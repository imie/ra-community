"""Add audit logging table for compliance and security tracking

Revision ID: 002
Revises: 001
Create Date: 2026-06-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:

    
    # Create audit logs table for compliance and security tracking
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),  # NULL for system actions
        sa.Column('action', sa.Enum(
            'create', 'update', 'delete', 'login', 'logout',
            'password_reset', 'email_verification', 'profile_update',
            'account_lock', 'account_unlock', 'permission_change',
            'export', 'import',
            name='audit_action_enum'
        ), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=False),  # 'user', 'profile', etc.
        sa.Column('resource_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('changes', postgresql.JSON, nullable=True),  # Before/after values
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.String(255), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='success'),  # success, failure
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )
    
    # Create indexes for audit log queries
    op.create_index('idx_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('idx_audit_logs_resource_type', 'audit_logs', ['resource_type'])
    op.create_index('idx_audit_logs_resource_id', 'audit_logs', ['resource_id'])
    op.create_index('idx_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('idx_audit_logs_status', 'audit_logs', ['status'])
    
    # Composite indexes for common queries
    op.create_index(
        'idx_audit_logs_user_action_created',
        'audit_logs',
        ['user_id', 'action', 'created_at']
    )
    
    op.create_index(
        'idx_audit_logs_resource_created',
        'audit_logs',
        ['resource_type', 'resource_id', 'created_at']
    )
    
    # Partial index for failed actions (compliance audits)
    op.create_index(
        'idx_audit_logs_failures',
        'audit_logs',
        ['created_at', 'user_id'],
        postgresql_where=text("status = 'failure'")
    )


def downgrade() -> None:
    op.drop_index('idx_audit_logs_failures')
    op.drop_index('idx_audit_logs_user_action_created')
    op.drop_index('idx_audit_logs_resource_created')
    op.drop_index('idx_audit_logs_status')
    op.drop_index('idx_audit_logs_created_at')
    op.drop_index('idx_audit_logs_resource_id')
    op.drop_index('idx_audit_logs_resource_type')
    op.drop_index('idx_audit_logs_action')
    op.drop_index('idx_audit_logs_user_id')
    
    op.drop_table('audit_logs')
    op.execute("DROP TYPE IF EXISTS audit_action_enum")
