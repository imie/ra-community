#!/usr/bin/env python3
"""
Database Schema Verification Script

Verifies that all tables, indexes, and constraints are properly created
Useful for post-migration validation and health checks
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime


class DatabaseVerifier:
    def __init__(self, database_url):
        """Initialize database connection"""
        self.connection = psycopg2.connect(database_url)
        self.cursor = self.connection.cursor(cursor_factory=RealDictCursor)
    
    def check_tables(self):
        """Verify all required tables exist"""
        print("\\n=== Checking Tables ===")
        required_tables = [
            'users',
            'password_reset_tokens',
            'email_verification_tokens',
            'oauth_credentials',
            'audit_logs'
        ]
        
        self.cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """)
        existing_tables = {row['table_name'] for row in self.cursor.fetchall()}
        
        for table in required_tables:
            status = "✓" if table in existing_tables else "✗"
            print(f"  {status} {table}")
        
        return all(table in existing_tables for table in required_tables)
    
    def check_indexes(self):
        """Verify critical indexes exist"""
        print("\\n=== Checking Indexes ===")
        
        critical_indexes = [
            ('idx_users_email', 'users'),
            ('idx_users_ic_number', 'users'),
            ('idx_users_status', 'users'),
            ('idx_audit_logs_created_at', 'audit_logs'),
            ('idx_oauth_credentials_user_id', 'oauth_credentials'),
        ]
        
        self.cursor.execute("""
            SELECT indexname, tablename FROM pg_indexes 
            WHERE schemaname = 'public'
        """)
        existing_indexes = {(row['indexname'], row['tablename']) 
                           for row in self.cursor.fetchall()}
        
        all_exist = True
        for index_name, table_name in critical_indexes:
            status = "✓" if (index_name, table_name) in existing_indexes else "✗"
            print(f"  {status} {index_name} on {table_name}")
            if status == "✗":
                all_exist = False
        
        return all_exist
    
    def check_constraints(self):
        """Verify critical constraints exist"""
        print("\\n=== Checking Constraints ===")
        
        constraints = {
            'users': ['uq_users_email', 'uq_users_ic_number'],
            'password_reset_tokens': ['uq_password_reset_tokens_token'],
            'email_verification_tokens': ['uq_email_verification_tokens_token'],
            'oauth_credentials': ['uq_oauth_provider_user'],
        }
        
        all_exist = True
        for table, constraint_list in constraints.items():
            self.cursor.execute(f"""
                SELECT constraint_name FROM information_schema.table_constraints 
                WHERE table_name = '{table}' AND table_schema = 'public'
            """)
            existing_constraints = {row['constraint_name'] 
                                   for row in self.cursor.fetchall()}
            
            for constraint in constraint_list:
                status = "✓" if constraint in existing_constraints else "✗"
                print(f"  {status} {constraint} on {table}")
                if status == "✗":
                    all_exist = False
        
        return all_exist
    
    def check_enum_types(self):
        """Verify all enum types exist"""
        print("\\n=== Checking Enum Types ===")
        
        enum_types = [
            'user_role_enum',
            'user_status_enum',
            'verification_status_enum',
            'sex_enum',
            'race_enum',
            'marital_status_enum',
            'oauth_provider_enum',
            'audit_action_enum',
        ]
        
        self.cursor.execute("""
            SELECT typname FROM pg_type 
            WHERE typkind = 'e' AND typname IN (
                'user_role_enum', 'user_status_enum', 'verification_status_enum',
                'sex_enum', 'race_enum', 'marital_status_enum',
                'oauth_provider_enum', 'audit_action_enum'
            )
        """)
        existing_types = {row['typname'] for row in self.cursor.fetchall()}
        
        all_exist = True
        for enum_type in enum_types:
            status = "✓" if enum_type in existing_types else "✗"
            print(f"  {status} {enum_type}")
            if status == "✗":
                all_exist = False
        
        return all_exist
    
    def check_data_integrity(self):
        """Run data integrity checks"""
        print("\\n=== Checking Data Integrity ===")
        
        # Check for orphaned tokens
        self.cursor.execute("""
            SELECT COUNT(*) as count FROM password_reset_tokens 
            WHERE user_id NOT IN (SELECT id FROM users)
        """)
        orphaned_prt = self.cursor.fetchone()['count']
        status = "✓" if orphaned_prt == 0 else "✗"
        print(f"  {status} Orphaned password reset tokens: {orphaned_prt}")
        
        # Check for invalid email formats
        self.cursor.execute("""
            SELECT COUNT(*) as count FROM users 
            WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$'
        """)
        invalid_emails = self.cursor.fetchone()['count']
        status = "✓" if invalid_emails == 0 else "✗"
        print(f"  {status} Invalid email formats: {invalid_emails}")
        
        # Check for future birth dates
        self.cursor.execute("""
            SELECT COUNT(*) as count FROM users 
            WHERE date_of_birth > CURRENT_DATE
        """)
        future_births = self.cursor.fetchone()['count']
        status = "✓" if future_births == 0 else "✗"
        print(f"  {status} Future birth dates: {future_births}")
        
        return orphaned_prt == 0 and invalid_emails == 0 and future_births == 0
    
    def get_table_statistics(self):
        """Get table statistics"""
        print("\\n=== Table Statistics ===")
        
        self.cursor.execute("""
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                n_live_tup as row_count
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        """)
        
        for row in self.cursor.fetchall():
            print(f"  {row['tablename']}: {row['row_count']} rows, {row['size']}")
    
    def verify_migration_status(self):
        """Check Alembic migration status"""
        print("\\n=== Migration Status ===")
        
        self.cursor.execute("""
            SELECT version_num, description, installed_on 
            FROM alembic_version 
            ORDER BY version_num DESC 
            LIMIT 5
        """)
        
        try:
            migrations = self.cursor.fetchall()
            for migration in migrations:
                print(f"  Version {migration['version_num']}: {migration['description']}")
                print(f"    Installed: {migration['installed_on']}")
        except psycopg2.ProgrammingError:
            print("  ✗ Alembic version table not found (migrations may not have run)")
            return False
        
        return True
    
    def run_all_checks(self):
        """Run all verification checks"""
        print(f"\\n{'='*50}")
        print(f"Database Schema Verification")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print(f"{'='*50}")
        
        results = {
            'Tables': self.check_tables(),
            'Indexes': self.check_indexes(),
            'Constraints': self.check_constraints(),
            'Enum Types': self.check_enum_types(),
            'Data Integrity': self.check_data_integrity(),
        }
        
        self.get_table_statistics()
        self.verify_migration_status()
        
        print(f"\\n{'='*50}")
        print("Verification Summary:")
        print(f"{'='*50}")
        
        all_passed = True
        for check_name, passed in results.items():
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"  {status}: {check_name}")
            if not passed:
                all_passed = False
        
        print(f"{'='*50}")
        if all_passed:
            print("✓ All checks passed!")
        else:
            print("✗ Some checks failed. Please review the output above.")
        print(f"{'='*50}\\n")
        
        return all_passed
    
    def close(self):
        """Close database connection"""
        self.cursor.close()
        self.connection.close()


if __name__ == '__main__':
    # Get database URL from environment
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://ra_user:ra_password@localhost:5432/ra_db'
    )
    
    verifier = DatabaseVerifier(database_url)
    try:
        success = verifier.run_all_checks()
        exit(0 if success else 1)
    finally:
        verifier.close()
