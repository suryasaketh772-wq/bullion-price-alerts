import logging
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.alert import Alert
from app.models.alert_history import AlertHistory

logger = logging.getLogger(__name__)

def evaluate_alerts(db: Session, asset: str, current_price: float):
    """
    Evaluate all active alerts for a given asset against the current price.
    Triggers alerts that meet the condition and are not on cooldown.
    """
    triggered_alerts = []
    alerts = db.query(Alert).filter(Alert.active == True, Alert.asset == asset).all()
    
    for alert in alerts:
        triggered = False
        if alert.condition == "above" and current_price >= alert.target_price:
            triggered = True
        elif alert.condition == "below" and current_price <= alert.target_price:
            triggered = True

        if triggered:
            # Check cooldown (compare naive UTC datetimes — SQLite stores without tz)
            if alert.last_triggered_at:
                if datetime.utcnow() - alert.last_triggered_at < timedelta(minutes=alert.cooldown_minutes):
                    continue

            trigger_alert(alert, current_price)
            alert.active = False
            alert.last_triggered_at = datetime.utcnow()
            history = AlertHistory(
                alert_id=alert.id,
                asset=alert.asset,
                condition=alert.condition,
                target_price=alert.target_price,
                triggered_price=current_price,
                name=getattr(alert, 'name', None),
            )
            db.add(history)
            db.commit()
            
            triggered_alerts.append({
                "id": alert.id,
                "asset": alert.asset,
                "condition": alert.condition,
                "target_price": alert.target_price,
                "current_price": current_price
            })
            
    return triggered_alerts

def trigger_alert(alert: Alert, current_price: float):
    logger.info(f"🚨 ALERT TRIGGERED: {alert.asset} is {alert.condition} {alert.target_price}! (Current: {current_price})")
