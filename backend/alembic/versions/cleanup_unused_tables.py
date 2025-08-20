"""cleanup unused tables

Revision ID: cleanup_unused_tables
Revises: 7496f96ecb51
Create Date: 2025-06-09 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'cleanup_unused_tables'
down_revision = '7496f96ecb51'
branch_labels = None
depends_on = None


def upgrade():
    """删除不使用的表"""
    
    # 第一批：旧上传分析系统（完全不使用）
    try:
        op.drop_table('order_assignments')
    except Exception as e:
        print(f"Error dropping order_assignments: {e}")
    
    try:
        op.drop_table('order_analysis_items')
    except Exception as e:
        print(f"Error dropping order_analysis_items: {e}")
    
    try:
        op.drop_table('order_analyses')
    except Exception as e:
        print(f"Error dropping order_analyses: {e}")
    
    try:
        op.drop_table('upload_order_items')
    except Exception as e:
        print(f"Error dropping upload_order_items: {e}")
    
    try:
        op.drop_table('upload_orders')
    except Exception as e:
        print(f"Error dropping upload_orders: {e}")
    
    try:
        op.drop_table('order_uploads')
    except Exception as e:
        print(f"Error dropping order_uploads: {e}")
    
    # 第二批：未实现的功能表
    try:
        op.drop_table('deliveries')
    except Exception as e:
        print(f"Error dropping deliveries: {e}")
    
    try:
        op.drop_table('inventories')
    except Exception as e:
        print(f"Error dropping inventories: {e}")
    
    try:
        op.drop_table('supplier_product_pricing')
    except Exception as e:
        print(f"Error dropping supplier_product_pricing: {e}")
    
    try:
        op.drop_table('order_processing_items')
    except Exception as e:
        print(f"Error dropping order_processing_items: {e}")
    
    try:
        op.drop_table('product_history')
    except Exception as e:
        print(f"Error dropping product_history: {e}")
    
    try:
        op.drop_table('notification_history')
    except Exception as e:
        print(f"Error dropping notification_history: {e}")


def downgrade():
    """恢复删除的表（仅保留核心表的定义）"""
    
    # 只恢复可能需要的表，其他旧表不再支持
    op.create_table('notification_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('supplier_id', sa.Integer(), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 其他表的恢复略过，因为它们属于旧系统