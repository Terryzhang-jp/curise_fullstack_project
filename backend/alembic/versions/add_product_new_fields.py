"""add product new fields

Revision ID: 9a8b7c6d5e4f
Revises: 7496f96ecb51
Create Date: 2023-04-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9a8b7c6d5e4f'
down_revision = '7496f96ecb51'
branch_labels = None
depends_on = None


def upgrade():
    # 添加新字段
    op.add_column('products', sa.Column('product_name_en', sa.String(length=100), nullable=True))
    op.add_column('products', sa.Column('product_name_jp', sa.String(length=100), nullable=True))
    op.add_column('products', sa.Column('unit_size', sa.String(length=50), nullable=True))
    op.add_column('products', sa.Column('pack_size', sa.Integer(), nullable=True))
    op.add_column('products', sa.Column('country_of_origin', sa.String(length=50), nullable=True))
    op.add_column('products', sa.Column('brand', sa.String(length=100), nullable=True))
    op.add_column('products', sa.Column('currency', sa.String(length=20), nullable=True))
    
    # 将现有name数据复制到product_name_en
    op.execute("UPDATE products SET product_name_en = name")


def downgrade():
    # 删除新添加的字段
    op.drop_column('products', 'product_name_en')
    op.drop_column('products', 'product_name_jp')
    op.drop_column('products', 'unit_size')
    op.drop_column('products', 'pack_size')
    op.drop_column('products', 'country_of_origin')
    op.drop_column('products', 'brand')
    op.drop_column('products', 'currency') 