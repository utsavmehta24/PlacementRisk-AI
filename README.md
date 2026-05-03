# PlacementRisk AI

**Linking Education Loans to Career Success**

An AI-powered Placement Risk Modeling System for Education Loan Borrowers — predicting employment timelines, salary expectations, and repayment risk to help lenders support students proactively before defaults ever occur.

> ⚠️ **DEMO VERSION NOTICE**: This system currently uses **synthetic data** and **hardcoded demo credentials** for demonstration purposes. For production deployment, you **MUST**:
> - Replace synthetic data with real student and institute data
> - Remove all hardcoded passwords from the login page
> - Change default JWT secrets and database passwords
> - Implement proper authentication and authorization
> - Enable SSL/TLS encryption for all endpoints
> - Review and update security configurations

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

## 📖 What is PlacementRisk AI?

PlacementRisk AI is an end-to-end machine learning platform that helps education loan lenders:

1. **Predict Placement Risk**: Assess the likelihood of a student securing employment within 3, 6, or 12 months after graduation
2. **Estimate Salary Ranges**: Provide P10/P50/P90 salary band predictions based on course, institute, location, and market conditions
3. **Generate Risk Scores**: Compute composite risk scores (LOW/MEDIUM/HIGH) with explainable AI-driven insights
4. **Monitor Portfolio Health**: Track portfolio-wide risk distribution across institutes, courses, and regions
5. **Enable Proactive Support**: Recommend next-best actions for at-risk students (skill-up programs, resume help, recruiter matching)

### How is it Useful?

**For Lenders:**
- **Reduce Delinquency**: Identify at-risk borrowers early and intervene before defaults occur (target: 30% reduction in early delinquency)
- **Optimize Loan Decisions**: Make data-driven pre-disbursal decisions with transparent risk assessments
- **Portfolio Management**: Monitor risk distribution across institutes and courses in real-time
- **Regulatory Compliance**: Maintain audit trails and explainable AI for regulatory requirements

**For Students:**
- **Career Guidance**: Receive personalized recommendations for skill development and job search strategies
- **Transparency**: Understand what factors influence their risk score and how to improve
- **Support Access**: Get matched with relevant skill-up programs, recruiters, and career resources

**For Institutes:**
- **Placement Insights**: Understand market demand trends and optimize curriculum accordingly
- **Student Success**: Partner with lenders to provide targeted support to students

### Current Status: Synthetic Data

🔬 **This demo version uses synthetic data generated via CTGAN** to simulate realistic student profiles, institute placement histories, and job market signals. The synthetic dataset includes:
- 50,000 student profiles across 3,000 academic programs
- NIRF-seeded distributions for placement rates and salary benchmarks
- Realistic correlations between CGPA, institute tier, course type, and outcomes

📊 **Future Production Deployment**: The system is designed to gradually transition to real data sources:
- **Student Data**: Integration with lender CRM systems and partner institute MIS via APIs
- **Institute Data**: Web scraping from NIRF, AICTE, UGC portals + open data sources
- **Job Market Signals**: Real-time data from Naukri, LinkedIn, Indeed APIs
- **Salary Benchmarks**: Monthly updates from AmbitionBox, Glassdoor, PayScale
- **Macro Indicators**: Quarterly data from RBI, CMIE, Ministry of Labour

The ML pipeline is built to handle incremental data updates and model retraining as real data becomes available.

## 🚀 Quick Start

### Prerequisites
- **Docker & Docker Compose** (v20.10+ recommended)
- **8GB RAM minimum** (16GB recommended for ML training)
- **10GB free disk space**
- **Operating System**: Linux, macOS, or Windows with WSL2

### Step-by-Step Setup

#### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/utsavmehta24/PlacementRisk-AI
cd PlacementRisk-AI

# Copy environment file
cp .env.example .env

# (Optional) Edit .env to customize database passwords, JWT secrets, etc.
# For demo purposes, default values work fine
```

#### 2. Start All Services

```bash
# Build and start all containers
docker-compose up -d

# This will start:
# - PostgreSQL (database)
# - Redis (cache)
# - Backend (FastAPI)
# - Frontend (React)
# - MLflow (experiment tracking)
# - Celery (task queue)

# Wait for services to be healthy (2-3 minutes)
docker-compose ps
```

#### 3. Generate Synthetic Data (First Time Only)

```bash
# Generate 50,000 synthetic student profiles
docker-compose exec backend python -m app.data.synthetic

# This creates:
# - data/synthetic/students.csv
# - data/synthetic/institutes.csv
# - data/synthetic/placement_outcomes.csv
# - data/synthetic/job_market_signals.csv
```

#### 4. Train ML Models (Optional)

```bash
# Train placement and salary prediction models
docker-compose exec backend python -m app.ml.train

# This will:
# - Train XGBoost placement classifier
# - Train LightGBM salary estimator
# - Log experiments to MLflow
# - Save models for inference
```

#### 5. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main user interface |
| **Backend API** | http://localhost:8000/docs | Interactive API documentation |
| **MLflow UI** | http://localhost:5000 | Model tracking and experiments |
| **Airflow UI** | http://localhost:8080 | Workflow orchestration (optional) |

### Demo Credentials

> ⚠️ **SECURITY WARNING**: These credentials are **hardcoded for demo purposes only**. In production, you **MUST** remove these from the login page and implement proper user registration and authentication.

**Admin (Full System Access)**
- Email: `admin@placementrisk.ai`
- Password: `demo123`
- Role: `admin`
- Access: All features, user management, system configuration

**Risk Head (Portfolio Management)**
- Email: `riskhead@placementrisk.ai`
- Password: `demo123`
- Role: `risk_head`
- Access: Portfolio analytics, risk reports, all student data

**Loan Officer (Individual Student Management)**
- Email: `officer@placementrisk.ai`
- Password: `demo123`
- Role: `loan_officer`
- Access: Individual student risk profiles, action recommendations

**Student (Self-Service Portal)**
- Email: `student0001@placementrisk.ai` through `student1500@placementrisk.ai`
- Password: `demo123`
- Role: `student`
- Access: Personal risk profile, career recommendations, support resources

## 👥 User Roles & How They Function

### 1. Admin Role (`admin`)

**Purpose**: System administration and configuration

**Access Level**: Full system access

**Key Features**:
- User management (create, update, delete users)
- System configuration and settings
- MLflow experiment tracking and model management
- Database administration
- Audit log access
- All features available to other roles

**Typical Workflow**:
1. Log in to admin dashboard
2. Monitor system health and performance
3. Review MLflow experiments and model metrics
4. Manage user accounts and permissions
5. Configure system settings and thresholds

**Dashboard Components**:
- System metrics and health status
- User management panel
- MLflow integration (experiments, runs, metrics)
- Configuration management
- Audit logs

---

### 2. Risk Head Role (`risk_head`)

**Purpose**: Portfolio-level risk management and strategic decision-making

**Access Level**: Full portfolio visibility across all students and institutes

**Key Features**:
- Portfolio heatmap (Institute × Course risk distribution)
- Aggregate risk analytics and trends
- Early warning alerts for deteriorating cohorts
- Pre-disbursal risk scoring for new applications
- Monthly/quarterly portfolio reports
- Risk threshold configuration

**Typical Workflow**:
1. Log in to risk head dashboard
2. Review portfolio heatmap to identify high-risk segments
3. Analyze early warning alerts for students showing deterioration
4. Review pre-disbursal applications and approve/reject based on risk scores
5. Generate monthly reports for senior management
6. Adjust risk thresholds and intervention triggers

**Dashboard Components**:
- **Portfolio Heatmap**: Visual grid showing risk distribution by institute and course
- **Risk Distribution Chart**: Breakdown of LOW/MEDIUM/HIGH risk students
- **Early Warning Alerts**: List of students with declining risk scores
- **Trend Analysis**: Historical risk trends over time
- **Institute Performance**: Placement rates and salary outcomes by institute

---

### 3. Loan Officer Role (`loan_officer`)

**Purpose**: Individual student case management and support coordination

**Access Level**: Access to assigned students only

**Key Features**:
- Individual student risk profiles
- SHAP-based risk explanations
- Next-best-action recommendations
- Student communication and case notes
- Support action tracking (skill-up, resume help, recruiter matching)
- Placement outcome updates

**Typical Workflow**:
1. Log in to loan officer dashboard
2. Review assigned students sorted by risk level
3. Click on high-risk students to view detailed profiles
4. Review SHAP explanations to understand risk drivers
5. Trigger recommended actions (e.g., enroll in skill-up program)
6. Add case notes and track student progress
7. Update placement status when student gets placed

**Dashboard Components**:
- **Student List**: Assigned students with risk badges (LOW/MEDIUM/HIGH)
- **Risk Profile**: Detailed view with SHAP explanations
- **Action Recommendations**: AI-suggested next-best actions
- **Case Notes**: Communication history and intervention tracking
- **Placement Timeline**: Predicted 3/6/12-month placement probabilities

---

### 4. Student Role (`student`)

**Purpose**: Self-service career guidance and transparency

**Access Level**: Personal profile and recommendations only

**Key Features**:
- Personal risk score and explanation
- Salary range predictions (P10/P50/P90)
- Skill gap analysis
- Recommended skill-up programs
- Resume review and mock interview scheduling
- Recruiter matching based on profile
- Job market insights for their field

**Typical Workflow**:
1. Log in to student portal
2. View personal risk score and understand contributing factors
3. Review salary predictions for their course and location
4. Explore recommended skill-up programs to improve employability
5. Request resume review or mock interview
6. Browse matched recruiters and job opportunities
7. Update profile with internships, certifications, projects

**Dashboard Components**:
- **Risk Score Card**: Current risk level with plain-English explanation
- **Salary Predictions**: Expected salary bands (P10/P50/P90)
- **Skill Recommendations**: Courses and certifications to improve profile
- **Career Resources**: Resume templates, interview prep, recruiter contacts
- **Progress Tracker**: Track improvements in risk score over time

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

### Current: Synthetic Data (Demo Version)

This demo version uses **synthetic data generated via CTGAN** (Conditional Tabular GAN) to simulate realistic student profiles and outcomes. The synthetic dataset provides:

**Data Volume**:
- **50,000 student profiles** across 3,000 academic programs
- **500 institutes** with varying placement rates and reputation tiers
- **7 data categories**: Student academic records, institute placement history, job market signals, salary benchmarks, macro economic indicators, student behavior (optional), outcome labels

**Data Quality**:
- **NIRF-seeded distributions**: Placement rates and salary ranges based on real NIRF data patterns
- **Realistic correlations**: CGPA, institute tier, course type, and location correlate with outcomes as expected
- **Temporal patterns**: Job market signals and placement outcomes vary by season and economic conditions

**Why Synthetic Data?**
- **Privacy**: No real student PII required for demo and testing
- **Scalability**: Generate unlimited data for stress testing and model validation
- **Reproducibility**: Consistent dataset for benchmarking and development
- **Rapid Prototyping**: No data partnership agreements needed for initial development

### Future: Real Data Integration (Production)

The system architecture supports **gradual transition to real data sources**:

**Phase 1: Institute Data (Months 1-2)**
- **Source**: NIRF, AICTE, UGC portals (web scraping + open data APIs)
- **Frequency**: Quarterly updates
- **Data**: Placement rates, average salaries, institute rankings, accreditation status

**Phase 2: Job Market Signals (Months 2-3)**
- **Source**: Naukri, LinkedIn, Indeed APIs
- **Frequency**: Daily refresh
- **Data**: Job postings by sector/location, demand indices, skill requirements

**Phase 3: Student Data (Months 3-4)**
- **Source**: Lender CRM systems, partner institute MIS (via API/MOU)
- **Frequency**: Real-time or daily batch
- **Data**: Academic records, loan details, demographic info (anonymized)

**Phase 4: Salary Benchmarks (Months 4-5)**
- **Source**: AmbitionBox, Glassdoor, PayScale
- **Frequency**: Monthly updates
- **Data**: Salary distributions by role, company, location, experience

**Phase 5: Macro Indicators (Ongoing)**
- **Source**: RBI, CMIE, Ministry of Labour
- **Frequency**: Quarterly
- **Data**: GDP growth, unemployment rates, sector-wise employment trends

**Data Pipeline**:
```
Real Data Sources → ETL (Airflow) → Feature Store (Feast) → ML Models → API
                         ↓
                  Data Quality (Great Expectations)
                         ↓
                  Drift Detection (Evidently)
```

The ML models are designed to handle incremental updates and will automatically retrain as real data accumulates.

## 🔐 Security & Compliance

### Demo Version Security (Current)

> ⚠️ **CRITICAL**: This demo version has **intentionally weak security** for ease of testing. **DO NOT deploy to production without implementing the security measures below.**

**Current Demo Configuration**:
- ❌ Hardcoded demo passwords (`demo123`) visible in login page
- ❌ Default JWT secret (`changeme_this_is_a_secret_key_for_jwt_tokens`)
- ❌ Default database password (`changeme`)
- ❌ No SSL/TLS encryption
- ❌ No rate limiting or DDoS protection
- ❌ No input validation on all endpoints
- ❌ CORS enabled for all origins

### Production Security Requirements

**Before deploying to production, you MUST implement**:

#### 1. Authentication & Authorization
- ✅ Remove all hardcoded passwords from `frontend/src/pages/Login.jsx`
- ✅ Implement proper user registration with email verification
- ✅ Use strong password policies (min 12 chars, complexity requirements)
- ✅ Enable multi-factor authentication (MFA) for admin and risk_head roles
- ✅ Change JWT secret in `.env` to a cryptographically secure random string
- ✅ Reduce JWT expiration time (currently 1440 minutes = 24 hours)
- ✅ Implement refresh token rotation

#### 2. Database Security
- ✅ Change default PostgreSQL password in `docker-compose.yml` and `.env`
- ✅ Use separate database users with minimal privileges for each service
- ✅ Enable SSL/TLS for database connections
- ✅ Implement database encryption at rest
- ✅ Regular automated backups with encryption

#### 3. Network Security
- ✅ Enable HTTPS/TLS 1.3 for all endpoints (use Let's Encrypt or AWS ACM)
- ✅ Configure CORS to allow only specific trusted origins
- ✅ Implement rate limiting (e.g., 100 requests/minute per user)
- ✅ Add DDoS protection (Cloudflare, AWS Shield)
- ✅ Use API gateway for request validation and throttling

#### 4. Data Privacy
- ✅ Anonymize student PII at ingestion (tokenization + field-level encryption)
- ✅ Implement data retention policies (auto-delete after N years)
- ✅ Enable audit logging for all data access
- ✅ Comply with data localization requirements (RBI guidelines)
- ✅ Implement GDPR/data deletion requests workflow

#### 5. Compliance & Audit
- ✅ Full audit trail for every model query and risk score update
- ✅ Log all authentication attempts and authorization failures
- ✅ Implement compliance checks for RBI and IT Act requirements
- ✅ Regular security audits and penetration testing
- ✅ Incident response plan and security monitoring

#### 6. Secrets Management
- ✅ Use AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault
- ✅ Never commit secrets to version control
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use environment-specific secrets (dev/staging/prod)

#### 7. Container Security
- ✅ Scan Docker images for vulnerabilities (Trivy, Snyk)
- ✅ Use minimal base images (alpine, distroless)
- ✅ Run containers as non-root users
- ✅ Implement network policies to isolate services
- ✅ Regular dependency updates and security patches

### Compliance Standards

**Regulatory Requirements**:
- **RBI Guidelines**: Data localization, audit trails, customer consent
- **IT Act 2000**: Data protection and cybersecurity measures
- **DPDPA 2023**: Data privacy and protection (when enacted)
- **ISO 27001**: Information security management (recommended)

**Model Governance**:
- **Explainability**: SHAP values for every prediction (regulatory requirement)
- **Bias Testing**: Regular fairness audits across gender, caste, region
- **Model Monitoring**: Drift detection and performance tracking
- **Version Control**: MLflow tracking for all model versions

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

### Backend Tests
```bash
# Run all backend tests
docker-compose exec backend pytest

# Run with coverage report
docker-compose exec backend pytest --cov=app --cov-report=html

# Run specific test file
docker-compose exec backend pytest tests/test_risk_scoring.py
```

### Frontend Tests
```bash
# Run frontend tests
docker-compose exec frontend npm test

# Run with coverage
docker-compose exec frontend npm test -- --coverage
```

### Model Evaluation
```bash
# Evaluate model performance
docker-compose exec backend python -m app.ml.evaluate

# Run drift detection
docker-compose exec backend python -m app.monitoring.drift

# Check data quality
docker-compose exec backend python -m app.monitoring.data_quality
```

### API Testing
```bash
# Test API endpoints (requires running services)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@placementrisk.ai", "password": "demo123"}'

# Get API documentation
open http://localhost:8000/docs
```

## 🐛 Troubleshooting

### Common Issues

**1. Services Not Starting**
```bash
# Check service status
docker-compose ps

# View logs for specific service
docker-compose logs backend
docker-compose logs mlflow

# Restart all services
docker-compose restart
```

**2. MLflow Not Accessible**
```bash
# Verify MLflow is running
docker-compose ps mlflow

# Check MLflow logs
docker-compose logs mlflow

# MLflow should be at http://localhost:5000
# If not accessible, restart: docker-compose restart mlflow
```

**3. Training Script Fails**
```bash
# Ensure all services are running first
docker-compose up -d

# Wait 30 seconds for services to be healthy
sleep 30

# Then run training
docker-compose exec backend python -m app.ml.train

# If MLflow connection fails, training will fall back to local ./mlruns directory
```

**4. Database Connection Errors**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Verify database is initialized
docker-compose exec postgres psql -U placementrisk -d placementrisk -c "\dt"

# Reinitialize database if needed
docker-compose down -v
docker-compose up -d
```

**5. Frontend Build Errors**
```bash
# Clear node_modules and rebuild
docker-compose exec frontend rm -rf node_modules
docker-compose exec frontend npm install

# Or rebuild container
docker-compose build frontend --no-cache
```

**6. Port Already in Use**
```bash
# Check what's using the port (example: port 8000)
# Linux/Mac:
lsof -i :8000

# Windows:
netstat -ano | findstr :8000

# Change ports in docker-compose.yml if needed
```

### Performance Optimization

**For Faster Builds**:
- Use `docker-compose build` without `--no-cache` to leverage cached layers
- Large pip packages are split into separate RUN commands for better caching

**For Faster Training**:
- Reduce dataset size in `app/data/synthetic.py` (default: 50,000 students)
- Use CPU-only models for development (already configured)
- Enable GPU support by modifying `docker-compose.yml` (add `runtime: nvidia`)

### Getting Help

**Logs and Debugging**:
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check container resource usage
docker stats
```

**Health Checks**:
```bash
# Backend health
curl http://localhost:8000/health

# MLflow health
curl http://localhost:5000/health

# Database health
docker-compose exec postgres pg_isready
```

## 🚀 Production Deployment Checklist

Before deploying to production, complete this checklist:

### Security
- [ ] Remove hardcoded passwords from `frontend/src/pages/Login.jsx`
- [ ] Change JWT secret in `.env` to cryptographically secure random string
- [ ] Change database passwords in `docker-compose.yml` and `.env`
- [ ] Enable HTTPS/TLS for all endpoints
- [ ] Configure CORS to allow only trusted origins
- [ ] Implement rate limiting and DDoS protection
- [ ] Set up secrets management (AWS Secrets Manager, Vault, etc.)
- [ ] Enable database encryption at rest
- [ ] Implement audit logging for all sensitive operations
- [ ] Set up security monitoring and alerting

### Data
- [ ] Replace synthetic data with real data sources
- [ ] Set up ETL pipelines for institute data (NIRF, AICTE)
- [ ] Integrate job market APIs (Naukri, LinkedIn, Indeed)
- [ ] Configure salary benchmark data sources
- [ ] Implement data quality checks (Great Expectations)
- [ ] Set up drift detection monitoring (Evidently)
- [ ] Configure data retention and deletion policies
- [ ] Implement PII anonymization at ingestion

### Infrastructure
- [ ] Set up production database with backups
- [ ] Configure Redis cluster for high availability
- [ ] Set up load balancer for backend services
- [ ] Configure auto-scaling for compute resources
- [ ] Set up monitoring (Prometheus, Grafana, DataDog)
- [ ] Configure log aggregation (ELK, CloudWatch)
- [ ] Set up alerting for system failures
- [ ] Implement disaster recovery plan

### ML Operations
- [ ] Configure MLflow with remote artifact storage (S3, Azure Blob)
- [ ] Set up model versioning and deployment pipeline
- [ ] Implement A/B testing framework for models
- [ ] Configure automated model retraining (Airflow DAGs)
- [ ] Set up model performance monitoring
- [ ] Implement bias testing and fairness audits
- [ ] Configure feature store with production data
- [ ] Set up model rollback procedures

### Testing
- [ ] Run full test suite (backend, frontend, integration)
- [ ] Perform load testing (target: 10K requests/second)
- [ ] Conduct security penetration testing
- [ ] Validate model performance on real data
- [ ] Test disaster recovery procedures
- [ ] Verify backup and restore processes

### Compliance
- [ ] Complete RBI compliance checklist
- [ ] Implement audit trail for all operations
- [ ] Set up data localization (India-only storage)
- [ ] Prepare privacy policy and terms of service
- [ ] Conduct bias and fairness audit
- [ ] Document model governance procedures
- [ ] Set up incident response plan

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

*Built with ❤️ for students, lenders, and institutes* 
