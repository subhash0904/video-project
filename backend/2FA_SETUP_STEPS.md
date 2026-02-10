# 2FA Setup - Final Steps

## ✅ What's Already Done

All code files have been created and updated:
- ✅ `backend/src/utils/encryption.ts` - Encryption utilities (AES-256-GCM)
- ✅ `backend/src/services/twoFactor.service.ts` - 2FA service (TOTP + backup codes)
- ✅ `backend/src/modules/auth/twoFactor.controller.ts` - 2FA controllers
- ✅ `backend/src/modules/auth/twoFactor.routes.ts` - 2FA routes
- ✅ `backend/src/config/env.ts` - Updated with encryptionSecret and appName
- ✅ `backend/src/modules/auth/auth.service.ts` - Updated login for 2FA check
- ✅ `backend/src/modules/auth/auth.routes.ts` - Added 2FA route integration
- ✅ `backend/prisma/schema.prisma` - Added 2FA fields to User model
- ✅ `backend/package.json` - Added otplib and qrcode dependencies
- ✅ `backend/.env.example` - Added ENCRYPTION_SECRET and APP_NAME
- ✅ `backend/2FA_IMPLEMENTATION.md` - Complete documentation

---

## 🚀 Steps to Complete Setup

### 1. Install NPM Packages (Inside Docker Container)

```powershell
cd c:\project\video-project\infra

# Install 2FA packages
docker-compose exec backend sh -c "cd /app && npm install otplib@12.0.1 qrcode@1.5.4 @types/qrcode@1.5.5"
```

**Expected output:**
```
added 3 packages in 5s
```

### 2. Apply Database Migration

```powershell
# Add 2FA columns to users table
docker-compose exec postgres psql -U video_user -d video_platform -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS twoFactorEnabled BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS twoFactorSecret TEXT, ADD COLUMN IF NOT EXISTS backupCodes TEXT;"
```

**Expected output:**
```
ALTER TABLE
```

### 3. Verify Database Migration

```powershell
# Check if columns were added
docker-compose exec postgres psql -U video_user -d video_platform -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('twoFactorEnabled', 'twoFactorSecret', 'backupCodes');"
```

**Expected output:**
```
  column_name     
------------------
 backupCodes
 twoFactorEnabled
 twoFactorSecret
(3 rows)
```

### 4. Add Environment Variables

Edit your `.env` file:

```powershell
# Generate a secure encryption secret
cd c:\project\video-project\backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add to `.env`:
```
ENCRYPTION_SECRET=<paste-the-generated-secret-here>
APP_NAME=Video Platform
```

**Example `.env` addition:**
```bash
# Two-Factor Authentication
ENCRYPTION_SECRET=a1b2c3d4e5f6abcd1234567890abcdef1234567890abcdef1234567890abcdef
APP_NAME=Video Platform
```

### 5. Restart Backend Container

```powershell
cd c:\project\video-project\infra
docker-compose restart backend

# Wait for healthy status
Start-Sleep -Seconds 10

# Verify backend is running
docker-compose ps backend
```

**Expected output:**
```
NAME                     IMAGE           COMMAND                  SERVICE   CREATED          STATUS                    PORTS
video-platform-backend   infra-backend   "docker-entrypoint.s…"   backend   X minutes ago    Up X seconds (healthy)    0.0.0.0:4000->4000/tcp
```

### 6. Test Health Check

```powershell
curl http://localhost:4000/health | ConvertFrom-Json
```

**Expected output:**
```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2024-02-10T..."
}
```

---

## 🧪 Test 2FA Functionality

### 1. Get Auth Token (Login First)

```powershell
# Login with existing user
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"user@example.com","password":"password123"}'
$token = $response.accessToken
```

### 2. Setup 2FA

```powershell
# Request 2FA setup
$setup = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/2fa/setup" -Method POST -Headers @{"Authorization"="Bearer $token"}

# Display QR code URL (open in browser or decode)
Write-Host "QR Code URL: $($setup.data.qrCodeUrl.Substring(0, 100))..."

# Display backup codes
Write-Host "`nBackup Codes (SAVE THESE!):"
$setup.data.backupCodes | ForEach-Object { Write-Host "  $_" }

# Display secret for manual entry
Write-Host "`nManual Entry Secret: $($setup.data.secret)"
```

### 3. Enable 2FA with Authenticator Code

```powershell
# Scan QR code with Google Authenticator app
# Enter the 6-digit code from your app

$code = Read-Host "Enter 6-digit code from authenticator app"

$enableResult = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/2fa/enable" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body "{`"token`":`"$code`"}"

Write-Host $enableResult.message
```

### 4. Test Login with 2FA

```powershell
# Step 1: Login (will require 2FA)
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"user@example.com","password":"password123"}'

if ($loginResponse.requiresTwoFactor) {
    Write-Host "2FA Required! User ID: $($loginResponse.userId)"
    
    # Step 2: Get code from authenticator and verify
    $code = Read-Host "Enter 6-digit code from authenticator app"
    
    $verifyResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/2fa/verify" -Method POST -Headers @{"Content-Type"="application/json"} -Body "{`"userId`":`"$($loginResponse.userId)`",`"token`":`"$code`"}"
    
    Write-Host "✅ Login successful!"
    Write-Host "Access Token: $($verifyResponse.data.accessToken.Substring(0, 50))..."
}
```

### 5. Check 2FA Status

```powershell
$status = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/2fa/status" -Method GET -Headers @{"Authorization"="Bearer $token"}

Write-Host "2FA Enabled: $($status.data.enabled)"
Write-Host "Remaining Backup Codes: $($status.data.remainingBackupCodes)"
```

---

## 📡 Available Endpoints

Once setup is complete, these endpoints will be available:

```
POST   /api/auth/2fa/setup
POST   /api/auth/2fa/enable
POST   /api/auth/2fa/verify
POST   /api/auth/2fa/disable
POST   /api/auth/2fa/backup-codes
GET    /api/auth/2fa/status
```

See [2FA_IMPLEMENTATION.md](./2FA_IMPLEMENTATION.md) for detailed API documentation.

---

##  Troubleshooting

### Issue: "Missing required environment variable: ENCRYPTION_SECRET"

**Solution:**
```powershell
# Generate and add to .env
$secret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Add-Content -Path "c:\project\video-project\backend\.env" -Value "`nENCRYPTION_SECRET=$secret"
```

### Issue: "

Cannot find module 'otplib'"

**Solution:**
```powershell
# Reinstall packages
cd c:\project\video-project\infra
docker-compose exec backend sh -c "cd /app && npm install"
docker-compose restart backend
```

### Issue: "Column twoFactorEnabled does not exist"

**Solution:**
```powershell
# Re-run migration
docker-compose exec postgres psql -U video_user -d video_platform -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS twoFactorEnabled BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS twoFactorSecret TEXT, ADD COLUMN IF NOT EXISTS backupCodes TEXT;"
```

### Issue: "Invalid verification code" (but code is correct)

**Possible causes:**
- Server time is out of sync
- Code expired (30-second window)
- Already used backup code

**Solution:**
```powershell
# Check server time
docker-compose exec backend date

# If time is wrong, restart Docker Desktop
```

---

## ✅ Verification Checklist

Run these checks to ensure everything is working:

- [ ] NPM packages installed (`otplib`, `qrcode`)
- [ ] Database migration applied (3 new columns)
- [ ] `.env` has `ENCRYPTION_SECRET` (32+ characters)
- [ ] Backend restarted successfully
- [ ] Health check returns `{"status":"ok"}`
- [ ] Can access `/api/auth/2fa/status` endpoint
- [ ] Can generate QR code with `/api/auth/2fa/setup`
- [ ] Can enable 2FA with authenticator code
- [ ] Login flow requires 2FA verification
- [ ] Backup codes work for login

---

## 🎯 Quick Start (All Steps)

Run all commands in sequence:

```powershell
# Navigate to infra directory
cd c:\project\video-project\infra

# 1. Install packages
docker-compose exec backend sh -c "cd /app && npm install otplib@12.0.1 qrcode@1.5.4 @types/qrcode@1.5.5"

# 2. Apply migration
docker-compose exec postgres psql -U video_user -d video_platform -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS twoFactorEnabled BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS twoFactorSecret TEXT, ADD COLUMN IF NOT EXISTS backupCodes TEXT;"

# 3. Verify migration
docker-compose exec postgres psql -U video_user -d video_platform -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('twoFactorEnabled', 'twoFactorSecret', 'backupCodes');"

# 4. Generate encryption secret
cd ..\backend
$secret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Write-Host "Add this to .env file: ENCRYPTION_SECRET=$secret"

# 5. Restart backend
cd ..\infra
docker-compose restart backend
Start-Sleep -Seconds 10

# 6. Test
curl http://localhost:4000/health | ConvertFrom-Json
```

---

## 📚 Next Steps

After completing setup:

1. **Read the full documentation:** [2FA_IMPLEMENTATION.md](./2FA_IMPLEMENTATION.md)
2. **Test all endpoints** using the examples above
3. **Integrate with frontend** (see frontend integration guide in docs)
4. **Add to user settings page** (enable/disable/status UI)
5. **Consider enhancements:**
   - Email notifications on 2FA enable/disable
   - Audit logging for 2FA events
   - Rate limiting on verification attempts
   - Trusted devices feature

---

**Status:** ✅ Code Complete - Awaiting Final Setup Steps  
**Time to Complete:** ~5-10 minutes  
**Documentation:** See [2FA_IMPLEMENTATION.md](./2FA_IMPLEMENTATION.md) for full details

**Last Updated:** 2024-02-10
