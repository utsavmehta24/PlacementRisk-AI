# PlacementRisk AI - Quick Start

## All Issues Resolved ✓

All Docker Compose errors, deprecation warnings, and network timeout issues have been fixed.

## Important: Network Timeout Fix Applied

The Dockerfile has been optimized to prevent timeout errors:
- ✓ Increased pip timeout to 1000 seconds (16+ minutes per package)
- ✓ Added retry logic (5 automatic retries on failure)
- ✓ Split package installation into smaller groups
- ✓ Uses CPU-only PyTorch (~200MB instead of 900MB for faster downloads)

**If build still times out**, see `DOCKER_BUILD_GUIDE.md` for detailed solutions.

## Quick Start

### 1. Stop Any Running Containers
```powershell
cd placementrisk-ai
docker compose down
```

### 2. Build and Start All Services
```powershell
# This will take 15-30 minutes on first build (downloads ~2GB of packages)
# Ensure stable internet connection
docker compose up --build

# Or build in background
docker compose up --build -d
```

**First Build Notes**:
- Takes 15-30 minutes (downloads all Python packages)
- Requires stable internet connection
- Downloads ~2GB of data
- Subsequent builds are much faster (2-5 minutes)

### 3. Monitor Build Progress
```powershell
# In another terminal, watch the build logs
docker compose logs -f backend

# Or for all services
docker compose logs -f
```

### 3. Monitor Build Progress
```powershell
# In another terminal, watch the build logs
docker compose logs -f backend

# Or for all services
docker compose logs -f
```

### 4. Verify Services Are Running

You should see the following services start successfully:

- **PostgreSQL** (port 5432): Database ready to accept connections
- **Redis** (port 6379): Ready to accept connections
- **Backend** (port 8000): FastAPI server running
- **Celery Worker**: Background tasks running with beat scheduler
- **MLflow** (port 5000): Experiment tracking server running
- **Airflow** (port 8080): Workflow orchestration running
- **Frontend** (port 3000): React app served by Nginx

### 5. Access the Application

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

```powershell
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

```powershell
# Health check
curl http://localhost:8000/health

# API documentation
Start-Process http://localhost:8000/docs
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
