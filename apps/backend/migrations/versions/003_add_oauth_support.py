"""Add OAuth credentials table for Google, Microsoft, and Apple integration

Revision ID: 003
Revises: 002
Create Date: 2026-06-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create OAuth provider enum
    op.execute("""
        CREATE TYPE oauth_provider_enum AS ENUM (
            'google',
            'microsoft',
            'apple',
            'github'
        )
    """)
    
    # Create OAuth credentials table
    op.create_table(
        'oauth_credentials',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.Enum('google', 'microsoft', 'apple', 'github', name='oauth_provider_enum'), nullable=False),
        sa.Column('provider_user_id', sa.String(255), nullable=False),  # OAuth provider's user ID
        sa.Column('access_token', sa.String(500), nullable=False),
        sa.Column('refresh_token', sa.String(500), nullable=True),
        sa.Column('token_type', sa.String(20), nullable=False, server_default='Bearer'),
        sa.Column('expires_at', sa.DateTime, nullable=True),
        sa.Column('scope', sa.String(500), nullable=True),
        sa.Column('raw_data', postgresql.JSON, nullable=True),  # Store additional provider-specific data
        sa.Column('is_primary', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('last_used', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('provider', 'provider_user_id', name='uq_oauth_provider_user'),
    )
    
    # Create indexes for OAuth queries
    op.create_index('idx_oauth_credentials_user_id', 'oauth_credentials', ['user_id'])
    op.create_index('idx_oauth_credentials_provider', 'oauth_credentials', ['provider'])
    op.create_index('idx_oauth_credentials_provider_user_id', 'oauth_credentials', ['provider', 'provider_user_id'], unique=True)
    op.create_index('idx_oauth_credentials_is_primary', 'oauth_credentials', ['is_primary'])
    op.create_index('idx_oauth_credentials_expires_at', 'oauth_credentials', ['expires_at'])
    
    # Create composite index for common OAuth lookup
    op.create_index(
        'idx_oauth_credentials_user_provider',
        'oauth_credentials',
        ['user_id', 'provider']
    )
    
    # Add oauth_id columns to users table for OAuth provider IDs
    op.add_column('users', sa.Column('google_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('microsoft_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('apple_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('github_id', sa.String(255), nullable=True))
    
    # Create unique indexes for OAuth IDs
    op.create_index('idx_users_google_id', 'users', ['google_id'], unique=True)
    op.create_index('idx_users_microsoft_id', 'users', ['microsoft_id'], unique=True)
    op.create_index('idx_users_apple_id', 'users', ['apple_id'], unique=True)
    op.create_index('idx_users_github_id', 'users', ['github_id'], unique=True)


def downgrade() -> None:
    op.drop_index('idx_users_github_id')
    op.drop_index('idx_users_apple_id')
    op.drop_index('idx_users_microsoft_id')
    op.drop_index('idx_users_google_id')
    
    op.drop_column('users', 'github_id')
    op.drop_column('users', 'apple_id')
    op.drop_column('users', 'microsoft_id')
    op.drop_column('users', 'google_id')
    
    op.drop_index('idx_oauth_credentials_user_provider')
    op.drop_index('idx_oauth_credentials_expires_at')
    op.drop_index('idx_oauth_credentials_is_primary')
    op.drop_index('idx_oauth_credentials_provider_user_id')
    op.drop_index('idx_oauth_credentials_provider')
    op.drop_index('idx_oauth_credentials_user_id')
    
    op.drop_table('oauth_credentials')
    op.execute("DROP TYPE IF EXISTS oauth_provider_enum")
