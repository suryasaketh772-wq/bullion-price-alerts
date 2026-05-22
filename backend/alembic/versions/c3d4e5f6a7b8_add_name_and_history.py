"""add name to alerts and alert_history table

Revision ID: c3d4e5f6a7b8
Revises: 70d1f12f7866
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = '70d1f12f7866'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('alerts', sa.Column('name', sa.String(), nullable=True))
    op.create_table('alert_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('alert_id', sa.Integer(), nullable=True),
        sa.Column('asset', sa.String(), nullable=False),
        sa.Column('condition', sa.String(), nullable=False),
        sa.Column('target_price', sa.Float(), nullable=False),
        sa.Column('triggered_price', sa.Float(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('triggered_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alert_history_id'), 'alert_history', ['id'], unique=False)
    op.create_index(op.f('ix_alert_history_triggered_at'), 'alert_history', ['triggered_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_alert_history_triggered_at'), table_name='alert_history')
    op.drop_index(op.f('ix_alert_history_id'), table_name='alert_history')
    op.drop_table('alert_history')
    op.drop_column('alerts', 'name')
