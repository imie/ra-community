# PostgreSQL Backup & Restore Procedures

## Overview

This document provides comprehensive backup and disaster recovery procedures for the RA Community Management System PostgreSQL database.

## Backup Strategy

### 1. **Backup Types**

#### Physical Backup (File-level)
- **Frequency:** Daily
- **Retention:** 30 days
- **Speed:** Fastest
- **Storage:** ~5-10GB per backup (compressed)
- **Recovery Time:** 15-30 minutes

#### Logical Backup (pg_dump)
- **Frequency:** Daily
- **Retention:** 90 days
- **Speed:** Slower but transportable
- **Storage:** ~2-5GB per backup (compressed)
- **Recovery Time:** 30-60 minutes

#### Transaction Log Archiving (WAL)
- **Frequency:** Continuous
- **Retention:** 14 days
- **Point-in-Time Recovery:** Yes
- **Storage:** ~500MB-1GB per day

### 2. **Automated Backup Script**

Create `/apps/backend/scripts/backup_database.sh`:

```bash
#!/bin/bash
# Database backup script with automated retention management

set -e

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-ra_db}
DB_USER=${DB_USER:-ra_user}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/postgres}
RETENTION_DAYS=${RETENTION_DAYS:-30}
LOG_FILE="${BACKUP_DIR}/backup.log"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ra_db_backup_${TIMESTAMP}.sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup of ${DB_NAME}..." | tee -a "${LOG_FILE}"

# Perform backup
if PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -Fc \
    -v \
    "${DB_NAME}" | gzip > "${BACKUP_FILE}"; then
    
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed successfully - Size: ${SIZE}" | tee -a "${LOG_FILE}"
    
    # Create backup metadata file
    cat > "${BACKUP_FILE}.meta" << EOF
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database": "${DB_NAME}",
  "size": "$(du -b "${BACKUP_FILE}" | cut -f1)",
  "format": "custom",
  "compression": "gzip",
  "host": "${DB_HOST}",
  "version": "$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -t -c 'SELECT version();')"
}
EOF
    
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup FAILED" | tee -a "${LOG_FILE}"
    exit 1
fi

# Clean up old backups (retention policy)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning up backups older than ${RETENTION_DAYS} days..." | tee -a "${LOG_FILE}"
find "${BACKUP_DIR}" -name "ra_db_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Total backup directory size: ${TOTAL_SIZE}" | tee -a "${LOG_FILE}"

echo "" >> "${LOG_FILE}"
```

### 3. **Docker Backup Script**

For containerized deployments:

```bash
#!/bin/bash
# Backup script for Docker Postgres container

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="ra_db_backup_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="ra-community-postgres-1"

# Backup from running container
docker exec "${CONTAINER_NAME}" pg_dump \
    -U ra_user \
    -d ra_db \
    -Fc \
    -v | gzip > "${BACKUP_FILE}"

echo "Backup completed: ${BACKUP_FILE}"

# Copy to persistent volume
docker cp "${BACKUP_FILE}" "${CONTAINER_NAME}:/var/backups/postgres/"
```

### 4. **Cron Job Setup**

Add to `/etc/cron.d/postgres-backup`:

```cron
# Daily backup at 2 AM
0 2 * * * postgres /usr/local/bin/backup_database.sh >> /var/log/postgres-backup.log 2>&1

# Weekly full backup at 3 AM on Sunday
0 3 * * 0 postgres /usr/local/bin/backup_database_full.sh >> /var/log/postgres-backup.log 2>&1

# Cleanup old backups daily at 4 AM
0 4 * * * postgres find /var/backups/postgres -name "*.gz" -mtime +30 -delete
```

## Restore Procedures

### 1. **Full Database Restore**

```bash
#!/bin/bash
# Full database restore script

BACKUP_FILE=$1
RESTORE_DB=${RESTORE_DB:-ra_db_restore}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-ra_user}

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: restore_database.sh <backup_file>"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "Preparing to restore from: ${BACKUP_FILE}"
echo "Target database: ${RESTORE_DB}"
echo "Target host: ${DB_HOST}:${DB_PORT}"
echo ""
echo "WARNING: This will overwrite the database!"
read -p "Continue? (yes/no): " -r CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Create restore database
echo "Creating restore database..."
PGPASSWORD="${DB_PASSWORD}" createdb \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    "${RESTORE_DB}" || echo "Database may already exist"

# Restore from backup
echo "Starting restore..."
PGPASSWORD="${DB_PASSWORD}" pg_restore \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${RESTORE_DB}" \
    -v \
    --exit-on-error \
    "${BACKUP_FILE}"

echo "Restore completed successfully"
```

### 2. **Selective Restore (Specific Tables)**

```bash
#!/bin/bash
# Restore specific tables from backup

BACKUP_FILE=$1
TABLE_NAME=$2
TARGET_DB=${TARGET_DB:-ra_db}

if [ -z "${BACKUP_FILE}" ] || [ -z "${TABLE_NAME}" ]; then
    echo "Usage: restore_table.sh <backup_file> <table_name>"
    exit 1
fi

echo "Restoring table: ${TABLE_NAME} from ${BACKUP_FILE}"

PGPASSWORD="${DB_PASSWORD}" pg_restore \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${TARGET_DB}" \
    --table="${TABLE_NAME}" \
    -v \
    "${BACKUP_FILE}"

echo "Table restore completed"
```

### 3. **Point-in-Time Recovery (PITR)**

**Prerequisites:** WAL archiving must be enabled

```sql
-- Find available backups and WAL files
SELECT 
    name,
    backup_label,
    pg_size_pretty(wal_bytes) as wal_size
FROM pg_available_backup_details();

-- Restore to specific point in time
-- Step 1: Restore base backup
pg_restore -d ra_db backup_20240610_020000.sql.gz

-- Step 2: Create recovery configuration
-- File: /var/lib/postgresql/14/main/recovery.conf
cat << 'EOF' > /var/lib/postgresql/14/main/recovery.conf
restore_command = 'cp /var/backups/postgres/wal/%f %p'
recovery_target_timeline = 'latest'
recovery_target_time = '2024-06-10 15:30:00'  -- Restore to this time
recovery_target_inclusive = true
EOF

-- Step 3: Start PostgreSQL
systemctl start postgresql
```

## Disaster Recovery Plan

### Recovery Time Objective (RTO)
- **Target:** 30 minutes maximum
- **Full restore:** 15-20 minutes
- **Verification:** 10 minutes

### Recovery Point Objective (RPO)
- **Target:** 15 minutes maximum
- **Backup frequency:** Every 4 hours + continuous WAL archiving
- **Data loss limit:** < 15 minutes of transactions

### Recovery Procedures

#### Scenario 1: Data Corruption

```bash
# 1. Identify corruption
SELECT * FROM users LIMIT 1;  -- Error or suspicious data

# 2. Stop application
docker-compose stop backend

# 3. Restore from previous backup
restore_database.sh /var/backups/postgres/ra_db_backup_20240610_180000.sql.gz

# 4. Verify data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM audit_logs;

# 5. Restart application
docker-compose up -d backend
```

#### Scenario 2: Accidental Deletion

```sql
-- Use PITR to recover deleted records
-- 1. Restore to point before deletion
-- 2. Query recovered data
SELECT * FROM users WHERE created_at > '2024-06-10 13:00:00'

-- 3. Export recovered data
COPY (SELECT * FROM users WHERE deleted_at > '2024-06-10 13:00:00') 
TO '/tmp/recovered_users.csv' WITH CSV HEADER;

-- 4. Import back to production database
COPY users FROM '/tmp/recovered_users.csv' WITH CSV HEADER;
```

#### Scenario 3: Storage Failure

```bash
# 1. Provision new storage
# 2. Restore PostgreSQL container with new volume
docker-compose down
# Update docker-compose.yml with new volume

docker-compose up -d postgres

# 3. Restore database from backup
restore_database.sh /external_backup/ra_db_backup_latest.sql.gz

# 4. Verify and restart services
docker-compose up -d
```

## Backup Verification

### 1. **Verify Backup Integrity**

```bash
#!/bin/bash
# Verify backup file integrity

BACKUP_FILE=$1

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: verify_backup.sh <backup_file>"
    exit 1
fi

echo "Verifying backup: ${BACKUP_FILE}"

# Check file size
SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "Backup size: ${SIZE}"

# Check file header
if file "${BACKUP_FILE}" | grep -q "gzip"; then
    echo "✓ File format: gzip compressed"
else
    echo "✗ ERROR: Not a valid gzip file"
    exit 1
fi

# Verify gzip integrity
if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    echo "✓ Gzip integrity: OK"
else
    echo "✗ ERROR: Gzip integrity check failed"
    exit 1
fi

# List backup contents
echo ""
echo "Backup contents:"
tar -tzf "${BACKUP_FILE}" | head -20

echo ""
echo "Backup verification completed"
```

### 2. **Test Restore Process**

```bash
#!/bin/bash
# Test restore to verify backup is usable

BACKUP_FILE=$1
TEST_DB="ra_db_test"

echo "Testing restore process..."

# Create test database
dropdb --if-exists "${TEST_DB}"
createdb "${TEST_DB}"

# Restore to test database
pg_restore -d "${TEST_DB}" "${BACKUP_FILE}"

# Run validation queries
echo "Validating restored data..."
psql -d "${TEST_DB}" << EOF
SELECT 'Users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'OAuth Credentials', COUNT(*) FROM oauth_credentials;
EOF

# Cleanup
dropdb "${TEST_DB}"
echo "Test restore completed"
```

## Monitoring & Alerting

### 1. **Backup Success Monitoring**

```python
# apps/backend/services/backup_monitor.py
import os
import time
from datetime import datetime, timedelta
from pathlib import Path

class BackupMonitor:
    def __init__(self, backup_dir="/var/backups/postgres"):
        self.backup_dir = Path(backup_dir)
    
    def get_latest_backup(self):
        """Get most recent backup file"""
        backups = sorted(self.backup_dir.glob("ra_db_backup_*.sql.gz"), reverse=True)
        return backups[0] if backups else None
    
    def check_backup_age(self, max_age_hours=25):
        """Check if latest backup is recent"""
        backup = self.get_latest_backup()
        if not backup:
            return False, "No backup found"
        
        age_hours = (time.time() - backup.stat().st_mtime) / 3600
        if age_hours > max_age_hours:
            return False, f"Latest backup is {age_hours:.1f} hours old"
        return True, f"Latest backup is {age_hours:.1f} hours old"
    
    def get_backup_size(self):
        """Get total backup directory size"""
        total = sum(f.stat().st_size for f in self.backup_dir.glob("*.sql.gz"))
        return total / (1024**3)  # Convert to GB
    
    def cleanup_old_backups(self, retention_days=30):
        """Remove backups older than retention period"""
        cutoff = datetime.now() - timedelta(days=retention_days)
        removed = 0
        for backup in self.backup_dir.glob("ra_db_backup_*.sql.gz"):
            mtime = datetime.fromtimestamp(backup.stat().st_mtime)
            if mtime < cutoff:
                backup.unlink()
                removed += 1
        return removed
```

### 2. **Alert Configuration**

```yaml
# prometheus/alerts.yml
groups:
  - name: database_backup
    rules:
      - alert: DatabaseBackupMissing
        expr: time() - file_mtime("/var/backups/postgres/ra_db_backup_*.sql.gz") > 90000  # > 25 hours
        annotations:
          summary: "Database backup missing or outdated"
          description: "No recent backup found for RA database"
      
      - alert: BackupSizeTooSmall
        expr: file_size("/var/backups/postgres/ra_db_backup_latest.sql.gz") < 1000000000  # < 1GB
        annotations:
          summary: "Database backup suspiciously small"
          description: "Latest backup is less than 1GB - may indicate backup failure"
```

## Backup Storage Recommendations

### Local Storage
- **Location:** `/var/backups/postgres` on local SSD
- **Retention:** 30 days
- **Space:** ~10GB minimum

### Remote Storage (Required)
- **Location:** S3, GCS, or dedicated backup storage
- **Retention:** 90 days
- **Replication:** Multiple geographic regions
- **Encryption:** AES-256 encryption at rest

### S3 Upload Script

```bash
#!/bin/bash
# Upload backup to AWS S3

BACKUP_FILE=$1
S3_BUCKET="s3://ra-community-backups"
S3_PATH="${S3_BUCKET}/postgres/$(date +%Y/%m/%d)/"

aws s3 cp "${BACKUP_FILE}" "${S3_PATH}" \
    --sse AES256 \
    --storage-class GLACIER_IR \
    --metadata "backup-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Backup uploaded to ${S3_PATH}"
```

---
**Last Updated:** 2026-06-10  
**Document Version:** 1.0
