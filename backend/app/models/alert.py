from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime
from app.db.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    asset = Column(String, index=True)
    target_price = Column(Float, nullable=False)
    condition = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    cooldown_minutes = Column(Integer, default=60)
    last_triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
