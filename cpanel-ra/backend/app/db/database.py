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
    "mysql+pymysql://ra_user:ra_password@localhost:3306/ra_db?charset=utf8mb4"
)

# CVE-9: Only echo SQL when explicitly opted in AND not in production
_IS_PRODUCTION = os.getenv("BACKEND_ENV", "development").lower() == "production"
_ECHO_SQL = (
    os.getenv("BACKEND_SQL_ECHO", "False") == "True"
    and not _IS_PRODUCTION
)

# Create engine with connection pooling
engine_kwargs = {
    "echo": _ECHO_SQL,
}
if "sqlite" in DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Use standard QueuePool for MariaDB in production/development
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True,
        "pool_recycle": 3600
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)

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
