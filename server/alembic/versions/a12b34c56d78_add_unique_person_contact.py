"""add unique constraint to person_contact

Revision ID: a12b34c56d78
Revises: 5c96faae6689
Create Date: 2025-12-27 00:15:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a12b34c56d78'
down_revision: Union[str, Sequence[str], None] = '5c96faae6689'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add unique constraint on person.person_contact."""
    # Ensure no duplicates exist before applying constraint (optional safeguard)
    # Note: This is a simple constraint addition; handling existing duplicates should be done manually if present.
    op.create_unique_constraint('uq_person_contact', 'person', ['person_contact'])


def downgrade() -> None:
    """Remove unique constraint on person.person_contact."""
    op.drop_constraint('uq_person_contact', 'person', type_='unique')