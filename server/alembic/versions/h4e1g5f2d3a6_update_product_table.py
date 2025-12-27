"""update product table with store_id and inventory

Revision ID: h4e1g5f2d3a6
Revises: g3d0f2c1e5b6
Create Date: 2025-12-27 12:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h4e1g5f2d3a6'
down_revision: Union[str, Sequence[str], None] = 'g3d0f2c1e5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade: Update product table with store_id and inventory columns."""
    # Add store_id column
    op.add_column('product', sa.Column('store_id', sa.Integer, nullable=True))
    
    # Add inventory column
    op.add_column('product', sa.Column('inventory', sa.Integer, nullable=False, server_default='0'))
    
    # Fix typo in column name: prod_descreption -> prod_description
    op.alter_column('product', 'prod_descreption', new_column_name='prod_description', existing_type=sa.String(1000))
    
    # Create foreign key constraint
    op.create_foreign_key(
        'fk_product_store',
        'product',
        'store',
        ['store_id'],
        ['store_id']
    )


def downgrade() -> None:
    """Downgrade: Revert product table changes."""
    op.drop_column('product', 'inventory')
    op.drop_column('product', 'store_id')
    op.alter_column('product', 'prod_description', new_column_name='prod_descreption')
