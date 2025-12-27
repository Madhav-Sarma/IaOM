"""fix product table - ensure store_id and inventory columns exist

Revision ID: i5f8g2b9d1a7
Revises: h4e1g5f2d3a6
Create Date: 2025-12-27 12:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


# revision identifiers, used by Alembic.
revision: str = 'i5f8g2b9d1a7'
down_revision: Union[str, Sequence[str], None] = 'h4e1g5f2d3a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade: Add missing columns to product table if they don't exist."""
    from sqlalchemy import inspect
    
    bind = op.get_bind()
    inspector = inspect(bind)
    
    # Check if product table exists
    if 'product' in inspector.get_table_names():
        existing_columns = {col['name'] for col in inspector.get_columns('product')}
        
        # Add store_id column if missing
        if 'store_id' not in existing_columns:
            op.add_column('product', sa.Column('store_id', sa.Integer(), nullable=True))
            op.create_foreign_key(
                'fk_product_store',
                'product',
                'store',
                ['store_id'],
                ['store_id']
            )
        
        # Add inventory column if missing
        if 'inventory' not in existing_columns:
            op.add_column('product', sa.Column('inventory', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade: Remove added columns from product table."""
    from sqlalchemy import inspect
    
    bind = op.get_bind()
    inspector = inspect(bind)
    
    if 'product' in inspector.get_table_names():
        existing_columns = {col['name'] for col in inspector.get_columns('product')}
        
        if 'inventory' in existing_columns:
            op.drop_column('product', 'inventory')
        
        if 'store_id' in existing_columns:
            op.drop_constraint('fk_product_store', 'product', type_='foreignkey')
            op.drop_column('product', 'store_id')
