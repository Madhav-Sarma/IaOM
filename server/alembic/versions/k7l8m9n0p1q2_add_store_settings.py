"""add store settings columns

Revision ID: k7l8m9n0p1q2
Revises: j6g9h3c2f4b8
Create Date: 2025-12-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'k7l8m9n0p1q2'
down_revision: Union[str, Sequence[str], None] = 'j6g9h3c2f4b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add store-level settings columns."""
    op.add_column('store', sa.Column('low_stock_threshold', sa.Integer(), nullable=False, server_default=sa.text('10')))
    op.add_column('store', sa.Column('restore_stock_on_cancel', sa.Boolean(), nullable=False, server_default=sa.text('1')))
    op.add_column('store', sa.Column('sales_lookback_days', sa.Integer(), nullable=False, server_default=sa.text('30')))
    op.add_column('store', sa.Column('reorder_horizon_days', sa.Integer(), nullable=False, server_default=sa.text('7')))
    op.add_column('store', sa.Column('currency', sa.String(length=8), nullable=False, server_default=sa.text("'₹'")))


def downgrade() -> None:
    """Drop store-level settings columns."""
    op.drop_column('store', 'currency')
    op.drop_column('store', 'reorder_horizon_days')
    op.drop_column('store', 'sales_lookback_days')
    op.drop_column('store', 'restore_stock_on_cancel')
    op.drop_column('store', 'low_stock_threshold')
