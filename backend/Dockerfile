FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

# Run migrations then start the server
# Cloud Run injects PORT=8080; gunicorn + uvicorn workers handle async + WebSockets
CMD alembic upgrade head && \
    gunicorn app.main:app \
      --workers 1 \
      --worker-class uvicorn.workers.UvicornWorker \
      --bind 0.0.0.0:${PORT:-8080} \
      --timeout 120
