"""hybrid search, citation offsets, answer confidence

- chunks.char_start / char_end: where a chunk sits in its page, so a citation opens on the exact passage.
  Null for chunks indexed before: the viewer then finds the passage by its text.
- chunks.search_vector: full-text index of the chunk (generated column + GIN index), for keyword search.
  Existing chunks get it right away: Postgres computes it while adding the column.
- messages.confidence / not_found: how strong the evidence behind an answer was, and whether the documents
  answered at all.

Revision ID: 8d9ee8d7bc79
Revises: c0300163f830
Create Date: 2026-11-21 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8d9ee8d7bc79'
down_revision: Union[str, Sequence[str], None] = 'c0300163f830'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # "simple" (no stemming, no stop words: language-neutral, fine for English and French) + unaccent
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    op.execute("CREATE TEXT SEARCH CONFIGURATION chatwave_text (COPY = simple)")
    op.execute(
        "ALTER TEXT SEARCH CONFIGURATION chatwave_text "
        "ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, word, hword, hword_part WITH unaccent, simple"
    )

    op.add_column('chunks', sa.Column('char_start', sa.Integer(), nullable=True))
    op.add_column('chunks', sa.Column('char_end', sa.Integer(), nullable=True))
    op.add_column(
        'chunks',
        sa.Column(
            'search_vector',
            postgresql.TSVECTOR(),
            sa.Computed("to_tsvector('chatwave_text'::regconfig, content)", persisted=True),
            nullable=True,
        ),
    )
    op.create_index('ix_chunks_search_vector', 'chunks', ['search_vector'], unique=False, postgresql_using='gin')

    op.add_column('messages', sa.Column('confidence', sa.String(length=10), nullable=True))
    op.add_column('messages', sa.Column('not_found', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('messages', 'not_found')
    op.drop_column('messages', 'confidence')

    op.drop_index('ix_chunks_search_vector', table_name='chunks', postgresql_using='gin')
    op.drop_column('chunks', 'search_vector')
    op.drop_column('chunks', 'char_end')
    op.drop_column('chunks', 'char_start')

    op.execute("DROP TEXT SEARCH CONFIGURATION chatwave_text")
    # The unaccent extension stays: other objects may use it, and keeping it is harmless
