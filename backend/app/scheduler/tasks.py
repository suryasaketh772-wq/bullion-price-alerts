import time
import threading
import logging
import asyncio
import os
import json
import requests
from datetime import datetime
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.services.alert_service import evaluate_alerts
from app.services.websocket_manager import manager
from app.services.price_cache import price_cache

logger = logging.getLogger(__name__)

# Configurable endpoints for connecting to the local api_server backend
API_SERVER_WS_URL = os.environ.get("API_SERVER_WS_URL", "ws://3.93.145.57/ws/prices")
API_SERVER_REST_URL = os.environ.get("API_SERVER_REST_URL", "http://3.93.145.57/api/latest")

_last_key: tuple = (None, None)  # (gold_price, silver_price) — skip duplicate broadcasts


def _broadcast_and_check(prices: dict):
    global _last_key

    gold_data = prices.get("gold", {})
    silver_data = prices.get("silver", {})
    usdinr_data = prices.get("usdinr", {})
    gold_price = gold_data.get("price")
    silver_price = silver_data.get("price")

    if not gold_price and not silver_price:
        return

    # Dedup broadcasts to save bandwidth, but always keep PriceCache updated
    key = (gold_price, silver_price)
    if key == _last_key:
        return
    _last_key = key

    logger.info(f"Price update → Gold=${gold_price}  Silver=${silver_price}  USD/INR={usdinr_data.get('price')}")

    # Evaluate alerts in DB
    db: Session = SessionLocal()
    triggered = []
    try:
        if gold_price:
            triggered.extend(evaluate_alerts(db, "Gold", gold_price))
        if silver_price:
            triggered.extend(evaluate_alerts(db, "Silver", silver_price))
    except Exception as e:
        logger.error(f"Alert evaluation error: {e}")
        db.rollback()
    finally:
        db.close()

    if not manager.loop:
        return

    # Broadcast prices via websocket to the Next.js app clients
    try:
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_prices(
                gold_price or 0.0,
                silver_price or 0.0,
                gold_data.get("high"),
                gold_data.get("low"),
                silver_data.get("high"),
                silver_data.get("low"),
                usdinr_data.get("price"),
            ),
            manager.loop,
        )
        for alert_data in triggered:
            asyncio.run_coroutine_threadsafe(
                manager.broadcast_alert(alert_data),
                manager.loop,
            )
    except Exception as e:
        logger.error(f"Broadcast error: {e}")


def _process_api_prices(data: dict):
    """
    Process raw pricing data dictionary from the API Server and updates cache.
    """
    try:
        pending = {
            "gold": {
                "price": data.get("gold_spot") or data.get("gold"),
                "high": data.get("gold_high"),
                "low": data.get("gold_low")
            },
            "silver": {
                "price": data.get("silver_spot") or data.get("silver"),
                "high": data.get("silver_high"),
                "low": data.get("silver_low")
            },
            "usdinr": {
                "price": data.get("usd_inr") or data.get("usdinr"),
                "high": data.get("usdinr_high") or data.get("usd_inr"),
                "low": data.get("usdinr_low") or data.get("usd_inr")
            }
        }
        
        if pending["gold"]["price"] and pending["silver"]["price"]:
            # Update centralized price cache
            price_cache.update(pending)
            
            # Check DB alerts and broadcast price updates
            _broadcast_and_check(pending)
    except Exception as e:
        logger.error(f"Error processing pricing update: {e}")


async def async_stream_worker():
    """
    Resilient WebSocket client listener that connects to the local api_server backend.
    Degrades gracefully to REST fallback polling if WebSocket is disconnected.
    """
    import websockets
    
    ws_connected = False
    reconnect_attempts = 0
    reconnect_delay = 1.0
    fallback_task = None
    
    async def run_fallback_polling():
        nonlocal ws_connected
        logger.info("REST fallback polling started (runs every 5 seconds).")
        while not ws_connected:
            try:
                # Run synchronous requests.get in an executor thread to avoid blocking the loop
                response = await asyncio.to_thread(
                    requests.get, API_SERVER_REST_URL, timeout=5
                )
                if response.status_code == 200:
                    data = response.json()
                    logger.info("Fetched live rates via fallback REST route.")
                    _process_api_prices(data)
                else:
                    logger.error(f"REST fallback HTTP error {response.status_code}")
            except Exception as e:
                logger.error(f"REST fallback poll failed: {e}")
            await asyncio.sleep(5)

    while True:
        try:
            logger.info(f"Attempting to connect to API Server WebSocket: {API_SERVER_WS_URL}")
            async with websockets.connect(API_SERVER_WS_URL) as websocket:
                ws_connected = True
                reconnect_attempts = 0
                reconnect_delay = 1.0
                logger.info("Successfully connected to API Server WebSocket!")
                
                # Cancel fallback task if running
                if fallback_task and not fallback_task.done():
                    fallback_task.cancel()
                    logger.info("Deactivated REST fallback polling. Real-time WebSockets active.")
                
                while True:
                    msg = await websocket.recv()
                    # Keepalive check
                    if msg == "ping":
                        await websocket.send("pong")
                        continue
                    
                    try:
                        payload = json.loads(msg)
                        # Extract data either from root or 'data' subkey depending on format
                        data = payload.get("data") if payload.get("type") == "price_update" else payload
                        if not data:
                            data = payload
                        _process_api_prices(data)
                    except Exception as e:
                        logger.error(f"Error parsing WebSocket message: {e}")
                        
        except Exception as e:
            ws_connected = False
            logger.warning(f"WebSocket disconnected or failed to connect ({e}).")
            
            # Start REST fallback polling in background if not already running
            if not fallback_task or fallback_task.done():
                fallback_task = asyncio.create_task(run_fallback_polling())
            
            # Reconnect delay with exponential backoff up to 30s
            logger.info(f"Retrying WebSocket connection in {reconnect_delay:.1f}s...")
            await asyncio.sleep(reconnect_delay)
            reconnect_attempts += 1
            reconnect_delay = min(reconnect_delay * 2, 30.0)


def _stream_worker():
    """
    Main thread entry point that runs the async stream worker loop.
    """
    logger.info("Initializing API Server WebSocket pricing listener worker...")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(async_stream_worker())


def start_scheduler():
    t = threading.Thread(target=_stream_worker, daemon=True, name="price-stream")
    t.start()
    logger.info("Centralized API Server price listener thread started.")
