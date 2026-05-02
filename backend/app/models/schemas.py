"""SQLAlchemy ORM models for PlacementRisk AI"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum

from app.database import Base


class CourseType(str, enum.Enum):
    ENGINEERING = "Engineering"
    MBA = "MBA"
    NURSING = "Nursing"
    COMMERCE = "Commerce"
    LAW = "Law"


class EmployerType(str, enum.Enum):
    FAANG = "FAANG"
    MNC = "MNC"
    STARTUP = "Startup"
    SME = "SME"
    NONE = "None"


class NIRFRankBand(str, enum.Enum):
    TOP10 = "Top10"
    RANK_11_50 = "11-50"
    RANK_51_100 = "51-100"
    RANK_101_200 = "101-200"
    RANK_201_500 = "201-500"
    UNRANKED = "Unranked"


class TrendType(str, enum.Enum):
    GROWING = "Growing"
    STABLE = "Stable"
    DECLINING = "Declining"


class OutcomeLabel(str, enum.Enum):
    PLACED_EARLY = "Placed_Early"
    PLACED_LATE = "Placed_Late"
    NOT_PLACED = "Not_Placed"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, nullable=False)  # loan_officer, risk_head, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Institute(Base):
    """Institute profile model"""
    __tablename__ = "institutes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institute_name = Column(String, nullable=False)
    nirf_rank_band = Column(Enum(NIRFRankBand), nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    region = Column(String, nullable=False)
    placement_rate_3mo = Column(Float, nullable=False)
    placement_rate_6mo = Column(Float, nullable=False)
    placement_rate_12mo = Column(Float, nullable=False)
    median_salary = Column(Integer, nullable=False)
    placement_cell_activity_index = Column(Float, nullable=False)
    recruiter_participation_trend = Column(Enum(TrendType), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    students = relationship("Student", back_populates="institute")


class Student(Base):
    """Student profile model"""
    __tablename__ = "students"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_name = Column(String, nullable=False)
    course_type = Column(Enum(CourseType), nullable=False)
    cgpa = Column(Float, nullable=False)
    academic_consistency_score = Column(Float, nullable=False)
    internship_count = Column(Integer, nullable=False)
    internship_duration_months = Column(Integer, nullable=False)
    employer_type = Column(Enum(EmployerType), nullable=False)
    skill_certifications = Column(Integer, nullable=False)
    gap_years = Column(Integer, nullable=False)
    institute_id = Column(UUID(as_uuid=True), ForeignKey("institutes.id"), nullable=False)
    loan_amount = Column(Integer, nullable=False)
    emi_monthly = Column(Integer, nullable=False)
    disbursal_date = Column(DateTime, nullable=False)
    lender_id = Column(UUID(as_uuid=True), nullable=False)  # Reference to lender
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    institute = relationship("Institute", back_populates="students")
    placement_outcome = relationship("PlacementOutcome", back_populates="student", uselist=False)
    risk_scores = relationship("RiskScore", back_populates="student")
    alerts = relationship("EarlyWarningAlert", back_populates="student")


class PlacementOutcome(Base):
    """Placement outcome (ground truth labels)"""
    __tablename__ = "placement_outcomes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, unique=True)
    actual_placement_months = Column(Integer)  # NULL if not placed
    actual_salary = Column(Integer)  # NULL if not placed
    first_emi_defaulted = Column(Boolean, default=False)
    outcome_label = Column(Enum(OutcomeLabel))
    placement_date = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    student = relationship("Student", back_populates="placement_outcome")


class RiskScore(Base):
    """Risk score history for students"""
    __tablename__ = "risk_scores"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    risk_level = Column(Enum(RiskLevel), nullable=False)
    risk_score = Column(Float, nullable=False)
    placement_prob_3mo = Column(Float, nullable=False)
    placement_prob_6mo = Column(Float, nullable=False)
    placement_prob_12mo = Column(Float, nullable=False)
    salary_p10 = Column(Integer, nullable=False)
    salary_p50 = Column(Integer, nullable=False)
    salary_p90 = Column(Integer, nullable=False)
    placement_momentum_score = Column(Float, nullable=False)
    market_alignment_score = Column(Float, nullable=False)
    repayment_buffer_score = Column(Float, nullable=False)
    shap_explanation = Column(Text, nullable=False)
    model_version = Column(String, nullable=False)
    scored_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationships
    student = relationship("Student", back_populates="risk_scores")


class EarlyWarningAlert(Base):
    """Early warning alerts for deteriorating students"""
    __tablename__ = "early_warning_alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    alert_type = Column(String, nullable=False)  # risk_deterioration, placement_delay, etc.
    severity = Column(String, nullable=False)  # high, medium, low
    message = Column(Text, nullable=False)
    previous_risk_score = Column(Float)
    current_risk_score = Column(Float)
    score_change = Column(Float)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationships
    student = relationship("Student", back_populates="alerts")


class JobMarketSignal(Base):
    """Job market signals (monthly snapshots)"""
    __tablename__ = "job_market_signals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_date = Column(DateTime, nullable=False, index=True)
    sector = Column(String, nullable=False)  # IT, BFSI, Manufacturing, Healthcare, Consulting
    region = Column(String, nullable=False)
    job_demand_index = Column(Float, nullable=False)
    avg_time_to_hire_days = Column(Integer, nullable=False)
    hiring_trend = Column(String, nullable=False)  # Expanding, Stable, Contracting
    job_postings_count = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class StudentAction(Base):
    """Student support actions taken"""
    __tablename__ = "student_actions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    action_type = Column(String, nullable=False)  # skill_up, resume_help, mock_interview, recruiter_match
    action_status = Column(String, nullable=False)  # initiated, in_progress, completed
    recommended_resources = Column(Text)
    initiated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime)
