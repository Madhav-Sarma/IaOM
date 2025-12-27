"""add password to person

Revision ID: f2c9e1b3a4d5
Revises: a12b34c56d78
Create Date: 2025-12-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2c9e1b3a4d5'
down_revision: Union[str, Sequence[str], None] = 'a12b34c56d78'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade: Add password column to person table."""
    op.add_column('person', sa.Column('password', sa.String(255), nullable=False, server_default='password'))


def downgrade() -> None:
    """Downgrade: Remove password column from person table."""
    op.drop_column('person', 'password')
