"""Database connection and session management"""
import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.postgres_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    _seed_institutes_from_csv()
    _seed_demo_users()


def _seed_institutes_from_csv():
    """Load institutes from CSV into the database if the table is empty."""
    import csv
    from app.models.schemas import Institute, NIRFRankBand, TrendType

    CSV_PATHS = [
        "/data/synthetic/institutes.csv",
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "synthetic", "institutes.csv"),
    ]

    csv_path = None
    for p in CSV_PATHS:
        if os.path.exists(p):
            csv_path = p
            break

    if not csv_path:
        print("institutes.csv not found, skipping institute seeding")
        return

    db = SessionLocal()
    try:
        count = db.query(Institute).count()
        if count > 0:
            print(f"Institutes already seeded ({count} records), skipping")
            return

        print(f"Seeding institutes from {csv_path}...")
        loaded = 0
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    institute = Institute(
                        id=uuid.UUID(row["id"]),
                        institute_name=row["institute_name"],
                        nirf_rank_band=NIRFRankBand(row["nirf_rank_band"]),
                        city=row["city"],
                        state=row["state"],
                        region=row["region"],
                        placement_rate_3mo=float(row["placement_rate_3mo"]),
                        placement_rate_6mo=float(row["placement_rate_6mo"]),
                        placement_rate_12mo=float(row["placement_rate_12mo"]),
                        median_salary=int(float(row["median_salary"])),
                        placement_cell_activity_index=float(row["placement_cell_activity_index"]),
                        recruiter_participation_trend=TrendType(row["recruiter_participation_trend"]),
                    )
                    db.add(institute)
                    loaded += 1
                except Exception as row_err:
                    print(f"Skipping row {row.get('id', '?')}: {row_err}")

        db.commit()
        print(f"✓ Seeded {loaded} institutes from CSV")
    except Exception as e:
        db.rollback()
        print(f"Could not seed institutes: {e}")
    finally:
        db.close()


def _seed_demo_users():
    from app.models.schemas import User, LenderOrganization, LenderOfficerProfile, Student, StudentUserLink
    from app.auth.jwt import get_password_hash

    demo_users = [
        {"email": "admin@placementrisk.ai", "full_name": "Admin User", "role": "admin", "password": "demo123"},
        {"email": "riskhead@placementrisk.ai", "full_name": "Risk Head", "role": "risk_head", "password": "demo123"},
        {"email": "officer@placementrisk.ai", "full_name": "Loan Officer", "role": "loan_officer", "password": "demo123"},
    ]

    db = SessionLocal()
    try:
        lender = db.query(LenderOrganization).filter(LenderOrganization.code == "PRISK-NBFC").first()
        if not lender:
            lender = LenderOrganization(name="PlacementRisk Demo NBFC", code="PRISK-NBFC")
            db.add(lender)
            db.flush()

        for u in demo_users:
            exists = db.query(User).filter(User.email == u["email"]).first()
            if not exists:
                db.add(User(
                    email=u["email"],
                    full_name=u["full_name"],
                    role=u["role"],
                    hashed_password=get_password_hash(u["password"]),
                    is_active=True,
                ))

        db.flush()

        for email in ["riskhead@placementrisk.ai", "officer@placementrisk.ai"]:
            usr = db.query(User).filter(User.email == email).first()
            if usr and not db.query(LenderOfficerProfile).filter(LenderOfficerProfile.user_id == usr.id).first():
                db.add(LenderOfficerProfile(
                    user_id=usr.id,
                    lender_org_id=lender.id,
                    employee_code=f"EMP-{str(usr.id)[:6]}",
                    designation="Risk Officer" if "officer" in email else "Risk Head",
                ))

        students = db.query(Student).limit(300).all()
        for idx, student in enumerate(students, start=1):
            if db.query(StudentUserLink).filter(StudentUserLink.student_id == student.id).first():
                continue
            student_email = f"student{idx:04d}@placementrisk.ai"
            student_user = db.query(User).filter(User.email == student_email).first()
            if not student_user:
                student_user = User(
                    email=student_email,
                    full_name=student.student_name,
                    role="student",
                    hashed_password=get_password_hash("demo123"),
                    is_active=True,
                )
                db.add(student_user)
                db.flush()
            db.add(StudentUserLink(student_id=student.id, user_id=student_user.id))

        db.commit()
        print("Demo users, officer profiles, and student portal links seeded")
    except Exception as e:
        db.rollback()
        print(f"Could not seed demo users: {e}")
    finally:
        db.close()
