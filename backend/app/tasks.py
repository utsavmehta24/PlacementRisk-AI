"""Celery tasks for background processing"""
from celery import Task
from app.celery_app import celery_app
from app.monitoring.drift import detect_drift
from app.features.engineering import refresh_feature_store
import logging

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task with database session management"""
    _db = None

    @property
    def db(self):
        if self._db is None:
            from app.database import SessionLocal
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(base=DatabaseTask, bind=True, name="app.tasks.check_model_drift")
def check_model_drift(self):
    """Check for model drift and trigger alerts"""
    try:
        logger.info("Starting model drift detection...")
        drift_detected = detect_drift()
        
        if drift_detected:
            logger.warning("Model drift detected!")
            # Trigger alert or retraining workflow
        else:
            logger.info("No model drift detected")
        
        return {"drift_detected": drift_detected}
    except Exception as e:
        logger.error(f"Error in drift detection: {str(e)}")
        raise


@celery_app.task(base=DatabaseTask, bind=True, name="app.tasks.refresh_features")
def refresh_features(self):
    """Refresh feature store with latest data"""
    try:
        logger.info("Starting feature refresh...")
        refresh_feature_store()
        logger.info("Feature refresh completed")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error in feature refresh: {str(e)}")
        raise


@celery_app.task(name="app.tasks.predict_risk_async")
def predict_risk_async(student_data: dict):
    """Async risk prediction task — triggers full scoring pipeline for a single student"""
    try:
        from app.workflows.backfill_scores import backfill_missing_risk_scores
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            result = backfill_missing_risk_scores(db, batch_size=1)
            return {"status": "success", "scored": result}
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error in async prediction: {str(e)}")
        raise


@celery_app.task(name="app.tasks.batch_predict")
def batch_predict(student_ids: list):
    """Batch prediction task — re-scores a list of students by ID"""
    try:
        from app.workflows.backfill_scores import backfill_missing_risk_scores
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            result = backfill_missing_risk_scores(db)
            logger.info(f"Batch prediction completed for {result} students")
            return {"status": "success", "scored": result}
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error in batch prediction: {str(e)}")
        raise
