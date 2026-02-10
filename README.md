# Video Streaming Platform 🎥

A production-grade, YouTube-like video streaming platform with adaptive streaming, ML-powered recommendations, real-time analytics, and modern architecture.

## 🏗️ Architecture

```
video-project/
├── frontend/          # React + Vite + TypeScript + Tailwind
├── backend/           # Node.js + Express + TypeScript + Prisma
├── infra/             # Docker Compose (Postgres + Redis)
├── ml/                # Python Flask ML recommendation service
└── streaming/         # FFmpeg + HLS + Nginx
```

## ✨ Features

### Core Features
- ✅ User authentication (JWT-based)
- ✅ Video upload & management
- ✅ Adaptive HLS streaming (144p to 2160p/4K)
- ✅ Home feed with personalized recommendations
- ✅ Video watch page with like/subscribe
- ✅ Shorts (vertical short-form videos)
- ✅ Search with filters
- ✅ Channel profiles & analytics
- ✅ Subscription system
- ✅ Watch history & liked videos
- ✅ Real-time analytics tracking
- ✅ ML-powered recommendation system

### Technical Features
- Full TypeScript for type safety
- Production-ready error handling & logging
- Redis caching for performance
- Database connection pooling
- RESTful API design
- Responsive UI (mobile & desktop)
- Dark theme
- Clean architecture & separation of concerns

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ & pnpm
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose
- FFmpeg (for video processing)
- Python 3.10+ (for ML service)

### 1. Setup Infrastructure

```bash
# Start Postgres & Redis
cd infra
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client & push schema to database
pnpm db:generate
pnpm db:push

# Start development server
pnpm dev
```

Backend will run on http://localhost:4000

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Start development server
pnpm dev
```

Frontend will run on http://localhost:5173

### 4. Setup ML Service (Optional)

```bash
cd ml/serving

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start ML service
python app.py
```

ML service will run on http://localhost:5000

### 5. Setup Streaming (Optional - for video transcoding)

```bash
cd streaming

# Build Docker image
docker build -t video-platform-streaming .

# Run streaming service
docker run -d -p 8080:8080 \
  -v $(pwd)/hls:/var/www/hls \
  -v $(pwd)/uploads:/uploads \
  video-platform-streaming
```

## 📋 API Documentation

### Authentication

```
POST /api/auth/register - Create new account
POST /api/auth/login    - Login
GET  /api/auth/me       - Get current user
POST /api/auth/refresh  - Refresh access token
```

### Videos

```
GET    /api/videos/feed             - Get video feed
GET    /api/videos/:id              - Get video details
GET    /api/videos/search           - Search videos
GET    /api/videos/:id/recommended  - Get recommended videos
POST   /api/videos/upload           - Upload video
PATCH  /api/videos/:id              - Update video
DELETE /api/videos/:id              - Delete video
POST   /api/videos/:id/like         - Like/dislike video
```

### Users & Channels

```
GET    /api/users/profile            - Get user profile
PATCH  /api/users/profile            - Update profile
GET    /api/users/subscriptions      - Get subscriptions
POST   /api/users/subscriptions/:id  - Subscribe to channel
DELETE /api/users/subscriptions/:id  - Unsubscribe
GET    /api/users/watch-history      - Get watch history
GET    /api/users/liked-videos       - Get liked videos

GET    /api/channels/:id             - Get channel details
GET    /api/channels/:id/videos      - Get channel videos
PATCH  /api/channels/:id             - Update channel
GET    /api/channels/:id/analytics   - Get channel analytics
```

### Analytics & Recommendations

```
POST /api/analytics/view      - Track video view
POST /api/analytics/share     - Track video share
GET  /api/analytics/trending  - Get trending videos

GET  /api/recommendations/personalized   - Personalized feed
GET  /api/recommendations/subscriptions  - Subscription feed
GET  /api/recommendations/shorts         - Shorts feed
```

## 🗄️ Database Schema

### Core Models
- **User** - User accounts & authentication
- **Channel** - Creator channels
- **Video** - Video metadata & status
- **VideoQuality** - Multiple quality variants (144p-2160p)
- **Subscription** - User-channel relationships
- **WatchHistory** - View tracking with resume position
- **Like** - Like/dislike tracking
- **Comment** - Video comments (nested)
- **AnalyticsEvent** - Event tracking system

## 🎯 Development Workflow

### 1. Database Changes

```bash
# After modifying schema.prisma
cd backend
pnpm db:generate  # Regenerate Prisma client
pnpm db:push      # Push changes to database
```

### 2. Adding New API Endpoint

1. Create service in `backend/src/modules/{module}/{module}.service.ts`
2. Create controller in `backend/src/modules/{module}/{module}.controller.ts`
3. Add route in `backend/src/modules/{module}/{module}.routes.ts`
4. Register route in `backend/src/app.ts`

### 3. Adding New Frontend Page

1. Create page in `frontend/src/pages/{PageName}.tsx`
2. Add route in `frontend/src/App.tsx`
3. Add API methods in `frontend/src/lib/api.ts` if needed

## 🔧 Configuration

### Backend Environment Variables

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://video_user:video_password@localhost:5432/video_platform
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables

```env
VITE_API_URL=http://localhost:4000/api
VITE_STREAMING_BASE_URL=http://localhost:8080/hls
```

## 📦 Production Deployment

### Backend

```bash
cd backend
pnpm build
NODE_ENV=production node dist/server.js
```

### Frontend

```bash
cd frontend
pnpm build
# Serve dist/ folder with nginx or similar
```

### Docker Compose (Full Stack)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pnpm test

# Frontend tests
cd frontend
pnpm test
```

## 📊 Performance Considerations

- **Caching**: Redis caching for video feeds, user profiles
- **Database Indexing**: Indexes on frequently queried fields
- **CDN**: Serve HLS segments via CDN in production
- **Connection Pooling**: Prisma connection pool configured
- **Lazy Loading**: Infinite scroll for video feeds
- **Image Optimization**: Serve thumbnails in WebP format

## 🔐 Security

- JWT-based authentication
- Bcrypt password hashing (12 rounds)
- CORS configured for frontend origin
- Input validation using express-validator
- SQL injection protection via Prisma ORM
- Rate limiting (implement in production)

## 📈 Scalability

### Horizontal Scaling
- Stateless backend (can run multiple instances)
- Redis for session/cache centralization
- Load balancer for distributing requests

### Database Optimization
- Read replicas for read-heavy operations
- Query optimization with proper indexes
- Pagination for large result sets

### Video Storage
- Store videos on S3/object storage
- Use CDN for HLS delivery
- Implement video retention policies

## 🛠️ Tech Stack

**Frontend:**
- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router 7

**Backend:**
- Node.js 20
- Express 5
- TypeScript (ESM)
- Prisma ORM
- PostgreSQL 16
- Redis 7
- JWT + Bcrypt

**Streaming:**
- FFmpeg (HLS transcoding)
- Nginx (HLS delivery)
- Adaptive bitrate streaming

**ML:**
- Python 3.11
- Flask
- Scikit-learn
- Pandas/NumPy

## 📝 License

MIT License - feel free to use this project for learning and commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows the existing style
- All tests pass
- New features include tests
- Update documentation as needed

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres
```

### Redis Connection Issues
```bash
# Check Redis status
docker-compose ps redis

# Test Redis connection
redis-cli ping
```

### Frontend API Errors
- Verify backend is running on port 4000
- Check CORS configuration in backend
- Ensure .env file exists in frontend

### Video Playback Issues
- Verify HLS segments exist in streaming/hls directory
- Check Nginx is running and serving HLS content
- Ensure video transcoding completed successfully

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review API logs for errors

---

Built with ❤️ for production-grade video streaming
