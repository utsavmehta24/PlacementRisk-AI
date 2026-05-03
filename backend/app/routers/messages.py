"""Messaging router"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.rbac import require_loan_officer, require_student
from app.auth.jwt import get_current_user
from app.database import get_db
from app.models.schemas import User, StudentCase, StudentMessage, StudentUserLink

router = APIRouter()


class MessageRequest(BaseModel):
    body: str
    receiver_user_id: Optional[str] = None


@router.get("/case/{case_id}")
async def list_messages(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(StudentCase).filter(StudentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if current_user.role not in ["student", "risk_head", "loan_officer"]:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    if current_user.role == "student":
        link = db.query(StudentUserLink).filter(StudentUserLink.user_id == current_user.id).first()
        if not link or link.student_id != case.student_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    messages = db.query(StudentMessage).filter(StudentMessage.case_id == case.id).order_by(StudentMessage.sent_at.asc()).all()
    return [
        {
            "id": str(m.id),
            "sender_user_id": str(m.sender_user_id),
            "receiver_user_id": str(m.receiver_user_id) if m.receiver_user_id else None,
            "body": m.body,
            "sent_at": m.sent_at,
        }
        for m in messages
    ]


@router.post("/case/{case_id}")
async def send_message(
    case_id: str,
    req: MessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(StudentCase).filter(StudentCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if current_user.role not in ["student", "risk_head", "loan_officer"]:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    if current_user.role == "student":
        link = db.query(StudentUserLink).filter(StudentUserLink.user_id == current_user.id).first()
        if not link or link.student_id != case.student_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    msg = StudentMessage(
        case_id=case.id,
        sender_user_id=current_user.id,
        receiver_user_id=req.receiver_user_id,
        body=req.body,
        sent_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    db.commit()

    return {"message": "Message sent", "id": str(msg.id)}
