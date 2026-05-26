import json
import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

FALLBACK_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "latest_prices_fallback.json"
)

class PriceCache:
    def __init__(self):
        self._data: Dict[str, Any] = {
            "gold": None,
            "silver": None,
            "gold_high": None,
            "gold_low": None,
            "silver_high": None,
            "silver_low": None,
            "usdinr": None,
            "usdinr_high": None,
            "usdinr_low": None,
            "timestamp": None
        }
        self.load_from_fallback()

    def load_from_fallback(self):
        """Loads cached prices from a backup JSON file on disk if it exists."""
        try:
            if os.path.exists(FALLBACK_FILE):
                with open(FALLBACK_FILE, "r") as f:
                    cached = json.load(f)
                    self._data.update(cached)
                logger.info(f"Successfully loaded fallback prices from disk: {FALLBACK_FILE}")
            else:
                logger.info("No fallback price cache found on disk, starting with empty cache.")
        except Exception as e:
            logger.error(f"Error loading fallback prices from disk: {e}")

    def save_to_fallback(self):
        """Persists the in-memory cache to a backup JSON file on disk."""
        try:
            with open(FALLBACK_FILE, "w") as f:
                json.dump(self._data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving prices to disk fallback cache: {e}")

    def update(self, raw_prices: dict):
        """
        Updates the in-memory price cache.
        Input format:
        {
            "gold": {"price": float, "high": float, "low": float},
            "silver": {"price": float, "high": float, "low": float},
            "usdinr": {"price": float, "high": float, "low": float}
        }
        """
        gold_data = raw_prices.get("gold", {})
        silver_data = raw_prices.get("silver", {})
        usdinr_data = raw_prices.get("usdinr", {})

        # We construct a flat structure matching what the client expects from REST / WebSockets
        updated_data = {
            "gold": gold_data.get("price"),
            "gold_high": gold_data.get("high"),
            "gold_low": gold_data.get("low"),
            "silver": silver_data.get("price"),
            "silver_high": silver_data.get("high"),
            "silver_low": silver_data.get("low"),
            "usdinr": usdinr_data.get("price"),
            "usdinr_high": usdinr_data.get("high"),
            "usdinr_low": usdinr_data.get("low"),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        # Keep existing high/low values if new ones are None
        for key in ["gold_high", "gold_low", "silver_high", "silver_low", "usdinr_high", "usdinr_low"]:
            if updated_data[key] is None and self._data.get(key) is not None:
                updated_data[key] = self._data[key]

        # Update in-memory dict
        self._data.update(updated_data)
        self.save_to_fallback()

    def get_latest(self) -> Dict[str, Any]:
        """Returns a copy of the latest cached price dictionary."""
        return self._data.copy()

# Singleton instance
price_cache = PriceCache()
