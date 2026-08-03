"""
FastAPI Backend - Main Application Entry Point

Security hardening:
  - CVE-8: Swagger/ReDoc docs disabled when BACKEND_ENV=production.
  - CVE-4: slowapi rate limiter registered globally; 429 handler wired in.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

# Will be populated when setting up the project
from app.db.database import Base, engine
import app.models

IS_PRODUCTION = os.getenv("BACKEND_ENV", "development").lower() == "production"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Application starting up...")
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    print("Application shutting down...")

# CVE-8: Disable interactive API docs in production (prevents API reconnaissance)
app = FastAPI(
    title="RA Community Management API",
    description="API for Residence Association Community Management System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# CVE-4: Register the global rate-limit exceeded handler
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],  # No wildcard
    allow_headers=["Authorization", "Content-Type", "Accept"],  # Explicit header allowlist
)

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.admin import router as admin_router
from app.api.announcements import router as announcements_router
from app.api.community_settings import router as community_settings_router

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_router)
app.include_router(announcements_router)
app.include_router(community_settings_router)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "RA Community API"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "RA Community Management API",
        "version": "1.0.0",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
