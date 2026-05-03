"""Portfolio analytics router"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
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
    latest_score_subquery = db.query(
        RiskScore.student_id.label("student_id"),
        func.max(RiskScore.scored_at).label("max_scored_at")
    ).group_by(RiskScore.student_id).subquery()

    query = db.query(
        Institute.institute_name.label("institute_name"),
        Student.course_type.label("course_type"),
        func.count(RiskScore.id).label("student_count"),
        func.sum(case((RiskScore.risk_level == "HIGH", 1), else_=0)).label("high_risk_count"),
        func.sum(case((RiskScore.risk_level == "MEDIUM", 1), else_=0)).label("medium_risk_count"),
        func.sum(case((RiskScore.risk_level == "LOW", 1), else_=0)).label("low_risk_count"),
        func.avg(RiskScore.risk_score).label("avg_risk_score"),
    ).join(
        Student, Student.institute_id == Institute.id
    ).join(
        latest_score_subquery, latest_score_subquery.c.student_id == Student.id
    ).join(
        RiskScore,
        and_(
            RiskScore.student_id == latest_score_subquery.c.student_id,
            RiskScore.scored_at == latest_score_subquery.c.max_scored_at
        )
    )

    if lender_id:
        query = query.filter(Student.lender_id == lender_id)
    if state:
        query = query.filter(Institute.state == state)
    if course_type:
        query = query.filter(Student.course_type == course_type)

    results = query.group_by(Institute.institute_name, Student.course_type).all()

    cells = []
    total_students = 0
    total_high_risk = 0
    for row in results:
        avg_score = float(row.avg_risk_score or 0.0)
        if avg_score < 0.40:
            risk_color = "#E24B4A"
        elif avg_score < 0.65:
            risk_color = "#EF9F27"
        else:
            risk_color = "#1D9E75"

        cell = HeatmapCell(
            institute_name=row.institute_name,
            course_type=row.course_type.value if hasattr(row.course_type, "value") else str(row.course_type),
            student_count=int(row.student_count or 0),
            high_risk_count=int(row.high_risk_count or 0),
            medium_risk_count=int(row.medium_risk_count or 0),
            low_risk_count=int(row.low_risk_count or 0),
            avg_risk_score=round(avg_score, 4),
            risk_color=risk_color
        )
        cells.append(cell)
        total_students += cell.student_count
        total_high_risk += cell.high_risk_count
    
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
    
    # Get latest risk score for each student in a DB-portable way
    latest_score_subquery = db.query(
        RiskScore.student_id.label("student_id"),
        func.max(RiskScore.scored_at).label("max_scored_at")
    ).group_by(RiskScore.student_id).subquery()

    risk_agg = db.query(
        func.count(RiskScore.id).label("total_scored"),
        func.sum(case((RiskScore.risk_level == "HIGH", 1), else_=0)).label("high_risk"),
        func.avg(RiskScore.placement_prob_6mo).label("avg_placement_prob")
    ).join(
        latest_score_subquery,
        and_(
            RiskScore.student_id == latest_score_subquery.c.student_id,
            RiskScore.scored_at == latest_score_subquery.c.max_scored_at
        )
    ).first()

    total_scored = int((risk_agg.total_scored or 0) if risk_agg else 0)
    high_risk = int((risk_agg.high_risk or 0) if risk_agg else 0)
    avg_placement_prob = float((risk_agg.avg_placement_prob or 0) if risk_agg else 0)
    
    # Alerts today
    today = datetime.now(timezone.utc).date()
    alerts_today = db.query(func.count(EarlyWarningAlert.id)).filter(
        func.date(EarlyWarningAlert.created_at) == today,
        EarlyWarningAlert.is_resolved == False
    ).scalar()
    
    return {
        "total_students": total_students,
        "high_risk_count": high_risk,
        "high_risk_percentage": round(high_risk / total_scored * 100, 2) if total_scored > 0 else 0,
        "avg_placement_prob_6mo": round(avg_placement_prob, 4),
        "alerts_today": alerts_today
    }
