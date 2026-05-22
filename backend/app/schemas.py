from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class AlertBase(BaseModel):
    asset: str
    target_price: float
    condition: str
    cooldown_minutes: Optional[int] = 60
    name: Optional[str] = None

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v: str) -> str:
        if v not in ("above", "below"):
            raise ValueError("condition must be 'above' or 'below'")
        return v

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    active: bool
    last_triggered_at: Optional[datetime] = None
    created_at: datetime
    name: Optional[str] = None

    class Config:
        from_attributes = True
    
    def model_post_init(self, __context):
        # Ensure last_triggered_at is timezone-aware
        if self.last_triggered_at and self.last_triggered_at.tzinfo is None:
            from datetime import timezone
            object.__setattr__(self, 'last_triggered_at', 
                self.last_triggered_at.replace(tzinfo=timezone.utc))

class PriceResponse(BaseModel):
    gold: Optional[float]
    silver: Optional[float]
    gold_high: Optional[float] = None
    gold_low: Optional[float] = None
    silver_high: Optional[float] = None
    silver_low: Optional[float] = None
    usdinr: Optional[float] = None
    usdinr_high: Optional[float] = None
    usdinr_low: Optional[float] = None

class AlertHistoryResponse(BaseModel):
    id: int
    alert_id: Optional[int] = None
    asset: str
    condition: str
    target_price: float
    triggered_price: float
    name: Optional[str] = None
    triggered_at: datetime

    class Config:
        from_attributes = True
