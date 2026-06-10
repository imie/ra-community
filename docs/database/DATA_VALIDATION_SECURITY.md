# PostgreSQL Schema - Data Validation & Security

## Data Validation Rules

### 1. **Email Validation**

```sql
-- Email format constraint
ALTER TABLE users ADD CONSTRAINT check_valid_email 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Prevent common invalid patterns
CHECK (email NOT LIKE '%@%@%')  -- No double @
CHECK (email NOT LIKE '%.%.')   -- No consecutive dots
CHECK (email NOT LIKE '.%')     -- Cannot start with dot
CHECK (email NOT LIKE '%.$')    -- Cannot end with dot
```

### 2. **IC Number Validation**

**Malaysian IC Format:** YYMMDD-NNN-GGG-S (12 digits + check digit)

```sql
-- IC Number format constraint
ALTER TABLE users ADD CONSTRAINT check_ic_format
CHECK (ic_number ~ '^\d{12}$' OR ic_number ~ '^\d{6}-\d{2}-\d{4}$');

-- Alternative: Store as numeric for faster validation
ALTER TABLE users MODIFY ic_number VARCHAR(20);
```

**IC Number Validation Function:**

```sql
CREATE OR REPLACE FUNCTION validate_ic_number(ic_input VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    ic_clean VARCHAR;
    weights SMALLINT[] := ARRAY[6,5,4,3,2,7,6,5,4,3,2];
    multiplier SMALLINT;
    check_digit SMALLINT;
    i INTEGER;
    sum_value INTEGER := 0;
BEGIN
    -- Clean input: remove dashes and spaces
    ic_clean := REPLACE(REPLACE(ic_input, '-', ''), ' ', '');
    
    -- Must be 12 digits
    IF LENGTH(ic_clean) != 12 OR ic_clean !~ '^\d+$' THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate check digit
    FOR i IN 1..11 LOOP
        sum_value := sum_value + (CAST(SUBSTRING(ic_clean, i, 1) AS SMALLINT) * weights[i]);
    END LOOP;
    
    check_digit := 11 - (sum_value % 11);
    IF check_digit = 10 THEN
        check_digit := 0;
    END IF;
    
    -- Verify check digit
    RETURN CAST(SUBSTRING(ic_clean, 12, 1) AS SMALLINT) = check_digit;
END;
$$ LANGUAGE plpgsql;

-- Add constraint using validation function
ALTER TABLE users ADD CONSTRAINT check_ic_valid
CHECK (ic_number IS NULL OR validate_ic_number(ic_number));
```

### 3. **Phone Number Validation**

```sql
-- Phone number format (allow international format)
CREATE OR REPLACE FUNCTION validate_phone_number(phone VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow: +60123456789, 0123456789, (60) 123456789
    RETURN phone ~ '^\+?[0-9\s().-]{7,20}$'
           AND LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '')) >= 7;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE users ADD CONSTRAINT check_phone_valid
CHECK (phone_number IS NULL OR validate_phone_number(phone_number));
```

### 4. **Date Validation**

```sql
-- Date of birth validations
ALTER TABLE users ADD CONSTRAINT check_birth_date
CHECK (
    date_of_birth IS NULL 
    OR (date_of_birth < CURRENT_DATE AND date_of_birth > CURRENT_DATE - INTERVAL '150 years')
);

-- Age must be consistent with birth date
CREATE OR REPLACE FUNCTION validate_age()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_of_birth IS NOT NULL THEN
        NEW.age := EXTRACT(YEAR FROM AGE(NEW.date_of_birth));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_validate_age BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_age();
```

### 5. **Employment Information Validation**

```sql
-- Employer phone validation
ALTER TABLE users ADD CONSTRAINT check_employer_phone
CHECK (employer_phone IS NULL OR validate_phone_number(employer_phone));

-- Job title length
ALTER TABLE users ADD CONSTRAINT check_job_title_length
CHECK (job_title IS NULL OR LENGTH(TRIM(job_title)) > 0);

-- Employer name length
ALTER TABLE users ADD CONSTRAINT check_employer_length
CHECK (employer_name IS NULL OR LENGTH(TRIM(employer_name)) > 0);
```

### 6. **Address Validation**

```sql
-- House number format
ALTER TABLE users ADD CONSTRAINT check_house_number
CHECK (house_number IS NULL OR LENGTH(TRIM(house_number)) > 0);

-- Taman name (housing complex) required if address provided
CREATE OR REPLACE FUNCTION validate_address()
RETURNS TRIGGER AS $$
BEGIN
    -- If any address field is provided, taman_name must be provided
    IF (NEW.house_number IS NOT NULL OR NEW.jalan_aman_serenia IS NOT NULL)
       AND NEW.taman_name IS NULL THEN
        RAISE EXCEPTION 'Taman name must be provided with complete address';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_validate_address BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_address();
```

## Security Constraints

### 1. **Password Hash Validation**

```sql
-- Password hash must be present for non-OAuth accounts
CREATE OR REPLACE FUNCTION validate_password_hash()
RETURNS TRIGGER AS $$
BEGIN
    -- If no OAuth providers, password hash must exist
    IF NEW.google_id IS NULL 
       AND NEW.microsoft_id IS NULL 
       AND NEW.apple_id IS NULL 
       AND NEW.github_id IS NULL
       AND (NEW.password_hash IS NULL OR LENGTH(TRIM(NEW.password_hash)) < 20) THEN
        RAISE EXCEPTION 'Password hash required for non-OAuth accounts';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_validate_password_hash BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_password_hash();
```

### 2. **Account Status Workflow**

```sql
-- Validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- pending can only transition to active or rejected
    IF OLD.status = 'pending' AND NEW.status NOT IN ('active', 'deactivated') THEN
        RAISE EXCEPTION 'Cannot transition from pending to %', NEW.status;
    END IF;
    
    -- Cannot revert from deactivated
    IF OLD.status = 'deactivated' AND NEW.status != 'deactivated' THEN
        RAISE EXCEPTION 'Cannot reactivate deactivated account';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_validate_status BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_status_transition();
```

### 3. **Email Verification Workflow**

```sql
-- Email verified timestamp should be set when is_verified is true
CREATE OR REPLACE FUNCTION validate_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- If marked as verified, must have verification timestamp
    IF NEW.is_verified = true AND NEW.email_verified_at IS NULL THEN
        NEW.email_verified_at := NOW();
    END IF;
    
    -- If marked as not verified, clear verification timestamp
    IF NEW.is_verified = false THEN
        NEW.email_verified_at := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_validate_verification BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_verification();
```

### 4. **Account Lock Logic**

```sql
-- Account lock duration: 30 minutes after 5 failed attempts
CREATE OR REPLACE FUNCTION enforce_account_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.failed_login_attempts >= 5 THEN
        NEW.account_locked_until := NOW() + INTERVAL '30 minutes';
    ELSIF NEW.failed_login_attempts = 0 THEN
        NEW.account_locked_until := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_enforce_account_lock BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION enforce_account_lock();

-- View: Accounts currently locked
CREATE VIEW v_locked_accounts AS
SELECT 
    id,
    email,
    full_name,
    failed_login_attempts,
    account_locked_until,
    (account_locked_until - NOW()) as time_until_unlock
FROM users
WHERE account_locked_until > NOW()
ORDER BY account_locked_until DESC;
```

### 5. **Token Expiration Validation**

```sql
-- Password reset token must expire between 1-24 hours
ALTER TABLE password_reset_tokens ADD CONSTRAINT check_token_expiry
CHECK (expires_at > created_at + INTERVAL '30 minutes' 
   AND expires_at <= created_at + INTERVAL '24 hours');

-- Email verification token must expire between 1-7 days
ALTER TABLE email_verification_tokens ADD CONSTRAINT check_token_expiry
CHECK (expires_at > created_at + INTERVAL '1 hour' 
   AND expires_at <= created_at + INTERVAL '7 days');

-- OAuth token expiry should be in future
ALTER TABLE oauth_credentials ADD CONSTRAINT check_oauth_expiry
CHECK (expires_at IS NULL OR expires_at > NOW());
```

## Data Integrity Checks

### 1. **Referential Integrity**

```sql
-- All password reset tokens must reference valid users
ALTER TABLE password_reset_tokens
ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- All email verification tokens must reference valid users
ALTER TABLE email_verification_tokens
ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- All OAuth credentials must reference valid users
ALTER TABLE oauth_credentials
ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- All audit logs should reference valid users (soft delete allowed)
ALTER TABLE audit_logs
ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

### 2. **Unique Constraint Checks**

```sql
-- Ensure no duplicate emails
CREATE UNIQUE INDEX uq_users_email ON users(LOWER(email)) 
WHERE is_deleted IS FALSE OR is_deleted IS NULL;

-- Ensure one primary OAuth credential per user
CREATE UNIQUE INDEX uq_primary_oauth_per_user ON oauth_credentials(user_id)
WHERE is_primary = true;

-- Ensure unique IC number
CREATE UNIQUE INDEX uq_users_ic_number ON users(ic_number)
WHERE ic_number IS NOT NULL;
```

### 3. **Data Completeness Checks**

```sql
-- View: Records with missing critical information
CREATE VIEW v_incomplete_profiles AS
SELECT 
    id,
    email,
    full_name,
    COUNT(CASE WHEN ic_number IS NULL THEN 1 END) as missing_ic,
    COUNT(CASE WHEN date_of_birth IS NULL THEN 1 END) as missing_dob,
    COUNT(CASE WHEN job_title IS NULL THEN 1 END) as missing_job,
    COUNT(CASE WHEN taman_name IS NULL THEN 1 END) as missing_address
FROM users
WHERE is_verified = true
GROUP BY id, email, full_name
HAVING COUNT(CASE WHEN ic_number IS NULL THEN 1 END) +
       COUNT(CASE WHEN date_of_birth IS NULL THEN 1 END) +
       COUNT(CASE WHEN job_title IS NULL THEN 1 END) +
       COUNT(CASE WHEN taman_name IS NULL THEN 1 END) > 0;
```

## Audit Logging for Data Changes

```sql
-- Audit trail for sensitive data changes
CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log all changes to user profiles
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        description,
        changes
    ) VALUES (
        NEW.id,
        CASE WHEN TG_OP = 'INSERT' THEN 'create'
             WHEN TG_OP = 'UPDATE' THEN 'profile_update'
             WHEN TG_OP = 'DELETE' THEN 'delete'
        END,
        'user',
        NEW.id,
        CASE WHEN TG_OP = 'INSERT' THEN 'User profile created'
             WHEN TG_OP = 'UPDATE' THEN 'User profile updated'
             WHEN TG_OP = 'DELETE' THEN 'User profile deleted'
        END,
        jsonb_build_object(
            'before', to_jsonb(OLD),
            'after', to_jsonb(NEW)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_audit_user_changes 
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_user_changes();
```

## Data Sanitization

### 1. **Input Sanitization Function**

```sql
CREATE OR REPLACE FUNCTION sanitize_text(input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove leading/trailing whitespace
    input := TRIM(input);
    -- Remove special characters (keep alphanumeric, spaces, hyphens, dots)
    input := REGEXP_REPLACE(input, '[^a-zA-Z0-9\s\-\.]', '', 'g');
    -- Remove multiple consecutive spaces
    input := REGEXP_REPLACE(input, '\s+', ' ', 'g');
    RETURN input;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 2. **Apply Sanitization on Insert/Update**

```sql
CREATE OR REPLACE FUNCTION sanitize_user_input()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name := sanitize_text(NEW.full_name);
    NEW.place_of_birth := sanitize_text(NEW.place_of_birth);
    NEW.taman_name := sanitize_text(NEW.taman_name);
    NEW.job_title := sanitize_text(NEW.job_title);
    NEW.employer_name := sanitize_text(NEW.employer_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sanitize_user_input BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION sanitize_user_input();
```

## Regular Data Quality Checks

```sql
-- Run weekly to identify data quality issues
SELECT 
    'Duplicate Emails' as issue,
    COUNT(*) as count
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1

UNION ALL

SELECT 
    'Invalid Birth Dates' as issue,
    COUNT(*) 
FROM users
WHERE date_of_birth > CURRENT_DATE

UNION ALL

SELECT 
    'Age Mismatch' as issue,
    COUNT(*)
FROM users
WHERE date_of_birth IS NOT NULL
AND AGE(date_of_birth) != make_interval(years => age)

UNION ALL

SELECT 
    'Orphaned Tokens' as issue,
    COUNT(*)
FROM password_reset_tokens
WHERE user_id NOT IN (SELECT id FROM users)

UNION ALL

SELECT 
    'Expired Active Tokens' as issue,
    COUNT(*)
FROM password_reset_tokens
WHERE expires_at < NOW()
AND used_at IS NULL;
```

---
**Last Updated:** 2026-06-10  
**Document Version:** 1.0
