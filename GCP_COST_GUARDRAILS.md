# 💰 GCP Cost Guardrails & Budget Management

## Table of Contents
- [FREE Tier Limits](#free-tier-limits)
- [Budget Alerts Setup](#budget-alerts-setup)
- [Cost Monitoring](#cost-monitoring)
- [Cost Optimization Strategies](#cost-optimization-strategies)
- [Emergency Cost Controls](#emergency-cost-controls)
- [Monthly Cost Breakdown](#monthly-cost-breakdown)
- [Upgrade Path & Costs](#upgrade-path--costs)

---

## FREE Tier Limits

### ✅ Always Free (No Expiration)

**Compute Engine:**
- 1 x e2-micro VM instance per month
- Regions: us-west1, us-central1, us-east1
- 30 GB-months standard persistent disk
- 1 GB network egress per month (excluding China & Australia)

**Cloud Storage:**
- 5 GB-months standard storage
- 5,000 Class A operations per month
- 50,000 Class B operations per month
- 1 GB network egress per month

**Cloud Pub/Sub:**
- 10 GB messages per month

**Cloud Firestore:**
- 1 GB storage
- 50,000 reads per day
- 20,000 writes per day

### 🎁 $300 Free Credits (90 Days)

- Valid for first 90 days
- Can be used for any GCP service
- Automatically applied
- Does NOT require credit card charges

---

## Budget Alerts Setup

### Step-by-Step Budget Configuration

#### 1. Access Billing
```
GCP Console → Billing → Budgets & alerts → Create Budget
```

#### 2. Recommended Budget Tiers

**Tier 1: Safety Net (Recommended)**
```
Budget name: Safety Budget
Budget type: Monthly
Target amount: $10.00

Alert thresholds:
  ✅ 50% ($5.00)
  ✅ 75% ($7.50)
  ✅ 90% ($9.00)
  ✅ 100% ($10.00)
  ✅ 110% ($11.00) - CRITICAL

Email recipients: your@email.com
```

**Tier 2: Strict Control (Paranoid Mode)**
```
Budget name: Strict Budget
Budget type: Monthly
Target amount: $5.00

Alert thresholds:
  ✅ 25% ($1.25)
  ✅ 50% ($2.50)
  ✅ 75% ($3.75)
  ✅ 100% ($5.00)

Programmatic notifications: ✅ Enable
```

**Tier 3: Development/Testing**
```
Budget name: Dev Budget
Budget type: Daily
Target amount: $0.50/day ($15/month)

Alert thresholds:
  ✅ 80% ($0.40)
  ✅ 100% ($0.50)
```

#### 3. Programmatic Budget Actions (Advanced)

Create Cloud Function to **automatically shut down VM** when budget exceeded:

```javascript
// budget-enforcer/index.js
const { Compute } = require('@google-cloud/compute');
const compute = new Compute();

exports.stopVMOnBudget = async (pubSubEvent, context) => {
  const pubsubData = JSON.parse(
    Buffer.from(pubSubEvent.data, 'base64').toString()
  );
  
  const costAmount = pubsubData.costAmount;
  const budgetAmount = pubsubData.budgetAmount;
  const costRatio = costAmount / budgetAmount;

  // If over 100% budget, STOP VM
  if (costRatio >= 1.0) {
    console.log('⚠️ BUDGET EXCEEDED! Stopping VM...');
    
    const zone = 'us-west1-a';
    const vmName = 'video-platform-vm';
    
    const [operation] = await compute
      .zone(zone)
      .vm(vmName)
      .stop();
    
    await operation.promise();
    
    console.log('✅ VM stopped successfully');
    
    // Send email notification
    // ... (implement with SendGrid or similar)
  }
};
```

Deploy:
```bash
gcloud functions deploy stopVMOnBudget \
  --runtime nodejs20 \
  --trigger-topic budget-alerts \
  --region us-central1
```

---

## Cost Monitoring

### Daily Monitoring Checklist

```bash
# 1. Check current costs
gcloud billing accounts list
gcloud billing accounts get-iam-policy <BILLING_ACCOUNT_ID>

# 2. View cost breakdown
# Go to: GCP Console → Billing → Reports
# Filter by: Service, Project, Time Range

# 3. Check VM uptime
gcloud compute instances describe video-platform-vm \
  --zone=us-west1-a \
  --format='get(status)'

# 4. Monitor resource usage
docker stats --no-stream
```

### Weekly Monitoring

```bash
# Export billing data
gcloud beta billing accounts list

# Check for anomalies
# GCP Console → Billing → Cost breakdown
# Look for:
#   - Unexpected services
#   - Spike in egress (network)
#   - New instances
```

### Setting Up Cost Alerts Email

```bash
# Install gcloud notification tool
gcloud components install alpha

# Create notification channel
gcloud alpha monitoring channels create \
  --display-name="Budget Alerts Email" \
  --type=email \
  --channel-labels=email_address=your@email.com
```

---

## Cost Optimization Strategies

### 1. Resource Management

**Stop VM When Not in Use**
```bash
# Create startup/shutdown schedule
gcloud compute instances add-resource-policies video-platform-vm \
  --resource-policies=weekday-schedule \
  --zone=us-west1-a

# Define schedule (9 AM - 6 PM weekdays)
gcloud compute resource-policies create instance-schedule weekday-schedule \
  --region=us-west1 \
  --vm-start-schedule='0 9 * * 1-5' \
  --vm-stop-schedule='0 18 * * 1-5' \
  --timezone='America/Los_Angeles'
```

**Auto-Shutdown Script**
```bash
# On VM, create: /usr/local/bin/auto-shutdown.sh
#!/bin/bash

# Check CPU usage
CPU_IDLE=$(top -bn1 | grep "Cpu(s)" | awk '{print $8}' | cut -d'%' -f1)
THRESHOLD=95

if (( $(echo "$CPU_IDLE > $THRESHOLD" | bc -l) )); then
  echo "System idle for 30 minutes. Shutting down..."
  sudo shutdown -h now
fi

# Add to cron
crontab -e
# */30 * * * * /usr/local/bin/auto-shutdown.sh
```

### 2. Network Optimization

**Minimize Egress Costs**
```bash
# Use Cloud CDN for static assets
# Compress responses
# Cache aggressively

# In nginx.conf:
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;

# Cache control headers
expires 1y;
add_header Cache-Control "public, immutable";
```

### 3. Storage Optimization

**Clean Up Old Data**
```bash
# Remove old Docker images
docker image prune -a -f

# Remove old containers
docker container prune -f

# Remove unused volumes
docker volume prune -f

# Remove old logs
docker-compose logs --tail=0 > /dev/null

# Schedule cleanup (daily)
crontab -e
# 0 2 * * * docker system prune -af --volumes
```

### 4. Database Optimization

**Reduce Database Size**
```bash
# Vacuum PostgreSQL
docker-compose exec postgres vacuumdb -U video_user -d video_platform --analyze --verbose

# Remove old analytics data
docker-compose exec backend npx prisma db execute \
  --sql="DELETE FROM video_views WHERE created_at < NOW() - INTERVAL '90 days';"
```

---

## Emergency Cost Controls

### 🚨 Emergency Shutdown (Budget Exceeded)

**Immediate Actions:**

```bash
# 1. STOP ALL SERVICES
docker-compose -f docker-compose.production.yml down

# 2. STOP VM
gcloud compute instances stop video-platform-vm --zone=us-west1-a

# 3. CHECK BILLING
gcloud billing accounts list
gcloud billing projects describe PROJECT_ID

# 4. DISABLE BILLING (LAST RESORT)
gcloud billing projects unlink PROJECT_ID
```

### ⚠️ Prevent Runaway Costs

**Set Hard Limits:**

```yaml
# In docker-compose.production.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
```

**Rate Limiting:**
```bash
# In API Gateway - Strict limits for dev/testing
RATE_LIMIT_MAX_REQUESTS=10  # Limit to 10 req/min
RATE_LIMIT_WINDOW_MS=60000
```

### Cost Kill Switch

Create a simple "kill switch" script:

```bash
# /usr/local/bin/kill-switch.sh
#!/bin/bash

echo "🚨 EMERGENCY SHUTDOWN INITIATED"

# Stop all containers
docker stop $(docker ps -q)

# Stop Docker service
sudo systemctl stop docker

# Send notification
curl -X POST https://api.telegram.org/bot<TOKEN>/sendMessage \
  -d chat_id=<CHAT_ID> \
  -d text="⚠️ Emergency shutdown executed!"

# Shutdown VM
sudo shutdown -h now
```

---

## Monthly Cost Breakdown

### Scenario 1: FREE Tier Only

```
e2-micro VM (us-west1):        $0.00
30 GB Standard Disk:           $0.00
1 GB Network Egress:           $0.00
───────────────────────────────────
TOTAL:                         $0.00/month
```

### Scenario 2: Light Production

```
e2-micro VM (us-west1):        $0.00
30 GB Standard Disk:           $0.00
10 GB Network Egress:          $0.80  ($0.08/GB after 1GB)
Pub/Sub (50 GB):              $0.00  (10 GB free, then $0.06/GB)
───────────────────────────────────
TOTAL:                         ~$0.80/month
```

### Scenario 3: Medium Load

```
e2-small VM (2 vCPU, 2GB):    $15.17
50 GB Standard Disk:           $2.00  ($0.04/GB after 30GB)
50 GB Network Egress:          $3.92  ($0.08/GB after 1GB)
Cloud SQL (1 vCPU):           $9.37
Pub/Sub (100 GB):             $5.40
───────────────────────────────────
TOTAL:                         ~$35.86/month
```

### Scenario 4: High Load (YouTube-Scale)

```
e2-standard-4 VM:              $121.22
100 GB SSD Disk:               $17.00
500 GB Network Egress:         $39.92
Cloud SQL (4 vCPU, HA):        $290.11
Memorystore Redis (5 GB):      $36.15
Cloud Pub/Sub (1 TB):          $40.00
Cloud CDN:                     ~$50.00
───────────────────────────────────
TOTAL:                         ~$594.40/month
```

---

## Upgrade Path & Costs

### Path 1: Gradual Scale (Recommended)

**Month 1-3: FREE Tier**
- Cost: $0/month
- Learn and test
- Use $300 credits

**Month 4-6: Small Upgrade**
- e2-small VM: $15/month
- Cloud SQL: $9/month
- Total: ~$24/month

**Month 7-12: Production Ready**
- e2-medium VM: $30/month
- Cloud SQL (HA): $50/month
- Memorystore: $36/month
- Total: ~$116/month

**Year 2+: Scale to Demand**
- Variable: $200-$2000/month
- Based on actual traffic

### Path 2: Immediate Production (Not Recommended for Testing)

- Skip FREE tier testing
- Start with e2-standard-4
- Immediate cost: ~$400/month
- ⚠️ Only if you have paying customers

---

## Cost Alerts Checklist

### ✅ Daily Checks
- [ ] Check email for budget alerts
- [ ] Verify VM is in expected state
- [ ] Monitor docker stats resource usage

### ✅ Weekly Checks
- [ ] Review GCP Billing reports
- [ ] Check for budget threshold breaches
- [ ] Verify no unexpected services running
- [ ] Clean up old Docker images/volumes

### ✅ Monthly Checks
- [ ] Review full month costs
- [ ] Adjust budgets if needed
- [ ] Optimize based on usage patterns
- [ ] Plan for next month scaling needs

---

## GCP Pricing Calculator

Use the official calculator to estimate costs:
https://cloud.google.com/products/calculator

**Pre-configured template for this project:**
```
Base Configuration:
- Region: us-west1
- VM: e2-micro (730 hours/month)
- Disk: 30 GB standard
- Egress: 1 GB/month

Estimated: $0.00/month
```

---

## Support & Resources

- **GCP Billing Documentation**: https://cloud.google.com/billing/docs
- **Free Tier Details**: https://cloud.google.com/free/docs/free-cloud-features
- **Pricing Calculator**: https://cloud.google.com/products/calculator
- **Cost Optimization Best Practices**: https://cloud.google.com/architecture/framework/cost-optimization

---

## Quick Reference Commands

```bash
# Check current costs
gcloud billing accounts list

# Stop VM (save costs)
gcloud compute instances stop video-platform-vm --zone=us-west1-a

# Start VM
gcloud compute instances start video-platform-vm --zone=us-west1-a

# Delete VM (save all costs)
gcloud compute instances delete video-platform-vm --zone=us-west1-a

# Check instance status
gcloud compute instances list

# View billing report
gcloud billing accounts get-iam-policy BILLING_ACCOUNT_ID
```

---

**⚠️ GOLDEN RULE: If you're not using it, STOP it!**

A stopped VM costs $0.00 for compute (only disk costs ~$1.20/month for 30GB).
