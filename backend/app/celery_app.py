"""Celery application for background tasks"""
from celery import Celery
from celery.schedules import crontab
from app.config import get_settings

settings = get_settings()

# Create Celery app
celery_app = Celery(
    "placementrisk",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    "check-model-drift-daily": {
        "task": "app.tasks.check_model_drift",
        "schedule": crontab(hour=2, minute=0),  # Run at 2 AM daily
    },
    "refresh-features-hourly": {
        "task": "app.tasks.refresh_features",
        "schedule": crontab(minute=0),  # Run every hour
    },
}

if __name__ == "__main__":
    celery_app.start()
