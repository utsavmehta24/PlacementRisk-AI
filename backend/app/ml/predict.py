"""Prediction and risk scoring module"""
import pickle
import json
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple

from app.config import get_settings
from app.features.engineering import engineer_features

settings = get_settings()


class RiskPredictor:
    """Risk prediction engine"""
    
    def __init__(self, model_dir: str = None):
        """Initialize predictor with trained models"""
        if model_dir is None:
            model_dir = Path(settings.model_dir) / "latest"
        else:
            model_dir = Path(model_dir)
        
        self.model_dir = model_dir
        self.load_models()
    
    def load_models(self):
        """Load all trained models and artifacts"""
        print(f"Loading models from {self.model_dir}...")
        self.fallback_only = False
        
        try:
            # Load placement models
            self.placement_models = {}
            for window in ["3mo", "6mo", "12mo"]:
                with open(self.model_dir / f"placement_{window}.pkl", "rb") as f:
                    self.placement_models[window] = pickle.load(f)
            
            # Load salary models
            self.salary_models = {}
            for quantile in ["p10", "p50", "p90"]:
                with open(self.model_dir / f"salary_{quantile}.pkl", "rb") as f:
                    self.salary_models[quantile] = pickle.load(f)
            
            # Load encoders
            with open(self.model_dir / "encoders.pkl", "rb") as f:
                self.encoders = pickle.load(f)
            
            # Load feature names
            with open(self.model_dir / "feature_names.json", "r") as f:
                self.feature_names = json.load(f)
            
            # Load metadata
            with open(self.model_dir / "metadata.json", "r") as f:
                self.metadata = json.load(f)
            
            print(f"✓ Models loaded (version: {self.metadata['version']})")
        except FileNotFoundError:
            # Graceful fallback for demo/dev runs where models were not trained yet.
            self.fallback_only = True
            self.placement_models = {}
            self.salary_models = {}
            self.encoders = {}
            self.feature_names = []
            self.metadata = {"version": "fallback-v1"}
            print("! Model artifacts not found; using fallback heuristic predictor.")
    
    def prepare_features(self, student_data: Dict, institute_data: Dict, 
                        job_market_data: Dict) -> np.ndarray:
        """Prepare features for prediction"""
        # Engineer features
        features = engineer_features(student_data, institute_data, job_market_data)
        
        # Encode categorical features
        for col, encoder in self.encoders.items():
            if col in features:
                try:
                    features[col] = encoder.transform([str(features[col])])[0]
                except:
                    # Handle unseen categories
                    features[col] = 0
        
        # Create feature vector in correct order
        feature_vector = [features.get(name, 0) for name in self.feature_names]
        
        return np.array(feature_vector).reshape(1, -1), features
    
    def predict_placement(self, X: np.ndarray) -> Dict[str, float]:
        """Predict placement probabilities"""
        predictions = {}
        
        for window, model in self.placement_models.items():
            prob = model.predict_proba(X)[0, 1]
            predictions[f"placement_prob_{window}"] = round(float(prob), 4)
        
        return predictions
    
    def predict_salary(self, X: np.ndarray) -> Dict[str, int]:
        """Predict salary bands"""
        predictions = {}
        
        for quantile, model in self.salary_models.items():
            salary = model.predict(X)[0]
            predictions[f"salary_{quantile}"] = int(max(0, salary))
        
        return predictions
    
    def compute_risk_score(self, placement_prob_6mo: float, salary_p50: int,
                          emi_monthly: int, placement_momentum: float,
                          market_alignment: float) -> Tuple[str, float]:
        """
        Compute composite risk score
        
        Returns:
            Tuple of (risk_level, risk_score)
        """
        # Repayment buffer
        monthly_salary = salary_p50 / 12
        repayment_buffer = min(monthly_salary / (emi_monthly * 3), 1.0) if emi_monthly > 0 else 1.0
        
        # Weighted composite score
        raw_score = (
            0.40 * placement_prob_6mo +
            0.30 * repayment_buffer +
            0.20 * (placement_momentum / 100) +
            0.10 * (market_alignment / 100)
        )
        
        # Determine risk level
        if raw_score >= 0.65:
            risk_level = "LOW"
        elif raw_score >= 0.40:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"
        
        return risk_level, round(raw_score, 4)
    
    def predict(self, student_data: Dict, institute_data: Dict, 
               job_market_data: Dict) -> Dict[str, Any]:
        """
        Full prediction pipeline
        
        Returns:
            Complete risk assessment with all predictions
        """
        # Prepare features
        X, engineered_features = self.prepare_features(
            student_data, institute_data, job_market_data
        ) if not self.fallback_only else (None, engineer_features(student_data, institute_data, job_market_data))

        if self.fallback_only:
            cgpa = float(student_data.get("cgpa", 7.0))
            internships = float(student_data.get("internship_count", 0))
            inst_rate_6 = float(institute_data.get("placement_rate_6mo", 0.5))
            market = float(job_market_data.get("job_demand_index", 0.5))
            base = (0.35 * (cgpa / 10.0)) + (0.2 * min(internships / 3.0, 1.0)) + (0.3 * inst_rate_6) + (0.15 * market)
            p6 = min(max(base, 0.05), 0.95)
            p3 = min(max(p6 - 0.18, 0.02), 0.9)
            p12 = min(max(p6 + 0.2, 0.1), 0.98)
            median_salary = int(institute_data.get("median_salary", 600000))
            cgpa_factor = (cgpa - 7.0) * 45000
            market_factor = (market - 0.5) * 140000
            salary_p50 = max(180000, int(median_salary + cgpa_factor + market_factor))
            placement_preds = {
                "placement_prob_3mo": round(p3, 4),
                "placement_prob_6mo": round(p6, 4),
                "placement_prob_12mo": round(p12, 4),
            }
            salary_preds = {
                "salary_p10": int(salary_p50 * 0.72),
                "salary_p50": int(salary_p50),
                "salary_p90": int(salary_p50 * 1.35),
            }
        else:
            # Predict placement probabilities
            placement_preds = self.predict_placement(X)
            # Predict salary bands
            salary_preds = self.predict_salary(X)
        
        # Compute risk score
        risk_level, risk_score = self.compute_risk_score(
            placement_preds["placement_prob_6mo"],
            salary_preds["salary_p50"],
            student_data.get("emi_monthly", 10000),
            engineered_features["placement_momentum_score"],
            engineered_features["market_alignment_score"]
        )
        
        return {
            **placement_preds,
            **salary_preds,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "placement_momentum_score": engineered_features["placement_momentum_score"],
            "market_alignment_score": engineered_features["market_alignment_score"],
            "repayment_buffer_score": engineered_features["repayment_buffer_score"],
            "model_version": self.metadata["version"]
        }


# Global predictor instance
_predictor = None


def get_predictor() -> RiskPredictor:
    """Get or create global predictor instance"""
    global _predictor
    if _predictor is None:
        _predictor = RiskPredictor()
    return _predictor
