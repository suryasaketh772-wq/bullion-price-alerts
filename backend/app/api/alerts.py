from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.db.database import get_db
from app.models.alert import Alert
from app.models.alert_history import AlertHistory
from app.schemas import AlertCreate, AlertResponse, AlertHistoryResponse

router = APIRouter()

class ToggleAllRequest(BaseModel):
    active: bool

@router.get("/history", response_model=List[AlertHistoryResponse])
def get_alert_history(db: Session = Depends(get_db)):
    return db.query(AlertHistory).order_by(AlertHistory.triggered_at.desc()).limit(200).all()

@router.delete("/history/clear")
def clear_alert_history(db: Session = Depends(get_db)):
    db.query(AlertHistory).delete(synchronize_session=False)
    db.commit()
    return {"message": "Alert history cleared"}

@router.delete("")
def delete_all_alerts(db: Session = Depends(get_db)):
    db.query(AlertHistory).delete(synchronize_session=False)
    db.query(Alert).delete(synchronize_session=False)
    db.commit()
    return {"message": "All alerts and history deleted"}

@router.patch("/toggle-all")
def toggle_all_alerts(body: ToggleAllRequest, db: Session = Depends(get_db)):
    update = {"active": body.active}
    if body.active:
        update["last_triggered_at"] = None
    db.query(Alert).update(update)
    db.commit()
    return {"message": f"All alerts {'activated' if body.active else 'deactivated'}"}

MAX_ALERTS = 20

@router.post("", response_model=AlertResponse)
def create_alert(alert_in: AlertCreate, db: Session = Depends(get_db)):
    count = db.query(Alert).count()
    if count >= MAX_ALERTS:
        raise HTTPException(status_code=400, detail=f"Maximum of {MAX_ALERTS} alerts allowed. Delete some to add more.")
    db_alert = Alert(
        asset=alert_in.asset,
        target_price=alert_in.target_price,
        condition=alert_in.condition,
        cooldown_minutes=alert_in.cooldown_minutes,
        name=alert_in.name,
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

@router.get("", response_model=List[AlertResponse])
def get_alerts(db: Session = Depends(get_db)):
    return db.query(Alert).all()

@router.patch("/{alert_id}/toggle", response_model=AlertResponse)
def toggle_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.active = not alert.active
    if alert.active:
        alert.last_triggered_at = None
    db.commit()
    db.refresh(alert)
    return alert

@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}

@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(alert_id: int, alert_in: AlertCreate, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.asset = alert_in.asset
    alert.target_price = alert_in.target_price
    alert.condition = alert_in.condition
    alert.cooldown_minutes = alert_in.cooldown_minutes
    alert.name = alert_in.name
    alert.last_triggered_at = None
    db.commit()
    db.refresh(alert)
    return alert
