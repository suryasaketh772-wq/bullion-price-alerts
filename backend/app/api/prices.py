from fastapi import APIRouter
from app.schemas import PriceResponse
from app.services.price_cache import price_cache

router = APIRouter()

@router.get("", response_model=PriceResponse)
def get_prices():
    """
    Returns the latest cached live prices for Gold, Silver, and USDINR
    along with their respective daily high and low metrics.
    Satisfies "Clients NEVER call API Server directly" and guarantees low latency.
    """
    latest = price_cache.get_latest()
    return PriceResponse(
        gold=latest.get("gold"),
        silver=latest.get("silver"),
        gold_high=latest.get("gold_high"),
        gold_low=latest.get("gold_low"),
        silver_high=latest.get("silver_high"),
        silver_low=latest.get("silver_low"),
        usdinr=latest.get("usdinr"),
        usdinr_high=latest.get("usdinr_high"),
        usdinr_low=latest.get("usdinr_low")
    )

