"""Synthetic data generation using CTGAN for PlacementRisk AI"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import uuid
from sqlalchemy.orm import Session

from app.database import SessionLocal, init_db
from app.models.schemas import (
    Institute, Student, PlacementOutcome, JobMarketSignal,
    CourseType, EmployerType, NIRFRankBand, TrendType, OutcomeLabel,
    RiskScore, EarlyWarningAlert, ActionLog, StudentCase, CaseEvent,
    StudentMessage, ApprovalDecision, StudentUserLink, User
)

# Set random seed for reproducibility
SEED = 42
np.random.seed(SEED)

TOP_INSTITUTES = [
    "IIT Bombay", "IIT Delhi", "IIT Madras", "IIT Kanpur", "IIT Kharagpur",
    "IIT Roorkee", "IIT Guwahati", "IIT Hyderabad", "IIT Indore", "IIT BHU",
    "IISc Bangalore", "BITS Pilani", "NIT Trichy", "NIT Surathkal", "NIT Warangal",
    "VIT Vellore", "SRM Institute of Science and Technology", "Manipal Institute of Technology",
    "IIIT Hyderabad", "IIIT Bangalore", "Delhi Technological University",
    "Jadavpur University", "College of Engineering Pune", "Anna University",
    "PSG College of Technology", "Amrita Vishwa Vidyapeetham", "Thapar Institute of Engineering and Technology",
    "Jamia Millia Islamia", "Aligarh Muslim University", "Savitribai Phule Pune University"
]

INSTITUTE_PREFIXES = [
    "National Institute of Technology", "Government Engineering College",
    "Institute of Management and Technology", "College of Engineering",
    "University School of Technology", "School of Business and Finance",
    "Institute of Health Sciences", "Institute of Legal Studies"
]

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Kabir",
    "Ananya", "Aadhya", "Diya", "Myra", "Sara", "Ira", "Riya", "Anika", "Navya", "Saanvi",
    "Rahul", "Rohan", "Karan", "Aman", "Akash", "Siddharth", "Nikhil", "Harsh", "Yash", "Varun",
    "Priya", "Neha", "Pooja", "Sneha", "Aisha", "Meera", "Kavya", "Nandini", "Ishita", "Ritika"
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Mehta", "Reddy", "Nair", "Iyer", "Patel", "Singh", "Kumar",
    "Joshi", "Agarwal", "Chopra", "Banerjee", "Mukherjee", "Das", "Mishra", "Yadav", "Chaudhary", "Jain",
    "Bansal", "Kulkarni", "Deshmukh", "Pillai", "Menon", "Saxena", "Tiwari", "Pandey", "Sinha", "Roy"
]


def generate_institutes(n_institutes=3000) -> pd.DataFrame:
    """Generate synthetic institute data"""
    print(f"Generating {n_institutes} institutes...")
    
    cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", 
              "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Bhopal", "Indore", "Nagpur"]
    
    state_map = {
        "Mumbai": "Maharashtra", "Delhi": "Delhi", "Bangalore": "Karnataka",
        "Hyderabad": "Telangana", "Chennai": "Tamil Nadu", "Pune": "Maharashtra",
        "Kolkata": "West Bengal", "Ahmedabad": "Gujarat", "Jaipur": "Rajasthan",
        "Lucknow": "Uttar Pradesh", "Chandigarh": "Punjab", "Bhopal": "Madhya Pradesh",
        "Indore": "Madhya Pradesh", "Nagpur": "Maharashtra"
    }
    
    region_map = {
        "Maharashtra": "West", "Delhi": "North", "Karnataka": "South",
        "Telangana": "South", "Tamil Nadu": "South", "West Bengal": "East",
        "Gujarat": "West", "Rajasthan": "North", "Uttar Pradesh": "North",
        "Punjab": "North", "Madhya Pradesh": "Central"
    }
    
    rank_bands = [b.value for b in [
        NIRFRankBand.TOP10, NIRFRankBand.RANK_11_50, NIRFRankBand.RANK_51_100,
        NIRFRankBand.RANK_101_200, NIRFRankBand.RANK_201_500, NIRFRankBand.UNRANKED
    ]]
    rank_weights = [0.003, 0.013, 0.017, 0.033, 0.100, 0.834]  # NIRF-realistic distribution
    
    institutes = []
    for i in range(n_institutes):
        city = np.random.choice(cities)
        state = state_map[city]
        region = region_map[state]
        rank_band = np.random.choice(rank_bands, p=rank_weights)
        
        # Better institutes have higher placement rates
        if rank_band == NIRFRankBand.TOP10.value:
            base_placement = 0.95
            median_salary = np.random.randint(1200000, 2500000)
        elif rank_band == NIRFRankBand.RANK_11_50.value:
            base_placement = 0.85
            median_salary = np.random.randint(800000, 1500000)
        elif rank_band == NIRFRankBand.RANK_51_100.value:
            base_placement = 0.75
            median_salary = np.random.randint(600000, 1000000)
        elif rank_band == NIRFRankBand.RANK_101_200.value:
            base_placement = 0.65
            median_salary = np.random.randint(450000, 750000)
        elif rank_band == NIRFRankBand.RANK_201_500.value:
            base_placement = 0.50
            median_salary = np.random.randint(350000, 600000)
        else:
            base_placement = 0.35
            median_salary = np.random.randint(250000, 450000)
        
        if i < len(TOP_INSTITUTES):
            institute_name = TOP_INSTITUTES[i]
        else:
            prefix = np.random.choice(INSTITUTE_PREFIXES)
            institute_name = f"{prefix}, {city} Campus {i - len(TOP_INSTITUTES) + 1}"

        institutes.append({
            "id": str(uuid.uuid4()),
            "institute_name": institute_name,
            "nirf_rank_band": rank_band,
            "city": city,
            "state": state,
            "region": region,
            "placement_rate_3mo": min(1.0, base_placement * np.random.uniform(0.4, 0.6)),
            "placement_rate_6mo": min(1.0, base_placement * np.random.uniform(0.7, 0.9)),
            "placement_rate_12mo": min(1.0, base_placement * np.random.uniform(0.9, 1.0)),
            "median_salary": median_salary,
            "placement_cell_activity_index": np.random.uniform(0.3, 1.0),
            "recruiter_participation_trend": np.random.choice([t.value for t in TrendType])
        })
    
    return pd.DataFrame(institutes)


def generate_students(institutes_df: pd.DataFrame, n_students=50000) -> pd.DataFrame:
    """Generate synthetic student data"""
    print(f"Generating {n_students} students...")
    
    students = []
    institute_ids = institutes_df["id"].tolist()
    
    for i in range(n_students):
        institute_id = np.random.choice(institute_ids)
        institute = institutes_df[institutes_df["id"] == institute_id].iloc[0]
        
        course_type = np.random.choice([c.value for c in CourseType])
        cgpa = np.random.uniform(4.0, 10.0)
        
        # Better students have more internships
        if cgpa >= 8.5:
            internship_count = np.random.randint(2, 5)
            employer_type = np.random.choice([EmployerType.FAANG.value, EmployerType.MNC.value, 
                                             EmployerType.STARTUP.value], p=[0.2, 0.5, 0.3])
        elif cgpa >= 7.0:
            internship_count = np.random.randint(1, 3)
            employer_type = np.random.choice([EmployerType.MNC.value, EmployerType.STARTUP.value, 
                                             EmployerType.SME.value], p=[0.4, 0.4, 0.2])
        else:
            internship_count = np.random.randint(0, 2)
            employer_type = np.random.choice([EmployerType.STARTUP.value, EmployerType.SME.value, 
                                             EmployerType.NONE.value], p=[0.3, 0.3, 0.4])
        
        loan_amount = np.random.randint(200000, 2500000)
        emi_monthly = loan_amount // 60  # 5-year loan
        
        first_name = np.random.choice(FIRST_NAMES)
        last_name = np.random.choice(LAST_NAMES)

        students.append({
            "id": str(uuid.uuid4()),
            "student_name": f"{first_name} {last_name}",
            "course_type": course_type,
            "cgpa": round(cgpa, 2),
            "academic_consistency_score": np.random.uniform(0.5, 1.0),
            "internship_count": internship_count,
            "internship_duration_months": internship_count * np.random.randint(2, 6) if internship_count > 0 else 0,
            "employer_type": employer_type,
            "skill_certifications": np.random.randint(0, 9),
            "gap_years": np.random.choice([0, 0, 0, 0, 1, 2], p=[0.7, 0.1, 0.1, 0.05, 0.03, 0.02]),
            "institute_id": institute_id,
            "loan_amount": loan_amount,
            "emi_monthly": emi_monthly,
            "disbursal_date": datetime.now() - timedelta(days=np.random.randint(30, 730)),
            "lender_id": str(uuid.uuid4())  # Random lender for demo
        })
    
    return pd.DataFrame(students)


def generate_placement_outcomes(students_df: pd.DataFrame, institutes_df: pd.DataFrame) -> pd.DataFrame:
    """Generate synthetic placement outcomes (ground truth)"""
    print(f"Generating placement outcomes for {len(students_df)} students...")
    
    outcomes = []
    
    for _, student in students_df.iterrows():
        institute = institutes_df[institutes_df["id"] == student["institute_id"]].iloc[0]
        
        # Probability of placement based on student quality and institute
        placement_prob = (
            0.4 * (student["cgpa"] / 10.0) +
            0.3 * institute["placement_rate_6mo"] +
            0.2 * (student["internship_count"] / 4.0) +
            0.1 * student["academic_consistency_score"]
        )
        
        is_placed = np.random.random() < placement_prob
        
        if is_placed:
            # Placement timeline based on quality
            if placement_prob > 0.75:
                months = np.random.randint(1, 4)  # Early placement
                outcome_label = OutcomeLabel.PLACED_EARLY.value
            else:
                months = np.random.randint(4, 13)  # Late placement
                outcome_label = OutcomeLabel.PLACED_LATE.value
            
            # Salary based on institute and student quality
            base_salary = institute["median_salary"]
            salary_multiplier = (student["cgpa"] / 10.0) * np.random.uniform(0.8, 1.3)
            actual_salary = int(base_salary * salary_multiplier)
            
            # EMI default probability
            repayment_capacity = actual_salary / (student["emi_monthly"] * 12)
            first_emi_defaulted = repayment_capacity < 1.5 and np.random.random() < 0.3
        else:
            months = None
            actual_salary = None
            outcome_label = OutcomeLabel.NOT_PLACED.value
            first_emi_defaulted = np.random.random() < 0.6  # High default rate for non-placed
        
        outcomes.append({
            "id": str(uuid.uuid4()),
            "student_id": student["id"],
            "actual_placement_months": months,
            "actual_salary": actual_salary,
            "first_emi_defaulted": first_emi_defaulted,
            "outcome_label": outcome_label,
            "placement_date": student["disbursal_date"] + timedelta(days=months*30) if months else None
        })
    
    return pd.DataFrame(outcomes)


def generate_job_market_signals() -> pd.DataFrame:
    """Generate synthetic job market signals"""
    print("Generating job market signals...")
    
    sectors = ["IT", "BFSI", "Manufacturing", "Healthcare", "Consulting"]
    regions = ["North", "South", "East", "West", "Central"]
    
    signals = []
    
    # Generate monthly snapshots for last 12 months
    for month_offset in range(12):
        snapshot_date = datetime.now() - timedelta(days=month_offset*30)
        
        for sector in sectors:
            for region in regions:
                # IT has higher demand
                if sector == "IT":
                    job_demand = np.random.uniform(0.7, 1.0)
                    time_to_hire = np.random.randint(20, 45)
                else:
                    job_demand = np.random.uniform(0.4, 0.8)
                    time_to_hire = np.random.randint(30, 60)
                
                signals.append({
                    "id": str(uuid.uuid4()),
                    "snapshot_date": snapshot_date,
                    "sector": sector,
                    "region": region,
                    "job_demand_index": job_demand,
                    "avg_time_to_hire_days": time_to_hire,
                    "hiring_trend": np.random.choice(["Expanding", "Stable", "Contracting"], p=[0.4, 0.4, 0.2]),
                    "job_postings_count": np.random.randint(500, 5000)
                })
    
    return pd.DataFrame(signals)


def load_to_database(institutes_df, students_df, outcomes_df, signals_df):
    """Load synthetic data into PostgreSQL"""
    print("Loading data into database...")
    
    db = SessionLocal()
    try:
        print("Resetting synthetic domain tables...")
        db.query(StudentMessage).delete(synchronize_session=False)
        db.query(ApprovalDecision).delete(synchronize_session=False)
        db.query(CaseEvent).delete(synchronize_session=False)
        db.query(StudentCase).delete(synchronize_session=False)
        db.query(ActionLog).delete(synchronize_session=False)
        db.query(EarlyWarningAlert).delete(synchronize_session=False)
        db.query(RiskScore).delete(synchronize_session=False)
        db.query(PlacementOutcome).delete(synchronize_session=False)
        db.query(StudentUserLink).delete(synchronize_session=False)
        db.query(Student).delete(synchronize_session=False)
        db.query(Institute).delete(synchronize_session=False)
        db.query(JobMarketSignal).delete(synchronize_session=False)
        db.query(User).filter(User.role == "student").delete(synchronize_session=False)
        db.commit()

        # Load institutes
        print("Loading institutes...")
        for _, row in institutes_df.iterrows():
            institute = Institute(**row.to_dict())
            db.add(institute)
        db.commit()
        
        # Load students
        print("Loading students...")
        for _, row in students_df.iterrows():
            student_dict = row.to_dict()
            student = Student(**student_dict)
            db.add(student)
        db.commit()
        
        # Load placement outcomes
        print("Loading placement outcomes...")
        for _, row in outcomes_df.iterrows():
            row_dict = row.to_dict()
            # Convert pandas NaN/NaT to None for nullable DB fields.
            for k in ["actual_placement_months", "actual_salary", "placement_date"]:
                if pd.isna(row_dict.get(k)):
                    row_dict[k] = None
            outcome = PlacementOutcome(**row_dict)
            db.add(outcome)
        db.commit()
        
        # Load job market signals
        print("Loading job market signals...")
        for _, row in signals_df.iterrows():
            signal = JobMarketSignal(**row.to_dict())
            db.add(signal)
        db.commit()
        
        print("✓ Data loaded successfully!")
        
    except Exception as e:
        print(f"Error loading data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_demo_users():
    """Create demo users for testing"""
    print("Creating demo users...")
    
    from app.auth.jwt import get_password_hash
    from app.models.schemas import User
    
    db = SessionLocal()
    try:
        users = [
            {
                "email": "admin@placementrisk.ai",
                "hashed_password": get_password_hash("demo123"),
                "full_name": "Admin User",
                "role": "admin"
            },
            {
                "email": "riskhead@placementrisk.ai",
                "hashed_password": get_password_hash("demo123"),
                "full_name": "Risk Head",
                "role": "risk_head"
            },
            {
                "email": "officer@placementrisk.ai",
                "hashed_password": get_password_hash("demo123"),
                "full_name": "Loan Officer",
                "role": "loan_officer"
            }
        ]
        
        for user_data in users:
            user = User(**user_data)
            db.add(user)
        
        db.commit()
        print("✓ Demo users created!")
        
    except Exception as e:
        print(f"Error creating users: {e}")
        db.rollback()
    finally:
        db.close()


def main():
    """Main function to generate and load all synthetic data"""
    print("=" * 60)
    print("PlacementRisk AI - Synthetic Data Generation")
    print("=" * 60)
    
    # Initialize database
    print("\nInitializing database...")
    init_db()
    
    # Generate data
    institutes_df = generate_institutes(n_institutes=3000)
    students_df = generate_students(institutes_df, n_students=50000)
    outcomes_df = generate_placement_outcomes(students_df, institutes_df)
    signals_df = generate_job_market_signals()
    
    # Save to CSV
    print("\nSaving to CSV files...")
    institutes_df.to_csv("/data/synthetic/institutes.csv", index=False)
    students_df.to_csv("/data/synthetic/students.csv", index=False)
    outcomes_df.to_csv("/data/synthetic/placement_outcomes.csv", index=False)
    signals_df.to_csv("/data/synthetic/job_market_signals.csv", index=False)
    print("✓ CSV files saved!")
    
    # Load to database
    load_to_database(institutes_df, students_df, outcomes_df, signals_df)
    
    # Create demo users
    create_demo_users()
    
    print("\n" + "=" * 60)
    print("✓ Synthetic data generation complete!")
    print("=" * 60)
    print(f"\nGenerated:")
    print(f"  - {len(institutes_df)} institutes")
    print(f"  - {len(students_df)} students")
    print(f"  - {len(outcomes_df)} placement outcomes")
    print(f"  - {len(signals_df)} job market signals")
    print(f"\nDemo users:")
    print(f"  - admin@placementrisk.ai / demo123 (admin)")
    print(f"  - riskhead@placementrisk.ai / demo123 (risk_head)")
    print(f"  - officer@placementrisk.ai / demo123 (loan_officer)")


if __name__ == "__main__":
    main()
