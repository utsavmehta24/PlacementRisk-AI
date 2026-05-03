"""Admin router"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth.rbac import require_admin
from app.database import get_db
from app.models.schemas import User, Student, Institute, LenderOrganization, LenderOfficerProfile, StudentCase
from app.monitoring.alerts import generate_early_warning_alerts
from app.workflows.backfill_scores import backfill_missing_risk_scores

router = APIRouter()


def _filter_unique_institutes(institutes):
    seen = set()
    unique = []
    for inst in institutes:
        key = (
            inst.institute_name.strip().lower(),
            inst.city.strip().lower(),
            inst.state.strip().lower(),
            (inst.region or "").strip().lower(),
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(inst)
    return unique


@router.get("/users")
async def list_users(role: Optional[str] = Query(None), db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    users = q.order_by(User.created_at.desc()).limit(500).all()
    return [{"id": str(u.id), "email": u.email, "full_name": u.full_name, "role": u.role, "is_active": u.is_active} for u in users]


@router.get("/officers")
async def list_officers(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    rows = db.query(LenderOfficerProfile, User, LenderOrganization).join(User, LenderOfficerProfile.user_id == User.id).outerjoin(LenderOrganization, LenderOfficerProfile.lender_org_id == LenderOrganization.id).all()
    return [
        {
            "user_id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "designation": profile.designation,
            "employee_code": profile.employee_code,
            "lender_org": org.name if org else None,
        }
        for profile, user, org in rows
    ]


@router.get("/institutes")
async def list_institutes(search: Optional[str] = Query(None), db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    q = db.query(Institute)
    if search:
        q = q.filter(Institute.institute_name.ilike(f"%{search}%"))
    institutes = q.order_by(Institute.institute_name.asc()).limit(200).all()
    institutes = _filter_unique_institutes(institutes)
    return [{"id": str(i.id), "name": i.institute_name, "city": i.city, "state": i.state, "region": i.region} for i in institutes]


@router.get("/institutes/{institute_id}/students")
async def institute_students(institute_id: str, limit: int = Query(200, le=1000), db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    rows = db.query(Student).filter(Student.institute_id == institute_id).limit(limit).all()
    return [{"id": str(s.id), "name": s.student_name, "course": s.course_type.value, "cgpa": s.cgpa, "loan_amount": s.loan_amount} for s in rows]


@router.get("/monitoring")
async def monitoring(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    from app.config import get_settings
    _settings = get_settings()
    total_cases = db.query(func.count(StudentCase.id)).scalar() or 0
    open_cases = db.query(func.count(StudentCase.id)).filter(StudentCase.current_status.in_(["NEW", "UNDER_REVIEW", "ACTION_PROPOSED", "IN_PROGRESS"])) .scalar() or 0
    return {
        "mlflow_url": _settings.mlflow_tracking_uri,
        "airflow_url": "http://localhost:8080",
        "total_cases": total_cases,
        "open_cases": open_cases,
        "last_checked_at": datetime.now(timezone.utc),
    }


@router.post("/backfill-risk-scores")
async def backfill_scores(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    created = backfill_missing_risk_scores(db)
    return {"created_scores": created}


@router.post("/generate-alerts")
async def generate_alerts(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    count = generate_early_warning_alerts()
    return {"generated_alerts": count}
