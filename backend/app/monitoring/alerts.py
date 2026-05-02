"""Early warning alert generation"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid

from app.database import SessionLocal
from app.models.schemas import Student, RiskScore, EarlyWarningAlert


def generate_early_warning_alerts():
    """
    Generate early warning alerts for students with deteriorating risk scores
    """
    print("=" * 60)
    print("PlacementRisk AI - Early Warning Alert Generation")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # Get all students with at least 2 risk scores
        students = db.query(Student).all()
        
        alerts_generated = 0
        
        for student in students:
            # Get last 2 risk scores
            scores = db.query(RiskScore).filter(
                RiskScore.student_id == student.id
            ).order_by(RiskScore.scored_at.desc()).limit(2).all()
            
            if len(scores) < 2:
                continue
            
            current_score = scores[0]
            previous_score = scores[1]
            
            # Check for significant deterioration (>15 points drop)
            score_change = current_score.risk_score - previous_score.risk_score
            
            if score_change < -0.15:  # Risk score decreased by more than 15%
                # Check if alert already exists for this deterioration
                existing_alert = db.query(EarlyWarningAlert).filter(
                    and_(
                        EarlyWarningAlert.student_id == student.id,
                        EarlyWarningAlert.is_resolved == False,
                        EarlyWarningAlert.created_at >= datetime.now(timezone.utc) - timedelta(days=7)
                    )
                ).first()
                
                if not existing_alert:
                    # Determine severity
                    if abs(score_change) >= 0.25:
                        severity = "high"
                    elif abs(score_change) >= 0.20:
                        severity = "medium"
                    else:
                        severity = "low"
                    
                    # Create alert
                    alert = EarlyWarningAlert(
                        student_id=student.id,
                        alert_type="risk_deterioration",
                        severity=severity,
                        message=f"Risk score dropped by {abs(score_change)*100:.1f} points. "
                               f"Current level: {current_score.risk_level.value}. "
                               f"Immediate intervention recommended.",
                        previous_risk_score=previous_score.risk_score,
                        current_risk_score=current_score.risk_score,
                        score_change=score_change
                    )
                    
                    db.add(alert)
                    alerts_generated += 1
            
            # Check for placement delay (>6 months since disbursal, low placement prob)
            months_since_disbursal = (datetime.now(timezone.utc) - student.disbursal_date).days / 30
            
            if months_since_disbursal > 6 and current_score.placement_prob_6mo < 0.4:
                existing_delay_alert = db.query(EarlyWarningAlert).filter(
                    and_(
                        EarlyWarningAlert.student_id == student.id,
                        EarlyWarningAlert.alert_type == "placement_delay",
                        EarlyWarningAlert.is_resolved == False
                    )
                ).first()
                
                if not existing_delay_alert:
                    alert = EarlyWarningAlert(
                        student_id=student.id,
                        alert_type="placement_delay",
                        severity="high",
                        message=f"Student has been waiting {months_since_disbursal:.0f} months "
                               f"with only {current_score.placement_prob_6mo*100:.0f}% placement probability. "
                               f"Urgent placement support needed.",
                        current_risk_score=current_score.risk_score
                    )
                    
                    db.add(alert)
                    alerts_generated += 1
        
        db.commit()
        
        print(f"\n✓ Generated {alerts_generated} new early warning alerts")
        print("\n" + "=" * 60)
        print("✓ Alert generation complete!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error generating alerts: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    generate_early_warning_alerts()
