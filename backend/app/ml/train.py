"""Model training script for PlacementRisk AI"""
import pandas as pd
import numpy as np
import pickle
import json
from pathlib import Path
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score, mean_absolute_error, classification_report
from xgboost import XGBClassifier
from lightgbm import LGBMRegressor
import mlflow
import mlflow.sklearn

from app.config import get_settings
from app.features.engineering import prepare_training_data

settings = get_settings()
MODEL_SEED = settings.model_seed


def encode_categorical_features(df: pd.DataFrame) -> tuple:
    """Encode categorical features"""
    encoders = {}
    df_encoded = df.copy()
    
    categorical_cols = ["course_type", "employer_type", "region", "hiring_trend"]
    
    for col in categorical_cols:
        if col in df.columns:
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df[col].astype(str))
            encoders[col] = le
    
    return df_encoded, encoders


def train_placement_classifier(X_train, y_train, X_test, y_test, window="6mo"):
    """
    Train XGBoost placement classifier with calibration
    
    Args:
        X_train, y_train: Training data
        X_test, y_test: Test data
        window: Placement window (3mo, 6mo, 12mo)
    
    Returns:
        Trained calibrated model
    """
    print(f"\nTraining placement classifier for {window} window...")
    
    with mlflow.start_run(run_name=f"placement_classifier_{window}"):
        # Log parameters
        mlflow.log_param("window", window)
        mlflow.log_param("model_type", "XGBoost")
        mlflow.log_param("seed", MODEL_SEED)
        
        # Train XGBoost
        xgb = XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=MODEL_SEED,
            eval_metric='auc'
        )
        
        # Calibrate probabilities
        model = CalibratedClassifierCV(xgb, cv=5, method='isotonic')
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        y_pred = model.predict(X_test)
        
        auc = roc_auc_score(y_test, y_pred_proba)
        
        print(f"  AUC: {auc:.4f}")
        print(f"  Classification Report:")
        print(classification_report(y_test, y_pred))
        
        # Log metrics
        mlflow.log_metric("auc", auc)
        mlflow.log_metric("auc_target", settings.placement_auc_target)
        mlflow.log_metric("meets_target", 1 if auc >= settings.placement_auc_target else 0)
        
        # Log model
        mlflow.sklearn.log_model(model, f"placement_model_{window}")
        
        return model, auc


def train_salary_estimator(X_train, y_train, X_test, y_test):
    """
    Train LightGBM quantile regression for salary estimation
    
    Returns:
        Dictionary of models for P10, P50, P90
    """
    print("\nTraining salary estimators (P10, P50, P90)...")
    
    models = {}
    
    # Filter to only placed students
    placed_mask_train = y_train > 0
    placed_mask_test = y_test > 0
    
    X_train_placed = X_train[placed_mask_train]
    y_train_placed = y_train[placed_mask_train]
    X_test_placed = X_test[placed_mask_test]
    y_test_placed = y_test[placed_mask_test]
    
    with mlflow.start_run(run_name="salary_estimator"):
        mlflow.log_param("model_type", "LightGBM_Quantile")
        mlflow.log_param("seed", MODEL_SEED)
        
        for quantile_name, alpha in [("p10", 0.1), ("p50", 0.5), ("p90", 0.9)]:
            print(f"  Training {quantile_name} (alpha={alpha})...")
            
            model = LGBMRegressor(
                objective='quantile',
                alpha=alpha,
                n_estimators=200,
                max_depth=6,
                learning_rate=0.05,
                random_state=MODEL_SEED
            )
            
            model.fit(X_train_placed, y_train_placed)
            
            # Evaluate
            y_pred = model.predict(X_test_placed)
            mae = mean_absolute_error(y_test_placed, y_pred)
            
            print(f"    MAE: ₹{mae:,.0f}")
            
            mlflow.log_metric(f"mae_{quantile_name}", mae)
            mlflow.sklearn.log_model(model, f"salary_model_{quantile_name}")
            
            models[quantile_name] = model
        
        # Overall MAE for P50
        overall_mae = mean_absolute_error(y_test_placed, models["p50"].predict(X_test_placed))
        mlflow.log_metric("mae_overall", overall_mae)
        mlflow.log_metric("mae_target", settings.salary_mae_target)
        mlflow.log_metric("meets_target", 1 if overall_mae <= settings.salary_mae_target else 0)
    
    return models


def save_models(placement_models, salary_models, encoders, feature_names):
    """Save trained models and artifacts"""
    model_dir = Path(settings.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    version_dir = model_dir / f"v_{timestamp}"
    version_dir.mkdir(exist_ok=True)
    
    print(f"\nSaving models to {version_dir}...")
    
    # Save placement models
    for window, model in placement_models.items():
        with open(version_dir / f"placement_{window}.pkl", "wb") as f:
            pickle.dump(model, f)
    
    # Save salary models
    for quantile, model in salary_models.items():
        with open(version_dir / f"salary_{quantile}.pkl", "wb") as f:
            pickle.dump(model, f)
    
    # Save encoders
    with open(version_dir / "encoders.pkl", "wb") as f:
        pickle.dump(encoders, f)
    
    # Save feature names
    with open(version_dir / "feature_names.json", "w") as f:
        json.dump(feature_names, f)
    
    # Save metadata
    metadata = {
        "version": timestamp,
        "trained_at": datetime.now().isoformat(),
        "seed": MODEL_SEED,
        "feature_count": len(feature_names)
    }
    with open(version_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    # Create symlink to latest
    latest_link = model_dir / "latest"
    if latest_link.exists():
        if latest_link.is_symlink():
            latest_link.unlink()
        elif latest_link.is_dir():
            import shutil
            shutil.rmtree(latest_link)
        else:
            latest_link.unlink()
    latest_link.symlink_to(version_dir.name)
    
    print(f"✓ Models saved successfully!")
    return str(version_dir)


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("PlacementRisk AI - Model Training")
    print("=" * 60)
    
    # Set MLflow tracking URI — fall back to local file store if server unreachable
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    try:
        mlflow.set_experiment("placementrisk_training")
        print(f"✓ MLflow connected: {settings.mlflow_tracking_uri}")
    except Exception as e:
        print(f"⚠ MLflow server unreachable ({e.__class__.__name__}). Falling back to local ./mlruns")
        mlflow.set_tracking_uri("./mlruns")
        mlflow.set_experiment("placementrisk_training")
    
    # Load data
    print("\nLoading data...")
    students_df = pd.read_csv("/data/synthetic/students.csv")
    institutes_df = pd.read_csv("/data/synthetic/institutes.csv")
    outcomes_df = pd.read_csv("/data/synthetic/placement_outcomes.csv")
    job_signals_df = pd.read_csv("/data/synthetic/job_market_signals.csv")
    
    # Prepare training data
    data = prepare_training_data(students_df, institutes_df, outcomes_df, job_signals_df)
    
    # Encode categorical features
    data_encoded, encoders = encode_categorical_features(data)
    
    # Define feature columns
    feature_cols = [
        "cgpa", "internship_count", "academic_consistency_score", "skill_certifications",
        "gap_years", "internship_duration_months", "institute_placement_rate_3mo",
        "institute_placement_rate_6mo", "institute_placement_rate_12mo",
        "institute_median_salary", "placement_cell_activity", "job_demand_index",
        "avg_time_to_hire_days", "loan_amount", "emi_monthly", "placement_momentum_score",
        "market_alignment_score", "repayment_buffer_score", "expected_salary",
        "months_since_disbursal", "internship_quality_score", "nirf_score",
        "course_type", "employer_type", "region", "hiring_trend"
    ]
    
    X = data_encoded[feature_cols]
    
    # Split data
    X_train, X_test = train_test_split(X, test_size=0.2, random_state=MODEL_SEED)
    train_idx, test_idx = train_test_split(data_encoded.index, test_size=0.2, random_state=MODEL_SEED)
    
    # Train placement classifiers
    placement_models = {}
    for window in ["3mo", "6mo", "12mo"]:
        y = data_encoded[f"placed_{window}"]
        y_train = y.iloc[train_idx]
        y_test = y.iloc[test_idx]
        
        model, auc = train_placement_classifier(X_train, y_train, X_test, y_test, window)
        placement_models[window] = model
    
    # Train salary estimators
    y_salary = data_encoded["actual_salary"]
    y_salary_train = y_salary.iloc[train_idx]
    y_salary_test = y_salary.iloc[test_idx]
    
    salary_models = train_salary_estimator(X_train, y_salary_train, X_test, y_salary_test)
    
    # Save models
    model_path = save_models(placement_models, salary_models, encoders, feature_cols)
    
    print("\n" + "=" * 60)
    print("✓ Training complete!")
    print("=" * 60)
    print(f"Models saved to: {model_path}")
    print(f"MLflow UI: {settings.mlflow_tracking_uri}")


if __name__ == "__main__":
    main()
