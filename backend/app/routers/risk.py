"""Risk scoring router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.auth.rbac import require_loan_officer
from app.models.schemas import User, Student, Institute, JobMarketSignal, RiskScore
from app.ml.predict import get_predictor
from app.ml.shap_explainer import generate_shap_explanation, get_next_best_action, get_action_resources

router = APIRouter()


class RiskScoreRequest(BaseModel):
    student_id: str


class RiskScoreResponse(BaseModel):
    student_id: str
    risk_level: str
    risk_score: float
    placement_prob_3mo: float
    placement_prob_6mo: float
    placement_prob_12mo: float
    salary_p10: int
    salary_p50: int
    salary_p90: int
    placement_momentum_score: float
    market_alignment_score: float
    repayment_buffer_score: float
    shap_explanation: str
    next_best_action: Optional[str]
    action_resources: Optional[dict]
    model_version: str
    scored_at: datetime


@router.post("/score", response_model=RiskScoreResponse)
async def score_student(
    request: RiskScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_loan_officer)
):
    """
    Score a student's placement risk
    
    Returns comprehensive risk assessment with SHAP explanation
    """
    # Get student
    student = db.query(Student).filter(Student.id == request.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get institute
    institute = db.query(Institute).filter(Institute.id == student.institute_id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")
    
    # Map course to sector
    course_to_sector = {
        "Engineering": "IT",
        "MBA": "BFSI",
        "Nursing": "Healthcare",
        "Commerce": "BFSI",
        "Law": "Consulting"
    }
    sector = course_to_sector.get(student.course_type.value, "IT")
    
    # Get latest job market signals
    job_signal = db.query(JobMarketSignal).filter(
        JobMarketSignal.sector == sector,
        JobMarketSignal.region == institute.region
    ).order_by(JobMarketSignal.snapshot_date.desc()).first()
    
    if not job_signal:
        # Use default values
        job_market_data = {
            "job_demand_index": 0.5,
            "avg_time_to_hire_days": 45,
            "hiring_trend": "Stable"
        }
    else:
        job_market_data = {
            "job_demand_index": job_signal.job_demand_index,
            "avg_time_to_hire_days": job_signal.avg_time_to_hire_days,
            "hiring_trend": job_signal.hiring_trend
        }
    
    # Prepare data for prediction
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
        "disbursal_date": student.disbursal_date
    }
    
    institute_data = {
        "placement_rate_3mo": institute.placement_rate_3mo,
        "placement_rate_6mo": institute.placement_rate_6mo,
        "placement_rate_12mo": institute.placement_rate_12mo,
        "median_salary": institute.median_salary,
        "placement_cell_activity_index": institute.placement_cell_activity_index,
        "nirf_rank_band": institute.nirf_rank_band.value,
        "region": institute.region
    }
    
    # Get predictor and make prediction
    predictor = get_predictor()
    prediction = predictor.predict(student_data, institute_data, job_market_data)
    
    # Generate SHAP explanation
    X, features = predictor.prepare_features(student_data, institute_data, job_market_data)
    shap_explanation = generate_shap_explanation(
        predictor.placement_models["6mo"],
        X,
        predictor.feature_names,
        features
    )
    
    # Add risk level to explanation
    full_explanation = f"{shap_explanation} => Risk: {prediction['risk_level']}"
    
    # Get next best action
    next_action = get_next_best_action(
        prediction["risk_level"],
        shap_explanation,
        features
    )
    
    action_resources = get_action_resources(next_action) if next_action else None
    
    # Save risk score to database
    risk_score = RiskScore(
        student_id=uuid.UUID(request.student_id),
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
        model_version=prediction["model_version"]
    )
    db.add(risk_score)
    db.commit()
    
    return {
        "student_id": request.student_id,
        "risk_level": prediction["risk_level"],
        "risk_score": prediction["risk_score"],
        "placement_prob_3mo": prediction["placement_prob_3mo"],
        "placement_prob_6mo": prediction["placement_prob_6mo"],
        "placement_prob_12mo": prediction["placement_prob_12mo"],
        "salary_p10": prediction["salary_p10"],
        "salary_p50": prediction["salary_p50"],
        "salary_p90": prediction["salary_p90"],
        "placement_momentum_score": prediction["placement_momentum_score"],
        "market_alignment_score": prediction["market_alignment_score"],
        "repayment_buffer_score": prediction["repayment_buffer_score"],
        "shap_explanation": full_explanation,
        "next_best_action": next_action,
        "action_resources": action_resources,
        "model_version": prediction["model_version"],
        "scored_at": datetime.now(timezone.utc)
    }
