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
    """Add unique constraint on person.person_contact after removing duplicates."""
    # Delete duplicate entries, keeping only the first occurrence (MySQL compatible)
    op.execute("""
        DELETE p FROM person p
        INNER JOIN (
            SELECT MAX(person_id) as person_id FROM person GROUP BY person_contact HAVING COUNT(*) > 1
        ) dupes ON p.person_id = dupes.person_id
    """)
    # Create unique constraint - if it already exists, this is a no-op in MySQL
    op.execute("""
        ALTER TABLE person ADD UNIQUE KEY IF NOT EXISTS uq_person_contact (person_contact)
    """)


def downgrade() -> None:
    """Remove unique constraint on person.person_contact."""
    op.drop_constraint('uq_person_contact', 'person', type_='unique')