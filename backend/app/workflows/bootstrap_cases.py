from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.schemas import Student, RiskScore, StudentCase, CaseEvent, CaseStatus


def bootstrap_cases_for_workbench(db: Session, limit: int = 1000):
    existing = db.query(StudentCase).count()
    if existing > 0:
        return

    # Prefer scored students first
    latest_scores = (
        db.query(RiskScore)
        .order_by(RiskScore.scored_at.desc())
        .limit(limit)
        .all()
    )

    now = datetime.now(timezone.utc)
    created = 0
    seen_students = set()

    for rs in latest_scores:
        if rs.student_id in seen_students:
            continue
        seen_students.add(rs.student_id)
        status = CaseStatus.UNDER_REVIEW if rs.risk_level.value in ["HIGH", "MEDIUM"] else CaseStatus.NEW
        case = StudentCase(
            student_id=rs.student_id,
            current_status=status,
            risk_level_snapshot=rs.risk_level.value,
            recommended_action="skill_up" if rs.risk_level.value == "HIGH" else "resume_help",
            sla_due_at=now + timedelta(days=3),
            summary=f"Bootstrap case from risk score {rs.risk_score:.2f}",
            created_at=now,
            updated_at=now,
        )
        db.add(case)
        db.flush()
        db.add(CaseEvent(
            case_id=case.id,
            actor_user_id=None,
            event_type="BOOTSTRAP",
            event_note="Auto-created initial officer workload",
            from_status=None,
            to_status=status.value,
            created_at=now,
        ))
        created += 1

    if created < max(100, limit // 3):
        needed = max(100, limit // 3) - created
        students = db.query(Student).limit(needed).all()
        for s in students:
            if s.id in seen_students:
                continue
            case = StudentCase(
                student_id=s.id,
                current_status=CaseStatus.NEW,
                risk_level_snapshot="MEDIUM",
                recommended_action="resume_help",
                sla_due_at=now + timedelta(days=5),
                summary="Bootstrap case from student cohort",
                created_at=now,
                updated_at=now,
            )
            db.add(case)
            db.flush()
            db.add(CaseEvent(
                case_id=case.id,
                actor_user_id=None,
                event_type="BOOTSTRAP",
                event_note="Auto-created initial officer workload",
                from_status=None,
                to_status=CaseStatus.NEW.value,
                created_at=now,
            ))
