from fastapi import WebSocket
from typing import List
import logging
import json

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.loop = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("New WebSocket connection established.")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info("WebSocket connection closed.")

    async def broadcast(self, message: str):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to websocket: {e}")
                dead.append(connection)
        for connection in dead:
            self.active_connections.remove(connection)

    async def broadcast_prices(self, gold: float, silver: float, gold_high: float = None, gold_low: float = None, silver_high: float = None, silver_low: float = None, usdinr: float = None):
        payload = {
            "type": "price_update",
            "data": {
                "gold": gold,
                "silver": silver,
                "gold_high": gold_high,
                "gold_low": gold_low,
                "silver_high": silver_high,
                "silver_low": silver_low,
                "usdinr": usdinr
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
