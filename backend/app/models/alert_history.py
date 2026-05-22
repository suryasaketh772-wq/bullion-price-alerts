from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.db.database import Base

class AlertHistory(Base):
    __tablename__ = "alert_history"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, nullable=True)
    asset = Column(String, nullable=False)
    condition = Column(String, nullable=False)
    target_price = Column(Float, nullable=False)
    triggered_price = Column(Float, nullable=False)
    name = Column(String, nullable=True)
    triggered_at = Column(DateTime, default=datetime.utcnow, index=True)
