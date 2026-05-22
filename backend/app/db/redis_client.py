import redis
import logging
from app.config import settings

logger = logging.getLogger(__name__)

try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    # Ping to check connection
    redis_client.ping()
    logger.info("Connected to Redis for caching.")
except Exception as e:
    logger.warning(f"Failed to connect to Redis. Caching will be disabled: {e}")
    redis_client = None
