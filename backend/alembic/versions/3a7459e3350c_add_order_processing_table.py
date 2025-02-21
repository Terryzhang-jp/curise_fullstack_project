"""add order processing table

Revision ID: 3a7459e3350c
Revises: 2a7459e3349b
Create Date: 2024-02-11 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '3a7459e3350c'
down_revision = '2a7459e3349b'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'order_processing',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_item_id', sa.Integer(), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), nullable=True, default='pending'),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), nullable=True, default=datetime.utcnow, onupdate=datetime.utcnow),
        sa.ForeignKeyConstraint(['order_item_id'], ['order_items.id'], ),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_order_processing_id'), 'order_processing', ['id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_order_processing_id'), table_name='order_processing')
    op.drop_table('order_processing') 