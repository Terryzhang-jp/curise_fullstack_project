"""add supplier category relation

Revision ID: add_supplier_category_relation
Revises: 3a7459e3350c
Create Date: 2024-03-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_supplier_category_relation'
down_revision = '3a7459e3350c'  # 更新为最新的迁移版本ID
branch_labels = None
depends_on = None

def upgrade():
    # 创建供应商-类别关联表
    op.create_table(
        'supplier_category',
        sa.Column('supplier_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('supplier_id', 'category_id', name='uq_supplier_category')
    )

def downgrade():
    # 删除供应商-类别关联表
    op.drop_table('supplier_category') 