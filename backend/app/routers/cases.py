"""Case workflow router"""
from datetime import datetime, timedelta, timezone
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.rbac import require_officer
from app.database import get_db
from app.models.schemas import (
    User,
    Student,
    StudentCase,
    CaseEvent,
    ApprovalDecision,
    CaseStatus,
    RiskScore,
)

router = APIRouter()


class DecisionRequest(BaseModel):
    decision: str
    reason: str


class StatusUpdateRequest(BaseModel):
    status: str
    note: Optional[str] = None


@router.get("/")
async def list_cases(
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    institute: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    q = db.query(StudentCase, Student).join(Student, StudentCase.student_id == Student.id)
    if status:
        q = q.filter(StudentCase.current_status == status)
    if risk_level:
        q = q.filter(StudentCase.risk_level_snapshot == risk_level)
    if institute:
        q = q.join(Student.institute).filter(Student.institute.has(institute_name=institute))

    rows = q.order_by(StudentCase.updated_at.desc()).limit(limit).all()
    return [
        {
            "case_id": str(case.id),
            "student_id": str(student.id),
            "student_name": student.student_name,
            "course_type": student.course_type.value,
            "status": case.current_status.value,
            "risk_level": case.risk_level_snapshot,
            "recommended_action": case.recommended_action,
            "sla_due_at": case.sla_due_at,
            "updated_at": case.updated_at,
        }
        for case, student in rows
    ]


@router.get("/{case_id}")
async def get_case_detail(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    case = db.query(StudentCase).filter(StudentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    student = db.query(Student).filter(Student.id == case.student_id).first()
    latest_score = db.query(RiskScore).filter(RiskScore.student_id == student.id).order_by(RiskScore.scored_at.desc()).first()
    events = db.query(CaseEvent).filter(CaseEvent.case_id == case.id).order_by(CaseEvent.created_at.desc()).all()

    return {
        "case": {
            "id": str(case.id),
            "status": case.current_status.value,
            "recommended_action": case.recommended_action,
            "summary": case.summary,
            "sla_due_at": case.sla_due_at,
            "created_at": case.created_at,
            "updated_at": case.updated_at,
        },
        "student": {
            "id": str(student.id),
            "name": student.student_name,
            "course": student.course_type.value,
            "cgpa": student.cgpa,
            "loan_amount": student.loan_amount,
            "emi_monthly": student.emi_monthly,
        },
        "latest_risk": {
            "level": latest_score.risk_level.value if latest_score else None,
            "score": latest_score.risk_score if latest_score else None,
            "explanation": latest_score.shap_explanation if latest_score else None,
        },
        "events": [
            {
                "id": str(e.id),
                "type": e.event_type,
                "note": e.event_note,
                "from_status": e.from_status,
                "to_status": e.to_status,
                "created_at": e.created_at,
            }
            for e in events
        ],
    }


@router.post("/{case_id}/decision")
async def decide_case(
    case_id: str,
    req: DecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    case = db.query(StudentCase).filter(StudentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if req.decision.lower() not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="decision must be approved or rejected")

    new_status = CaseStatus.APPROVED if req.decision.lower() == "approved" else CaseStatus.REJECTED
    old_status = case.current_status.value
    case.current_status = new_status
    case.updated_at = datetime.now(timezone.utc)

    db.add(ApprovalDecision(
        case_id=case.id,
        decided_by_user_id=current_user.id,
        decision=req.decision.lower(),
        reason=req.reason,
    ))
    db.add(CaseEvent(
        case_id=case.id,
        actor_user_id=current_user.id,
        event_type="DECISION",
        event_note=req.reason,
        from_status=old_status,
        to_status=new_status.value,
    ))
    db.commit()

    return {"message": f"Case {req.decision.lower()}"}


@router.post("/{case_id}/status")
async def update_case_status(
    case_id: str,
    req: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    case = db.query(StudentCase).filter(StudentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    valid = {s.value for s in CaseStatus}
    if req.status not in valid:
        raise HTTPException(status_code=400, detail="Invalid status")

    old_status = case.current_status.value
    case.current_status = CaseStatus(req.status)
    case.updated_at = datetime.now(timezone.utc)

    db.add(CaseEvent(
        case_id=case.id,
        actor_user_id=current_user.id,
        event_type="STATUS_UPDATE",
        event_note=req.note,
        from_status=old_status,
        to_status=req.status,
    ))
    db.commit()

    return {"message": "Case status updated"}
