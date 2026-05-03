"""Authentication router"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pydantic import EmailStr
from datetime import timedelta
from datetime import datetime, timezone

from app.database import get_db
from app.auth.jwt import authenticate_user, create_access_token, get_password_hash
from app.config import get_settings
from app.workflows.case_management import ensure_student_support_case
from app.models.schemas import (
    User,
    Student,
    StudentUserLink,
    Institute,
    LenderOrganization,
    CourseType,
    EmployerType,
    NIRFRankBand,
    TrendType,
)

router = APIRouter()
settings = get_settings()


class LoginRequest(BaseModel):
    email: EmailStr | None = None
    identifier: str | None = None
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


class StudentRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint
    
    Returns JWT access token
    """
    identifier = (request.identifier or request.email or "").strip()

    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or student ID is required",
        )

    user = authenticate_user(db, identifier, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.jwt_expiration_minutes)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    role_home_route = {
        "admin": "/admin",
        "risk_head": "/officer",
        "loan_officer": "/officer",
        "student": "/student-portal",
    }.get(user.role, "/")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "home_route": role_home_route,
            "profile_metadata": {
                "role_display": user.role.replace("_", " ").title(),
                "can_approve": user.role in ["admin", "risk_head", "loan_officer"],
            }
        }
    }


@router.post("/register-student")
async def register_student(request: StudentRegisterRequest, db: Session = Depends(get_db)):
    full_name = request.full_name.strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    existing_email = db.query(User).filter(User.email == request.email).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=request.email,
        hashed_password=get_password_hash(request.password),
        full_name=full_name,
        role="student",
        is_active=True,
    )
    db.add(user)
    db.flush()

    institute = db.query(Institute).first()
    if not institute:
        institute = Institute(
            institute_name="PlacementRisk Open Admissions Institute",
            nirf_rank_band=NIRFRankBand.UNRANKED,
            city="Bangalore",
            state="Karnataka",
            region="South",
            placement_rate_3mo=0.35,
            placement_rate_6mo=0.55,
            placement_rate_12mo=0.72,
            median_salary=450000,
            placement_cell_activity_index=0.5,
            recruiter_participation_trend=TrendType.STABLE,
        )
        db.add(institute)
        db.flush()

    lender = db.query(LenderOrganization).filter(LenderOrganization.code == "PRISK-NBFC").first()
    if not lender:
        lender = LenderOrganization(name="PlacementRisk Demo NBFC", code="PRISK-NBFC")
        db.add(lender)
        db.flush()

    student = Student(
        student_name=full_name,
        course_type=CourseType.ENGINEERING,
        cgpa=7.0,
        academic_consistency_score=0.7,
        internship_count=0,
        internship_duration_months=0,
        employer_type=EmployerType.NONE,
        skill_certifications=0,
        gap_years=0,
        institute_id=institute.id,
        loan_amount=500000,
        emi_monthly=8333,
        disbursal_date=datetime.now(timezone.utc),
        lender_id=lender.id,
    )
    db.add(student)
    db.flush()

    ensure_student_support_case(
        db,
        student.id,
        summary="Student registered and needs onboarding support.",
        recommended_action="resume_help",
    )

    link = StudentUserLink(student_id=student.id, user_id=user.id)
    db.add(link)
    db.commit()

    access_token_expires = timedelta(minutes=settings.jwt_expiration_minutes)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "home_route": "/student-portal",
            "profile_metadata": {
                "role_display": "Student",
                "can_approve": False,
                "student_id": str(student.id),
            }
        }
    }
