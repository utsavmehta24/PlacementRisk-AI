"""Student management router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import get_db
from app.auth.rbac import require_loan_officer
from app.models.schemas import User, Student, Institute, RiskScore, StudentAction

router = APIRouter()


class StudentProfile(BaseModel):
    id: str
    student_name: str
    course_type: str
    cgpa: float
    institute_name: str
    loan_amount: int
    emi_monthly: int
    disbursal_date: datetime
    latest_risk_score: Optional[dict]


class RiskScoreHistory(BaseModel):
    scored_at: datetime
    risk_level: str
    risk_score: float
    placement_prob_6mo: float


class ActionRequest(BaseModel):
    action_type: str  # skill_up, resume_help, mock_interview, recruiter_match


@router.get("/{student_id}", response_model=StudentProfile)
async def get_student_profile(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_loan_officer)
):
    """
    Get student risk profile with latest risk score
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    institute = db.query(Institute).filter(Institute.id == student.institute_id).first()
    
    # Get latest risk score
    latest_score = db.query(RiskScore).filter(
        RiskScore.student_id == student_id
    ).order_by(RiskScore.scored_at.desc()).first()
    
    latest_risk_data = None
    if latest_score:
        latest_risk_data = {
            "risk_level": latest_score.risk_level.value,
            "risk_score": latest_score.risk_score,
            "placement_prob_3mo": latest_score.placement_prob_3mo,
            "placement_prob_6mo": latest_score.placement_prob_6mo,
            "placement_prob_12mo": latest_score.placement_prob_12mo,
            "salary_p10": latest_score.salary_p10,
            "salary_p50": latest_score.salary_p50,
            "salary_p90": latest_score.salary_p90,
            "placement_momentum_score": latest_score.placement_momentum_score,
            "market_alignment_score": latest_score.market_alignment_score,
            "repayment_buffer_score": latest_score.repayment_buffer_score,
            "shap_explanation": latest_score.shap_explanation,
            "next_best_action": None,
            "action_resources": None,
            "scored_at": latest_score.scored_at
        }

        from app.ml.shap_explainer import get_next_best_action, get_action_resources
        next_action = get_next_best_action(
            latest_score.risk_level.value,
            latest_score.shap_explanation,
            {"cgpa": student.cgpa, "internship_count": student.internship_count}
        )
        latest_risk_data["next_best_action"] = next_action
        latest_risk_data["action_resources"] = get_action_resources(next_action) if next_action else None
    
    return StudentProfile(
        id=str(student.id),
        student_name=student.student_name,
        course_type=student.course_type.value,
        cgpa=student.cgpa,
        institute_name=institute.institute_name,
        loan_amount=student.loan_amount,
        emi_monthly=student.emi_monthly,
        disbursal_date=student.disbursal_date,
        latest_risk_score=latest_risk_data
    )


@router.get("/{student_id}/history", response_model=List[RiskScoreHistory])
async def get_risk_score_history(
    student_id: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_loan_officer)
):
    """
    Get risk score history for a student
    """
    scores = db.query(RiskScore).filter(
        RiskScore.student_id == student_id
    ).order_by(RiskScore.scored_at.desc()).limit(limit).all()
    
    return [
        RiskScoreHistory(
            scored_at=score.scored_at,
            risk_level=score.risk_level.value,
            risk_score=score.risk_score,
            placement_prob_6mo=score.placement_prob_6mo
        )
        for score in scores
    ]


@router.post("/{student_id}/action")
async def initiate_student_action(
    student_id: str,
    request: ActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_loan_officer)
):
    """
    Initiate a support action for a student
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get action resources
    from app.ml.shap_explainer import get_action_resources
    resources = get_action_resources(request.action_type)
    
    # Create action record
    action = StudentAction(
        student_id=uuid.UUID(student_id),
        action_type=request.action_type,
        action_status="initiated",
        recommended_resources=str(resources),
        initiated_by=current_user.id
    )
    db.add(action)
    db.commit()
    
    return {
        "message": f"Action '{request.action_type}' initiated successfully",
        "action_id": str(action.id),
        "resources": resources
    }
