"""
Initialize PostgreSQL database with required extensions and permissions
"""

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Set default timezone
ALTER DATABASE ra_db SET timezone TO 'UTC';

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ra_db TO ra_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO ra_user;
