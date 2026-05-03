from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.schemas import StudentCase, CaseEvent, CaseStatus


def ensure_case_for_alert(
    db: Session,
    student_id,
    alert_id=None,
    risk_level: Optional[str] = None,
    recommended_action: Optional[str] = None,
    summary: Optional[str] = None,
):
    case = (
        db.query(StudentCase)
        .filter(StudentCase.student_id == student_id)
        .order_by(StudentCase.updated_at.desc())
        .first()
    )

    now = datetime.now(timezone.utc)
    if not case:
        case = StudentCase(
            student_id=student_id,
            current_status=CaseStatus.NEW,
            risk_level_snapshot=risk_level,
            recommended_action=recommended_action,
            latest_alert_id=alert_id,
            sla_due_at=now + timedelta(days=3),
            summary=summary,
            created_at=now,
            updated_at=now,
        )
        db.add(case)
        db.flush()
        db.add(CaseEvent(
            case_id=case.id,
            actor_user_id=None,
            event_type="CASE_CREATED",
            event_note=summary,
            from_status=None,
            to_status=CaseStatus.NEW.value,
        ))
    else:
        old_status = case.current_status.value
        if case.current_status in [CaseStatus.RESOLVED, CaseStatus.CLOSED]:
            case.current_status = CaseStatus.UNDER_REVIEW
        case.latest_alert_id = alert_id or case.latest_alert_id
        case.risk_level_snapshot = risk_level or case.risk_level_snapshot
        case.recommended_action = recommended_action or case.recommended_action
        case.summary = summary or case.summary
        case.updated_at = now
        db.add(CaseEvent(
            case_id=case.id,
            actor_user_id=None,
            event_type="ALERT_ATTACHED",
            event_note=summary,
            from_status=old_status,
            to_status=case.current_status.value,
        ))

    return case


def ensure_student_support_case(
    db: Session,
    student_id,
    summary: str = "Student onboarding case created.",
    recommended_action: str = "resume_help",
):
    """Guarantee each student has at least one active support case."""
    case = (
        db.query(StudentCase)
        .filter(StudentCase.student_id == student_id)
        .order_by(StudentCase.updated_at.desc())
        .first()
    )

    if case:
        return case

    now = datetime.now(timezone.utc)
    case = StudentCase(
        student_id=student_id,
        current_status=CaseStatus.NEW,
        risk_level_snapshot=None,
        recommended_action=recommended_action,
        latest_alert_id=None,
        sla_due_at=now + timedelta(days=5),
        summary=summary,
        created_at=now,
        updated_at=now,
    )
    db.add(case)
    db.flush()
    db.add(CaseEvent(
        case_id=case.id,
        actor_user_id=None,
        event_type="CASE_CREATED",
        event_note=summary,
        from_status=None,
        to_status=CaseStatus.NEW.value,
    ))
    return case
