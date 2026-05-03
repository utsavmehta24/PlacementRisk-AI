from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.schemas import Student, Institute, JobMarketSignal, RiskScore
from app.ml.predict import get_predictor
from app.ml.shap_explainer import generate_simple_explanation


COURSE_TO_SECTOR = {
    "Engineering": "IT",
    "MBA": "BFSI",
    "Nursing": "Healthcare",
    "Commerce": "BFSI",
    "Law": "Consulting",
}


def backfill_missing_risk_scores(db: Session, batch_size: int = 5000):
    scored_ids = {row[0] for row in db.query(RiskScore.student_id).distinct().all()}
    students = db.query(Student).all()
    predictor = get_predictor()
    created = 0

    for student in students:
        if student.id in scored_ids:
            continue

        institute = db.query(Institute).filter(Institute.id == student.institute_id).first()
        sector = COURSE_TO_SECTOR.get(student.course_type.value, "IT")
        signal = db.query(JobMarketSignal).filter(
            JobMarketSignal.sector == sector,
            JobMarketSignal.region == institute.region,
        ).order_by(JobMarketSignal.snapshot_date.desc()).first()

        job = {
            "job_demand_index": signal.job_demand_index if signal else 0.5,
            "avg_time_to_hire_days": signal.avg_time_to_hire_days if signal else 45,
            "hiring_trend": signal.hiring_trend if signal else "Stable",
        }

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

        pred = predictor.predict(student_data, institute_data, job)
        explanation = generate_simple_explanation({
            "internship_count": student.internship_count,
            "job_demand_index": job["job_demand_index"],
            "cgpa": student.cgpa,
            "institute_placement_rate_6mo": institute.placement_rate_6mo,
        }) + f" => Risk: {pred['risk_level']}"

        db.add(RiskScore(
            student_id=student.id,
            risk_level=pred["risk_level"],
            risk_score=pred["risk_score"],
            placement_prob_3mo=pred["placement_prob_3mo"],
            placement_prob_6mo=pred["placement_prob_6mo"],
            placement_prob_12mo=pred["placement_prob_12mo"],
            salary_p10=pred["salary_p10"],
            salary_p50=pred["salary_p50"],
            salary_p90=pred["salary_p90"],
            placement_momentum_score=pred["placement_momentum_score"],
            market_alignment_score=pred["market_alignment_score"],
            repayment_buffer_score=pred["repayment_buffer_score"],
            shap_explanation=explanation,
            model_version=pred["model_version"],
            scored_at=datetime.now(timezone.utc),
        ))
        created += 1

        if created % batch_size == 0:
            db.commit()

    db.commit()
    return created
