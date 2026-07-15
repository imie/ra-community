"""
FastAPI Backend - Main Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

# Will be populated when setting up the project
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Application starting up...")
    yield
    # Shutdown
    print("Application shutting down...")

app = FastAPI(
    title="RA Community Management API",
    description="API for Residence Association Community Management System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.admin import router as admin_router

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_router)

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
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
