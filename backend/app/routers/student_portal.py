"""Student portal router"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.rbac import require_student
from app.database import get_db
from app.ml.predict import get_predictor
from app.ml.shap_explainer import (
    generate_shap_explanation,
    generate_simple_explanation,
    get_action_resources,
    get_next_best_action,
)
from app.models.schemas import (
    User,
    StudentUserLink,
    Student,
    RiskScore,
    StudentCase,
    Institute,
    JobMarketSignal,
    CourseType,
    EmployerType,
)
from app.workflows.case_management import ensure_case_for_alert, ensure_student_support_case

router = APIRouter()


class StudentProfileUpdateRequest(BaseModel):
    institute_id: Optional[str] = None
    course_type: Optional[str] = None
    cgpa: Optional[float] = None
    academic_consistency_score: Optional[float] = None
    internship_count: Optional[int] = None
    internship_duration_months: Optional[int] = None
    employer_type: Optional[str] = None
    skill_certifications: Optional[int] = None
    gap_years: Optional[int] = None
    loan_amount: Optional[int] = None
    emi_monthly: Optional[int] = None
    disbursal_date: Optional[datetime] = None


def _get_student_for_user(db: Session, current_user: User) -> Student:
    link = db.query(StudentUserLink).filter(StudentUserLink.user_id == current_user.id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Student mapping not found")

    student = db.query(Student).filter(Student.id == link.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


def _serialize_portal(db: Session, student: Student):
    institute = db.query(Institute).filter(Institute.id == student.institute_id).first()
    latest = db.query(RiskScore).filter(RiskScore.student_id == student.id).order_by(RiskScore.scored_at.desc()).first()
    case = ensure_student_support_case(
        db,
        student.id,
        summary="Student support case is active for onboarding and guidance.",
        recommended_action="resume_help",
    )

    profile_fields = [
        student.institute_id,
        student.course_type,
        student.cgpa,
        student.loan_amount,
        student.emi_monthly,
        student.disbursal_date,
    ]
    completion = int((sum(1 for value in profile_fields if value is not None) / len(profile_fields)) * 100)

    return {
        "student": {
            "id": str(student.id),
            "name": student.student_name,
            "course": student.course_type.value,
            "cgpa": student.cgpa,
            "loan_amount": student.loan_amount,
            "emi_monthly": student.emi_monthly,
            "institute_id": str(student.institute_id),
            "institute_name": institute.institute_name if institute else None,
            "disbursal_date": student.disbursal_date,
            "academic_consistency_score": student.academic_consistency_score,
            "internship_count": student.internship_count,
            "internship_duration_months": student.internship_duration_months,
            "employer_type": student.employer_type.value,
            "skill_certifications": student.skill_certifications,
            "gap_years": student.gap_years,
            "profile_completion": completion,
        },
        "risk": {
            "level": latest.risk_level.value if latest else None,
            "score": latest.risk_score if latest else None,
            "placement_prob_6mo": latest.placement_prob_6mo if latest else None,
            "salary_p50": latest.salary_p50 if latest else None,
            "explanation": latest.shap_explanation if latest else None,
            "scored_at": latest.scored_at if latest else None,
        },
        "active_case": {
            "id": str(case.id) if case else None,
            "status": case.current_status.value if case else None,
            "recommended_action": case.recommended_action if case else None,
            "summary": case.summary if case else None,
        },
        "support_tracks": [
            "Internship support",
            "Resume and LinkedIn review",
            "Mock interview practice",
            "Repayment readiness guidance",
        ],
    }


def _build_job_market_data(db: Session, student: Student, institute: Institute):
    course_to_sector = {
        "Engineering": "IT",
        "MBA": "BFSI",
        "Nursing": "Healthcare",
        "Commerce": "BFSI",
        "Law": "Consulting",
    }
    sector = course_to_sector.get(student.course_type.value, "IT")
    job_signal = db.query(JobMarketSignal).filter(
        JobMarketSignal.sector == sector,
        JobMarketSignal.region == institute.region,
    ).order_by(JobMarketSignal.snapshot_date.desc()).first()

    if not job_signal:
        return {
            "job_demand_index": 0.5,
            "avg_time_to_hire_days": 45,
            "hiring_trend": "Stable",
        }

    return {
        "job_demand_index": job_signal.job_demand_index,
        "avg_time_to_hire_days": job_signal.avg_time_to_hire_days,
        "hiring_trend": job_signal.hiring_trend,
    }


def _run_student_analysis(db: Session, student: Student):
    institute = db.query(Institute).filter(Institute.id == student.institute_id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")

    student_data = {
        "cgpa": student.cgpa,
        "internship_count": student.internship_count,
        "academic_consistency_score": student.academic_consistency_score,
        "skill_certifications": student.skill_certifications,
        "gap_years": student.gap_years,
        "internship_duration_months": student.internship_duration_months,
        "employer_type": student.employer_type.value,
        "course_type": student.course_type.value,
        "loan_amount": student.loan_amount,
        "emi_monthly": student.emi_monthly,
        "disbursal_date": student.disbursal_date,
    }
    institute_data = {
        "placement_rate_3mo": institute.placement_rate_3mo,
        "placement_rate_6mo": institute.placement_rate_6mo,
        "placement_rate_12mo": institute.placement_rate_12mo,
        "median_salary": institute.median_salary,
        "placement_cell_activity_index": institute.placement_cell_activity_index,
        "nirf_rank_band": institute.nirf_rank_band.value,
        "region": institute.region,
    }
    job_market_data = _build_job_market_data(db, student, institute)

    predictor = get_predictor()
    prediction = predictor.predict(student_data, institute_data, job_market_data)

    if predictor.fallback_only:
        features = {
            "cgpa": student.cgpa,
            "internship_count": student.internship_count,
            "job_demand_index": job_market_data.get("job_demand_index", 0.5),
            "institute_placement_rate_6mo": institute.placement_rate_6mo,
        }
        explanation = generate_simple_explanation(features)
    else:
        X, features = predictor.prepare_features(student_data, institute_data, job_market_data)
        explanation = generate_shap_explanation(
            predictor.placement_models["6mo"],
            X,
            predictor.feature_names,
            features,
        )

    full_explanation = f"{explanation} => Risk: {prediction['risk_level']}"
    next_action = get_next_best_action(prediction["risk_level"], explanation, features)

    risk_score = RiskScore(
        student_id=student.id,
        risk_level=prediction["risk_level"],
        risk_score=prediction["risk_score"],
        placement_prob_3mo=prediction["placement_prob_3mo"],
        placement_prob_6mo=prediction["placement_prob_6mo"],
        placement_prob_12mo=prediction["placement_prob_12mo"],
        salary_p10=prediction["salary_p10"],
        salary_p50=prediction["salary_p50"],
        salary_p90=prediction["salary_p90"],
        placement_momentum_score=prediction["placement_momentum_score"],
        market_alignment_score=prediction["market_alignment_score"],
        repayment_buffer_score=prediction["repayment_buffer_score"],
        shap_explanation=full_explanation,
        model_version=prediction["model_version"],
    )
    db.add(risk_score)
    db.flush()

    case = ensure_case_for_alert(
        db=db,
        student_id=student.id,
        alert_id=None,
        risk_level=prediction["risk_level"],
        recommended_action=next_action or "resume_help",
        summary=f"Student self-analysis refreshed on {datetime.now(timezone.utc).strftime('%Y-%m-%d')}.",
    )
    db.commit()

    return {
        "risk_level": prediction["risk_level"],
        "risk_score": prediction["risk_score"],
        "placement_prob_6mo": prediction["placement_prob_6mo"],
        "salary_p50": prediction["salary_p50"],
        "explanation": full_explanation,
        "next_best_action": next_action,
        "action_resources": get_action_resources(next_action) if next_action else None,
        "case_id": str(case.id) if case else None,
    }


@router.get("/me")
async def my_profile(db: Session = Depends(get_db), current_user: User = Depends(require_student)):
    student = _get_student_for_user(db, current_user)
    payload = _serialize_portal(db, student)
    db.commit()
    return payload


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


@router.get("/institutes")
async def list_institutes(
    search: Optional[str] = Query(None),
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    query = db.query(Institute)
    if search:
        query = query.filter(Institute.institute_name.ilike(f"%{search}%"))
    institutes = query.order_by(Institute.institute_name.asc()).limit(limit).all()
    institutes = _filter_unique_institutes(institutes)
    return [
        {
            "id": str(i.id),
            "name": i.institute_name,
            "city": i.city,
            "state": i.state,
            "region": i.region,
            "placement_rate_6mo": i.placement_rate_6mo,
            "median_salary": i.median_salary,
        }
        for i in institutes
    ]


@router.put("/profile")
async def update_profile(
    req: StudentProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    student = _get_student_for_user(db, current_user)

    if req.institute_id:
        try:
            institute_uuid = UUID(req.institute_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid institute_id")
        institute = db.query(Institute).filter(Institute.id == institute_uuid).first()
        if not institute:
            raise HTTPException(status_code=404, detail="Institute not found")
        student.institute_id = institute.id

    if req.course_type:
        student.course_type = CourseType(req.course_type)
    if req.employer_type:
        student.employer_type = EmployerType(req.employer_type)

    for field in [
        "cgpa",
        "academic_consistency_score",
        "internship_count",
        "internship_duration_months",
        "skill_certifications",
        "gap_years",
        "loan_amount",
        "emi_monthly",
    ]:
        value = getattr(req, field)
        if value is not None:
            setattr(student, field, value)

    if req.disbursal_date is not None:
        student.disbursal_date = req.disbursal_date

    student.updated_at = datetime.now(timezone.utc)
    ensure_student_support_case(
        db,
        student.id,
        summary="Student profile updated and ready for analysis.",
        recommended_action="resume_help",
    )
    db.commit()

    return _serialize_portal(db, student)


@router.post("/analyze")
async def analyze_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    student = _get_student_for_user(db, current_user)
    result = _run_student_analysis(db, student)
    refreshed_student = _get_student_for_user(db, current_user)
    return {
        "analysis": result,
        "profile": _serialize_portal(db, refreshed_student),
    }
