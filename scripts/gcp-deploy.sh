#!/bin/bash
# GCP Deployment Script - Run after setup
# Usage: ./deploy.sh

set -e

echo "================================================"
echo "  Video Platform - GCP Deployment"
echo "================================================"

cd ~/video-project

echo ""
echo "📥 Pulling latest code..."
git pull origin master || git pull origin main

echo ""
echo "📁 Entering infra directory..."
cd infra

echo ""
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.production.yml down 2>/dev/null || true

echo ""
echo "🧹 Cleaning up..."
docker image prune -f
docker volume prune -f

echo ""
echo "🔨 Building and starting services..."
docker compose -f docker-compose.production.yml up -d --build

echo ""
echo "⏳ Waiting for services to start (60 seconds)..."
sleep 60

echo ""
echo "🏥 Health checks..."
FAILED=0

check_health() {
    local name=$1
    local url=$2
    if curl -sf --max-time 10 "$url" > /dev/null 2>&1; then
        echo "✓ $name: healthy"
    else
        echo "✗ $name: FAILED"
        FAILED=1
    fi
}

check_health "Frontend" "http://localhost/health"
check_health "Backend" "http://localhost:4000/health"
check_health "API Gateway" "http://localhost:3000/health"

echo ""
if [ $FAILED -eq 0 ]; then
    echo "================================================"
    echo "  ✅ Deployment Successful!"
    echo "================================================"
    echo ""
    echo "Your application is now running at:"
    echo "  🌐 http://$(curl -s ifconfig.me)"
    echo ""
    echo "Services status:"
    docker compose -f docker-compose.production.yml ps
else
    echo "================================================"
    echo "  ⚠️ Some services may have issues"
    echo "================================================"
    echo ""
    echo "Check logs with:"
    echo "  docker compose -f docker-compose.production.yml logs -f"
fi
