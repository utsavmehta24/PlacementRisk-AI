<div align="center">

# 🎓 PlacementRisk AI

### AI-Powered Placement Risk Modeling for Education Loan Borrowers

*Predict. Intervene. Protect.*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.1-FF6600?style=flat-square)](https://xgboost.readthedocs.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![MLflow](https://img.shields.io/badge/MLflow-2.17-0194E2?style=flat-square)](https://mlflow.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**[Live Demo](#-quick-start) · [API Docs](http://localhost:8000/docs) · [Architecture](#-architecture)**

</div>

---

## 📌 The Problem

India has over **₹1.2 lakh crore** in outstanding education loans. Yet lenders have almost no visibility into whether a student will get placed — until it's too late and EMIs start bouncing.

Traditional credit risk models look backward (past repayment history). Education loans need a model that looks **forward** — at placement probability, salary expectations, and job market conditions — to intervene *before* defaults happen.

---

## 💡 What We Built

**PlacementRisk AI** is an end-to-end ML platform that gives education loan lenders a real-time window into every borrower's placement trajectory.

For each student, the system predicts:
- 📊 **Placement probability** at 3, 6, and 12 months post-graduation
- 💰 **Expected salary range** (P10 / P50 / P90 bands)
- 🚦 **Composite risk score** (LOW / MEDIUM / HIGH) with SHAP-based explanations
- 🎯 **Next-best action** — what the lender should do right now to help

The result: lenders can intervene early with targeted support (skill-up programs, resume help, recruiter matching) instead of waiting for defaults.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     React Frontend (Port 3000)                    │
│   Landing · Login · Admin · Risk Head · Officer · Student Portal  │
└───────────────────────────┬──────────────────────────────────────┘
                            │  REST API (JWT Auth)
┌───────────────────────────▼──────────────────────────────────────┐
│                   FastAPI Backend (Port 8000)                     │
│                                                                    │
│  /auth    /api/risk    /api/portfolio    /api/admin               │
│  /api/student    /api/officer    /api/cases    /api/messages      │
└──────────┬──────────────┬──────────────────┬──────────────────────┘
           │              │                  │
    ┌──────▼──────┐ ┌─────▼──────┐  ┌───────▼───────┐
    │ PostgreSQL  │ │   Redis    │  │  ML Pipeline  │
    │  Port 5432  │ │  Port 6379 │  │               │
    └─────────────┘ └────────────┘  │  XGBoost      │
                                    │  LightGBM     │
                                    │  SHAP         │
                                    └───────┬───────┘
                                            │
                              ┌─────────────▼──────────────┐
                              │     MLOps Layer             │
                              │  MLflow (5000) · Airflow    │
                              │  Celery · Evidently AI      │
                              └────────────────────────────┘
```

---

## ✨ Key Features

### 🤖 ML-Powered Risk Engine
- **XGBoost Placement Classifier** — predicts placement probability at 3, 6, and 12-month windows (target AUC > 0.82)
- **LightGBM Salary Estimator** — quantile regression for P10/P50/P90 salary bands (target MAE < ₹30,000)
- **Composite Risk Score** — weighted ensemble: `0.40 × placement + 0.30 × repayment buffer + 0.20 × momentum + 0.10 × market alignment`
- **Fallback Heuristic** — graceful degradation when trained models are unavailable

### 🔍 Explainable AI (XAI)
- SHAP TreeExplainer for every single prediction — zero black-box outputs
- Plain-English explanations of top risk drivers
- Positive and negative factor breakdown per student

### 📊 Portfolio Intelligence
- **Institute × Course Heatmap** — visualize risk distribution across your entire portfolio
- **Early Warning Alerts** — auto-generated when a student's risk deteriorates
- **Aggregate Analytics** — HIGH/MEDIUM/LOW breakdown, trend analysis, cohort comparisons

### 👥 Role-Based Dashboards
| Role | What They See |
|------|--------------|
| **Admin** | System health, user management, institute directory, MLOps links, operations control |
| **Risk Head** | Portfolio heatmap, alert feed, case overview, risk composition charts |
| **Loan Officer** | Individual student workbench, SHAP explanations, case notes, support actions |
| **Student** | Personal risk score, salary predictions, skill gap analysis, career resources |

### ⚙️ Production-Grade MLOps
- **MLflow** — experiment tracking, model versioning, artifact storage
- **Apache Airflow** — daily feature refresh + weekly model retraining DAGs
- **Celery + Redis** — async task queue for on-demand scoring
- **Evidently AI** — data drift detection and model monitoring

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v20.10+)
- 8 GB RAM minimum (16 GB recommended)
- 10 GB free disk space

### 1. Clone & Configure

```bash
git clone https://github.com/utsavmehta24/PlacementRisk-AI.git
cd PlacementRisk-AI
cp .env.example .env
```

### 2. Start All Services

```bash
docker compose up --build
```

This spins up 6 services: PostgreSQL, Redis, Backend, Frontend, MLflow, and Celery. First build takes ~3–5 minutes; subsequent starts are instant.

### 3. Access the Application

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | See demo credentials below |
| **API Docs** | http://localhost:8000/docs | — |
| **MLflow UI** | http://localhost:5000 | — |
| **Airflow UI** | http://localhost:8080 | `admin` / `admin` |

### 4. Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@placementrisk.ai` | `demo123` |
| Risk Head | `riskhead@placementrisk.ai` | `demo123` |
| Loan Officer | `officer@placementrisk.ai` | `demo123` |
| Student | `student0001@placementrisk.ai` | `demo123` |

> Students `student0001` through `student1500` are all available with password `demo123`.

### 5. Seed Data & Train Models (Optional)

```bash
# Generate 50K synthetic student profiles
docker compose exec backend python -m app.data.synthetic

# Train XGBoost + LightGBM models
docker compose exec backend python -m app.ml.train

# Backfill risk scores for all students (via Admin dashboard → Operations tab)
# Or via API:
curl -X POST http://localhost:8000/api/admin/backfill-risk-scores \
  -H "Authorization: Bearer <admin_token>"
```

---

## 📁 Project Structure

```
PlacementRisk-AI/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point
│   │   ├── config.py                # Environment-based settings
│   │   ├── database.py              # SQLAlchemy + PostgreSQL setup
│   │   ├── auth/
│   │   │   ├── jwt.py               # JWT token management (bcrypt)
│   │   │   └── rbac.py              # Role-based access control
│   │   ├── models/
│   │   │   └── schemas.py           # ORM models (Student, Institute, RiskScore…)
│   │   ├── routers/
│   │   │   ├── auth.py              # Login, student registration
│   │   │   ├── risk.py              # Risk scoring endpoint
│   │   │   ├── portfolio.py         # Heatmap, alerts, stats
│   │   │   ├── student.py           # Student profile & history
│   │   │   ├── admin.py             # Admin operations
│   │   │   ├── officer.py           # Officer workbench
│   │   │   ├── student_portal.py    # Student self-service
│   │   │   ├── cases.py             # Case management
│   │   │   ├── messages.py          # Officer ↔ Student messaging
│   │   │   └── mlflow_proxy.py      # MLflow API proxy
│   │   ├── ml/
│   │   │   ├── train.py             # XGBoost + LightGBM training
│   │   │   ├── predict.py           # RiskPredictor engine
│   │   │   └── shap_explainer.py    # SHAP explanations + NBA
│   │   ├── features/
│   │   │   └── engineering.py       # 25+ feature engineering functions
│   │   ├── data/
│   │   │   └── synthetic.py         # CTGAN synthetic data generation
│   │   ├── monitoring/
│   │   │   ├── drift.py             # Evidently AI drift detection
│   │   │   └── alerts.py            # Early warning alert generation
│   │   └── workflows/
│   │       ├── case_management.py   # Auto case creation
│   │       ├── backfill_scores.py   # Batch risk scoring
│   │       └── bootstrap_cases.py   # Initial case seeding
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Router + role-based private routes
│   │   ├── api/client.js            # Axios API client
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx      # Public landing page
│   │   │   ├── Login.jsx            # Auth with demo presets
│   │   │   ├── AdminDashboard.jsx   # Tabbed admin panel
│   │   │   ├── RiskHeadDashboard.jsx# Portfolio analytics
│   │   │   ├── OfficerDashboard.jsx # Case workbench
│   │   │   ├── StudentPortal.jsx    # Student self-service
│   │   │   ├── StudentView.jsx      # Individual student detail
│   │   │   ├── StudentSignup.jsx    # Student registration
│   │   │   └── Alerts.jsx           # Alert feed
│   │   └── components/
│   │       ├── RiskBadge.jsx        # HIGH/MEDIUM/LOW badge
│   │       ├── SalaryBands.jsx      # P10/P50/P90 visualization
│   │       └── PortfolioHeatmap.jsx # Institute × Course heatmap
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
│
├── ml_jobs/
│   └── airflow_dags/
│       ├── daily_feature_refresh.py # Daily job market signal updates
│       └── weekly_retrain.py        # Weekly model retraining
│
├── data/
│   ├── raw/                         # Raw data (gitignored)
│   ├── processed/                   # Processed features (gitignored)
│   └── synthetic/                   # Generated synthetic data
│
├── docker-compose.yml               # Full service orchestration
├── init-db.sql                      # PostgreSQL schema initialization
├── .env.example                     # Environment variable template
├── setup.sh                         # Automated setup script
├── QUICKSTART.md                    # 5-minute quick start guide
└── README.md                        # This file
```

---

## 🔌 API Reference

All endpoints require a `Bearer` JWT token (except `/auth/login` and `/auth/register-student`).

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login, returns JWT token + user info |
| `POST` | `/auth/register-student` | Student self-registration |

### Risk Scoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/risk/score` | Score a student — returns risk level, placement probs, salary bands, SHAP |

### Portfolio Analytics *(Risk Head+)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/portfolio/heatmap` | Institute × Course risk heatmap |
| `GET` | `/api/portfolio/alerts` | Early warning alert feed |
| `GET` | `/api/portfolio/stats` | Portfolio summary statistics |

### Student Management *(Loan Officer+)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/student/{id}` | Student profile + latest risk score |
| `GET` | `/api/student/{id}/history` | Risk score history |
| `POST` | `/api/student/{id}/action` | Initiate support action |

### Admin *(Admin only)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | List all users |
| `GET` | `/api/admin/institutes` | Institute directory |
| `GET` | `/api/admin/monitoring` | System health status |
| `POST` | `/api/admin/backfill-risk-scores` | Batch score all students |
| `POST` | `/api/admin/generate-alerts` | Run early warning scan |

> Full interactive docs at **http://localhost:8000/docs**

---

## 🧠 ML Model Details

### Placement Classifier (XGBoost)
```
Algorithm:     XGBoost + Isotonic Calibration (CalibratedClassifierCV)
Target:        AUC > 0.82
Windows:       3 months, 6 months, 12 months (3 separate models)
Features:      25+ engineered features
Explainability: SHAP TreeExplainer
```

### Salary Estimator (LightGBM)
```
Algorithm:     LightGBM Quantile Regression
Target:        MAE < ₹30,000
Outputs:       P10 (pessimistic), P50 (median), P90 (optimistic)
Training data: Placed students only
```

### Composite Risk Score
```
Formula:  0.40 × placement_prob_6mo
        + 0.30 × repayment_buffer_score
        + 0.20 × placement_momentum_score
        + 0.10 × market_alignment_score

Thresholds:
  LOW    → score ≥ 0.65  (green)
  MEDIUM → score 0.40–0.65 (amber)
  HIGH   → score < 0.40  (red)
```

### Feature Engineering (25+ Features)
| Category | Features |
|----------|----------|
| Academic | CGPA, academic consistency score, gap years, skill certifications |
| Internship | Count, total duration (months), quality score, employer type |
| Institute | Placement rates (3/6/12mo), median salary, NIRF rank band, placement cell activity, recruiter trend |
| Job Market | Demand index, hiring trend, time-to-hire, sector growth rate |
| Financial | Loan amount, monthly EMI, repayment buffer ratio |

---

## 🌱 Data Strategy

### Current: Synthetic Data (Demo)
This demo uses **CTGAN-generated synthetic data** that mirrors real-world distributions:
- 50,000 student profiles across 500 institutes
- NIRF-seeded placement rates and salary benchmarks
- Realistic correlations between CGPA, institute tier, course type, and outcomes

### Roadmap: Real Data Integration
| Phase | Data Source | Timeline |
|-------|-------------|----------|
| 1 | Institute data — NIRF, AICTE, UGC portals | Month 1–2 |
| 2 | Job market signals — Naukri, LinkedIn, Indeed APIs | Month 2–3 |
| 3 | Student data — Lender CRM, partner institute MIS | Month 3–6 |
| 4 | Salary benchmarks — AmbitionBox, Glassdoor, PayScale | Month 4–6 |
| 5 | Macro indicators — RBI, CMIE, Ministry of Labour | Month 6+ |

---

## 📈 Expected Impact

| Metric | Target |
|--------|--------|
| Early delinquency reduction | **30%** in 6-month window |
| Average salary uplift (skill-up programs) | **₹2–5 lakh** per student |
| Lender response time to at-risk students | **3× faster** |
| Addressable market | **10M+** education loan borrowers in India |

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and update as needed:

```env
# Database
POSTGRES_USER=placementrisk
POSTGRES_PASSWORD=changeme
POSTGRES_DB=placementrisk
POSTGRES_URL=postgresql://placementrisk:changeme@postgres:5432/placementrisk

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=changeme_this_is_a_secret_key_for_jwt_tokens
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# MLflow
MLFLOW_TRACKING_URI=http://mlflow:5000

# ML
MODEL_SEED=42
```

> ⚠️ **For production:** Replace all `changeme` values with strong secrets. Use a secrets manager (AWS Secrets Manager, HashiCorp Vault) — never commit real credentials.

---

## 🐳 Docker Services

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `placementrisk-frontend` | Custom (nginx) | 3000 | React UI |
| `placementrisk-backend` | Custom (Python 3.11) | 8000 | FastAPI server |
| `placementrisk-postgres` | postgres:15-alpine | 5432 | Primary database |
| `placementrisk-redis` | redis:7-alpine | 6379 | Cache + task queue |
| `placementrisk-mlflow` | python:3.10-slim | 5000 | ML experiment tracking |
| `placementrisk-celery` | Custom (Python 3.11) | — | Async task worker |

---

## 🛠️ Tech Stack

**Frontend**
- React 18 · React Router v6 · Tailwind CSS · Recharts · Axios

**Backend**
- FastAPI · Python 3.11 · SQLAlchemy 2.0 · Pydantic v2 · Uvicorn

**Database & Cache**
- PostgreSQL 15 · Redis 7 · Alembic (migrations)

**ML / AI**
- XGBoost 2.1 · LightGBM 4.5 · scikit-learn 1.5 · SHAP 0.46
- Feast (feature store) · River (online learning) · SDV/CTGAN (synthetic data)

**MLOps & Monitoring**
- MLflow 2.17 · Apache Airflow 2.7 · Celery 5.4
- Evidently AI 0.4 · Great Expectations 1.17

**Infrastructure**
- Docker · Docker Compose · Nginx

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**PlacementRisk AI** — *Because every student deserves a fair shot, and every lender deserves visibility.*

</div>
