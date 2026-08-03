"""
Database configuration and connection

Security hardening:
  - CVE-9: SQL query echo logging is disabled by default (opt-in only, never in production).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ra_user:ra_password@localhost:5432/ra_db"
)

# CVE-9: Only echo SQL when explicitly opted in AND not in production
_IS_PRODUCTION = os.getenv("BACKEND_ENV", "development").lower() == "production"
_ECHO_SQL = (
    os.getenv("BACKEND_SQL_ECHO", "False") == "True"
    and not _IS_PRODUCTION
)

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,  # Disable pooling for development, enable for production
    echo=_ECHO_SQL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    """Dependency for database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
