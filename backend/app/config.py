"""Configuration management for PlacementRisk AI"""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    postgres_url: str = "postgresql://placementrisk:changeme@localhost:5432/placementrisk"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # JWT
    jwt_secret: str = "changeme_this_is_a_secret_key_for_jwt_tokens"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440
    
    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"
    
    # Model
    model_seed: int = 42
    placement_auc_target: float = 0.82
    salary_mae_target: int = 30000
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Paths
    data_dir: str = "/data"
    model_dir: str = "/models"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        protected_namespaces=('settings_',)
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
