from fastapi import WebSocket
from typing import List
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.loop = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("New WebSocket connection established.")
        
        # Proactively send latest cached rates to prevent initial UI latency
        try:
            from app.services.price_cache import price_cache
            latest = price_cache.get_latest()
            # Check if cache is not empty
            if latest.get("gold") is not None:
                payload = {
                    "type": "price_update",
                    "data": latest
                }
                await websocket.send_text(json.dumps(payload))
                logger.info("Dispatched initial price cache payload to newly connected client.")
        except Exception as e:
            logger.error(f"Failed to dispatch initial price cache to client: {e}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket connection closed and cleaned up.")

    async def broadcast(self, message: str):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to websocket: {e}")
                dead.append(connection)
        for connection in dead:
            if connection in self.active_connections:
                self.active_connections.remove(connection)

    async def broadcast_prices(self, gold: float, silver: float, gold_high: float = None, gold_low: float = None, silver_high: float = None, silver_low: float = None, usdinr: float = None, timestamp: str = None):
        payload = {
            "type": "price_update",
            "data": {
                "gold": gold,
                "silver": silver,
                "gold_high": gold_high,
                "gold_low": gold_low,
                "silver_high": silver_high,
                "silver_low": silver_low,
                "usdinr": usdinr,
                "timestamp": timestamp or datetime.utcnow().isoformat() + "Z"
            }
        }
        await self.broadcast(json.dumps(payload))

    async def broadcast_alert(self, alert_data: dict):
        payload = {
            "type": "alert_triggered",
            "data": alert_data
        }
        await self.broadcast(json.dumps(payload))

manager = ConnectionManager()

