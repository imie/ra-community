-- RA Community PostgreSQL Initialisation Script
-- Run once on first container start.

-- Ensure the database exists (docker image creates it via env vars,
-- but we add extensions and set search_path here)

-- Enable UUID extension (used for all primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set default search path
ALTER DATABASE ra_db SET search_path TO public;

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON DATABASE ra_db TO ra_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ra_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ra_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ra_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ra_user;
