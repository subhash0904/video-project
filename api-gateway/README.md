# API Gateway

Enterprise-grade API Gateway with rate limiting, circuit breakers, authentication, and service routing.

## Features

- **Rate Limiting**: Redis-backed distributed rate limiting
  - General API: 100 requests/15 minutes
  - Authentication: 5 requests/15 minutes
  - Uploads: 10 requests/hour
  - API Key: 1000 requests/minute

- **Circuit Breakers**: Automatic service health monitoring
  - Timeout: 3 seconds
  - Error threshold: 50%
  - Reset timeout: 30 seconds

- **Authentication**: JWT-based authentication with user context forwarding

- **Request Routing**: Intelligent routing to microservices
  - User Service
  - Video Service
  - Recommendation Service
  - Comment Service
  - Like Service
  - Subscription Service
  - Analytics Service

- **Monitoring**: Built-in health checks and metrics endpoints

## Architecture

```
Client Request
     ↓
Rate Limiter (Redis)
     ↓
Authentication (JWT)
     ↓
Circuit Breaker
     ↓
Service Proxy → Microservice
     ↓
Response
```

## Endpoints

### Health & Metrics
- `GET /health` - Health check
- `GET /metrics` - Gateway metrics and circuit breaker stats

### User & Authentication
- `POST /api/auth/register` - Register (strict rate limit)
- `POST /api/auth/login` - Login (strict rate limit)
- `GET /api/users/*` - User operations

### Videos
- `GET /api/videos` - List videos (optional auth)
- `GET /api/videos/:id` - Get video (optional auth)
- `POST /api/videos` - Upload video (auth + upload rate limit)
- `PATCH /api/videos/:id` - Update video (auth)
- `DELETE /api/videos/:id` - Delete video (auth)

### Recommendations
- `GET /api/recommendations` - Get recommendations
- `GET /api/recommendations/personalized` - Personalized recommendations (auth)

### Comments
- `GET /api/videos/:videoId/comments` - Get comments
- `POST /api/videos/:videoId/comments` - Add comment (auth)

### Likes & Interactions
- `POST /api/videos/:videoId/like` - Like video (auth)
- `POST /api/videos/:videoId/dislike` - Dislike video (auth)

### Subscriptions
- `POST /api/channels/:channelId/subscribe` - Subscribe (auth)
- `GET /api/subscriptions` - Get subscriptions (auth)

## Configuration

See [.env.example](.env.example) for all configuration options.

### Key Environment Variables

```env
PORT=3000
JWT_SECRET=your-secret
REDIS_HOST=localhost
REGION=us-west
RATE_LIMIT_MAX_REQUESTS=100
CIRCUIT_BREAKER_TIMEOUT=3000
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## Docker

```bash
docker build -t api-gateway .
docker run -p 3000:3000 --env-file .env api-gateway
```

## Monitoring

### Circuit Breaker States

- **CLOSED**: Normal operation, all requests pass through
- **OPEN**: Service is down, requests fail fast
- **HALF_OPEN**: Testing if service is recovered

### Metrics

View real-time metrics:
```bash
curl http://localhost:3000/metrics
```

Returns:
```json
{
  "timestamp": "2026-02-10T...",
  "uptime": 3600,
  "memory": {...},
  "region": "us-west",
  "circuitBreakers": {
    "user": { "state": "CLOSED", "failureCount": 0 },
    "video": { "state": "CLOSED", "failureCount": 0 }
  }
}
```

## Geographic Routing

The gateway supports multi-region deployment with geo-based routing:

- India → Mumbai DC
- US → Oregon DC
- EU → Frankfurt DC
- Asia → Singapore DC

Set the `REGION` environment variable to configure regional behavior.

## Rate Limit Headers

All rate-limited responses include:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in window
- `RateLimit-Reset`: Time until limit resets

## Error Responses

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

### 503 Service Unavailable
```json
{
  "success": false,
  "message": "video service unavailable"
}
```

### 504 Gateway Timeout
```json
{
  "success": false,
  "message": "Service timeout"
}
```
