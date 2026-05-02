# PlacementRisk AI - Quick Start Guide

## Prerequisites

- Docker Desktop installed and running
- 8GB RAM minimum
- 10GB free disk space
- Internet connection for downloading dependencies

## Installation (5 minutes)

### Option 1: Automated Setup (Recommended)

```bash
# Clone or navigate to the project directory
cd placementrisk-ai

# Make setup script executable (Linux/Mac)
chmod +x setup.sh

# Run setup script
./setup.sh
```

### Option 2: Manual Setup

```bash
# 1. Create environment file
cp .env.example .env

# 2. Start services
docker-compose up -d

# 3. Wait for services to start (2-3 minutes)
docker-compose ps

# 4. Generate synthetic data
docker-compose exec backend python -m app.data.synthetic

# 5. Train models
docker-compose exec backend python -m app.ml.train
```

## Access the Application

Once setup is complete, access:

- **Frontend Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **MLflow UI**: http://localhost:5000
- **Airflow UI**: http://localhost:8080 (admin/admin)

## Demo Login Credentials

### Admin (Full Access)
- Email: `admin@placementrisk.ai`
- Password: `demo123`

### Risk Head (Portfolio View)
- Email: `riskhead@placementrisk.ai`
- Password: `demo123`

### Loan Officer (Student View)
- Email: `officer@placementrisk.ai`
- Password: `demo123`

## Quick Tour

### 1. Dashboard (Risk Head View)
- View portfolio statistics
- See risk distribution heatmap
- Monitor high-risk students
- Check daily alerts

### 2. Student Profile
- Click any student name to view detailed risk profile
- See placement probability timeline (3/6/12 months)
- View expected salary bands (P10/P50/P90)
- Read SHAP-based risk explanations
- Initiate support actions

### 3. Alerts Page
- View early warning alerts
- See students with deteriorating risk scores
- Initiate support interventions
- Track alert history

### 4. API Testing

Test the risk scoring API:

```bash
# Get access token
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@placementrisk.ai", "password": "demo123"}'

# Score a student (replace TOKEN and STUDENT_ID)
curl -X POST http://localhost:8000/api/risk/score \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id": "STUDENT_ID"}'
```

## Key Features to Explore

### 1. Risk Scoring
- Multi-window placement predictions (3/6/12 months)
- Quantile salary estimation (P10/P50/P90)
- Composite risk score (LOW/MEDIUM/HIGH)
- SHAP explanations for every prediction

### 2. Portfolio Analytics
- Institute × Course heatmap
- Risk distribution visualization
- Aggregate statistics
- Trend analysis

### 3. Early Warning System
- Automatic alert generation for deteriorating students
- Severity-based prioritization
- Action recommendations
- Support intervention tracking

### 4. Student Support
- Skill development programs
- Resume optimization
- Mock interview preparation
- Recruiter matching

## Data Overview

The system generates synthetic data with:
- **50,000 students** across 3,000 programs
- **NIRF-realistic** institute distributions
- **Placement outcomes** with ground truth labels
- **Job market signals** by sector and region

## Model Performance

Target metrics:
- **Placement AUC**: > 0.82
- **Salary MAE**: < ₹30,000
- **Risk Score Precision**: > 80%
- **SHAP Coverage**: 100% of outputs

## Troubleshooting

### Services not starting
```bash
# Check Docker is running
docker ps

# Restart services
docker-compose down
docker-compose up -d
```

### Database connection errors
```bash
# Check PostgreSQL is healthy
docker-compose ps postgres

# Restart database
docker-compose restart postgres
```

### Frontend not loading
```bash
# Check backend is running
curl http://localhost:8000/health

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Models not found
```bash
# Retrain models
docker-compose exec backend python -m app.ml.train
```

## Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Next Steps

1. **Explore the Dashboard**: Login and navigate through different views
2. **Test API Endpoints**: Use the interactive API docs at `/docs`
3. **Review MLflow**: Check model experiments and metrics
4. **Configure Airflow**: Set up automated retraining schedules
5. **Customize Features**: Modify feature engineering in `backend/app/features/`

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review API docs: http://localhost:8000/docs
- Check MLflow: http://localhost:5000

## Architecture

```
Frontend (React) → Backend (FastAPI) → PostgreSQL
                                     → Redis (Cache)
                                     → MLflow (Tracking)
                                     
Backend → ML Models (XGBoost, LightGBM)
       → Feature Store (Feast)
       → SHAP Explainer
       
Airflow → Daily Feature Refresh
       → Weekly Model Retraining
       → Drift Detection
```

## Production Deployment

For production deployment:
1. Update `.env` with production credentials
2. Configure proper secrets management
3. Set up SSL/TLS certificates
4. Configure backup strategies
5. Set up monitoring and alerting
6. Review security settings in `docker-compose.yml`

---

**PlacementRisk AI** — Turning Education Loans into Career Partnerships
