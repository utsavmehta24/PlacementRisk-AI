FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Upgrade pip and install wheel
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install Python dependencies with increased timeout and retries
# Split installation to handle large packages better
RUN pip install --no-cache-dir --timeout=1000 --retries=5 \
    fastapi==0.115.0 \
    uvicorn[standard]==0.32.0 \
    python-multipart==0.0.12 \
    multipart==1.1.0 \
    sqlalchemy==2.0.36 \
    psycopg2-binary==2.9.10 \
    alembic==1.14.0 \
    redis==5.2.0 \
    hiredis==3.0.0 \
    celery==5.4.0 \
    python-jose[cryptography]==3.3.0 \
    passlib[bcrypt]==1.7.4 \
    bcrypt==4.0.1 \
    python-dotenv==1.0.1 \
    email-validator==2.2.0 \
    pydantic==2.10.2 \
    pydantic-settings==2.6.1 \
    python-dateutil==2.9.0.post0 \
    pytz==2024.2 \
    requests==2.32.3 \
    beautifulsoup4==4.12.3

# Install ML packages separately (these are large)
RUN pip install --no-cache-dir --timeout=1000 --retries=5 \
    numpy==1.26.4 \
    pandas==2.2.3 \
    scikit-learn==1.5.2

# Install PyTorch with CPU-only version (much smaller, ~200MB vs 900MB)
RUN pip install --no-cache-dir --timeout=1000 --retries=5 \
    torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu

# Install remaining ML packages
RUN pip install --no-cache-dir --timeout=1000 --retries=5 \
    xgboost==2.1.2 \
    lightgbm==4.5.0 \
    shap==0.46.0 \
    transformers==4.46.3 \
    river==0.21.2

# Install data processing and MLOps packages
RUN pip install --no-cache-dir --timeout=1000 --retries=5 \
    pyarrow==17.0.0 \
    mlflow==2.17.2 \
    feast==0.40.1 \
    sdv==1.16.2 \
    great-expectations==1.17.0 \
    evidently==0.4.16

# Install web scraping packages
RUN pip install --no-cache-dir --timeout=1000 --retries=5 \
    scrapy==2.12.0

# Install PySpark (large package)
RUN pip install --no-cache-dir --timeout=1000 --retries=5 \
    pyspark==3.5.3

# Install testing packages
RUN pip install --no-cache-dir --timeout=1000 --retries=5 \
    pytest==8.3.4 \
    pytest-asyncio==0.24.0 \
    httpx==0.28.1

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /models /data /mlruns

# Expose port
EXPOSE 8000

# Default command (can be overridden in docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
