# PlacementRisk AI

**Linking Education Loans to Career Success**

An AI-powered Placement Risk Modeling System for Education Loan Borrowers — predicting employment timelines, salary expectations, and repayment risk to help lenders support students proactively before defaults ever occur.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  Dashboard | Student View | Alerts | Portfolio Heatmap          │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────────┐
│                    Backend (FastAPI)                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Risk    │  │Portfolio │  │ Student  │  │   Auth   │       │
│  │ Scoring  │  │Analytics │  │ Actions  │  │  (JWT)   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
│  PostgreSQL  │  │    Redis    │  │   MLflow   │
│  (Data Store)│  │   (Cache)   │  │ (Tracking) │
└──────────────┘  └─────────────┘  └────────────┘
        │
┌───────▼──────────────────────────────────────────┐
│            ML Pipeline                            │
│  ┌──────────────┐  ┌──────────────┐             │
│  │   XGBoost    │  │  LightGBM    │             │
│  │ (Placement)  │  │  (Salary)    │             │
│  └──────────────┘  └──────────────┘             │
│  ┌──────────────┐  ┌──────────────┐             │
│  │     SHAP     │  │    Feast     │             │
│  │ (Explainer)  │  │(Feature Store)│            │
│  └──────────────┘  └──────────────┘             │
└───────────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────┐
│         Airflow (Orchestration)                   │
│  • Daily Feature Refresh                          │
│  • Weekly Model Retraining                        │
│  • Drift Detection                                │
└───────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB RAM minimum
- 10GB free disk space

### One-Command Setup

```bash
# Clone the repository
git clone <repo-url>
cd placementrisk-ai

# Copy environment file
cp .env.example .env

# Start all services
docker compose up -d

# Wait for services to be healthy (2-3 minutes)
docker compose ps

# Generate synthetic data (first time only)
docker compose exec backend python -m app.data.synthetic

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
# MLflow UI: http://localhost:5000
# Airflow UI: http://localhost:8080
```

### Demo Credentials

**Lender Dashboard (Risk Head)**
- Email: `admin@placementrisk.ai`
- Password: `demo123`
- Role: `risk_head` (full portfolio access)

**Loan Officer**
- Email: `officer@placementrisk.ai`
- Password: `demo123`
- Role: `loan_officer` (individual student access)

## 📊 Key Features

### 1. AI/ML Predictions
- **Placement Timeline**: 3/6/12-month probability of placement
- **Salary Range**: P10/P50/P90 salary bands by field, institute, location
- **Risk Score**: LOW/MEDIUM/HIGH composite score with drivers

### 2. Real-Time Signals
- Job market demand indices by sector and region
- Institute placement momentum tracking
- Student behavioral signals (optional opt-in)

### 3. Explainable AI (XAI)
- SHAP-based explanations for every risk score
- Plain-English drivers: "Low internship exposure (-18 pts) + weak NCR job demand (-12 pts) + strong CGPA (+9 pts) => Risk: HIGH"

### 4. Lender Dashboard
- Portfolio heatmap: Institute × Course risk distribution
- Early warning alerts for deteriorating students
- Pre-disbursal risk scoring
- Monthly portfolio analytics

### 5. Student Support
- Next-best-action recommendations
- Skill-up program matching
- Resume help and mock interview scheduling
- Recruiter matching based on profile

## 🔧 API Endpoints

### Authentication
```bash
# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@placementrisk.ai", "password": "demo123"}'
```

### Risk Scoring
```bash
# Score a student
curl -X POST http://localhost:8000/api/risk/score \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "uuid-here",
    "course_type": "Engineering",
    "cgpa": 8.5,
    "institute_id": "uuid-here",
    "loan_amount": 500000
  }'
```

### Portfolio Analytics
```bash
# Get portfolio heatmap
curl -X GET "http://localhost:8000/api/portfolio/heatmap?lender_id=uuid" \
  -H "Authorization: Bearer <token>"

# Get early warning alerts
curl -X GET http://localhost:8000/api/portfolio/alerts \
  -H "Authorization: Bearer <token>"
```

### Student Management
```bash
# Get student risk profile
curl -X GET http://localhost:8000/api/student/{student_id} \
  -H "Authorization: Bearer <token>"

# Trigger support action
curl -X POST http://localhost:8000/api/student/{student_id}/action \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action_type": "skill_up"}'
```

## 📈 Model Performance

### Placement Classifier (XGBoost)
- **Target**: AUC > 0.82
- **Features**: 40+ engineered features across 4 dimensions
- **Calibration**: Isotonic regression for probability calibration
- **Explainability**: SHAP values for every prediction

### Salary Estimator (LightGBM)
- **Target**: MAE < Rs. 30,000
- **Output**: P10/P50/P90 quantile bands
- **Features**: Course, institute tier, region, CGPA, sector demand

### Composite Risk Score
- Weighted ensemble: 40% placement prob + 30% repayment buffer + 20% placement momentum + 10% market alignment
- Thresholds: LOW (≥0.65), MEDIUM (0.40-0.65), HIGH (<0.40)

## 🗂️ Dataset

### Synthetic Data Generation
The system uses CTGAN to generate realistic synthetic data:
- **50,000 student profiles** across 3,000 programs
- **NIRF-seeded distributions** for placement rates
- **7 data categories**: Student academic, institute placement history, job market signals, salary benchmarks, macro economic data, student behavior (optional), outcome labels

### Data Sources (Production)
- **Student Data**: Lender CRM / Partner Institute MIS (API/MOU)
- **Institute Data**: NIRF, AICTE, UGC portals (web scraping + open data)
- **Job Market**: Naukri, LinkedIn, Indeed APIs (daily refresh)
- **Salary Benchmarks**: AmbitionBox, Glassdoor, PayScale (monthly)
- **Macro Data**: RBI, CMIE, Ministry of Labour (quarterly)

## 🔐 Security & Compliance

- **Data Privacy**: Student PII anonymized at ingestion (tokenization + field-level encryption)
- **Access Control**: Role-based access control (RBAC) with JWT authentication
- **Audit Logs**: Full audit trail for every model query and risk score update
- **Compliance**: RBI data localization and IT Act requirements
- **Encryption**: TLS 1.3 for all data flows, AWS KMS for secrets

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js, Recharts, Tailwind CSS |
| **Backend** | FastAPI, Python 3.10 |
| **Database** | PostgreSQL 15, Redis 7 |
| **ML Models** | XGBoost, LightGBM, SHAP |
| **NLP** | IndicBERT (HuggingFace) |
| **Feature Store** | Feast (SQLite backend) |
| **Orchestration** | Apache Airflow |
| **Task Queue** | Celery + Redis |
| **Monitoring** | MLflow, Evidently AI, Great Expectations |
| **Containerization** | Docker, Docker Compose |

## 📅 Development Roadmap

### Phase 1: Foundation (Month 1-2) ✅
- Data partnership agreements
- ETL pipeline for institute and student data
- Synthetic dataset generation
- Baseline XGBoost model (v0.1)
- SHAP explainability prototype

### Phase 2: Core Product (Month 2-3)
- Job market API integration
- Quantile regression for salary range
- Feature store setup (Feast)
- FastAPI backend + risk endpoint
- Alpha test at 2 institutes

### Phase 3: Dashboard (Month 3-4)
- React dashboard with heatmap
- Early warning alert engine
- Next-best action recommendation module
- RBAC and user testing

### Phase 4: Scale & Harden (Month 4-5)
- 10+ institutes across 3 states
- Bias testing and fairness audit
- Online learning layer
- MLflow + Evidently monitoring
- Load testing (10K req/s)

### Phase 5: Evaluate (Month 5-6)
- 6-month placement outcome tracking
- Model retrain with real outcome labels
- A/B test: risk-guided vs. control cohort
- Publish accuracy metrics

## 🎯 Expected Impact

| Metric | Target |
|--------|--------|
| **Delinquency Reduction** | 30% reduction in 6-month early delinquency |
| **Salary Uplift** | Rs. 2-5L avg. from NBA skill-up programs |
| **Response Time** | 3x faster lender response to at-risk students |
| **Reach** | 10M+ education loan borrowers (India) |

## 🧪 Testing

```bash
# Run backend tests
docker compose exec backend pytest

# Run frontend tests
docker compose exec frontend npm test

# Check model performance
docker compose exec backend python -m app.ml.evaluate

# Run drift detection
docker compose exec backend python -m app.monitoring.drift
```

## 📝 License

This project is built for the AI/ML FinTech EdTech Hackathon - Problem Statement 1.

## 🤝 Contributing

This is a hackathon project. For production deployment, please contact the development team.

## 📧 Contact

For questions or support:
- Email: support@placementrisk.ai
- Documentation: http://localhost:8000/docs

---

**PlacementRisk AI** — Turning Education Loans into Career Partnerships
"# PlacementRisk-AI" 
