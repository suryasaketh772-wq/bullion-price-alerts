import requests
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

DPGOLD_API_URL = "https://statewisebcast.dpgold.in:7768/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/dpgold"

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_dpgold_prices() -> dict:
    """
    Fetches the live prices from the dPGold API endpoint.
    Returns a dictionary with 'gold' and 'silver' keys, each containing a dict with 'price', 'high', and 'low'.
    """
    try:
        # Avoid SSL verification issues if their cert is weird
        response = requests.get(DPGOLD_API_URL, timeout=5, verify=False)
        response.raise_for_status()
        data = response.text
        
        prices = {}
        for line in data.split('\n'):
            line = line.strip()
            if not line:
                continue
            parts = line.split('\t')
            # Look for lines that have enough columns
            if len(parts) >= 6:
                name = parts[1].strip().upper()
                # Use the 'buy' price
                try:
                    price = float(parts[2])
                except ValueError:
                    continue
                
                # Try to parse high and low prices
                high_price = None
                low_price = None
                try:
                    high_price = float(parts[4])
                    low_price = float(parts[5])
                except ValueError:
                    pass
                
                if name == "GOLD SPOT":
                    prices["gold"] = {"price": price, "high": high_price, "low": low_price}
                elif name == "SILVER SPOT":
                    prices["silver"] = {"price": price, "high": high_price, "low": low_price}
                elif name == "USDINR":
                    prices["usdinr"] = {"price": price, "high": high_price, "low": low_price}
                    
        return prices
    except Exception as e:
        logger.error(f"Error fetching prices from dPGold: {e}")
        raise e  # Reraise so tenacity catches it and retries

