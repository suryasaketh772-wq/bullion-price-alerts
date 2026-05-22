# Gold & Silver Price Alert App - Production Ready

A scalable, real-time platform for tracking and alerting on Gold & Silver prices.

## Architecture
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Redis, APScheduler, WebSockets.
- **Frontend**: Next.js 15, Tailwind CSS, Recharts.
- **Notifications**: Local in-browser popups.

## Local Development (Docker)
The easiest way to run the full stack locally is using Docker Compose. This spins up the FastAPI backend, PostgreSQL database, and Redis cache automatically.

1. Create a `.env` file in the `backend/` directory (copy `.env.example`).

3. Start the services from the root folder:
   ```bash
   docker-compose up --build
   ```
4. Run database migrations:
   ```bash
   docker-compose exec api alembic upgrade head
   ```
5. In a separate terminal, navigate to `frontend/` and start the UI:
   ```bash
   npm install
   npm run dev
   ```

## Production Deployment

### Backend (Render.com)
The backend is optimized for deployment on Render.
1. Connect your GitHub repository to Render.
2. Go to **Blueprints** and deploy the `backend/render.yaml` configuration.
3. This blueprint will automatically provision a Web Service (FastAPI) and a free Redis instance.
4. **Environment Variables**: Add your Supabase `DATABASE_URL` manually in the Render dashboard.
5. The `startCommand` automatically uses Gunicorn with Uvicorn workers for high concurrency.

### Database (Supabase)
1. Create a project on Supabase.
2. Retrieve the Postgres connection string.
3. Add it to your backend environment variables.
4. **Optimization**: Supabase provides PgBouncer. Ensure you use the connection pooler URL in production to prevent connection exhaustion.

### Frontend (Vercel)
1. Import the project into Vercel.
2. Select the `frontend` folder as the Root Directory.
3. Set the Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://your-render-app-url.onrender.com/api/v1`
   - `NEXT_PUBLIC_WS_URL`: `wss://your-render-app-url.onrender.com/api/v1/ws`
4. Deploy!

## Optimizations Included
- **Rate Limiting**: Protects alert creation and public APIs using `slowapi`.
- **Redis Caching**: Heavily caches historical chart data to prevent database overload.
- **WebSocket Resilience**: Exponential backoff implemented on the client to automatically recover dropped connections.
- **API Retries**: The `yfinance` scraper utilizes `tenacity` for exponential backoff on transient network failures.
# price_alerts
