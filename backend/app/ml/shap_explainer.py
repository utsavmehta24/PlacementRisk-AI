"""SHAP-based explainability for risk scores"""
import numpy as np
import shap
from typing import Dict, List, Tuple


def generate_shap_explanation(
    model,
    X: np.ndarray,
    feature_names: List[str],
    feature_values: Dict[str, float],
    top_n: int = 3
) -> str:
    """
    Generate plain-English SHAP explanation
    
    Args:
        model: Trained model
        X: Feature vector
        feature_names: List of feature names
        feature_values: Dictionary of feature values
        top_n: Number of top drivers to include
    
    Returns:
        Plain-English explanation string
    """
    try:
        # Get base model from calibrated classifier
        if hasattr(model, 'calibrated_classifiers_'):
            base_model = model.calibrated_classifiers_[0].estimator
        else:
            base_model = model
        
        # Create SHAP explainer
        explainer = shap.TreeExplainer(base_model)
        shap_values = explainer.shap_values(X)
        
        # Get SHAP values for positive class
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        
        # Get feature contributions
        contributions = []
        for i, (name, shap_val) in enumerate(zip(feature_names, shap_values[0])):
            contributions.append({
                "feature": name,
                "shap_value": float(shap_val),
                "feature_value": feature_values.get(name, X[0, i])
            })
        
        # Sort by absolute SHAP value
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        # Get top positive and negative drivers
        positive_drivers = [c for c in contributions if c["shap_value"] > 0][:top_n]
        negative_drivers = [c for c in contributions if c["shap_value"] < 0][:top_n]
        
        # Generate explanation text
        explanation_parts = []
        
        # Negative drivers (risks)
        if negative_drivers:
            for driver in negative_drivers:
                feature_name = format_feature_name(driver["feature"])
                impact = int(abs(driver["shap_value"]) * 100)
                explanation_parts.append(f"{feature_name} (-{impact} pts)")
        
        # Positive drivers (strengths)
        if positive_drivers:
            for driver in positive_drivers:
                feature_name = format_feature_name(driver["feature"])
                impact = int(abs(driver["shap_value"]) * 100)
                explanation_parts.append(f"{feature_name} (+{impact} pts)")
        
        explanation = " + ".join(explanation_parts)
        
        return explanation
    
    except Exception as e:
        # Fallback to simple explanation
        return generate_simple_explanation(feature_values)


def format_feature_name(feature: str) -> str:
    """Format feature name for human readability"""
    name_map = {
        "cgpa": "Strong CGPA",
        "internship_count": "Internship exposure",
        "job_demand_index": "Job market demand",
        "institute_placement_rate_6mo": "Institute placement rate",
        "placement_momentum_score": "Placement momentum",
        "market_alignment_score": "Market alignment",
        "repayment_buffer_score": "Repayment capacity",
        "skill_certifications": "Skill certifications",
        "gap_years": "Gap years",
        "avg_time_to_hire_days": "Time to hire in market"
    }
    
    # Check if feature is in map
    for key, value in name_map.items():
        if key in feature.lower():
            return value
    
    # Default: capitalize and replace underscores
    return feature.replace("_", " ").title()


def generate_simple_explanation(feature_values: Dict[str, float]) -> str:
    """Generate simple rule-based explanation as fallback"""
    parts = []
    
    # Check key factors
    if feature_values.get("internship_count", 0) < 1:
        parts.append("Low internship exposure (-18 pts)")
    
    if feature_values.get("job_demand_index", 0.5) < 0.5:
        parts.append("Weak job market demand (-12 pts)")
    
    if feature_values.get("cgpa", 7.0) >= 8.0:
        parts.append("Strong CGPA (+9 pts)")
    
    if feature_values.get("institute_placement_rate_6mo", 0.5) >= 0.7:
        parts.append("Good institute placement rate (+8 pts)")
    
    if not parts:
        parts.append("Mixed factors")
    
    return " + ".join(parts)


def get_next_best_action(
    risk_level: str,
    shap_explanation: str,
    feature_values: Dict[str, float]
) -> str:
    """
    Determine next best action based on risk drivers
    
    Args:
        risk_level: LOW, MEDIUM, or HIGH
        shap_explanation: SHAP explanation string
        feature_values: Feature values dictionary
    
    Returns:
        Recommended action type
    """
    if risk_level == "LOW":
        return None
    
    # Check for specific risk factors
    if "internship" in shap_explanation.lower() or feature_values.get("internship_count", 0) < 2:
        return "skill_up"
    
    if feature_values.get("months_since_disbursal", 0) > 6:
        return "recruiter_match"
    
    if feature_values.get("cgpa", 7.0) < 7.0:
        return "skill_up"
    
    if "market" in shap_explanation.lower() or feature_values.get("job_demand_index", 0.5) < 0.5:
        return "recruiter_match"
    
    # Default action
    return "resume_help"


def get_action_resources(action_type: str) -> Dict[str, any]:
    """Get recommended resources for an action type"""
    resources = {
        "skill_up": {
            "title": "Skill Development Programs",
            "description": "Enhance your technical and soft skills with industry-relevant courses",
            "resources": [
                "Coursera Industry Certifications",
                "LinkedIn Learning Paths",
                "NPTEL Online Courses",
                "Udemy Technical Skills"
            ],
            "estimated_duration": "2-3 months"
        },
        "resume_help": {
            "title": "Resume & Profile Enhancement",
            "description": "Optimize your resume and online profiles for better visibility",
            "resources": [
                "Professional Resume Review",
                "LinkedIn Profile Optimization",
                "GitHub Portfolio Building",
                "Mock Application Reviews"
            ],
            "estimated_duration": "1-2 weeks"
        },
        "mock_interview": {
            "title": "Interview Preparation",
            "description": "Practice interviews with industry professionals",
            "resources": [
                "Technical Interview Practice",
                "HR Round Preparation",
                "Group Discussion Training",
                "Case Study Practice"
            ],
            "estimated_duration": "2-4 weeks"
        },
        "recruiter_match": {
            "title": "Recruiter Matching",
            "description": "Connect with recruiters actively hiring in your field",
            "resources": [
                "Direct Recruiter Introductions",
                "Job Fair Invitations",
                "Campus Placement Support",
                "Industry Networking Events"
            ],
            "estimated_duration": "Ongoing"
        }
    }
    
    return resources.get(action_type, {})
