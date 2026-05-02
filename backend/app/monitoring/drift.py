"""Data drift detection using Evidently AI"""
import pandas as pd
from datetime import datetime, timedelta, timezone
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset
from pathlib import Path

from app.config import get_settings

settings = get_settings()


def detect_drift():
    """
    Detect data drift in features and job market signals
    
    Returns:
        bool: True if drift detected, False otherwise
    """
    print("=" * 60)
    print("PlacementRisk AI - Drift Detection")
    print("=" * 60)
    
    try:
        # Load training data (reference)
        print("\nLoading reference data...")
        reference_data = pd.read_csv("/data/processed/training_features.csv")
        
        # Load current data (last 30 days)
        print("Loading current data...")
        current_data = pd.read_csv("/data/processed/current_features.csv")
        
        # Select numeric features for drift detection
        feature_cols = [
            "cgpa", "internship_count", "job_demand_index",
            "institute_placement_rate_6mo", "placement_momentum_score",
            "market_alignment_score", "repayment_buffer_score"
        ]
        
        reference_subset = reference_data[feature_cols]
        current_subset = current_data[feature_cols]
        
        # Create drift report
        print("\nGenerating drift report...")
        report = Report(metrics=[DataDriftPreset()])
        report.run(reference_data=reference_subset, current_data=current_subset)
        
        # Save report
        report_dir = Path("/data/reports/drift")
        report_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = report_dir / f"drift_report_{timestamp}.html"
        report.save_html(str(report_path))
        
        print(f"\n✓ Drift report saved to: {report_path}")
        
        # Check for significant drift
        drift_results = report.as_dict()
        drift_detected = drift_results.get("metrics", [{}])[0].get("result", {}).get("dataset_drift", False)
        
        # Log to MLflow
        import mlflow
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        
        with mlflow.start_run(run_name=f"drift_detection_{timestamp}"):
            mlflow.log_artifact(str(report_path))
            mlflow.log_metric("drift_detected", 1 if drift_detected else 0)
        
        print("\n" + "=" * 60)
        print(f"✓ Drift detection complete! Drift detected: {drift_detected}")
        print("=" * 60)
        
        return drift_detected
        
    except FileNotFoundError as e:
        print(f"\n⚠ Warning: Required data files not found: {e}")
        print("Skipping drift detection. Run training first to generate reference data.")
        return False
    except Exception as e:
        print(f"\n✗ Error during drift detection: {e}")
        raise


if __name__ == "__main__":
    detect_drift()
