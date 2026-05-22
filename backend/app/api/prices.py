from fastapi import APIRouter
from app.services.price_service import fetch_dpgold_prices
from app.schemas import PriceResponse

router = APIRouter()

@router.get("", response_model=PriceResponse)
def get_prices():
    """
    Fetches the latest live prices for Gold and Silver along with today's high and low.
    """
    try:
        prices = fetch_dpgold_prices()
        gold_data = prices.get("gold", {})
        silver_data = prices.get("silver", {})
        
        usdinr_data = prices.get("usdinr", {})
        
        return PriceResponse(
            gold=gold_data.get("price"),
            silver=silver_data.get("price"),
            gold_high=gold_data.get("high"),
            gold_low=gold_data.get("low"),
            silver_high=silver_data.get("high"),
            silver_low=silver_data.get("low"),
            usdinr=usdinr_data.get("price"),
            usdinr_high=usdinr_data.get("high"),
            usdinr_low=usdinr_data.get("low")
        )
    except Exception as e:
        return PriceResponse(gold=None, silver=None)
