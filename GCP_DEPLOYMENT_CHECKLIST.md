# ✅ GCP Deployment Readiness Checklist

Use this checklist to ensure smooth deployment to Google Cloud Platform.

**Estimated Time:** 30-45 minutes  
**Cost:** $0.00/month (FREE tier)

---

## 📋 Pre-Deployment Checklist

### ☑️ Phase 0: Local Verification (Optional - 10 minutes)

Test everything works locally before deploying to GCP.

- [ ] **Navigate to project folder**
  ```bash
  cd project/video-project/infra
  ```

- [ ] **Copy environment template**
  ```bash
  cp .env.example .env
  ```

- [ ] **Start services locally**
  ```bash
  docker-compose -f docker-compose.production.yml up -d
  ```

- [ ] **Verify health checks**
  ```bash
  curl http://localhost/health        # Should return: {"status":"ok"}
  curl http://localhost:4000/health   # Should return: {"status":"ok"}
  curl http://localhost:4100/health   # Should return: {"status":"ok"}
  ```

- [ ] **Check all containers are healthy**
  ```bash
  docker-compose -f docker-compose.production.yml ps
  # All services should show "Up (healthy)"
  ```

- [ ] **Stop local deployment**
  ```bash
  docker-compose -f docker-compose.production.yml down
  ```

✅ **Local Test Complete!** Continue to GCP deployment.

---

## ☑️ Phase 1: GCP Account Setup (10 minutes)

### Step 1.1: Create GCP Account

- [ ] Go to https://console.cloud.google.com
- [ ] Click "Get started for free" or "Activate"
- [ ] Sign in with Google account
- [ ] Enter billing information (credit card - **$0 charged**)
- [ ] Verify you received **$300 free credits** (90 days)

**✓ Checkpoint:** You should see "Free trial activated" banner

### Step 1.2: Create Project

- [ ] Click "Select a project" dropdown (top bar)
- [ ] Click "New Project"
- [ ] Project name: `video-platform-prod` (or your choice)
- [ ] Click "Create"
- [ ] Wait for project creation (~30 seconds)
- [ ] **Write down your Project ID:** `_______________`

**✓ Checkpoint:** Project dashboard visible

### Step 1.3: Enable Required APIs

- [ ] Go to: APIs & Services → Library
- [ ] Search and enable: **Compute Engine API**
- [ ] Wait for activation (~1 minute)

**✓ Checkpoint:** "API enabled" confirmation

### Step 1.4: Set Budget Alerts (CRITICAL!)

- [ ] Go to: Billing → Budgets & alerts
- [ ] Click "Create Budget"
- [ ] Name: `Safety Budget`
- [ ] Budget amount: `$10.00` per month
- [ ] Set alert thresholds:
  - [ ] 50% ($5.00)
  - [ ] 90% ($9.00)
  - [ ] 100% ($10.00)
- [ ] Add your email for notifications
- [ ] Click "Finish"

**✓ Checkpoint:** Budget alert email received

---

## ☑️ Phase 2: VM Creation (5 minutes)

### Step 2.1: Create VM Instance

- [ ] Go to: Compute Engine → VM instances
- [ ] Click "Create Instance"
- [ ] Configure:
  - Name: `video-platform-vm`
  - Region: `us-west1` (or `us-central1`, `us-east1`)
  - Zone: `us-west1-a`
  - Machine type → Series: `E2`
  - Machine type: `e2-micro` (0.25-1 vCPU, 1 GB) ← **FREE!**
  - Boot disk → Click "Change"
    - Operating system: `Ubuntu`
    - Version: `Ubuntu 22.04 LTS`
    - Boot disk type: `Standard persistent disk`
    - Size: `30 GB` ← **FREE!**
    - Click "Select"
  - Firewall:
    - [ ] ✅ Allow HTTP traffic
    - [ ] ✅ Allow HTTPS traffic
- [ ] Click "Create"
- [ ] Wait for VM to start (~1 minute)
- [ ] **Write down External IP:** `_______________`

**✓ Checkpoint:** VM status shows green checkmark

### Step 2.2: Configure Firewall Rules

- [ ] Go to: VPC Network → Firewall → Create Firewall Rule
- [ ] Configure:
  - Name: `allow-video-platform`
  - Targets: `All instances in the network`
  - Source IPv4 ranges: `0.0.0.0/0`
  - Protocols and ports: `tcp:3000,4000,4100`
- [ ] Click "Create"

**✓ Checkpoint:** Firewall rule shows in list

---

## ☑️ Phase 3: VM Setup (10 minutes)

### Step 3.1: SSH into VM

- [ ] Go to: Compute Engine → VM instances
- [ ] Click "SSH" button next to your VM
- [ ] Wait for SSH console to open in browser

**✓ Checkpoint:** You see terminal prompt like `username@video-platform-vm:~$`

### Step 3.2: Install Docker

Copy and paste this entire block:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

- [ ] Verify installation:
  ```bash
  docker --version        # Should show version
  docker-compose --version # Should show version
  ```

- [ ] **LOGOUT AND LOGIN AGAIN:**
  ```bash
  exit
  # Click "SSH" button again to reconnect
  ```

**✓ Checkpoint:** `docker ps` works without sudo

### Step 3.3: Clone Repository

- [ ] Clone your repository:
  ```bash
  cd ~
  git clone https://github.com/YOUR_USERNAME/video-project.git
  cd video-project
  ```
  
  **Replace `YOUR_USERNAME` with your actual GitHub username!**

- [ ] Verify files exist:
  ```bash
  ls infra/
  # Should see: docker-compose.production.yml, .env.example, etc.
  ```

**✓ Checkpoint:** Repository cloned successfully

---

## ☑️ Phase 4: Environment Configuration (5 minutes)

### Step 4.1: Generate Secrets

- [ ] Generate JWT secrets (run 3 times, save output):
  ```bash
  openssl rand -hex 32
  # Run this 3 times and save each output!
  ```
  
  **Write down:**
  - JWT_SECRET: `________________________________`
  - REFRESH_TOKEN_SECRET: `________________________________`
  - ENCRYPTION_SECRET: `________________________________`

- [ ] Generate strong database password:
  ```bash
  openssl rand -base64 24
  ```
  
  **Write down:**
  - POSTGRES_PASSWORD: `________________________________`

- [ ] Get VM External IP:
  ```bash
  curl -s ifconfig.me
  ```
  
  **Write down:**
  - VM_IP: `_______________`

### Step 4.2: Configure .env File

- [ ] Navigate to infra directory:
  ```bash
  cd ~/video-project/infra
  ```

- [ ] Copy example environment:
  ```bash
  cp .env.example .env
  ```

- [ ] Edit .env file:
  ```bash
  nano .env
  ```

- [ ] Update these values (use secrets from above):
  ```bash
  POSTGRES_PASSWORD=<YOUR_POSTGRES_PASSWORD>
  JWT_SECRET=<YOUR_JWT_SECRET>
  REFRESH_TOKEN_SECRET=<YOUR_REFRESH_TOKEN_SECRET>
  ENCRYPTION_SECRET=<YOUR_ENCRYPTION_SECRET>
  FRONTEND_URL=http://<YOUR_VM_IP>
  VITE_WS_URL=ws://<YOUR_VM_IP>:4100
  GOOGLE_CALLBACK_URL=http://<YOUR_VM_IP>:4000/api/auth/google/callback
  ```

- [ ] Save and exit: `Ctrl+X`, then `Y`, then `Enter`

- [ ] Verify .env file:
  ```bash
  cat .env | grep -v "^#" | grep -v "^$"
  ```

**✓ Checkpoint:** All secrets configured correctly

---

## ☑️ Phase 5: Application Deployment (10 minutes)

### Step 5.1: Start Services

- [ ] Build and start all services:
  ```bash
  cd ~/video-project/infra
  docker-compose -f docker-compose.production.yml up -d --build
  ```
  
  **This will take 5-10 minutes first time!**

- [ ] Watch logs (optional):
  ```bash
  docker-compose -f docker-compose.production.yml logs -f
  # Press Ctrl+C to exit
  ```

### Step 5.2: Verify Services Started

- [ ] Check container status:
  ```bash
  docker-compose -f docker-compose.production.yml ps
  ```
  
  **All services should show "Up" or "Up (healthy)"**

- [ ] Wait for all services to be healthy (~2-3 minutes):
  ```bash
  watch docker-compose -f docker-compose.production.yml ps
  # Press Ctrl+C when all show (healthy)
  ```

**✓ Checkpoint:** All containers running and healthy

---

## ☑️ Phase 6: Health Verification (5 minutes)

### Step 6.1: Test Health Endpoints

- [ ] Test API Gateway:
  ```bash
  curl http://localhost/health
  # Should return: {"status":"ok"} or similar
  ```

- [ ] Test Backend:
  ```bash
  curl http://localhost:4000/health
  # Should return: {"status":"ok"}
  ```

- [ ] Test WebSocket:
  ```bash
  curl http://localhost:4100/health
  # Should return: {"status":"ok"}
  ```

- [ ] Test Redis:
  ```bash
  docker-compose -f docker-compose.production.yml exec redis redis-cli ping
  # Should return: PONG
  ```

- [ ] Test PostgreSQL:
  ```bash
  docker-compose -f docker-compose.production.yml exec postgres pg_isready -U video_user
  # Should return: "accepting connections"
  ```

**✓ Checkpoint:** All health checks pass

### Step 6.2: Test From Internet

**On your local computer (NOT on VM):**

- [ ] Test API Gateway:
  ```bash
  curl http://<YOUR_VM_IP>/health
  ```

- [ ] Test Backend:
  ```bash
  curl http://<YOUR_VM_IP>:4000/health
  ```

- [ ] Test in browser:
  - [ ] Open: `http://<YOUR_VM_IP>`
  - [ ] You should see the frontend

**✓ Checkpoint:** Application accessible from internet!

---

## ☑️ Phase 7: GitHub Actions Setup (10 minutes)

### Step 7.1: Generate SSH Key for GitHub Actions

- [ ] On VM, generate SSH key:
  ```bash
  ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
  ```

- [ ] Add public key to authorized_keys:
  ```bash
  cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
  ```

- [ ] Display private key (COPY THIS):
  ```bash
  cat ~/.ssh/github_actions
  ```
  
  **⚠️ Copy the ENTIRE output including BEGIN/END lines!**

### Step 7.2: Get VM Information

- [ ] Get VM External IP:
  ```bash
  curl -s ifconfig.me
  ```
  **Write down:** `_______________`

- [ ] Get SSH username:
  ```bash
  whoami
  ```
  **Write down:** `_______________`

- [ ] Get Project ID:
  ```bash
  gcloud config get-value project
  ```
  **Write down:** `_______________`

### Step 7.3: Add GitHub Secrets

- [ ] Go to GitHub repository
- [ ] Click: Settings → Secrets and variables → Actions
- [ ] Click "New repository secret" for EACH of these:

| Secret Name | Your Value |
|-------------|------------|
| `GCP_SSH_KEY` | <PRIVATE KEY FROM STEP 7.1> |
| `GCP_VM_IP` | <VM IP FROM STEP 7.2> |
| `GCP_VM_USER` | <USERNAME FROM STEP 7.2> |
| `GCP_PROJECT_ID` | <PROJECT ID FROM STEP 7.2> |
| `GCP_REGION` | `us-west1` (or your region) |

- [ ] Verify all 5 secrets are added

**✓ Checkpoint:** All GitHub secrets configured

### Step 7.4: Test GitHub Actions

- [ ] Make a small change locally:
  ```bash
  # On your local computer
  cd video-project
  echo "# Deployed to GCP" >> README.md
  git add .
  git commit -m "test: GCP deployment"
  git push origin main  # or 'master'
  ```

- [ ] Watch GitHub Actions:
  - [ ] Go to: GitHub repo → Actions tab
  - [ ] Click on the running workflow
  - [ ] Watch it complete (~2-3 minutes)

**✓ Checkpoint:** GitHub Actions runs successfully and deployment completes

---

## ☑️ Phase 8: Final Verification (5 minutes)

### Step 8.1: Full System Test

- [ ] **Register a user** (in browser):
  ```
  http://<YOUR_VM_IP>
  Click "Register" → Fill form → Submit
  ```

- [ ] **Login:**
  ```
  Login with credentials you just created
  ```

- [ ] **Upload video** (if implemented):
  ```
  Click "Upload" → Select video → Submit
  ```

- [ ] **Test WebSocket** (browser console):
  ```javascript
  const ws = new WebSocket('ws://<YOUR_VM_IP>:4100');
  ws.onopen = () => console.log('✅ Connected!');
  ws.onmessage = (msg) => console.log('📨', msg.data);
  ```

**✓ Checkpoint:** All features working!

### Step 8.2: Check Costs

- [ ] Go to: GCP Console → Billing → Overview
- [ ] Verify: **Current charges: $0.00**
- [ ] Verify: **Free credits: $300.00**
- [ ] Check email for budget alert confirmation

**✓ Checkpoint:** No unexpected charges

---

## 🎉 SUCCESS CHECKLIST

If you can check ALL of these, you're done!

### Infrastructure
- [ ] GCP account active with $300 credits
- [ ] Budget alert configured ($10/month)
- [ ] e2-micro VM running (FREE tier)
- [ ] Firewall rules configured
- [ ] Docker installed and working

### Application
- [ ] All containers "Up (healthy)"
- [ ] Health endpoints return 200 OK
- [ ] Application accessible from internet
- [ ] Database connected and ready
- [ ] Redis cache working
- [ ] Kafka processing events

### CI/CD
- [ ] GitHub Actions workflow exists
- [ ] GitHub secrets configured
- [ ] Deployment runs successfully
- [ ] Push to main triggers auto-deploy

### Costs & Monitoring
- [ ] GCP billing shows $0.00
- [ ] Budget alerts configured
- [ ] Email notifications working
- [ ] No unexpected services running

### Functionality
- [ ] User registration works
- [ ] User login works
- [ ] Frontend loads correctly
- [ ] WebSocket connection works
- [ ] (Optional) Video upload/streaming works

---

## 📚 What's Next?

### Today:
- [x] Read [GCP_COST_GUARDRAILS.md](GCP_COST_GUARDRAILS.md)
- [x] Share your URL: `http://<YOUR_VM_IP>`
- [x] Test all features thoroughly

### This Week:
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure HTTPS (Let's Encrypt)
- [ ] Add custom domain
- [ ] Invite beta users

### When Ready to Scale:
- [ ] Upgrade to e2-small ($15/month)
- [ ] Migrate to Cloud SQL
- [ ] Add Cloud CDN
- [ ] Implement multi-region

---

## 🆘 Troubleshooting

### If something doesn't work:

**Services won't start:**
```bash
docker-compose -f docker-compose.production.yml logs
docker stats
free -h
```

**Out of memory:**
```bash
# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**GitHub Actions fails:**
- Verify all secrets are set correctly
- Check SSH key has no extra spaces/newlines
- Verify VM External IP is correct

**Can't access from browser:**
- Check firewall rules
- Verify VM External IP
- Test from VM: `curl http://localhost/health`

---

## 📖 Reference Documentation

- [GCP_QUICK_START.md](GCP_QUICK_START.md) - Quick start guide
- [GCP_DEPLOYMENT_GUIDE.md](GCP_DEPLOYMENT_GUIDE.md) - Detailed guide
- [GCP_COST_GUARDRAILS.md](GCP_COST_GUARDRAILS.md) - Cost management
- [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) - CI/CD details
- [GCP_IMPLEMENTATION_SUMMARY.md](GCP_IMPLEMENTATION_SUMMARY.md) - Full summary

---

**🎉 CONGRATULATIONS! Your YouTube-scale platform is live on GCP!**

**Your Platform:** `http://<YOUR_VM_IP>`  
**Monthly Cost:** $0.00 (FREE tier)  
**Capacity:** 100-500 concurrent users

**Successfully deployed?** Share your success! 🚀
