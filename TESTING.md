# PlacementRisk AI - Testing Guide

## Overview

This guide covers testing the PlacementRisk AI system end-to-end.

## Prerequisites

Ensure the system is running:
```bash
docker-compose ps
```

All services should show "Up" status.

## 1. Backend API Testing

### Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "PlacementRisk AI",
  "version": "1.0.0"
}
```

### Authentication
```bash
# Login as admin
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@placementrisk.ai",
    "password": "demo123"
  }'
```

Save the `access_token` from the response.

### Risk Scoring

First, get a student ID from the database:
```bash
docker-compose exec backend python -c "
from app.database import SessionLocal
from app.models.schemas import Student
db = SessionLocal()
student = db.query(Student).first()
print(f'Student ID: {student.id}')
print(f'Name: {student.student_name}')
print(f'Course: {student.course_type.value}')
"
```

Then score the student:
```bash
curl -X POST http://localhost:8000/api/risk/score \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STUDENT_ID_HERE"
  }'
```

Expected response includes:
- `risk_level`: LOW/MEDIUM/HIGH
- `risk_score`: 0.0 to 1.0
- `placement_prob_3mo`, `placement_prob_6mo`, `placement_prob_12mo`
- `salary_p10`, `salary_p50`, `salary_p90`
- `shap_explanation`: Plain-English explanation

### Portfolio Analytics
```bash
# Get portfolio heatmap
curl -X GET http://localhost:8000/api/portfolio/heatmap \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get portfolio stats
curl -X GET http://localhost:8000/api/portfolio/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get alerts
curl -X GET http://localhost:8000/api/portfolio/alerts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Student Management
```bash
# Get student profile
curl -X GET http://localhost:8000/api/student/STUDENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get risk score history
curl -X GET http://localhost:8000/api/student/STUDENT_ID/history \
  -H "Authorization: Bearer YOUR_TOKEN"

# Initiate action
curl -X POST http://localhost:8000/api/student/STUDENT_ID/action \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "skill_up"
  }'
```

## 2. Frontend Testing

### Login Page
1. Navigate to http://localhost:3000
2. Should see PlacementRisk AI login page
3. Try demo credentials:
   - admin@placementrisk.ai / demo123
   - riskhead@placementrisk.ai / demo123
   - officer@placementrisk.ai / demo123

### Dashboard
After login, verify:
- [ ] Stats cards show data (Total Borrowers, High Risk %, etc.)
- [ ] Portfolio heatmap displays
- [ ] Can navigate to Alerts page
- [ ] Can logout

### Student View
1. Click on any student name in the heatmap
2. Verify student profile loads
3. Check risk badge displays correctly
4. Verify placement timeline bars show
5. Check salary bands visualization
6. Read SHAP explanation
7. Try clicking action buttons

### Alerts Page
1. Navigate to /alerts
2. Verify alerts table displays
3. Check severity badges
4. Try "Initiate Support" button

## 3. ML Model Testing

### Check Model Files
```bash
docker-compose exec backend ls -la /models/latest/
```

Should see:
- placement_3mo.pkl
- placement_6mo.pkl
- placement_12mo.pkl
- salary_p10.pkl
- salary_p50.pkl
- salary_p90.pkl
- encoders.pkl
- feature_names.json
- metadata.json

### Test Prediction Pipeline
```bash
docker-compose exec backend python -c "
from app.ml.predict import get_predictor
from datetime import datetime

predictor = get_predictor()
print(f'Model version: {predictor.metadata[\"version\"]}')
print(f'Feature count: {len(predictor.feature_names)}')

# Test prediction
student_data = {
    'cgpa': 8.5,
    'internship_count': 2,
    'academic_consistency_score': 0.85,
    'skill_certifications': 3,
    'gap_years': 0,
    'internship_duration_months': 6,
    'employer_type': 'MNC',
    'course_type': 'Engineering',
    'loan_amount': 500000,
    'emi_monthly': 8333,
    'disbursal_date': datetime.now()
}

institute_data = {
    'placement_rate_3mo': 0.5,
    'placement_rate_6mo': 0.75,
    'placement_rate_12mo': 0.9,
    'median_salary': 800000,
    'placement_cell_activity_index': 0.8,
    'nirf_rank_band': '11-50',
    'region': 'South'
}

job_market_data = {
    'job_demand_index': 0.75,
    'avg_time_to_hire_days': 35,
    'hiring_trend': 'Expanding'
}

result = predictor.predict(student_data, institute_data, job_market_data)
print(f'Risk Level: {result[\"risk_level\"]}')
print(f'Risk Score: {result[\"risk_score\"]}')
print(f'Placement Prob (6mo): {result[\"placement_prob_6mo\"]}')
print(f'Salary P50: ₹{result[\"salary_p50\"]:,}')
"
```

### Verify Model Performance
```bash
# Check MLflow for metrics
# Navigate to http://localhost:5000
# Look for experiments with AUC > 0.78
```

## 4. Database Testing

### Check Data
```bash
# Count students
docker-compose exec postgres psql -U placementrisk -d placementrisk -c \
  "SELECT COUNT(*) FROM students;"

# Count institutes
docker-compose exec postgres psql -U placementrisk -d placementrisk -c \
  "SELECT COUNT(*) FROM institutes;"

# Count risk scores
docker-compose exec postgres psql -U placementrisk -d placementrisk -c \
  "SELECT COUNT(*) FROM risk_scores;"

# Sample data
docker-compose exec postgres psql -U placementrisk -d placementrisk -c \
  "SELECT student_name, course_type, cgpa FROM students LIMIT 5;"
```

## 5. Airflow Testing

### Access Airflow UI
1. Navigate to http://localhost:8080
2. Login: admin / admin
3. Verify DAGs are visible:
   - daily_feature_refresh
   - weekly_model_retrain

### Trigger DAG Manually
1. Click on a DAG
2. Click "Trigger DAG" button
3. Monitor execution in Graph view
4. Check logs for each task

## 6. MLflow Testing

### Access MLflow UI
1. Navigate to http://localhost:5000
2. Verify experiments are logged
3. Check metrics:
   - Placement AUC
   - Salary MAE
   - Model parameters

### Compare Runs
1. Select multiple runs
2. Click "Compare"
3. View metric comparisons

## 7. Performance Testing

### API Response Time
```bash
# Test response time
time curl -X POST http://localhost:8000/api/risk/score \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id": "STUDENT_ID"}'
```

Should complete in < 500ms.

### Load Testing (Optional)
```bash
# Install Apache Bench
# Run load test
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  -p student_id.json -T application/json \
  http://localhost:8000/api/risk/score
```

## 8. Integration Testing

### End-to-End Flow
1. Login to frontend
2. View dashboard
3. Click on a student
4. Verify risk score loads
5. Initiate an action
6. Check action is recorded in database:
```bash
docker-compose exec postgres psql -U placementrisk -d placementrisk -c \
  "SELECT * FROM student_actions ORDER BY created_at DESC LIMIT 5;"
```

## 9. Error Handling Testing

### Invalid Token
```bash
curl -X GET http://localhost:8000/api/portfolio/stats \
  -H "Authorization: Bearer invalid_token"
```

Should return 401 Unauthorized.

### Invalid Student ID
```bash
curl -X POST http://localhost:8000/api/risk/score \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id": "00000000-0000-0000-0000-000000000000"}'
```

Should return 404 Not Found.

### Missing Required Fields
```bash
curl -X POST http://localhost:8000/api/risk/score \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Should return 422 Validation Error.

## 10. Monitoring Testing

### Check Logs
```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Database logs
docker-compose logs -f postgres
```

### Check Service Health
```bash
docker-compose ps
```

All services should be "Up" and "healthy".

## Expected Results Summary

✅ **Backend API**
- All endpoints return 200 OK
- Authentication works
- Risk scoring completes in < 500ms
- SHAP explanations included

✅ **Frontend**
- Login works with demo credentials
- Dashboard displays data
- Student view shows risk profile
- Alerts page loads

✅ **ML Models**
- Models trained and saved
- Predictions return valid results
- AUC > 0.78 on test set
- Salary MAE < ₹30,000

✅ **Database**
- 50,000 students loaded
- 3,000 institutes loaded
- Risk scores being generated
- Alerts being created

✅ **Airflow**
- DAGs visible and schedulable
- Manual triggers work
- Tasks execute successfully

✅ **MLflow**
- Experiments logged
- Metrics tracked
- Models versioned

## Troubleshooting

### Service Not Responding
```bash
docker-compose restart SERVICE_NAME
```

### Database Connection Error
```bash
docker-compose restart postgres
docker-compose restart backend
```

### Frontend Not Loading
```bash
docker-compose build frontend
docker-compose up -d frontend
```

### Models Not Found
```bash
docker-compose exec backend python -m app.ml.train
```

## Automated Testing (Future)

For production, implement:
- Unit tests with pytest
- Integration tests
- E2E tests with Selenium
- Load tests with Locust
- CI/CD pipeline with GitHub Actions

---

**All tests passing = System ready for demo! 🚀**
