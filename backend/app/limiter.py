from slowapi import Limiter
from slowapi.util import get_remote_address

# Define rate limiter globally to avoid circular imports between routers and main.py
limiter = Limiter(key_func=get_remote_address)
