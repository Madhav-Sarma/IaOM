"""remove password from users table

Revision ID: g3d0f2c1e5b6
Revises: f2c9e1b3a4d5
Create Date: 2025-12-27 12:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g3d0f2c1e5b6'
down_revision: Union[str, Sequence[str], None] = 'f2c9e1b3a4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade: Remove password column from users table (now stored in person table)."""
    op.drop_column('users', 'password')


def downgrade() -> None:
    """Downgrade: Add password column back to users table."""
    op.add_column('users', sa.Column('password', sa.String(255), nullable=False, server_default='password'))
