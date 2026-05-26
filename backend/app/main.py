import logging
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager

from app.config import settings
from app.api import prices, alerts, websockets
from app.services.websocket_manager import manager
import asyncio
from app.scheduler.tasks import start_scheduler
from app.models import *
from app.limiter import limiter
from app.services.price_cache import price_cache
from app.schemas import PriceResponse
from app.api.websockets import handle_websocket_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    manager.loop = asyncio.get_running_loop()
    start_scheduler()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.getLogger("uvicorn.error").error(f"Global Error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."}
    )

# Set up CORS middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(
    prices.router,
    prefix=f"{settings.API_V1_STR}/prices",
    tags=["prices"]
)

app.include_router(
    alerts.router,
    prefix=f"{settings.API_V1_STR}/alerts",
    tags=["alerts"]
)

app.include_router(
    websockets.router,
    prefix=settings.API_V1_STR,
    tags=["websockets"]
)

@app.websocket("/ws/prices")
async def websocket_root_prices(websocket: WebSocket):
    """
    Root WebSocket Endpoint: /ws/prices
    Provides highly efficient, low-latency realtime bullion price streaming.
    """
    await handle_websocket_connection(websocket)


@app.get("/")
def read_root():
    return {"message": "Bullion Market Alerts API"}

@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
@limiter.limit("60/minute")
def health_check(request: Request):
    return {"status": "ok", "service": "bullion-alerts-realtime-infrastructure"}

@app.get("/api/latest", response_model=PriceResponse)
@app.get(f"{settings.API_V1_STR}/prices/latest", response_model=PriceResponse)
@limiter.limit("60/minute")
def get_latest_prices(request: Request):
    """
    REST Backup Endpoint: Returns the latest cached prices in memory instantly.
    Protected with rate limiting.
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

