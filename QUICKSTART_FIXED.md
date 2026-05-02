# PlacementRisk AI - Quick Start (Fixed Version)

## All Issues Resolved ✓

All Docker Compose errors and deprecation warnings have been fixed. The application is now ready to run.

## Quick Start

### 1. Stop Any Running Containers
```bash
cd placementrisk-ai
docker-compose down
```

### 2. Build and Start All Services
```bash
docker-compose up --build
```

### 3. Verify Services Are Running

You should see the following services start successfully:

- **PostgreSQL** (port 5432): Database ready to accept connections
- **Redis** (port 6379): Ready to accept connections
- **Backend** (port 8000): FastAPI server running
- **Celery Worker**: Background tasks running with beat scheduler
- **MLflow** (port 5000): Experiment tracking server running
- **Airflow** (port 8080): Workflow orchestration running
- **Frontend** (port 3000): React app served by Nginx

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MLflow UI**: http://localhost:5000
- **Airflow UI**: http://localhost:8080 (admin/admin)

## What Was Fixed

### Critical Errors Fixed
1. ✓ Missing `email-validator` package (required by Pydantic EmailStr)
2. ✓ Missing `app.celery_app` module (Celery worker couldn't start)
3. ✓ Pydantic model namespace warnings (model_seed, model_dir conflicts)

### Deprecation Warnings Fixed
4. ✓ Airflow SQL Alchemy connection configuration
5. ✓ Airflow database initialization (db init → db migrate)
6. ✓ Docker Compose version attribute removed

### New Features Added
7. ✓ Celery background tasks for drift detection and feature refresh
8. ✓ Celery beat scheduler for periodic tasks
9. ✓ Feature store refresh functionality
10. ✓ Improved drift detection with return values

## Background Tasks

The following Celery tasks run automatically:

- **Model Drift Detection**: Daily at 2:00 AM UTC
- **Feature Refresh**: Every hour
- **Async Risk Prediction**: On-demand
- **Batch Prediction**: On-demand

## Monitoring Celery Tasks

To monitor Celery tasks:

```bash
# View Celery worker logs
docker logs -f placementrisk-celery

# View all running tasks
docker exec -it placementrisk-celery celery -A app.celery_app inspect active

# View scheduled tasks
docker exec -it placementrisk-celery celery -A app.celery_app inspect scheduled
```

## Troubleshooting

### If services fail to start:

1. **Check logs for specific service**:
   ```bash
   docker logs placementrisk-backend
   docker logs placementrisk-celery
   docker logs placementrisk-airflow
   ```

2. **Ensure ports are not in use**:
   - 5432 (PostgreSQL)
   - 6379 (Redis)
   - 8000 (Backend)
   - 5000 (MLflow)
   - 8080 (Airflow)
   - 3000 (Frontend)

3. **Clean rebuild**:
   ```bash
   docker-compose down -v
   docker-compose build --no-cache
   docker-compose up
   ```

## Development Mode

To run in development mode with hot reload:

```bash
# Backend already has --reload enabled in docker-compose.yml
# Edit files in ./backend and changes will auto-reload

# View backend logs
docker logs -f placementrisk-backend
```

## Testing the API

```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs
```

## Next Steps

1. Generate synthetic data: See `TESTING.md`
2. Train models: See `README.md`
3. Run predictions: Use the API or frontend
4. Monitor drift: Check MLflow UI for drift reports
5. Schedule workflows: Configure Airflow DAGs

## Support

For issues or questions, refer to:
- `FIXES_APPLIED.md` - Detailed list of all fixes
- `README.md` - Full project documentation
- `TESTING.md` - Testing guide
