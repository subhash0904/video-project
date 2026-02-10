#!/bin/bash
# Quick Deploy Script - YouTube-Like Video Platform
# Usage: ./deploy.sh [dev|docker|production]

ENVIRONMENT=${1:-dev}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Video Platform Deployment"
echo "Environment: $ENVIRONMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

case $ENVIRONMENT in
  dev)
    echo "📦 Starting Development Environment..."
    echo ""
    echo "Starting Backend (Terminal 1):"
    echo "  cd backend && pnpm build && pnpm dev"
    echo ""
    echo "Starting Frontend (Terminal 2):"
    echo "  cd frontend && pnpm dev"
    echo ""
    echo "✅ Backend: http://localhost:4000"
    echo "✅ Frontend: http://localhost:5173"
    echo "✅ API Health: http://localhost:4000/health"
    ;;
    
  docker)
    echo "🐳 Starting Docker Compose..."
    cd infra
    
    echo "[1/4] Pulling images..."
    docker-compose pull
    
    echo "[2/4] Starting services..."
    docker-compose up -d
    
    echo "[3/4] Waiting for services to be ready..."
    sleep 5
    
    echo "[4/4] Running migrations..."
    docker-compose exec -T backend pnpm prisma migrate deploy
    docker-compose exec -T backend pnpm db:seed:simple
    
    echo ""
    echo "✅ Services Started:"
    echo "   - PostgreSQL: localhost:5432"
    echo "   - Redis: localhost:6379"
    echo "   - Backend: http://localhost:4000"
    echo "   - Frontend: http://localhost:5173"
    echo ""
    echo "📊 View logs: docker-compose logs -f [backend|postgres|redis]"
    echo "🛑 Stop services: docker-compose down"
    ;;
    
  production)
    echo "🚀 Preparing Production Deployment..."
    echo ""
    echo "⚠️  PRODUCTION CHECKLIST:"
    echo "   [ ] Updated .env with production credentials"
    echo "   [ ] Rotated JWT_SECRET (min 32 chars)"
    echo "   [ ] Configured SSL certificates"
    echo "   [ ] Setup database backups"
    echo "   [ ] Configured monitoring/alerts"
    echo "   [ ] Reviewed security settings"
    echo ""
    
    echo "Building production images..."
    docker build -t video-backend:prod ./backend
    docker build -t video-frontend:prod ./frontend
    docker build -t video-transcoder:prod ./streaming
    
    echo ""
    echo "✅ Images built:"
    echo "   - video-backend:prod"
    echo "   - video-frontend:prod"
    echo "   - video-transcoder:prod"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Push images to registry"
    echo "   2. Deploy via docker-compose or Kubernetes"
    echo "   3. Configure Nginx/ingress"
    echo "   4. Run health checks"
    ;;
    
  *)
    echo "❌ Invalid environment. Usage: $0 [dev|docker|production]"
    exit 1
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Documentation:"
echo "   - Deployment Guide: DEPLOYMENT_GUIDE.md"
echo "   - Verification Report: FINAL_VERIFICATION_REPORT.md"
echo "   - Architecture: docs/ARCHITECTURE.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
