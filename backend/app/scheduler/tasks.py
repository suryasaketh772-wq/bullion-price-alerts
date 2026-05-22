import time
import threading
import logging
import asyncio
import requests
import urllib3
from datetime import datetime
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.services.alert_service import evaluate_alerts
from app.services.websocket_manager import manager

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
logger = logging.getLogger(__name__)

DPGOLD_URL = (
    "https://statewisebcast.dpgold.in:7768"
    "/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/dpgold"
)

_last_key: tuple = (None, None)  # (gold_price, silver_price) — skip duplicate broadcasts


def _parse_line(line: str) -> tuple[str, dict] | None:
    """Parse one tab-delimited price line. Returns (name_key, data) or None."""
    parts = line.split("\t")
    if len(parts) < 6:
        return None
    name = parts[1].strip().upper()
    try:
        price = float(parts[2])
        high = float(parts[4]) if parts[4].strip() else None
        low = float(parts[5]) if parts[5].strip() else None
    except (ValueError, IndexError):
        return None

    if name == "GOLD SPOT":
        return "gold", {"price": price, "high": high, "low": low}
    if name == "SILVER SPOT":
        return "silver", {"price": price, "high": high, "low": low}
    if name == "USDINR":
        return "usdinr", {"price": price, "high": high, "low": low}
    return None


def _broadcast_and_check(prices: dict):
    global _last_key

    gold_data = prices.get("gold", {})
    silver_data = prices.get("silver", {})
    usdinr_data = prices.get("usdinr", {})
    gold_price = gold_data.get("price")
    silver_price = silver_data.get("price")

    if not gold_price and not silver_price:
        return

    # Skip if nothing changed
    key = (gold_price, silver_price)
    if key == _last_key:
        return
    _last_key = key

    logger.info(f"Price update → Gold=${gold_price}  Silver=${silver_price}  USD/INR={usdinr_data.get('price')}")

    # Evaluate alerts
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

    # Broadcast prices
    try:
        asyncio.run_coroutine_threadsafe(
            manager.broadcast_prices(
                gold_price or 0,
                silver_price or 0,
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


def _stream_worker():
    """
    Polls the dpgold endpoint at the same rate as dpgold.com (every ~500 ms).
    The endpoint returns a snapshot in ~90 ms and closes; we re-fetch immediately
    without sleeping so the effective rate is the HTTP round-trip time (~90–150 ms),
    which is 3-5× faster than dpgold.com's own 500 ms frontend interval.
    Only broadcasts when price values actually change (dedup via _last_key).
    Errors use exponential backoff capped at 30 s.
    """
    error_backoff = 1.0
    while True:
        try:
            with requests.get(
                DPGOLD_URL, stream=True, timeout=(5, 10), verify=False
            ) as resp:
                resp.raise_for_status()
                error_backoff = 1.0

                pending: dict = {}
                for raw in resp.iter_lines(decode_unicode=True):
                    if not raw:
                        continue
                    result = _parse_line(raw.strip())
                    if result is None:
                        continue
                    k, data = result
                    pending[k] = data

                    if "gold" in pending and "silver" in pending and "usdinr" in pending:
                        _broadcast_and_check(pending.copy())
                        pending = {}

            # No sleep — reconnect immediately for maximum refresh rate

        except Exception as e:
            logger.error(f"Stream error ({e}), retrying in {error_backoff:.0f}s…")
            time.sleep(error_backoff)
            error_backoff = min(error_backoff * 2, 30)


def start_scheduler():
    t = threading.Thread(target=_stream_worker, daemon=True, name="price-stream")
    t.start()
    logger.info("Persistent price-stream worker started.")
