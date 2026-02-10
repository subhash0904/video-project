#!/bin/bash
# GCP VM Setup Script for Video Platform
# Run this script on your GCP VM to install all dependencies

set -e

echo "================================================"
echo "  Video Platform - GCP VM Setup Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please run as regular user, not root"
    exit 1
fi

echo ""
echo "📦 Step 1: Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
print_status "System packages updated"

echo ""
echo "🐳 Step 2: Installing Docker..."
if command -v docker &> /dev/null; then
    print_status "Docker already installed: $(docker --version)"
else
    # Remove old versions
    sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Install prerequisites
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update -qq
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    print_status "Docker installed successfully"
fi

echo ""
echo "🔧 Step 3: Installing Docker Compose..."
if command -v docker compose &> /dev/null; then
    print_status "Docker Compose already installed: $(docker compose version)"
else
    sudo apt-get install -y docker-compose-plugin
    print_status "Docker Compose installed"
fi

echo ""
echo "📂 Step 4: Setting up project directory..."
cd ~
if [ -d "video-project" ]; then
    print_warning "video-project directory already exists"
    echo "Pulling latest changes..."
    cd video-project
    git pull origin master || git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/subhash0904/video-project.git
    cd video-project
fi
print_status "Project directory ready"

echo ""
echo "⚙️ Step 5: Creating environment files..."
cd ~/video-project/infra

if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# Production Environment Variables

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=video_platform
DATABASE_URL=postgresql://postgres:postgres123@db-primary:5432/video_platform

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-$(openssl rand -hex 32)
JWT_EXPIRY=7d

# Kafka
KAFKA_BROKERS=kafka:9092

# Services
NODE_ENV=production
PORT=4000
FRONTEND_URL=http://localhost

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    print_status "Environment file created"
else
    print_warning ".env file already exists, skipping"
fi

# Backend env
cd ~/video-project/backend
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres123@db-primary:5432/video_platform
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d
REDIS_URL=redis://redis:6379
NODE_ENV=production
PORT=4000
KAFKA_BROKERS=kafka:9092
FRONTEND_URL=http://localhost
EOF
    print_status "Backend env created"
fi

echo ""
echo "🔥 Step 6: Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
print_status "Firewall configured"

echo ""
echo "📊 Step 7: Creating swap space (for e2-micro)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    print_status "2GB swap file created"
else
    print_warning "Swap already exists"
fi

echo ""
echo "================================================"
echo "  ✅ Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Log out and log back in (for docker group)"
echo "  2. Run: cd ~/video-project/infra"
echo "  3. Run: docker compose -f docker-compose.production.yml up -d --build"
echo ""
echo "Your VM IP: $(curl -s ifconfig.me)"
echo ""
print_warning "IMPORTANT: Change the JWT_SECRET in .env files before going live!"
echo ""
