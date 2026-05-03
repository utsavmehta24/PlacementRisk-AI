"""Officer workflow router"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth.rbac import require_officer
from app.database import get_db
from app.models.schemas import User, StudentCase, Student, Institute, EarlyWarningAlert
from app.workflows.bootstrap_cases import bootstrap_cases_for_workbench

router = APIRouter()


@router.get("/dashboard")
async def officer_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_officer)):
    if (db.query(func.count(StudentCase.id)).scalar() or 0) == 0:
        bootstrap_cases_for_workbench(db, limit=1200)
        db.commit()
    total_cases = db.query(func.count(StudentCase.id)).scalar() or 0
    by_status = db.query(StudentCase.current_status, func.count(StudentCase.id)).group_by(StudentCase.current_status).all()
    alerts = db.query(func.count(EarlyWarningAlert.id)).filter(EarlyWarningAlert.is_resolved == False).scalar() or 0
    return {
        "total_cases": total_cases,
        "open_alerts": alerts,
        "status_breakdown": [{"status": s.value if hasattr(s, 'value') else s, "count": c} for s, c in by_status],
    }


@router.get("/students")
async def search_students(
    q: str = Query(""),
    institute_id: str | None = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    query = db.query(Student, Institute).join(Institute, Student.institute_id == Institute.id)
    if q:
        query = query.filter(Student.student_name.ilike(f"%{q}%"))
    if institute_id:
        query = query.filter(Student.institute_id == institute_id)
    rows = query.limit(limit).all()
    return [
        {
            "student_id": str(s.id),
            "student_name": s.student_name,
            "course": s.course_type.value,
            "institute": i.institute_name,
            "city": i.city,
            "state": i.state,
            "loan_amount": s.loan_amount,
        }
        for s, i in rows
    ]
