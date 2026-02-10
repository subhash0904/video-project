# ⚡ FINAL DEPLOYMENT STEPS - Complete Guide

**Status:** Local environment ready ✅ | GCP deployment ready to go 🚀  
**Time Required:** 20-30 minutes  
**Cost:** $0.00/month (FREE tier)

---

## 🎯 What's Already Done

✅ Local Docker environment tested and working  
✅ Backend, Frontend, PostgreSQL, Redis all healthy  
✅ Environment variables configured  
✅ GitHub Actions workflow created  
✅ Complete documentation written  

---

## 📋 COMPLETE THE DEPLOYMENT (Follow in order)

### STEP 1: GCP Account Setup (10 min)

**Go to:** https://console.cloud.google.com

1. **Create/Login** to Google Cloud account
2. **Activate** $300 free trial
3. **Create project:** `video-platform-prod`
4. **Enable API:** Compute Engine API
5. **Set budget alert:** $10/month with 50%, 90%, 100% alerts

---

### STEP 2: Create FREE VM (5 min)

**In GCP Console → Compute Engine → VM instances → CREATE INSTANCE**

```yaml
Name: video-platform-vm
Region: us-west1 (or us-central1, us-east1)
Zone: us-west1-a

Machine Configuration:
  Series: E2
  Machine type: e2-micro (FREE ✅)

Boot Disk:
  OS: Ubuntu 22.04 LTS
  Type: Standard persistent disk
  Size: 30 GB (FREE ✅)

Firewall:
  ✓ Allow HTTP traffic
  ✓ Allow HTTPS traffic
```

Click **CREATE** → Wait 1 minute

**Firewall Rules:** VPC Network → Firewall → CREATE FIREWALL RULE
```yaml
Name: allow-video-ports
Targets: All instances
Source: 0.0.0.0/0
Protocols: tcp:3000,4000,4100,5432,6379,9092
```

---

### STEP 3: Configure VM (10 min)

**SSH into VM:** Click "SSH" button in GCP Console

**Copy & paste this entire block:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
exit
```

**SSH back in, then continue:**

```bash
# Clone repository
cd ~
git clone https://github.com/subhash0904/video-project.git
cd video-project/infra

# Configure environment
cp .env.example .env
nano .env
```

**In nano, update these lines:**
```bash
POSTGRES_PASSWORD=YourSecurePassword123
JWT_SECRET=your_32_char_secret_here_change_this
REFRESH_TOKEN_SECRET=another_32_char_secret_change_this
ENCRYPTION_SECRET=third_32_char_secret_change_this
FRONTEND_URL=http://YOUR_VM_EXTERNAL_IP
VITE_WS_URL=ws://YOUR_VM_EXTERNAL_IP:4100
GOOGLE_CALLBACK_URL=http://YOUR_VM_EXTERNAL_IP:4000/api/auth/google/callback
```

Press `Ctrl+X`, `Y`, `Enter` to save.

**Get your VM external IP:**
```bash
curl -s ifconfig.me
```

**Start services:**
```bash
docker-compose -f docker-compose.yml up -d

# Wait 2 minutes, then check:
docker-compose -f docker-compose.yml ps
```

**All should show "Up (healthy)"**

---

### STEP 4: Test Deployment (2 min)

**Get VM IP:**
```bash
VM_IP=$(curl -s ifconfig.me)
echo "Your platform: http://$VM_IP"
```

**Test endpoints:**
```bash
curl http://localhost/health
curl http://localhost:4000/health
```

**From your local computer browser:**
```
http://YOUR_VM_EXTERNAL_IP
```

✅ You should see your video platform!

---

### STEP 5: GitHub Actions Setup (5 min)

**On VM, generate SSH key:**
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key (COPY THIS)
cat ~/.ssh/github_actions
```

**On GitHub (github.com/subhash0904/video-project):**

Settings → Secrets and variables → Actions → New repository secret

Add these 5 secrets:

| Name | Value |
|------|-------|
| `GCP_SSH_KEY` | (paste private key from above) |
| `GCP_VM_IP` | (your VM external IP) |
| `GCP_VM_USER` | (run `whoami` on VM) |
| `GCP_PROJECT_ID` | `video-platform-prod` |
| `GCP_REGION` | `us-west1` |

**Test deployment:**
```bash
# On local computer
cd C:\project\video-project
git add .
git commit -m "Setup GCP deployment"
git push origin master
```

Go to GitHub → Actions tab → Watch deployment!

---

## ✅ SUCCESS CHECKLIST

After completing all steps:

- [ ] GCP account created with $300 credits
- [ ] Budget alert configured ($10/month)
- [ ] e2-micro VM running
- [ ] Docker installed on VM
- [ ] Application deployed and healthy
- [ ] Can access: `http://YOUR_VM_IP`
- [ ] GitHub secrets configured
- [ ] Push to master auto-deploys

---

## 🆘 TROUBLESHOOTING

### Services won't start
```bash
docker-compose logs
docker stats
free -h  # Check memory
```

### Out of memory
```bash
# Add swap (e2-micro has only 1GB RAM)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Can't access from browser
```bash
# Check firewall
gcloud compute firewall-rules list

# Check service on VM
curl http://localhost/health
```

### GitHub Actions fails
- Verify all 5 secrets are set
- Check SSH key has no extra spaces
- Verify VM IP is correct

---

## 📚 REFERENCE DOCUMENTATION

All guides are in your repository:

- **[GCP_QUICK_START.md](GCP_QUICK_START.md)** - 30-min quick start
- **[GCP_DEPLOYMENT_GUIDE.md](GCP_DEPLOYMENT_GUIDE.md)** - Detailed guide
- **[GCP_COST_GUARDRAILS.md](GCP_COST_GUARDRAILS.md)** - Cost management
- **[GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)** - CI/CD details
- **[GCP_DEPLOYMENT_CHECKLIST.md](GCP_DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist

---

## 💰 COST SUMMARY

```
Current Setup (FREE Tier):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
e2-micro VM (us-west1)      $0.00/month ✅
30 GB Standard Disk         $0.00/month ✅
Network Egress (1GB free)   $0.00/month ✅
$300 GCP Credits            Active ✅
Budget Alert                Configured ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:                      $0.00/month
```

---

## 🎉 YOU'RE DONE!

After completing these steps, you'll have:

✅ Production YouTube-scale platform on GCP  
✅ Auto-scaling architecture  
✅ GitHub Actions CI/CD (push to deploy)  
✅ Zero cost (FREE tier)  
✅ Budget alerts protecting you  
✅ Public URL to share  

**Your platform will be live at:** `http://YOUR_VM_EXTERNAL_IP`

---

## 📧 MONITORING

**Daily:** Check GCP billing dashboard  
**Weekly:** Review usage and performance  
**Monthly:** Optimize based on actual usage  

**Stop VM when not using:**
```bash
gcloud compute instances stop video-platform-vm --zone=us-west1-a
```

**Restart when needed:**
```bash
gcloud compute instances start video-platform-vm --zone=us-west1-a
```

---

**Questions?** Check the detailed guides in your repository!

**Success?** Your platform is live! Share the URL! 🚀
