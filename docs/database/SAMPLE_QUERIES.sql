-- ============================================================================
-- RA Community Management System - Sample Queries
-- Common operations for authentication, profile management, and analytics
-- ============================================================================

-- ============================================================================
-- AUTHENTICATION QUERIES
-- ============================================================================

-- Find user by email (login)
SELECT 
    id,
    email,
    password_hash,
    is_active,
    is_verified,
    status,
    account_locked_until,
    failed_login_attempts
FROM users
WHERE email = 'resident@example.com'
AND is_active = true;

-- Get user by OAuth provider ID
SELECT u.*
FROM users u
JOIN oauth_credentials oc ON u.id = oc.user_id
WHERE oc.provider = 'google'
AND oc.provider_user_id = '123456789'
AND oc.is_primary = true;

-- Check duplicate email during registration
SELECT COUNT(*) as email_exists
FROM users
WHERE LOWER(email) = LOWER('newresident@example.com');

-- Check duplicate IC number during registration
SELECT COUNT(*) as ic_exists
FROM users
WHERE ic_number = '123456789012';

-- ============================================================================
-- PASSWORD RESET & EMAIL VERIFICATION
-- ============================================================================

-- Create password reset token
INSERT INTO password_reset_tokens (user_id, token, expires_at)
VALUES (
    (SELECT id FROM users WHERE email = 'user@example.com'),
    'secure_random_token_here',
    NOW() + INTERVAL '24 hours'
)
RETURNING id, token, expires_at;

-- Validate password reset token
SELECT prt.*, u.email
FROM password_reset_tokens prt
JOIN users u ON prt.user_id = u.id
WHERE prt.token = 'secure_random_token_here'
AND prt.expires_at > NOW()
AND prt.used_at IS NULL;

-- Mark password reset token as used
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE id = 'token_id_here'
RETURNING id, used_at;

-- Find valid email verification tokens
SELECT evt.*, u.email
FROM email_verification_tokens evt
JOIN users u ON evt.user_id = u.id
WHERE evt.token = 'verification_token_here'
AND evt.expires_at > NOW()
AND evt.verified_at IS NULL;

-- ============================================================================
-- USER PROFILE QUERIES
-- ============================================================================

-- Get complete user profile
SELECT
    id,
    email,
    full_name,
    phone_number,
    ic_number,
    date_of_birth,
    place_of_birth,
    age,
    sex,
    race,
    marital_status,
    num_dependents,
    taman_name,
    house_number,
    jalan_aman_serenia,
    job_title,
    employer_name,
    employer_address,
    employer_phone,
    status,
    is_verified,
    created_at,
    updated_at
FROM users
WHERE id = 'user_id_here';

-- Get residents by taman/housing complex
SELECT
    id,
    email,
    full_name,
    phone_number,
    house_number,
    jalan_aman_serenia,
    status,
    is_verified,
    created_at
FROM users
WHERE taman_name = 'Taman Name'
AND is_active = true
ORDER BY house_number ASC;

-- Search residents by name (with fuzzy matching)
SELECT
    id,
    email,
    full_name,
    phone_number,
    taman_name,
    house_number
FROM users
WHERE full_name ILIKE '%John%'
AND is_active = true
ORDER BY full_name ASC;

-- Find residents with missing critical information
SELECT
    id,
    email,
    full_name,
    ic_number,
    date_of_birth,
    place_of_birth,
    job_title,
    employer_name
FROM users
WHERE (
    ic_number IS NULL
    OR date_of_birth IS NULL
    OR place_of_birth IS NULL
    OR job_title IS NULL
    OR employer_name IS NULL
)
AND is_verified = true;

-- ============================================================================
-- SECURITY & AUTHENTICATION MONITORING
-- ============================================================================

-- Find locked accounts (failed login attempts)
SELECT
    id,
    email,
    full_name,
    failed_login_attempts,
    account_locked_until,
    last_login,
    created_at
FROM users
WHERE account_locked_until > NOW()
ORDER BY account_locked_until DESC;

-- Get login history for a user
SELECT
    id,
    action,
    ip_address,
    user_agent,
    status,
    created_at
FROM audit_logs
WHERE user_id = 'user_id_here'
AND action IN ('login', 'logout')
ORDER BY created_at DESC
LIMIT 50;

-- Detect suspicious login activity (failed logins in last hour)
SELECT
    user_id,
    COUNT(*) as failed_attempts,
    MAX(created_at) as last_attempt,
    array_agg(DISTINCT ip_address) as ip_addresses
FROM audit_logs
WHERE action = 'login'
AND status = 'failure'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 3
ORDER BY failed_attempts DESC;

-- ============================================================================
-- OAUTH MANAGEMENT QUERIES
-- ============================================================================

-- Get all OAuth credentials for a user
SELECT
    id,
    provider,
    is_primary,
    last_used,
    created_at,
    expires_at
FROM oauth_credentials
WHERE user_id = 'user_id_here'
ORDER BY is_primary DESC, last_used DESC NULLS LAST;

-- Find expired OAuth tokens
SELECT
    id,
    user_id,
    provider,
    expires_at
FROM oauth_credentials
WHERE expires_at IS NOT NULL
AND expires_at < NOW()
AND is_primary = true
ORDER BY expires_at ASC;

-- Get users connected to specific OAuth provider
SELECT
    u.id,
    u.email,
    u.full_name,
    oc.provider,
    oc.is_primary,
    oc.last_used,
    oc.created_at
FROM users u
JOIN oauth_credentials oc ON u.id = oc.user_id
WHERE oc.provider = 'google'
AND u.is_active = true
ORDER BY oc.last_used DESC NULLS LAST;

-- ============================================================================
-- AUDIT LOG QUERIES
-- ============================================================================

-- Get audit trail for a specific user
SELECT
    id,
    action,
    resource_type,
    description,
    status,
    ip_address,
    created_at
FROM audit_logs
WHERE user_id = 'user_id_here'
ORDER BY created_at DESC
LIMIT 100;

-- Get all failed operations (security incidents)
SELECT
    id,
    user_id,
    action,
    resource_type,
    error_message,
    ip_address,
    created_at
FROM audit_logs
WHERE status = 'failure'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Get password reset history
SELECT
    id,
    user_id,
    action,
    description,
    ip_address,
    created_at
FROM audit_logs
WHERE action = 'password_reset'
AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Profile update audit trail
SELECT
    id,
    user_id,
    action,
    changes,
    created_at
FROM audit_logs
WHERE action = 'profile_update'
AND user_id = 'user_id_here'
ORDER BY created_at DESC;

-- ============================================================================
-- ANALYTICS QUERIES
-- ============================================================================

-- User registration trend (daily)
SELECT
    DATE(created_at) as registration_date,
    COUNT(*) as new_users,
    COUNT(*) FILTER (WHERE is_verified = true) as verified_users
FROM users
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY registration_date DESC;

-- Verification status breakdown
SELECT
    status as registration_status,
    verification_status,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM users
GROUP BY status, verification_status
ORDER BY count DESC;

-- User distribution by housing complex
SELECT
    taman_name,
    COUNT(*) as resident_count,
    COUNT(*) FILTER (WHERE is_verified = true) as verified_residents,
    COUNT(*) FILTER (WHERE is_active = true) as active_residents
FROM users
WHERE taman_name IS NOT NULL
GROUP BY taman_name
ORDER BY resident_count DESC;

-- Account status summary
SELECT
    status,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE is_verified = true) as verified,
    ROUND(AVG(EXTRACT(DAY FROM (NOW() - created_at))), 1) as avg_age_days
FROM users
GROUP BY status
ORDER BY total DESC;

-- Most common races/ethnicities
SELECT
    race,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM users
WHERE race IS NOT NULL
GROUP BY race
ORDER BY count DESC;

-- Employment analysis
SELECT
    employer_name,
    COUNT(*) as employee_count,
    COUNT(DISTINCT job_title) as unique_job_titles
FROM users
WHERE employer_name IS NOT NULL
AND is_verified = true
GROUP BY employer_name
HAVING COUNT(*) >= 3
ORDER BY employee_count DESC;

-- ============================================================================
-- DATA MAINTENANCE QUERIES
-- ============================================================================

-- Find and clean expired password reset tokens (safe delete)
SELECT COUNT(*)
FROM password_reset_tokens
WHERE expires_at < NOW() - INTERVAL '7 days'
AND used_at IS NOT NULL;

-- Find and clean expired verification tokens
SELECT COUNT(*)
FROM email_verification_tokens
WHERE expires_at < NOW() - INTERVAL '30 days'
AND verified_at IS NOT NULL;

-- Find inactive accounts (no login in 90 days)
SELECT
    id,
    email,
    full_name,
    last_login,
    created_at,
    status
FROM users
WHERE last_login < NOW() - INTERVAL '90 days'
AND is_active = true
ORDER BY last_login ASC;

-- Reset failed login attempts for accounts (manual unlock)
UPDATE users
SET failed_login_attempts = 0, account_locked_until = NULL
WHERE account_locked_until < NOW()
RETURNING id, email, failed_login_attempts, account_locked_until;

-- ============================================================================
-- EXPORT QUERIES (for data management/reporting)
-- ============================================================================

-- Export verified residents list
COPY (
    SELECT
        id,
        email,
        full_name,
        phone_number,
        ic_number,
        date_of_birth,
        sex,
        race,
        marital_status,
        taman_name,
        house_number,
        job_title,
        employer_name,
        created_at
    FROM users
    WHERE is_verified = true
    AND is_active = true
    ORDER BY created_at DESC
) TO STDOUT WITH CSV HEADER;

-- Export audit trail for compliance report
COPY (
    SELECT
        a.id,
        u.email,
        a.action,
        a.resource_type,
        a.status,
        a.ip_address,
        a.created_at
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.created_at > NOW() - INTERVAL '90 days'
    ORDER BY a.created_at DESC
) TO STDOUT WITH CSV HEADER;
