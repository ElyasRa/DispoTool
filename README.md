# Dispo Tool

A dispatch management tool for coordinating service technicians and orders.

## Setup

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)

### Local Development (without Docker)

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env and configure your database and other settings
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env if needed (default: http://localhost:3000)
   npm run dev
   ```

3. **Database Setup**
   - Make sure PostgreSQL is running
   - Create database: `createdb dispo_db`
   - Backend will initialize tables on startup

### Docker Development

```bash
# Start all services (frontend, backend, postgres)
docker-compose up

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# PostgreSQL: localhost:5432
```

## Environment Variables

### Backend (.env)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Backend port (default: 3000)
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)
- `JWT_SECRET` - Secret for JWT tokens (MUST change in production!)
- `TELEGRAM_BOT_TOKEN` - (Optional) Telegram bot token for notifications
- `TELEGRAM_CHAT_ID` - (Optional) Telegram chat ID

### Frontend (.env)
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/orders` - Get all orders
- `GET /api/monteure` - Get all technicians

## Troubleshooting

### Frontend cannot connect to backend
1. Check that `VITE_API_URL` is set correctly in `frontend/.env`
2. Verify backend is running on the correct port
3. Check CORS settings in backend

### JSON Parse Errors
- Ensure all API endpoints return valid JSON
- Check that error handling middleware is working
- Verify no HTML error pages are being returned instead of JSON

### Docker Network Issues
- Frontend connects via browser, so use `http://localhost:3000` not container names
- Backend and PostgreSQL communicate via Docker network using service names