"""add port_id to products

Revision ID: add_port_id_to_products_20240403
Revises: 7496f96ecb51
Create Date: 2024-04-03

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_port_id_to_products_20240403'
down_revision = '7496f96ecb51'  # 指向前一个版本
branch_labels = None
depends_on = None

def upgrade():
    # 添加port_id字段
    op.add_column('products', sa.Column('port_id', sa.Integer(), nullable=True))
    
    # 添加外键约束
    op.create_foreign_key(
        'fk_products_port_id_ports',
        'products', 'ports',
        ['port_id'], ['id']
    )
    
    # 更新唯一约束
    op.drop_constraint('uix_country_product_name_en', 'products', type_='unique')
    op.create_unique_constraint(
        'uix_country_product_name_port',
        'products',
        ['country_id', 'product_name_en', 'port_id']
    )

def downgrade():
    # 删除新的唯一约束
    op.drop_constraint('uix_country_product_name_port', 'products', type_='unique')
    op.create_unique_constraint(
        'uix_country_product_name_en',
        'products',
        ['country_id', 'product_name_en']
    )
    
    # 删除外键约束
    op.drop_constraint('fk_products_port_id_ports', 'products', type_='foreignkey')
    
    # 删除port_id字段
    op.drop_column('products', 'port_id') 