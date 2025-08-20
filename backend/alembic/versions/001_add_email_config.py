"""Add email config table

Revision ID: 001_add_email_config
Revises: 
Create Date: 2025-08-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '001_add_email_config'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    """创建email_configs表"""
    op.create_table(
        'email_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('config_name', sa.String(length=100), nullable=False, comment='配置名称'),
        sa.Column('config_type', sa.String(length=20), nullable=False, comment='配置类型: gmail, smtp'),
        sa.Column('is_active', sa.Boolean(), nullable=True, comment='是否启用'),
        sa.Column('is_default', sa.Boolean(), nullable=True, comment='是否为默认配置'),
        sa.Column('gmail_address', sa.String(length=100), nullable=True, comment='Gmail邮箱地址'),
        sa.Column('gmail_app_password', sa.Text(), nullable=True, comment='Gmail App Password (加密存储)'),
        sa.Column('sender_name', sa.String(length=100), nullable=True, comment='发件人显示名称'),
        sa.Column('smtp_host', sa.String(length=100), nullable=True, comment='SMTP服务器地址'),
        sa.Column('smtp_port', sa.Integer(), nullable=True, comment='SMTP端口'),
        sa.Column('use_tls', sa.Boolean(), nullable=True, comment='是否使用TLS'),
        sa.Column('use_ssl', sa.Boolean(), nullable=True, comment='是否使用SSL'),
        sa.Column('timeout', sa.Integer(), nullable=True, comment='连接超时时间(秒)'),
        sa.Column('max_retries', sa.Integer(), nullable=True, comment='最大重试次数'),
        sa.Column('last_test_at', sa.DateTime(), nullable=True, comment='最后测试时间'),
        sa.Column('last_test_result', sa.Boolean(), nullable=True, comment='最后测试结果'),
        sa.Column('last_test_error', sa.Text(), nullable=True, comment='最后测试错误信息'),
        sa.Column('emails_sent', sa.Integer(), nullable=True, comment='已发送邮件数量'),
        sa.Column('last_used_at', sa.DateTime(), nullable=True, comment='最后使用时间'),
        sa.Column('created_at', sa.DateTime(), nullable=True, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(), nullable=True, comment='更新时间'),
        sa.Column('created_by', sa.Integer(), nullable=True, comment='创建者用户ID'),
        sa.Column('updated_by', sa.Integer(), nullable=True, comment='更新者用户ID'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 创建索引
    op.create_index('ix_email_configs_id', 'email_configs', ['id'])
    op.create_index('ix_email_configs_config_type', 'email_configs', ['config_type'])
    op.create_index('ix_email_configs_is_active', 'email_configs', ['is_active'])
    op.create_index('ix_email_configs_is_default', 'email_configs', ['is_default'])
    op.create_index('ix_email_configs_gmail_address', 'email_configs', ['gmail_address'])
    
    # 设置默认值
    op.execute("""
        ALTER TABLE email_configs 
        ALTER COLUMN config_type SET DEFAULT 'gmail',
        ALTER COLUMN is_active SET DEFAULT false,
        ALTER COLUMN is_default SET DEFAULT false,
        ALTER COLUMN smtp_host SET DEFAULT 'smtp.gmail.com',
        ALTER COLUMN smtp_port SET DEFAULT 587,
        ALTER COLUMN use_tls SET DEFAULT true,
        ALTER COLUMN use_ssl SET DEFAULT false,
        ALTER COLUMN timeout SET DEFAULT 30,
        ALTER COLUMN max_retries SET DEFAULT 3,
        ALTER COLUMN emails_sent SET DEFAULT 0
    """)

def downgrade():
    """删除email_configs表"""
    op.drop_index('ix_email_configs_gmail_address', table_name='email_configs')
    op.drop_index('ix_email_configs_is_default', table_name='email_configs')
    op.drop_index('ix_email_configs_is_active', table_name='email_configs')
    op.drop_index('ix_email_configs_config_type', table_name='email_configs')
    op.drop_index('ix_email_configs_id', table_name='email_configs')
    op.drop_table('email_configs')
