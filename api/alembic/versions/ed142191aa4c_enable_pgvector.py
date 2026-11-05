"""enable pgvector

Revision ID: ed142191aa4c
Revises: 49ca0aee660a
Create Date: 2026-11-05 14:23:40.793391

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed142191aa4c'
down_revision: Union[str, Sequence[str], None] = '49ca0aee660a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP EXTENSION IF EXISTS vector")
