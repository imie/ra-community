"""Initial schema with users table, enums, and security fields

Revision ID: 001
Revises: 
Create Date: 2026-06-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"pg_trgm\"")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"unaccent\"")
    
    # Create ENUM types
    op.execute("""
        CREATE TYPE user_role_enum AS ENUM (
            'admin',
            'resident',
            'guest'
        )
    """)
    
    op.execute("""
        CREATE TYPE user_status_enum AS ENUM (
            'pending',
            'active',
            'suspended',
            'deactivated'
        )
    """)
    
    op.execute("""
        CREATE TYPE verification_status_enum AS ENUM (
            'not_started',
            'pending',
            'verified',
            'rejected'
        )
    """)
    
    op.execute("""
        CREATE TYPE sex_enum AS ENUM (
            'M',
            'F',
            'Other'
        )
    """)
    
    op.execute("""
        CREATE TYPE race_enum AS ENUM (
            'Malay',
            'Chinese',
            'Indian',
            'Eurasian',
            'Kadazan',
            'Iban',
            'Other'
        )
    """)
    
    op.execute("""
        CREATE TYPE marital_status_enum AS ENUM (
            'single',
            'married',
            'divorced',
            'widowed'
        )
    """)
    
    # Create users table with all 18 data fields
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('phone_number', sa.String(20), nullable=True),
        
        # Core resident information (18 fields)
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('ic_number', sa.String(50), nullable=True),  # Identity Card Number
        sa.Column('date_of_birth', sa.Date, nullable=True),
        sa.Column('place_of_birth', sa.String(255), nullable=True),
        sa.Column('age', sa.Integer, nullable=True),
        sa.Column('sex', sa.Enum('M', 'F', 'Other', name='sex_enum'), nullable=True),
        sa.Column('race', sa.Enum('Malay', 'Chinese', 'Indian', 'Eurasian', 'Kadazan', 'Iban', 'Other', name='race_enum'), nullable=True),
        sa.Column('marital_status', sa.Enum('single', 'married', 'divorced', 'widowed', name='marital_status_enum'), nullable=True),
        sa.Column('num_dependents', sa.Integer, nullable=True, server_default='0'),
        
        # Address information
        sa.Column('taman_name', sa.String(255), nullable=True),  # Housing complex name
        sa.Column('house_number', sa.String(50), nullable=True),
        sa.Column('jalan_aman_serenia', sa.String(255), nullable=True),  # Street address
        
        # Employment information
        sa.Column('job_title', sa.String(255), nullable=True),
        sa.Column('employer_name', sa.String(255), nullable=True),
        sa.Column('employer_address', sa.String(255), nullable=True),
        sa.Column('employer_phone', sa.String(20), nullable=True),
        
        # Account status and verification
        sa.Column('role', sa.Enum('admin', 'resident', 'guest', name='user_role_enum'), nullable=False, server_default='resident'),
        sa.Column('status', sa.Enum('pending', 'active', 'suspended', 'deactivated', name='user_status_enum'), nullable=False, server_default='pending'),
        sa.Column('verification_status', sa.Enum('not_started', 'pending', 'verified', 'rejected', name='verification_status_enum'), nullable=False, server_default='not_started'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('is_verified', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('email_verified_at', sa.DateTime, nullable=True),
        
        # Security fields
        sa.Column('failed_login_attempts', sa.Integer, nullable=False, server_default='0'),
        sa.Column('account_locked_until', sa.DateTime, nullable=True),
        sa.Column('last_login', sa.DateTime, nullable=True),
        sa.Column('last_password_change', sa.DateTime, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_users_email'),
        sa.UniqueConstraint('ic_number', name='uq_users_ic_number'),
    )
    
    # Create indexes for performance optimization
    op.create_index('idx_users_email', 'users', ['email'], unique=True)
    op.create_index('idx_users_ic_number', 'users', ['ic_number'], unique=True)
    op.create_index('idx_users_phone_number', 'users', ['phone_number'])
    op.create_index('idx_users_status', 'users', ['status'])
    op.create_index('idx_users_verification_status', 'users', ['verification_status'])
    op.create_index('idx_users_is_verified', 'users', ['is_verified'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])
    op.create_index('idx_users_updated_at', 'users', ['updated_at'])
    op.create_index('idx_users_taman_name', 'users', ['taman_name'])
    op.create_index('idx_users_house_number', 'users', ['house_number'])
    
    # Create partial indexes for performance on common queries
    op.create_index(
        'idx_users_active_verified',
        'users',
        ['is_active', 'is_verified'],
        postgresql_where=text('is_active = true AND is_verified = true')
    )
    
    op.create_index(
        'idx_users_locked',
        'users',
        ['account_locked_until'],
        postgresql_where=text('account_locked_until IS NOT NULL')
    )
    
    # Create password reset tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('used_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('token', name='uq_password_reset_tokens_token'),
    )
    
    op.create_index('idx_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'])
    op.create_index('idx_password_reset_tokens_token', 'password_reset_tokens', ['token'], unique=True)
    op.create_index('idx_password_reset_tokens_expires_at', 'password_reset_tokens', ['expires_at'])
    
    # Create email verification tokens table
    op.create_table(
        'email_verification_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('verified_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('token', name='uq_email_verification_tokens_token'),
    )
    
    op.create_index('idx_email_verification_tokens_user_id', 'email_verification_tokens', ['user_id'])
    op.create_index('idx_email_verification_tokens_token', 'email_verification_tokens', ['token'], unique=True)
    op.create_index('idx_email_verification_tokens_expires_at', 'email_verification_tokens', ['expires_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_email_verification_tokens_expires_at')
    op.drop_index('idx_email_verification_tokens_token')
    op.drop_index('idx_email_verification_tokens_user_id')
    op.drop_table('email_verification_tokens')
    
    op.drop_index('idx_password_reset_tokens_expires_at')
    op.drop_index('idx_password_reset_tokens_token')
    op.drop_index('idx_password_reset_tokens_user_id')
    op.drop_table('password_reset_tokens')
    
    op.drop_index('idx_users_locked')
    op.drop_index('idx_users_active_verified')
    op.drop_index('idx_users_house_number')
    op.drop_index('idx_users_taman_name')
    op.drop_index('idx_users_updated_at')
    op.drop_index('idx_users_created_at')
    op.drop_index('idx_users_is_verified')
    op.drop_index('idx_users_verification_status')
    op.drop_index('idx_users_status')
    op.drop_index('idx_users_phone_number')
    op.drop_index('idx_users_ic_number')
    op.drop_index('idx_users_email')
    
    op.drop_table('users')
    
    # Drop ENUM types
    op.execute("DROP TYPE IF EXISTS marital_status_enum")
    op.execute("DROP TYPE IF EXISTS race_enum")
    op.execute("DROP TYPE IF EXISTS sex_enum")
    op.execute("DROP TYPE IF EXISTS verification_status_enum")
    op.execute("DROP TYPE IF EXISTS user_status_enum")
    op.execute("DROP TYPE IF EXISTS user_role_enum")
