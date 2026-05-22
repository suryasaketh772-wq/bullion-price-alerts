"""drop price_history table

Revision ID: 70d1f12f7866
Revises: 705ad019dcf8
Create Date: 2026-05-20 14:46:40.148016

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '70d1f12f7866'
down_revision: Union[str, Sequence[str], None] = '705ad019dcf8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index('ix_price_history_timestamp', table_name='price_history')
    op.drop_index('ix_price_history_id', table_name='price_history')
    op.drop_index('ix_price_history_asset', table_name='price_history')
    op.drop_table('price_history')


def downgrade() -> None:
    op.create_table('price_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset', sa.String(), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_price_history_timestamp', 'price_history', ['timestamp'])
    op.create_index('ix_price_history_id', 'price_history', ['id'])
    op.create_index('ix_price_history_asset', 'price_history', ['asset'])
