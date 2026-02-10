# Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ pnpm installed (`pnpm --version` or `npm install -g pnpm`)
- ✅ Docker installed (`docker --version`)
- ✅ Docker Compose installed (`docker-compose --version`)

## Step-by-Step Setup

### 1. Start Infrastructure (Required)

```bash
cd infra
docker-compose up -d

# Verify services are running
docker-compose ps

# You should see postgres and redis running
```

If there are issues:
```bash
# View logs
docker-compose logs

# Restart services
docker-compose restart
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies (takes 1-2 minutes)
pnpm install

# Setup environment
# The .env file is already configured for local development

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# Start development server
pnpm dev

# Backend should start on http://localhost:4000
# You should see: "✅ Server running on http://localhost:4000"
```

Test backend:
```bash
# In a new terminal
curl http://localhost:4000/health

# Should return: {"status":"ok",...}
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies (takes 1-2 minutes)  
pnpm install

# The .env file is already configured

# Start development server
pnpm dev

# Frontend should start on http://localhost:5173
```

Open browser to http://localhost:5173

### 4. Create Your First User

1. Go to http://localhost:5173/login
2. Click "Sign up"
3. Fill in:
   - Username: `testuser`
   - Display Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
4. Click "Sign Up"
5. You'll be redirected to the home page

### 5. Test API with cURL

```bash
# Register a user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "username": "demouser",
    "password": "password123",
    "displayName": "Demo User"
  }'

# Should return user data and tokens
```

## Optional Services

### ML Recommendation Service

```bash
cd ml/serving

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start service
python app.py

# ML service runs on http://localhost:5000
```

### Streaming Service (for video transcoding)

```bash
cd streaming

# Build Docker image
docker build -t video-platform-streaming .

# Run container
docker run -d -p 8080:8080 \
  --name streaming \
  -v ${PWD}/hls:/var/www/hls \
  -v ${PWD}/uploads:/uploads \
  video-platform-streaming
```

## Troubleshooting

### Database connection failed

```bash
# Check if Postgres is running
cd infra
docker-compose ps

# Restart Postgres
docker-compose restart postgres

# View Postgres logs
docker-compose logs postgres
```

### Backend won't start

```bash
# Check if port 4000 is already in use
# Windows:
netstat -ano | findstr :4000

# Mac/Linux:
lsof -i :4000

# Kill the process or change PORT in backend/.env
```

### Frontend API errors

1. Ensure backend is running on port 4000
2. Check browser console for errors
3. Verify CORS is allowing http://localhost:5173

### Redis connection issues

```bash
cd infra
docker-compose restart redis
docker-compose logs redis
```

## Development Workflow

### Adding Sample Videos

Since video upload requires file handling, you can add sample data via Prisma Studio:

```bash
cd backend
pnpm db:studio

# Opens at http://localhost:5555
# Navigate to "Video" model and add records
```

### Viewing Database

```bash
cd backend
pnpm db:studio

# Browser opens with database GUI
```

### Stopping Everything

```bash
# Stop backend: Ctrl+C in terminal

# Stop frontend: Ctrl+C in terminal

# Stop infrastructure:
cd infra
docker-compose down

# Stop and remove volumes (deletes data):
docker-compose down -v
```

## What to Try

1. **Authentication**
   - Register a new user
   - Login with credentials
   - View your profile

2. **Navigation**
   - Browse home feed (mock data for now)
   - Click on videos
   - Use search
   - Try Shorts

3. **API Testing**
   ```bash
   # Get video feed
   curl http://localhost:4000/api/videos/feed
   
   # Search videos
   curl "http://localhost:4000/api/videos/search?q=test"
   
   # Get trending
   curl http://localhost:4000/api/analytics/trending
   ```

4. **Database Exploration**
   - Open Prisma Studio: `cd backend && pnpm db:studio`
   - Browse all tables
   - Add test data

## Next Steps

1. Add video upload functionality
2. Implement video player with HLS.js
3. Add more UI components
4. Implement comments
5. Add real-time features with WebSockets
6. Deploy to production

## Need Help?

- Check `README.md` for full documentation
- Review `IMPLEMENTATION_SUMMARY.md` for architecture overview
- Backend logs are in terminal
- Frontend errors in browser console
- Database queries visible in backend logs (development mode)

## Success Indicators

✅ Backend health check returns 200
✅ Frontend loads without errors
✅ Can register and login
✅ Database tables created
✅ Redis connected (check backend logs)

You're all set! 🚀
