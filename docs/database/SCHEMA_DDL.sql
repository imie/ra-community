-- ============================================================================
-- RA Community Management System - PostgreSQL DDL Statements
-- Complete Schema for Production Deployment
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- User role enumeration
CREATE TYPE user_role_enum AS ENUM (
    'admin',
    'resident',
    'guest'
);

-- User account status enumeration
CREATE TYPE user_status_enum AS ENUM (
    'pending',      -- Account created but not activated
    'active',       -- Account is active
    'suspended',    -- Account temporarily suspended
    'deactivated'   -- Account permanently deactivated
);

-- Email and profile verification status
CREATE TYPE verification_status_enum AS ENUM (
    'not_started',  -- Verification process not started
    'pending',      -- Awaiting verification
    'verified',     -- Successfully verified
    'rejected'      -- Verification rejected
);

-- Sex/Gender enumeration
CREATE TYPE sex_enum AS ENUM (
    'M',    -- Male
    'F',    -- Female
    'Other' -- Other
);

-- Race/Ethnicity enumeration
CREATE TYPE race_enum AS ENUM (
    'Malay',
    'Chinese',
    'Indian',
    'Eurasian',
    'Kadazan',
    'Iban',
    'Other'
);

-- Marital status enumeration
CREATE TYPE marital_status_enum AS ENUM (
    'single',
    'married',
    'divorced',
    'widowed'
);

-- OAuth provider enumeration
CREATE TYPE oauth_provider_enum AS ENUM (
    'google',
    'microsoft',
    'apple',
    'github'
);

-- Audit action enumeration
CREATE TYPE audit_action_enum AS ENUM (
    'create',               -- New resource created
    'update',               -- Resource updated
    'delete',               -- Resource deleted
    'login',                -- User login
    'logout',               -- User logout
    'password_reset',       -- Password reset
    'email_verification',   -- Email verification
    'profile_update',       -- Profile information updated
    'account_lock',         -- Account locked (security)
    'account_unlock',       -- Account unlocked
    'permission_change',    -- User permissions changed
    'export',               -- Data exported
    'import'                -- Data imported
);

-- ============================================================================
-- MAIN USERS TABLE (18 RESIDENT DATA FIELDS)
-- ============================================================================

CREATE TABLE users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication Fields
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    
    -- Core Resident Information (18 Fields)
    -- 1. Full Name
    full_name VARCHAR(255) NOT NULL,
    
    -- 2. IC Number (Identity Card Number)
    ic_number VARCHAR(50) UNIQUE,
    
    -- 3. Date of Birth
    date_of_birth DATE,
    
    -- 4. Place of Birth
    place_of_birth VARCHAR(255),
    
    -- 5. Age
    age INTEGER,
    
    -- 6. Sex
    sex sex_enum,
    
    -- 7. Race
    race race_enum,
    
    -- 8. Marital Status
    marital_status marital_status_enum,
    
    -- 9. Number of Dependents
    num_dependents INTEGER DEFAULT 0,
    
    -- 10. Taman Name (Housing complex name)
    taman_name VARCHAR(255),
    
    -- 11. House Number
    house_number VARCHAR(50),
    
    -- 12. Jalan Aman Serenia (Street Address)
    jalan_aman_serenia VARCHAR(255),
    
    -- 13. Job Title
    job_title VARCHAR(255),
    
    -- 14. Employer Name
    employer_name VARCHAR(255),
    
    -- 15. Employer Address
    employer_address VARCHAR(255),
    
    -- 16. Employer Phone
    employer_phone VARCHAR(20),
    
    -- Account Management
    role user_role_enum NOT NULL DEFAULT 'resident',
    status user_status_enum NOT NULL DEFAULT 'pending',
    verification_status verification_status_enum NOT NULL DEFAULT 'not_started',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    
    -- Security & Authentication Fields
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    account_locked_until TIMESTAMP,
    last_login TIMESTAMP,
    last_password_change TIMESTAMP,
    
    -- OAuth Provider IDs
    google_id VARCHAR(255) UNIQUE,
    microsoft_id VARCHAR(255) UNIQUE,
    apple_id VARCHAR(255) UNIQUE,
    github_id VARCHAR(255) UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT valid_age CHECK (age IS NULL OR (age >= 0 AND age <= 150))
);

-- Create indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_ic_number ON users(ic_number);
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_verification_status ON users(verification_status);
CREATE INDEX idx_users_is_verified ON users(is_verified);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_updated_at ON users(updated_at);
CREATE INDEX idx_users_taman_name ON users(taman_name);
CREATE INDEX idx_users_house_number ON users(house_number);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_microsoft_id ON users(microsoft_id);
CREATE INDEX idx_users_apple_id ON users(apple_id);
CREATE INDEX idx_users_github_id ON users(github_id);

-- Partial indexes for common queries
CREATE INDEX idx_users_active_verified ON users(is_active, is_verified) WHERE is_active = true AND is_verified = true;
CREATE INDEX idx_users_locked ON users(account_locked_until) WHERE account_locked_until IS NOT NULL;
CREATE INDEX idx_users_pending ON users(created_at) WHERE status = 'pending' ORDER BY created_at DESC;

-- ============================================================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================================================

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT token_expiry CHECK (expires_at > created_at)
);

-- Create indexes for password reset tokens
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_used ON password_reset_tokens(used_at) WHERE used_at IS NULL;

-- ============================================================================
-- EMAIL VERIFICATION TOKENS TABLE
-- ============================================================================

CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT token_expiry CHECK (expires_at > created_at)
);

-- Create indexes for email verification tokens
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
CREATE INDEX idx_email_verification_tokens_pending ON email_verification_tokens(verified_at) WHERE verified_at IS NULL;

-- ============================================================================
-- OAUTH CREDENTIALS TABLE
-- ============================================================================

CREATE TABLE oauth_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    provider oauth_provider_enum NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500),
    token_type VARCHAR(20) NOT NULL DEFAULT 'Bearer',
    expires_at TIMESTAMP,
    scope VARCHAR(500),
    raw_data JSONB,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    last_used TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (provider, provider_user_id)
);

-- Create indexes for OAuth credentials
CREATE INDEX idx_oauth_credentials_user_id ON oauth_credentials(user_id);
CREATE INDEX idx_oauth_credentials_provider ON oauth_credentials(provider);
CREATE INDEX idx_oauth_credentials_provider_user_id ON oauth_credentials(provider, provider_user_id);
CREATE INDEX idx_oauth_credentials_is_primary ON oauth_credentials(is_primary) WHERE is_primary = true;
CREATE INDEX idx_oauth_credentials_expires_at ON oauth_credentials(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_oauth_credentials_user_provider ON oauth_credentials(user_id, provider);

-- ============================================================================
-- AUDIT LOGS TABLE (COMPLIANCE & SECURITY)
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,  -- NULL for system actions
    action audit_action_enum NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    description TEXT,
    changes JSONB,  -- Before/after values: {before: {...}, after: {...}}
    ip_address VARCHAR(50),
    user_agent VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'success',  -- success, failure
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_user_action_created ON audit_logs(user_id, action, created_at);
CREATE INDEX idx_audit_logs_resource_created ON audit_logs(resource_type, resource_id, created_at);

-- Partial index for failed actions (compliance audits)
CREATE INDEX idx_audit_logs_failures ON audit_logs(created_at, user_id) WHERE status = 'failure';

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active users view
CREATE VIEW v_active_users AS
SELECT 
    id,
    email,
    full_name,
    phone_number,
    status,
    is_verified,
    taman_name,
    house_number,
    last_login,
    created_at
FROM users
WHERE is_active = true AND status = 'active'
ORDER BY last_login DESC;

-- Pending verification view
CREATE VIEW v_pending_verification AS
SELECT 
    id,
    email,
    full_name,
    status,
    verification_status,
    created_at
FROM users
WHERE verification_status = 'pending'
ORDER BY created_at ASC;

-- Locked accounts view
CREATE VIEW v_locked_accounts AS
SELECT 
    id,
    email,
    full_name,
    failed_login_attempts,
    account_locked_until,
    status
FROM users
WHERE account_locked_until IS NOT NULL AND account_locked_until > NOW()
ORDER BY account_locked_until DESC;

-- Recent audit events view
CREATE VIEW v_recent_audit_events AS
SELECT 
    a.id,
    a.user_id,
    u.email,
    a.action,
    a.resource_type,
    a.status,
    a.ip_address,
    a.created_at
FROM audit_logs a
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 1000;

-- ============================================================================
-- UPDATE TIMESTAMPS TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER oauth_credentials_updated_at BEFORE UPDATE ON oauth_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS (for application user)
-- ============================================================================

-- Grant all privileges on tables
GRANT ALL PRIVILEGES ON TABLE users TO ra_user;
GRANT ALL PRIVILEGES ON TABLE password_reset_tokens TO ra_user;
GRANT ALL PRIVILEGES ON TABLE email_verification_tokens TO ra_user;
GRANT ALL PRIVILEGES ON TABLE oauth_credentials TO ra_user;
GRANT ALL PRIVILEGES ON TABLE audit_logs TO ra_user;

-- Grant permissions on sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ra_user;

-- Grant permissions on views
GRANT SELECT ON v_active_users TO ra_user;
GRANT SELECT ON v_pending_verification TO ra_user;
GRANT SELECT ON v_locked_accounts TO ra_user;
GRANT SELECT ON v_recent_audit_events TO ra_user;
