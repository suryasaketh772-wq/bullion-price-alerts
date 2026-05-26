from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

async def handle_websocket_connection(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Maintain active connection and listen for any inbound client messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket connection exception: {e}", exc_info=True)
        manager.disconnect(websocket)

@router.websocket("/ws")
@router.websocket("/ws/prices")
async def websocket_endpoint(websocket: WebSocket):
    await handle_websocket_connection(websocket)

