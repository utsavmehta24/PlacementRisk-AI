"""Early warning alert generation"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import and_

from app.database import SessionLocal
from app.models.schemas import Student, RiskScore, EarlyWarningAlert
from app.workflows.case_management import ensure_case_for_alert
from app.ml.shap_explainer import get_next_best_action


def generate_early_warning_alerts():
    db = SessionLocal()
    try:
        students = db.query(Student).all()
        alerts_generated = 0

        for student in students:
            scores = db.query(RiskScore).filter(RiskScore.student_id == student.id).order_by(RiskScore.scored_at.desc()).limit(2).all()
            if len(scores) < 2:
                continue

            current_score = scores[0]
            previous_score = scores[1]
            score_change = current_score.risk_score - previous_score.risk_score

            if score_change < -0.15:
                existing_alert = db.query(EarlyWarningAlert).filter(
                    and_(
                        EarlyWarningAlert.student_id == student.id,
                        EarlyWarningAlert.is_resolved == False,
                        EarlyWarningAlert.created_at >= datetime.now(timezone.utc) - timedelta(days=7),
                    )
                ).first()
                if not existing_alert:
                    severity = "high" if abs(score_change) >= 0.25 else "medium" if abs(score_change) >= 0.20 else "low"
                    alert = EarlyWarningAlert(
                        student_id=student.id,
                        alert_type="risk_deterioration",
                        severity=severity,
                        message=f"Risk score dropped by {abs(score_change)*100:.1f} points. Current level: {current_score.risk_level.value}.",
                        previous_risk_score=previous_score.risk_score,
                        current_risk_score=current_score.risk_score,
                        score_change=score_change,
                    )
                    db.add(alert)
                    db.flush()
                    recommendation = get_next_best_action(
                        current_score.risk_level.value,
                        current_score.shap_explanation,
                        {"cgpa": student.cgpa, "internship_count": student.internship_count},
                    )
                    ensure_case_for_alert(
                        db=db,
                        student_id=student.id,
                        alert_id=alert.id,
                        risk_level=current_score.risk_level.value,
                        recommended_action=recommendation,
                        summary=alert.message,
                    )
                    alerts_generated += 1

            months_since_disbursal = (datetime.now(timezone.utc) - student.disbursal_date).days / 30
            if months_since_disbursal > 6 and current_score.placement_prob_6mo < 0.4:
                existing_delay_alert = db.query(EarlyWarningAlert).filter(
                    and_(
                        EarlyWarningAlert.student_id == student.id,
                        EarlyWarningAlert.alert_type == "placement_delay",
                        EarlyWarningAlert.is_resolved == False,
                    )
                ).first()
                if not existing_delay_alert:
                    alert = EarlyWarningAlert(
                        student_id=student.id,
                        alert_type="placement_delay",
                        severity="high",
                        message=f"Waiting {months_since_disbursal:.0f} months with only {current_score.placement_prob_6mo*100:.0f}% placement probability.",
                        current_risk_score=current_score.risk_score,
                    )
                    db.add(alert)
                    db.flush()
                    recommendation = get_next_best_action(
                        current_score.risk_level.value,
                        current_score.shap_explanation,
                        {"cgpa": student.cgpa, "internship_count": student.internship_count},
                    )
                    ensure_case_for_alert(
                        db=db,
                        student_id=student.id,
                        alert_id=alert.id,
                        risk_level=current_score.risk_level.value,
                        recommended_action=recommendation,
                        summary=alert.message,
                    )
                    alerts_generated += 1

        db.commit()
        return alerts_generated
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print(generate_early_warning_alerts())
