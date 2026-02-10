# 🚀 GCP Deployment Guide - YouTube-Scale Platform

## Table of Contents
- [Prerequisites](#prerequisites)
- [Phase 1: GCP Project Setup](#phase-1-gcp-project-setup)
- [Phase 2: VM Creation (FREE TIER)](#phase-2-vm-creation-free-tier)
- [Phase 3: VM Configuration](#phase-3-vm-configuration)
- [Phase 4: Deploy Application](#phase-4-deploy-application)
- [Phase 5: GitHub Actions Setup](#phase-5-github-actions-setup)
- [Phase 6: Testing & Verification](#phase-6-testing--verification)
- [Phase 7: Scaling](#phase-7-scaling)
- [Cost Management](#cost-management)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

✅ **What you need:**
- Google account
- GitHub account with this repository
- Basic terminal knowledge
- Credit card (for GCP, **$0 charged with free tier**)

✅ **What you get for FREE:**
- $300 GCP credits (90 days)
- 1 e2-micro VM (always free in select regions)
- 30GB standard persistent disk
- 1GB network egress/month

---

## Phase 1: GCP Project Setup

### Step 1: Create GCP Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign up for free trial → **Get $300 credits**
3. Enable billing (required, but FREE tier available)

### Step 2: Create Project
```bash
# In GCP Console
1. Click "Select a project" → "New Project"
2. Project name: "video-platform-prod"
3. Click "Create"
```

### Step 3: Enable Required APIs
```bash
# In GCP Console → APIs & Services → Enable APIs
✔ Compute Engine API
✔ Cloud SQL API (optional, for later)
✔ Cloud Pub/Sub API (optional, for later)
```

### Step 4: Set Budget Alerts ⚠️ CRITICAL
```bash
# In GCP Console → Billing → Budgets & alerts
1. Click "Create Budget"
2. Set budget: $10/month
3. Alert thresholds:
   - 50% ($5)
   - 90% ($9)
   - 100% ($10)
4. Add your email for notifications
```

---

## Phase 2: VM Creation (FREE TIER)

### Step 1: Create Compute Engine VM
```bash
# In GCP Console → Compute Engine → VM instances → Create Instance

NAME: video-platform-vm
REGION: us-west1  # Or: us-central1, us-east1 (FREE tier eligible)
ZONE: us-west1-a

MACHINE CONFIGURATION:
  Series: E2
  Machine type: e2-micro (0.25-1 vCPU, 1 GB memory) ✅ ALWAYS FREE

BOOT DISK:
  Operating System: Ubuntu
  Version: Ubuntu 22.04 LTS
  Boot disk type: Standard persistent disk
  Size: 30 GB ✅ FREE

FIREWALL:
  ✅ Allow HTTP traffic
  ✅ Allow HTTPS traffic

NETWORKING:
  External IP: Ephemeral (or Reserve Static IP for $3/month)
```

### Step 2: Configure Firewall Rules
```bash
# In GCP Console → VPC Network → Firewall → Create Firewall Rule

# Rule 1: Allow Backend
NAME: allow-backend
TARGETS: All instances
SOURCE IP RANGES: 0.0.0.0/0
PROTOCOLS: tcp:4000

# Rule 2: Allow WebSocket
NAME: allow-websocket
TARGETS: All instances
SOURCE IP RANGES: 0.0.0.0/0
PROTOCOLS: tcp:4100

# Rule 3: Allow API Gateway (if needed)
NAME: allow-api-gateway
TARGETS: All instances
SOURCE IP RANGES: 0.0.0.0/0
PROTOCOLS: tcp:3000
```

---

## Phase 3: VM Configuration

### Step 1: SSH into VM
```bash
# Option A: Browser SSH (easiest)
In GCP Console → Compute Engine → VM instances → Click "SSH"

# Option B: gcloud CLI
gcloud compute ssh video-platform-vm --zone=us-west1-a

# Option C: Local SSH (after setting up keys)
ssh -i ~/.ssh/gcp_key username@VM_EXTERNAL_IP
```

### Step 2: Install Docker
```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Docker
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version

# ⚠️ LOGOUT AND LOGIN AGAIN for group changes
exit
# SSH back in
```

### Step 3: Install Git
```bash
sudo apt install -y git

git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## Phase 4: Deploy Application

### Step 1: Clone Repository
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/video-project.git
cd video-project
```

### Step 2: Configure Environment
```bash
cd infra

# Copy example environment file
cp .env.example .env

# Edit with production values
nano .env
```

**Required .env values:**
```bash
# Database
POSTGRES_USER=video_user
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>
POSTGRES_DB=video_platform

# JWT Secrets (generate with: openssl rand -hex 32)
JWT_SECRET=<32_CHAR_SECRET>
REFRESH_TOKEN_SECRET=<32_CHAR_SECRET>
ENCRYPTION_SECRET=<32_CHAR_SECRET>

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://YOUR_VM_IP:4000/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://YOUR_VM_IP
VITE_WS_URL=ws://YOUR_VM_IP:4100
```

### Step 3: Start Services
```bash
# Build and start all services
docker-compose -f docker-compose.production.yml up -d --build

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f

# View specific service logs
docker-compose -f docker-compose.production.yml logs backend -f
```

### Step 4: Initialize Database
```bash
# Run migrations
docker-compose -f docker-compose.production.yml exec backend npx prisma migrate deploy

# (Optional) Seed database
docker-compose -f docker-compose.production.yml exec backend npm run seed
```

---

## Phase 5: GitHub Actions Setup

### Step 1: Generate SSH Key for VM
```bash
# On VM
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key (copy this)
cat ~/.ssh/github_actions
```

### Step 2: Add GitHub Secrets
```bash
# In GitHub: Settings → Secrets and variables → Actions → New repository secret

GCP_VM_IP         = <YOUR_VM_EXTERNAL_IP>
GCP_VM_USER       = <YOUR_SSH_USERNAME>  # Usually: yourusername or ubuntu
GCP_SSH_KEY       = <PASTE_PRIVATE_KEY_FROM_ABOVE>
GCP_PROJECT_ID    = video-platform-prod
GCP_REGION        = us-west1
```

### Step 3: Test GitHub Actions
```bash
# Push to main branch to trigger deployment
git add .
git commit -m "Setup GCP deployment"
git push origin main

# Or trigger manually:
# GitHub → Actions → Deploy to GCP → Run workflow
```

---

## Phase 6: Testing & Verification

### Access Your Application
```bash
# Get VM External IP
VM_IP=$(gcloud compute instances describe video-platform-vm \
  --zone=us-west1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "Your platform: http://$VM_IP"
```

### Health Checks
```bash
# API Gateway
curl http://$VM_IP/health

# Backend
curl http://$VM_IP:4000/health

# WebSocket
curl http://$VM_IP:4100/health

# Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli ping

# PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres pg_isready

# Kafka
docker-compose -f docker-compose.production.yml exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Test Full Flow
```bash
# 1. Register user
curl -X POST http://$VM_IP/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","username":"testuser"}'

# 2. Login
curl -X POST http://$VM_IP/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# 3. Test WebSocket (browser console)
const ws = new WebSocket('ws://YOUR_VM_IP:4100');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (msg) => console.log('Received:', msg.data);
```

---

## Phase 7: Scaling

### Horizontal Scaling (Scale Services)
```bash
# Scale backend to 3 instances
docker-compose -f docker-compose.production.yml up -d --scale backend=3

# Scale realtime-service to 2 instances
docker-compose -f docker-compose.production.yml up -d --scale realtime-service=2

# Monitor resources
docker stats
```

### Vertical Scaling (Upgrade VM)
```bash
# Stop VM
gcloud compute instances stop video-platform-vm --zone=us-west1-a

# Change machine type
gcloud compute instances set-machine-type video-platform-vm \
  --machine-type=e2-small \
  --zone=us-west1-a

# Start VM
gcloud compute instances start video-platform-vm --zone=us-west1-a

# Note: e2-small costs ~$15/month (NOT free)
```

---

## Cost Management

### Current FREE Tier Usage
```
✅ e2-micro VM: $0/month (1 instance always free)
✅ 30GB disk: $0/month (30GB free)
✅ 1GB egress: $0/month (1GB free)
✅ $300 credits: Active (90 days)

Estimated actual cost: $0.00/month
```

### Monitor Costs
```bash
# In GCP Console → Billing → Reports
- Check daily costs
- Set up budget alerts
- Use cost breakdown by service
```

### Stop VM When Not Using
```bash
# Stop (saves compute costs)
gcloud compute instances stop video-platform-vm --zone=us-west1-a

# Start again
gcloud compute instances start video-platform-vm --zone=us-west1-a

# Delete (saves all costs)
gcloud compute instances delete video-platform-vm --zone=us-west1-a
```

---

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Check resources
docker stats
free -h
df -h

# Restart specific service
docker-compose -f docker-compose.production.yml restart backend
```

### Out of Memory
```bash
# e2-micro has only 1GB RAM
# Enable swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Database Connection Issues
```bash
# Check PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres psql -U video_user -d video_platform -c "SELECT 1;"

# Reset database
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d
```

### Kafka Issues
```bash
# Check Zookeeper
docker-compose -f docker-compose.production.yml logs zookeeper

# Check Kafka
docker-compose -f docker-compose.production.yml exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Reset Kafka
docker-compose -f docker-compose.production.yml restart zookeeper kafka
```

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :4000
sudo netstat -tulpn | grep :4000

# Kill process
sudo kill -9 <PID>
```

---

## Next Steps: Cloud-Native Migration

### When Ready to Scale Beyond FREE Tier:

1. **Kafka → Pub/Sub**
   - GCP managed Kafka
   - No Zookeeper maintenance
   - Auto-scaling

2. **PostgreSQL → Cloud SQL**
   - Managed database
   - Automatic backups
   - Read replicas

3. **Redis → Memorystore**
   - Managed Redis
   - High availability
   - Better performance

4. **Docker Compose → Cloud Run**
   - Pay per request
   - Auto-scale to zero
   - No VM management

5. **Add Cloud CDN**
   - Cache static assets
   - Global distribution
   - Lower latency

---

## Support & Resources

- **GCP Free Tier**: https://cloud.google.com/free
- **GCP Documentation**: https://cloud.google.com/docs
- **Docker Compose**: https://docs.docker.com/compose/
- **GitHub Actions**: https://docs.github.com/en/actions

---

**🎉 You now have a production-ready, YouTube-scale platform running on GCP for FREE!**
