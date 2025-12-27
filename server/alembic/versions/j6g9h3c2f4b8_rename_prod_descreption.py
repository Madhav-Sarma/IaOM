"""rename prod_descreption to prod_description

Revision ID: j6g9h3c2f4b8
Revises: i5f8g2b9d1a7
Create Date: 2025-12-27 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'j6g9h3c2f4b8'
down_revision: Union[str, Sequence[str], None] = 'i5f8g2b9d1a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename prod_descreption to prod_description."""
    # For MySQL, ALTER COLUMN requires specifying the full column definition
    op.alter_column('product', 'prod_descreption',
                    new_column_name='prod_description',
                    existing_type=sa.String(1000),
                    existing_nullable=True)


def downgrade() -> None:
    """Revert column name back to prod_descreption."""
    op.alter_column('product', 'prod_description',
                    new_column_name='prod_descreption',
                    existing_type=sa.String(1000),
                    existing_nullable=True)
