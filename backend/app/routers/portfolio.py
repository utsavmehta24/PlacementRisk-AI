"""Portfolio analytics router"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.auth.rbac import require_risk_head
from app.models.schemas import User, Student, Institute, RiskScore, EarlyWarningAlert

router = APIRouter()


class HeatmapCell(BaseModel):
    institute_name: str
    course_type: str
    student_count: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    avg_risk_score: float
    risk_color: str


class HeatmapResponse(BaseModel):
    cells: List[HeatmapCell]
    total_students: int
    high_risk_percentage: float


class AlertItem(BaseModel):
    id: str
    student_id: str
    student_name: str
    institute_name: str
    course_type: str
    alert_type: str
    severity: str
    message: str
    previous_risk_score: Optional[float]
    current_risk_score: Optional[float]
    score_change: Optional[float]
    created_at: datetime


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_portfolio_heatmap(
    lender_id: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    course_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_risk_head)
):
    """
    Get portfolio heatmap showing risk distribution by institute and course
    """
    # Build query
    query = db.query(
        Institute.institute_name,
        Student.course_type,
        func.count(Student.id).label("student_count")
    ).join(Student, Student.institute_id == Institute.id)
    
    # Apply filters
    if lender_id:
        query = query.filter(Student.lender_id == lender_id)
    if state:
        query = query.filter(Institute.state == state)
    if course_type:
        query = query.filter(Student.course_type == course_type)
    
    # Group by institute and course
    query = query.group_by(Institute.institute_name, Student.course_type)
    
    results = query.all()
    
    # Get latest risk scores for each student
    cells = []
    total_students = 0
    total_high_risk = 0
    
    for institute_name, course, student_count in results:
        # Get latest risk scores for this group
        risk_scores = db.query(RiskScore).join(
            Student, Student.id == RiskScore.student_id
        ).join(
            Institute, Institute.id == Student.institute_id
        ).filter(
            and_(
                Institute.institute_name == institute_name,
                Student.course_type == course
            )
        ).order_by(RiskScore.scored_at.desc()).limit(student_count).all()
        
        if not risk_scores:
            continue
        
        # Count risk levels
        high_count = sum(1 for rs in risk_scores if rs.risk_level == "HIGH")
        medium_count = sum(1 for rs in risk_scores if rs.risk_level == "MEDIUM")
        low_count = sum(1 for rs in risk_scores if rs.risk_level == "LOW")
        
        avg_score = sum(rs.risk_score for rs in risk_scores) / len(risk_scores)
        
        # Determine color
        if avg_score < 0.40:
            risk_color = "#E24B4A"  # RED
        elif avg_score < 0.65:
            risk_color = "#EF9F27"  # AMBER
        else:
            risk_color = "#1D9E75"  # GREEN
        
        cells.append(HeatmapCell(
            institute_name=institute_name,
            course_type=course.value,
            student_count=student_count,
            high_risk_count=high_count,
            medium_risk_count=medium_count,
            low_risk_count=low_count,
            avg_risk_score=round(avg_score, 4),
            risk_color=risk_color
        ))
        
        total_students += student_count
        total_high_risk += high_count
    
    high_risk_pct = (total_high_risk / total_students * 100) if total_students > 0 else 0
    
    return HeatmapResponse(
        cells=cells,
        total_students=total_students,
        high_risk_percentage=round(high_risk_pct, 2)
    )


@router.get("/alerts", response_model=List[AlertItem])
async def get_early_warning_alerts(
    limit: int = Query(50, le=100),
    severity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_risk_head)
):
    """
    Get early warning alerts for students with deteriorating risk scores
    """
    query = db.query(EarlyWarningAlert).join(
        Student, Student.id == EarlyWarningAlert.student_id
    ).join(
        Institute, Institute.id == Student.institute_id
    ).filter(
        EarlyWarningAlert.is_resolved == False
    )
    
    if severity:
        query = query.filter(EarlyWarningAlert.severity == severity)
    
    query = query.order_by(EarlyWarningAlert.created_at.desc()).limit(limit)
    
    alerts = query.all()
    
    result = []
    for alert in alerts:
        student = db.query(Student).filter(Student.id == alert.student_id).first()
        institute = db.query(Institute).filter(Institute.id == student.institute_id).first()
        
        result.append(AlertItem(
            id=str(alert.id),
            student_id=str(alert.student_id),
            student_name=student.student_name,
            institute_name=institute.institute_name,
            course_type=student.course_type.value,
            alert_type=alert.alert_type,
            severity=alert.severity,
            message=alert.message,
            previous_risk_score=alert.previous_risk_score,
            current_risk_score=alert.current_risk_score,
            score_change=alert.score_change,
            created_at=alert.created_at
        ))
    
    return result


@router.get("/stats")
async def get_portfolio_stats(
    lender_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_risk_head)
):
    """
    Get portfolio summary statistics
    """
    # Total students
    query = db.query(func.count(Student.id))
    if lender_id:
        query = query.filter(Student.lender_id == lender_id)
    total_students = query.scalar()
    
    # Get latest risk scores
    latest_scores = db.query(RiskScore).order_by(
        RiskScore.student_id, RiskScore.scored_at.desc()
    ).distinct(RiskScore.student_id).all()
    
    if latest_scores:
        high_risk = sum(1 for rs in latest_scores if rs.risk_level == "HIGH")
        avg_placement_prob = sum(rs.placement_prob_6mo for rs in latest_scores) / len(latest_scores)
    else:
        high_risk = 0
        avg_placement_prob = 0
    
    # Alerts today
    today = datetime.now(timezone.utc).date()
    alerts_today = db.query(func.count(EarlyWarningAlert.id)).filter(
        func.date(EarlyWarningAlert.created_at) == today,
        EarlyWarningAlert.is_resolved == False
    ).scalar()
    
    return {
        "total_students": total_students,
        "high_risk_count": high_risk,
        "high_risk_percentage": round(high_risk / total_students * 100, 2) if total_students > 0 else 0,
        "avg_placement_prob_6mo": round(avg_placement_prob, 4),
        "alerts_today": alerts_today
    }
