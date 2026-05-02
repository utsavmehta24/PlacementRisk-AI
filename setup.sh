#!/bin/bash

# PlacementRisk AI - Setup Script
# This script sets up the complete PlacementRisk AI system

set -e

echo "=========================================="
echo "PlacementRisk AI - Setup"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi

# Create necessary directories
echo ""
echo "Creating directories..."
mkdir -p data/raw data/processed data/synthetic
mkdir -p mlruns
mkdir -p models
echo "✓ Directories created"

# Build and start services
echo ""
echo "Building Docker images..."
docker-compose build

echo ""
echo "Starting services..."
docker-compose up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 30

# Check service health
echo ""
echo "Checking service health..."
docker-compose ps

# Generate synthetic data
echo ""
echo "Generating synthetic data..."
docker-compose exec -T backend python -m app.data.synthetic

# Train initial models
echo ""
echo "Training initial models..."
docker-compose exec -T backend python -m app.ml.train

echo ""
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Services are now running:"
echo "  - Frontend:  http://localhost:3000"
echo "  - Backend:   http://localhost:8000"
echo "  - API Docs:  http://localhost:8000/docs"
echo "  - MLflow:    http://localhost:5000"
echo "  - Airflow:   http://localhost:8080"
echo ""
echo "Demo Credentials:"
echo "  - admin@placementrisk.ai / demo123 (Admin)"
echo "  - riskhead@placementrisk.ai / demo123 (Risk Head)"
echo "  - officer@placementrisk.ai / demo123 (Loan Officer)"
echo ""
echo "To stop services: docker-compose down"
echo "To view logs: docker-compose logs -f"
echo ""
