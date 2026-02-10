# 🚀 GitHub Actions Setup Guide

This guide walks you through setting up automated CI/CD deployment to GCP using GitHub Actions.

---

## Prerequisites

✅ GitHub repository with this code  
✅ GCP VM created and running  
✅ SSH access to GCP VM  

---

## Step 1: Generate SSH Key on GCP VM

SSH into your GCP VM and create a dedicated SSH key for GitHub Actions:

```bash
# SSH into your VM
gcloud compute ssh video-platform-vm --zone=us-west1-a

# Generate new SSH keypair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions -N ""

# Add public key to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display the PRIVATE key (you'll need this for GitHub)
cat ~/.ssh/github_actions
```

**⚠️ IMPORTANT:** Copy the entire private key output (including `-----BEGIN ... -----END` lines)

---

## Step 2: Get GCP VM Details

```bash
# Get your VM's external IP
gcloud compute instances describe video-platform-vm \
  --zone=us-west1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# Note your SSH username (usually your GCP email prefix or 'ubuntu')
whoami

# Note your GCP project ID
gcloud config get-value project

# Note your region
gcloud config get-value compute/zone
```

---

## Step 3: Add GitHub Secrets

Go to your GitHub repository:

```
Settings → Secrets and variables → Actions → New repository secret
```

Add the following secrets:

### Required Secrets

| Secret Name | Value | Example |
|------------|-------|---------|
| `GCP_SSH_KEY` | Private key from Step 1 | `-----BEGIN OPENSSH PRIVATE KEY-----\nxxxxx\n-----END OPENSSH PRIVATE KEY-----` |
| `GCP_VM_IP` | External IP of your VM | `34.83.123.456` |
| `GCP_VM_USER` | SSH username | `your_username` or `ubuntu` |
| `GCP_PROJECT_ID` | GCP Project ID | `video-platform-prod` |
| `GCP_REGION` | GCP Region | `us-west1` |

### How to Add Each Secret

1. Click **"New repository secret"**
2. Enter the **Name** (e.g., `GCP_SSH_KEY`)
3. Paste the **Value**
4. Click **"Add secret"**
5. Repeat for all 5 secrets

---

## Step 4: Verify GitHub Actions Workflow

The workflow file is already created at:
```
.github/workflows/deploy-gcp.yml
```

Review it to ensure it matches your setup:

```yaml
# Key sections to verify:
env:
  GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GCP_REGION: ${{ secrets.GCP_REGION }}

# Deployment triggers:
on:
  push:
    branches:
      - main      # Or 'master' if that's your default branch
      - master
  workflow_dispatch:  # Allows manual trigger
```

---

## Step 5: Test Deployment

### Option A: Push to Trigger (Recommended)

```bash
# Make a small change
echo "# GCP Deployment Ready" >> README.md

# Commit and push
git add .
git commit -m "test: trigger GCP deployment"
git push origin main  # or 'master'
```

### Option B: Manual Trigger

1. Go to GitHub: **Actions** tab
2. Click **"Deploy to GCP"** workflow
3. Click **"Run workflow"**
4. Select branch and click **"Run workflow"**

---

## Step 6: Monitor Deployment

### In GitHub UI

1. Go to **Actions** tab
2. Click on the running workflow
3. Watch the deployment steps in real-time

### Expected Output

```
✓ Checkout code
✓ Setup SSH
✓ Deploy to GCP
  📥 Pulling latest code...
  🛑 Stopping existing containers...
  🧹 Cleaning up old images...
  🚀 Starting services...
  ⏳ Waiting for services to start...
  🏥 Checking service health...
  ✅ Deployment complete!
✓ Verify deployment
  🔍 Verifying deployment...
  ✅ API Gateway health check passed
  ✅ Backend health check passed
  ✅ WebSocket health check passed
  ✅ Verification complete
✓ Cleanup SSH
```

---

## Step 7: Verify Deployment on VM

SSH into your VM and check:

```bash
# Check running containers
docker ps

# Check logs
cd ~/video-project/infra
docker-compose -f docker-compose.production.yml logs --tail=50

# Test health endpoints
curl http://localhost/health
curl http://localhost:4000/health
curl http://localhost:4100/health
```

---

## Troubleshooting

### ❌ "Permission denied (publickey)"

**Solution:**
```bash
# On VM, check authorized_keys
cat ~/.ssh/authorized_keys | grep github-actions

# Ensure correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Verify SSH key format (should start with ssh-ed25519)
cat ~/.ssh/github_actions.pub
```

### ❌ "Host key verification failed"

**Cause:** SSH host key not in known_hosts

**Solution:** The workflow automatically handles this with:
```yaml
ssh-keyscan -H ${{ secrets.GCP_VM_IP }} >> ~/.ssh/known_hosts
```

If issues persist, manually add on VM:
```bash
ssh-keyscan -H <YOUR_VM_IP> >> ~/.ssh/known_hosts
```

### ❌ Docker commands fail with "permission denied"

**Solution:**
```bash
# On VM, ensure user is in docker group
sudo usermod -aG docker $USER

# Logout and login again
exit
# SSH back in
```

### ❌ "fatal: could not read Username for 'https://github.com'"

**Cause:** Git authentication issue on VM

**Solution:**
```bash
# On VM, configure git credentials
cd ~/video-project

# Option A: Use HTTPS with token
git remote set-url origin https://YOUR_GITHUB_TOKEN@github.com/YOUR_USERNAME/video-project.git

# Option B: Use SSH (recommended)
git remote set-url origin git@github.com:YOUR_USERNAME/video-project.git

# Add GitHub to known_hosts
ssh-keyscan github.com >> ~/.ssh/known_hosts
```

### ❌ Containers fail to start after deployment

**Check logs:**
```bash
cd ~/video-project/infra
docker-compose -f docker-compose.production.yml logs

# Check specific service
docker-compose -f docker-compose.production.yml logs backend

# Check resources
docker stats
free -h
df -h
```

---

## Advanced: Branch-Specific Deployments

### Deploy Different Branches to Different Environments

Modify `.github/workflows/deploy-gcp.yml`:

```yaml
name: Deploy to GCP

on:
  push:
    branches:
      - main      # Production
      - staging   # Staging environment
      - develop   # Development environment

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Set environment based on branch
        run: |
          if [[ $GITHUB_REF == 'refs/heads/main' ]]; then
            echo "ENV=production" >> $GITHUB_ENV
            echo "VM_IP=${{ secrets.GCP_VM_IP_PROD }}" >> $GITHUB_ENV
          elif [[ $GITHUB_REF == 'refs/heads/staging' ]]; then
            echo "ENV=staging" >> $GITHUB_ENV
            echo "VM_IP=${{ secrets.GCP_VM_IP_STAGING }}" >> $GITHUB_ENV
          else
            echo "ENV=development" >> $GITHUB_ENV
            echo "VM_IP=${{ secrets.GCP_VM_IP_DEV }}" >> $GITHUB_ENV
          fi
      
      # ... rest of deployment steps
```

---

## Security Best Practices

### ✅ DO's

- ✅ Use separate SSH keys for GitHub Actions (not your personal key)
- ✅ Store ALL sensitive data in GitHub Secrets
- ✅ Limit SSH key to only deployment user on VM
- ✅ Regularly rotate SSH keys (every 90 days)
- ✅ Use `ed25519` key type (more secure than RSA)
- ✅ Enable branch protection rules

### ❌ DON'Ts

- ❌ NEVER commit SSH keys to repository
- ❌ NEVER use root user for deployments
- ❌ DON'T share SSH keys between environments
- ❌ DON'T give GitHub Actions unnecessary permissions
- ❌ DON'T expose secrets in logs or error messages

---

## Monitoring Deployments

### GitHub Actions Email Notifications

1. Go to: **GitHub Profile → Settings → Notifications**
2. Enable: **"Actions" → "Send notifications for failed workflows"**

### Slack Integration (Optional)

Add to workflow:

```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "🚨 Deployment Failed!",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Deployment Failed*\nBranch: ${{ github.ref }}\nCommit: ${{ github.sha }}"
            }
          }
        ]
      }
```

---

## Workflow Execution History

View past deployments:

```
GitHub → Actions → Deploy to GCP → View all workflow runs
```

You can:
- ✅ See deployment success/failure
- ✅ View logs for debugging
- ✅ Re-run failed deployments
- ✅ Download logs for analysis

---

## Next Steps

✅ **Phase 1 Complete:** GitHub Actions is set up!

**Next:**
- 📊 Add monitoring (Prometheus/Grafana)
- 🔒 Set up HTTPS with Let's Encrypt
- 📧 Configure email notifications for failures
- 🌍 Add CDN for static assets
- 🔄 Implement blue-green deployments

---

## Quick Reference

```bash
# Test SSH connection from local machine
ssh -i ~/.ssh/gcp_key $GCP_VM_USER@$GCP_VM_IP

# Check GitHub Actions runner status
# (Go to GitHub Settings → Actions → Runners)

# View real-time deployment logs
# (GitHub → Actions → Running workflow → Expand steps)

# Roll back deployment
git revert HEAD
git push origin main
# (This triggers automatic deployment of previous version)
```

---

**🎉 Your automated CI/CD pipeline is ready!**

Every push to `main`/`master` will automatically deploy to your GCP VM.
