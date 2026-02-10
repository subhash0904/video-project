# Quick Start - YouTube-Scale Platform

## 🚀 Start Everything (5 minutes)

### 1. Prerequisites Check
```powershell
# Verify Docker is running
docker --version
docker-compose --version

# Check available resources
docker system info | Select-String "CPUs|Total Memory"
```

**Requirements**:
- Docker Desktop running
- 16GB RAM minimum
- 50GB disk space
- Ports available: 80, 3000, 4000, 4100, 5432, 6379, 9092

### 2. Environment Setup
```powershell
# Navigate to project
cd C:\project\video-project

# Generate secrets
$JWT_SECRET = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$REFRESH_TOKEN = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$ENCRYPTION = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

Write-Host "Generated Secrets:"
Write-Host "JWT_SECRET=$JWT_SECRET"
Write-Host "REFRESH_TOKEN_SECRET=$REFRESH_TOKEN"
Write-Host "ENCRYPTION_SECRET=$ENCRYPTION"

# Copy .env files
Copy-Item "api-gateway\.env.example" "api-gateway\.env"
Copy-Item "event-streaming\.env.example" "event-streaming\.env"
Copy-Item "realtime-service\.env.example" "realtime-service\.env"

# Update backend .env with secrets
@"
DATABASE_URL=postgresql://video_user:video_password@localhost:5432/video_platform
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=$JWT_SECRET
REFRESH_TOKEN_SECRET=$REFRESH_TOKEN
ENCRYPTION_SECRET=$ENCRYPTION
FRONTEND_URL=http://localhost
"@ | Out-File -FilePath "backend\.env" -Encoding utf8
```

### 3. Start Services
```powershell
# Option A: Full production stack
cd infra
docker-compose -f docker-compose.production.yml up -d

# Option B: Development mode (lighter)
docker-compose up -d

# Wait for services to start (2-3 minutes)
Write-Host "Waiting for services to start..."
Start-Sleep -Seconds 120
```

### 4. Verify Everything Works
```powershell
# Check all services are running
docker-compose ps

# Test endpoints
Invoke-WebRequest -Uri "http://localhost/health"
Invoke-WebRequest -Uri "http://localhost:3000/health"
Invoke-WebRequest -Uri "http://localhost:4100/health"

# View logs
docker-compose logs --tail=50
```

### 5. Access Points
- **🌐 Website**: http://localhost
- **🚪 API Gateway**: http://localhost:3000
- **⚡ WebSocket**: http://localhost:4100
- **📊 API Metrics**: http://localhost:3000/metrics
- **🎥 Video Streaming**: http://localhost/hls/

## 📊 Quick Health Check

```powershell
# Check service status
$services = @(
    @{Name="Load Balancer"; Url="http://localhost/health"},
    @{Name="API Gateway"; Url="http://localhost:3000/health"},
    @{Name="Realtime Service"; Url="http://localhost:4100/health"},
    @{Name="Backend"; Url="http://localhost:4000/health"}
)

foreach ($service in $services) {
    $status = try {
        $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 5
        "✅ OK"
    } catch {
        "❌ FAILED"
    }
    Write-Host "$($service.Name): $status"
}
```

## 🧪 Quick Test

```powershell
# Register a test user
$registerBody = @{
    username = "testuser"
    email = "test@example.com"
    password = "Test123!@#"
    fullName = "Test User"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost/api/auth/register" `
    -Method POST `
    -Body $registerBody `
    -ContentType "application/json"

Write-Host "User registered! Token: $($response.token)"

# Get videos
$videos = Invoke-RestMethod -Uri "http://localhost/api/videos"
Write-Host "Found $($videos.data.Count) videos"
```

## 🛑 Stop Everything

```powershell
cd C:\project\video-project\infra

# Stop all services
docker-compose -f docker-compose.production.yml down

# Or keep data
docker-compose -f docker-compose.production.yml stop
```

## 🧹 Clean Up (if needed)

```powershell
# Remove all containers and volumes
docker-compose -f docker-compose.production.yml down -v

# Clean Docker system
docker system prune -a --volumes
```

## 💡 Quick Tips

### Scale Services
```powershell
# Scale backend to 3 instances
docker-compose -f docker-compose.production.yml up -d --scale backend=3

# Scale event streaming
docker-compose -f docker-compose.production.yml up -d --scale event-streaming=2
```

### View Logs
```powershell
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway
docker-compose logs -f kafka
docker-compose logs -f event-streaming

# Last 100 lines
docker-compose logs --tail=100
```

### Database Access
```powershell
# Connect to PostgreSQL
docker-compose exec postgres psql -U video_user -d video_platform

# Run migrations
docker-compose exec backend pnpm prisma migrate deploy

# Seed database
docker-compose exec backend pnpm db:seed
```

### Redis Access
```powershell
# Connect to Redis CLI
docker-compose exec redis redis-cli

# View cache keys
docker-compose exec redis redis-cli KEYS "*"

# Monitor Redis commands
docker-compose exec redis redis-cli MONITOR
```

## 🔍 Monitoring Dashboard

```powershell
# View real-time metrics
while ($true) {
    Clear-Host
    Write-Host "=== YouTube-Scale Platform Status ===" -ForegroundColor Cyan
    Write-Host ""
    
    # API Gateway metrics
    $metrics = Invoke-RestMethod -Uri "http://localhost:3000/metrics"
    Write-Host "API Gateway Uptime: $([math]::Round($metrics.uptime / 60, 2)) minutes"
    Write-Host "Memory Usage: $([math]::Round($metrics.memory.heapUsed / 1MB, 2)) MB"
    Write-Host ""
    
    # Circuit breaker status
    Write-Host "Circuit Breakers:" -ForegroundColor Yellow
    foreach ($cb in $metrics.circuitBreakers.PSObject.Properties) {
        Write-Host "  $($cb.Name): $($cb.Value.state) (Failures: $($cb.Value.failureCount))"
    }
    Write-Host ""
    
    # Docker containers
    Write-Host "Containers:" -ForegroundColor Green
    docker-compose ps --format "table {{.Service}}\t{{.Status}}"
    
    Start-Sleep -Seconds 5
}
```

## 📈 Performance Test

```powershell
# Install if needed: choco install apache-bench

# Test API Gateway throughput
ab -n 1000 -c 10 http://localhost:3000/health

# Test with authentication
ab -n 100 -c 5 -H "Authorization: Bearer YOUR_TOKEN" http://localhost/api/videos
```

## ❓ Troubleshooting

### Ports Already in Use
```powershell
# Find process using port 80
netstat -ano | findstr ":80"

# Kill process (replace PID)
Stop-Process -Id PID -Force
```

### Services Won't Start
```powershell
# Check Docker resources
docker system df

# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory: 8GB+

# Restart Docker Desktop
Restart-Service -Name docker
```

### Database Connection Failed
```powershell
# Check PostgreSQL logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Wait for health check
Start-Sleep -Seconds 30
```

### Kafka Issues
```powershell
# Check Kafka logs
docker-compose logs kafka

# Restart Kafka stack
docker-compose restart zookeeper
Start-Sleep -Seconds 10
docker-compose restart kafka
Start-Sleep -Seconds 30
```

## 🎯 Common Tasks

### Upload a Video
```powershell
$token = "YOUR_AUTH_TOKEN"
$videoFile = "C:\path\to\video.mp4"

$form = @{
    title = "My Video"
    description = "Test video upload"
    category = "Education"
    video = Get-Item -Path $videoFile
}

Invoke-RestMethod -Uri "http://localhost/api/videos/upload" `
    -Method POST `
    -Form $form `
    -Headers @{Authorization = "Bearer $token"}
```

### Watch Live Metrics
```powershell
# Watch Kafka topics
docker-compose exec kafka kafka-console-consumer `
    --bootstrap-server kafka:9092 `
    --topic video.views `
    --from-beginning

# Watch Redis counter updates
docker-compose exec redis redis-cli --scan --pattern "video:*:views"
```

### Check System Resources
```powershell
# Container resource usage
docker stats --no-stream

# Disk space
docker system df
```

## 🏆 You're Ready!

Your YouTube-scale platform is now running locally! 🎉

Next steps:
1. Open http://localhost in your browser
2. Register an account
3. Upload a video
4. Watch it stream with adaptive quality
5. See real-time view counts update

For detailed documentation, see:
- `YOUTUBE_SCALE_IMPLEMENTATION.md` - Complete guide
- `docs/CACHING_STRATEGY.md` - Caching details
- `docs/DATABASE_SCALING.md` - Database optimization
- `docs/CDN_ADAPTIVE_STREAMING.md` - Video delivery
