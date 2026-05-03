"""Main FastAPI application for PlacementRisk AI"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import init_db
from app.routers import risk, portfolio, student, auth, admin, officer, student_portal, cases, messages, mlflow_proxy

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle management"""
    # Startup
    print("Starting PlacementRisk AI...")
    init_db()
    print("✓ Database initialized")
    
    yield
    
    # Shutdown
    print("Shutting down PlacementRisk AI...")


# Create FastAPI app
app = FastAPI(
    title="PlacementRisk AI",
    description="AI-powered Placement Risk Modeling System for Education Loan Borrowers",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(risk.router, prefix="/api/risk", tags=["Risk Scoring"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio Analytics"])
app.include_router(student.router, prefix="/api/student", tags=["Student Management"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(officer.router, prefix="/api/officer", tags=["Officer"])
app.include_router(student_portal.router, prefix="/api/student-portal", tags=["Student Portal"])
app.include_router(cases.router, prefix="/api/cases", tags=["Cases"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messaging"])
app.include_router(mlflow_proxy.router, prefix="/api/mlflow", tags=["MLflow"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "PlacementRisk AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "PlacementRisk AI",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)
