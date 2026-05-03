"""Feature engineering for PlacementRisk AI"""
import pandas as pd
import numpy as np
from typing import Dict, Any
from datetime import datetime


def normalize(value: float, min_val: float, max_val: float) -> float:
    """Normalize a value to 0-1 range"""
    if max_val == min_val:
        return 0.5
    return (value - min_val) / (max_val - min_val)


def inverse_normalize(value: float, min_val: float, max_val: float) -> float:
    """Inverse normalize (higher value = lower score)"""
    return 1.0 - normalize(value, min_val, max_val)


def compute_placement_momentum_score(
    institute_placement_rate_6mo: float,
    cgpa: float,
    internship_count: int,
    academic_consistency_score: float
) -> float:
    """
    Compute Placement Momentum Score (0-100)
    
    Formula:
    PMS = 0.4 * institute_placement_rate_6mo
        + 0.3 * normalize(cgpa)
        + 0.2 * normalize(internship_count)
        + 0.1 * academic_consistency_score
    """
    cgpa_normalized = normalize(cgpa, 4.0, 10.0)
    internship_normalized = normalize(internship_count, 0, 4)
    
    pms = (
        0.4 * institute_placement_rate_6mo +
        0.3 * cgpa_normalized +
        0.2 * internship_normalized +
        0.1 * academic_consistency_score
    )
    
    return round(pms * 100, 2)


def compute_market_alignment_score(
    job_demand_index: float,
    avg_time_to_hire: int,
    hiring_trend: str
) -> float:
    """
    Compute Market Alignment Score (0-100)
    
    Formula:
    MAS = 0.5 * job_demand_index
        + 0.3 * inverse_normalize(avg_time_to_hire)
        + 0.2 * hiring_trend_score
    """
    # Hiring trend score
    trend_scores = {
        "Expanding": 1.0,
        "Stable": 0.5,
        "Contracting": 0.0
    }
    hiring_trend_score = trend_scores.get(hiring_trend, 0.5)
    
    # Inverse normalize time to hire (lower is better)
    time_to_hire_normalized = inverse_normalize(avg_time_to_hire, 20, 90)
    
    mas = (
        0.5 * job_demand_index +
        0.3 * time_to_hire_normalized +
        0.2 * hiring_trend_score
    )
    
    return round(mas * 100, 2)


def compute_repayment_buffer_score(
    expected_salary: float,
    emi_monthly: float
) -> float:
    """
    Compute Repayment Buffer Score (0-100)
    
    Formula:
    RBS = min((expected_salary / (emi_monthly * 3)), 1) * 100
    
    A score of 100 means salary is 3x the EMI (comfortable repayment)
    """
    if emi_monthly == 0:
        return 100.0
    
    monthly_salary = expected_salary / 12
    buffer_ratio = monthly_salary / (emi_monthly * 3)
    rbs = min(buffer_ratio, 1.0) * 100
    
    return round(rbs, 2)


def engineer_features(student_data: Dict[str, Any], institute_data: Dict[str, Any], 
                     job_market_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Engineer all features for a student
    
    Args:
        student_data: Student profile data
        institute_data: Institute profile data
        job_market_data: Job market signals for student's sector/region
    
    Returns:
        Dictionary with all engineered features
    """
    # Extract base features
    cgpa = student_data.get("cgpa", 7.0)
    internship_count = student_data.get("internship_count", 0)
    academic_consistency = student_data.get("academic_consistency_score", 0.7)
    emi_monthly = student_data.get("emi_monthly", 10000)
    
    institute_placement_6mo = institute_data.get("placement_rate_6mo", 0.5)
    median_salary = institute_data.get("median_salary", 500000)
    
    job_demand = job_market_data.get("job_demand_index", 0.5)
    time_to_hire = job_market_data.get("avg_time_to_hire_days", 45)
    hiring_trend = job_market_data.get("hiring_trend", "Stable")
    
    # Compute derived scores
    placement_momentum = compute_placement_momentum_score(
        institute_placement_6mo, cgpa, internship_count, academic_consistency
    )
    
    market_alignment = compute_market_alignment_score(
        job_demand, time_to_hire, hiring_trend
    )
    
    # Expected salary based on institute median and student quality
    expected_salary = median_salary * (cgpa / 10.0)
    
    repayment_buffer = compute_repayment_buffer_score(
        expected_salary, emi_monthly
    )
    
    # Additional derived features
    disbursal_date = student_data.get("disbursal_date", datetime.now())
    if isinstance(disbursal_date, str):
        try:
            disbursal_date = datetime.fromisoformat(disbursal_date.replace("Z", "+00:00"))
        except ValueError:
            disbursal_date = datetime.now()
    if pd.isna(disbursal_date):
        disbursal_date = datetime.now()
    days_since_disbursal = (datetime.now() - disbursal_date).days
    months_since_disbursal = days_since_disbursal / 30
    
    # Internship quality score
    employer_type_scores = {
        "FAANG": 1.0,
        "MNC": 0.8,
        "Startup": 0.6,
        "SME": 0.4,
        "None": 0.0
    }
    internship_quality = employer_type_scores.get(student_data.get("employer_type", "None"), 0.0)
    
    # NIRF rank score (higher is better)
    nirf_scores = {
        "Top10": 1.0,
        "11-50": 0.85,
        "51-100": 0.70,
        "101-200": 0.55,
        "201-500": 0.40,
        "Unranked": 0.25
    }
    nirf_score = nirf_scores.get(institute_data.get("nirf_rank_band", "Unranked"), 0.25)
    
    return {
        # Composite scores
        "placement_momentum_score": placement_momentum,
        "market_alignment_score": market_alignment,
        "repayment_buffer_score": repayment_buffer,
        
        # Derived features
        "expected_salary": expected_salary,
        "months_since_disbursal": months_since_disbursal,
        "internship_quality_score": internship_quality,
        "nirf_score": nirf_score,
        
        # Raw features (for model input)
        "cgpa": cgpa,
        "internship_count": internship_count,
        "academic_consistency_score": academic_consistency,
        "skill_certifications": student_data.get("skill_certifications", 0),
        "gap_years": student_data.get("gap_years", 0),
        "internship_duration_months": student_data.get("internship_duration_months", 0),
        "institute_placement_rate_3mo": institute_data.get("placement_rate_3mo", 0.3),
        "institute_placement_rate_6mo": institute_placement_6mo,
        "institute_placement_rate_12mo": institute_data.get("placement_rate_12mo", 0.7),
        "institute_median_salary": median_salary,
        "placement_cell_activity": institute_data.get("placement_cell_activity_index", 0.5),
        "job_demand_index": job_demand,
        "avg_time_to_hire_days": time_to_hire,
        "loan_amount": student_data.get("loan_amount", 500000),
        "emi_monthly": emi_monthly,
        
        # Categorical features (encoded)
        "course_type": student_data.get("course_type", "Engineering"),
        "employer_type": student_data.get("employer_type", "None"),
        "region": institute_data.get("region", "North"),
        "hiring_trend": hiring_trend
    }


def prepare_training_data(students_df: pd.DataFrame, institutes_df: pd.DataFrame,
                         outcomes_df: pd.DataFrame, job_signals_df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare training dataset with all engineered features
    
    Args:
        students_df: Student profiles DataFrame
        institutes_df: Institute profiles DataFrame
        outcomes_df: Placement outcomes DataFrame
        job_signals_df: Job market signals DataFrame
    
    Returns:
        DataFrame with all features and labels
    """
    print("Engineering features for training data...")
    
    # Merge dataframes
    data = students_df.merge(institutes_df, left_on="institute_id", right_on="id", suffixes=("", "_inst"))
    data = data.merge(outcomes_df, left_on="id", right_on="student_id", suffixes=("", "_outcome"))
    
    # Get latest job market signals for each sector/region
    latest_signals = job_signals_df.sort_values("snapshot_date").groupby(["sector", "region"]).last().reset_index()
    
    # Map course type to sector
    course_to_sector = {
        "Engineering": "IT",
        "MBA": "BFSI",
        "Nursing": "Healthcare",
        "Commerce": "BFSI",
        "Law": "Consulting"
    }
    
    engineered_features = []
    
    for _, row in data.iterrows():
        sector = course_to_sector.get(row["course_type"], "IT")
        region = row["region"]
        
        # Get job market data
        job_data = latest_signals[
            (latest_signals["sector"] == sector) & 
            (latest_signals["region"] == region)
        ]
        
        if len(job_data) > 0:
            job_market_data = job_data.iloc[0].to_dict()
        else:
            # Default values if no data
            job_market_data = {
                "job_demand_index": 0.5,
                "avg_time_to_hire_days": 45,
                "hiring_trend": "Stable"
            }
        
        # Engineer features
        features = engineer_features(
            row.to_dict(),
            row.to_dict(),
            job_market_data
        )
        
        # Add labels
        features["student_id"] = row["id"]
        features["placed_3mo"] = 1 if (row["actual_placement_months"] and row["actual_placement_months"] <= 3) else 0
        features["placed_6mo"] = 1 if (row["actual_placement_months"] and row["actual_placement_months"] <= 6) else 0
        features["placed_12mo"] = 1 if (row["actual_placement_months"] and row["actual_placement_months"] <= 12) else 0
        features["actual_salary"] = row["actual_salary"] if pd.notna(row["actual_salary"]) else 0
        features["first_emi_defaulted"] = row["first_emi_defaulted"]
        
        engineered_features.append(features)
    
    result_df = pd.DataFrame(engineered_features)
    print(f"✓ Engineered {len(result_df)} feature rows with {len(result_df.columns)} columns")
    
    return result_df


def refresh_feature_store():
    """
    Refresh feature store with latest data
    
    This function updates the feature store with the most recent
    student, institute, and job market data.
    """
    print("Refreshing feature store...")
    
    try:
        from pathlib import Path
        
        # Use synthetic data directory (where actual data lives)
        data_dir = Path("/data/synthetic")
        if not data_dir.exists():
            print("⚠ Warning: Data directory not found. Skipping feature refresh.")
            return
        
        # Load latest data
        students_file = data_dir / "students.csv"
        institutes_file = data_dir / "institutes.csv"
        job_signals_file = data_dir / "job_market_signals.csv"
        
        if not all([students_file.exists(), institutes_file.exists(), job_signals_file.exists()]):
            print("⚠ Warning: Required data files not found. Skipping feature refresh.")
            return
        
        students_df = pd.read_csv(students_file)
        institutes_df = pd.read_csv(institutes_file)
        job_signals_df = pd.read_csv(job_signals_file)
        
        print(f"Loaded {len(students_df)} students, {len(institutes_df)} institutes, {len(job_signals_df)} job signals")
        
        # Engineer features for current students
        current_features = []
        
        for _, student in students_df.iterrows():
            # Get institute data
            institute = institutes_df[institutes_df["id"] == student["institute_id"]]
            if len(institute) == 0:
                continue
            
            institute_data = institute.iloc[0].to_dict()
            
            # Get job market data
            course_to_sector = {
                "Engineering": "IT",
                "MBA": "BFSI",
                "Nursing": "Healthcare",
                "Commerce": "BFSI",
                "Law": "Consulting"
            }
            
            sector = course_to_sector.get(student["course_type"], "IT")
            region = institute_data["region"]
            
            job_data = job_signals_df[
                (job_signals_df["sector"] == sector) & 
                (job_signals_df["region"] == region)
            ].sort_values("snapshot_date").tail(1)
            
            if len(job_data) > 0:
                job_market_data = job_data.iloc[0].to_dict()
            else:
                job_market_data = {
                    "job_demand_index": 0.5,
                    "avg_time_to_hire_days": 45,
                    "hiring_trend": "Stable"
                }
            
            # Engineer features
            features = engineer_features(
                student.to_dict(),
                institute_data,
                job_market_data
            )
            features["student_id"] = student["id"]
            current_features.append(features)
        
        # Save to feature store (create processed dir if needed)
        output_dir = Path("/data/processed")
        output_dir.mkdir(parents=True, exist_ok=True)
        features_df = pd.DataFrame(current_features)
        output_file = output_dir / "current_features.csv"
        features_df.to_csv(output_file, index=False)
        
        print(f"✓ Feature store refreshed with {len(features_df)} records")
        print(f"✓ Saved to: {output_file}")
        
    except Exception as e:
        print(f"✗ Error refreshing feature store: {e}")
        raise
