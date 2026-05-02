-- Initialize databases for PlacementRisk AI

-- Create airflow database for Airflow
CREATE DATABASE airflow;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE placementrisk TO placementrisk;
GRANT ALL PRIVILEGES ON DATABASE airflow TO placementrisk;
