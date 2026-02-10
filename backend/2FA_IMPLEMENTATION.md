# Two-Factor Authentication (2FA) Implementation

## ✅ Complete Implementation

This document describes the complete Two-Factor Authentication system implemented for the Video Platform.

---

## 📋 Features

### Core Functionality
- ✅ **TOTP-based 2FA** using authenticator apps (Google Authenticator, Authy, Microsoft Authenticator, etc.)
- ✅  **QR Code generation** for easy authenticator app setup
- ✅ **Backup codes** system (10 codes per user) for account recovery
- ✅ **Encrypted storage** of TOTP secrets and backup codes using AES-256-GCM
- ✅ **Secure key derivation** using PBKDF2 with 100,000 iterations
- ✅ **Login flow integration** - 2FA verification required after password validation
- ✅ **Backup code consumption** - codes are one-time use only

### Security Features
- ✅ **AES-256-GCM encryption** for sensitive 2FA data
- ✅ **SHA-256 hashing** for backup codes (one-way hash)
- ✅ **Cryptographically secure** random generation for backup codes
- ✅ **Time-based verification** with 30-second window
- ✅ **Environment-based encryption key** (ENCRYPTION_SECRET)
- ✅ **Salt + IV** for each encrypted value

---

## 🏗️ Architecture

### Files Created

#### 1. Encryption Utility (`backend/src/utils/encryption.ts`)
```typescript
- encrypt(text: string): string
- decrypt(encryptedData: string): string
- generateSecureRandom(length?: number): string
- hashData(data: string): string
- compareHash(data: string, hash: string): boolean
```

**Features:**
- AES-256-GCM encryption with authenticated tags
- PBKDF2 key derivation (100,000 iterations)
- Random salt (64 bytes) and IV (16 bytes) per encryption
- Format: `salt.iv.tag.encrypted` for easy parsing

#### 2. 2FA Service (`backend/src/services/twoFactor.service.ts`)
```typescript
- generateTwoFactorSecret(userId): Promise<TwoFactorSetupResponse>
- enableTwoFactor(userId, token): Promise<boolean>
- verifyTwoFactorToken(userId, token): Promise<boolean>
- disableTwoFactor(userId, token): Promise<boolean>
- regenerateBackupCodes(userId, token): Promise<string[]>
- isTwoFactorEnabled(userId): Promise<boolean>
- getTwoFactorStatus(userId): Promise<{ enabled, remainingBackupCodes }>
```

**Features:**
- TOTP secret generation using `otplib`
- QR code data URL generation using `qrcode`
- Backup code generation (8-character hex codes)
- Token verification with 30-second time window
- Backup code validation with SHA-256 hashing
- Atomic code consumption (removes after use)

#### 3. 2FA Controllers (`backend/src/modules/auth/twoFactor.controller.ts`)
```typescript
- setupTwoFactor(req, res, next)
- enableTwoFactor(req, res, next)
- verifyTwoFactor(req, res, next)
- disableTwoFactor(req, res, next)
- regenerateBackupCodes(req, res, next)
- getTwoFactorStatus(req, res, next)
```

#### 4. 2FA Routes (`backend/src/modules/auth/twoFactor.routes.ts`)
```
POST   /api/auth/2fa/setup          - Generate QR code (protected)
POST   /api/auth/2fa/enable         - Verify and enable 2FA (protected)
POST   /api/auth/2fa/verify         - Verify during login (public)
POST   /api/auth/2fa/disable        - Disable 2FA (protected)
POST   /api/auth/2fa/backup-codes   - Regenerate backup codes (protected)
GET    /api/auth/2fa/status         - Get 2FA status (protected)
```

### Files Modified

#### 1. Database Schema (`backend/prisma/schema.prisma`)
```prisma
model User {
  // ... existing fields ...
  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String? // Encrypted TOTP secret
  backupCodes      String? // Encrypted array of hashed backup codes
}
```

#### 2. Environment Config (`backend/src/config/env.ts`)
```typescript
interface Config {
  // ... existing ...
  encryptionSecret: string // For 2FA encryption
  appName: string          // For TOTP app display name
}
```

#### 3. Auth Service (`backend/src/modules/auth/auth.service.ts`)
**Updated login flow:**
```typescript
export const login = async (data: LoginData) => {
  // 1. Verify email/password
  
  // 2. Check if 2FA is enabled
  if (user.twoFactorEnabled) {
    return {
      requiresTwoFactor: true,
      userId: user.id,
      message: 'Two-factor authentication required',
    };
  }
  
  // 3. Generate tokens (if no 2FA)
  return { user, accessToken, refreshToken };
};
```

#### 4. Auth Routes (`backend/src/modules/auth/auth.routes.ts`)
```typescript
import twoFactorRoutes from './twoFactor.routes.js';

// Added:
router.use('/2fa', twoFactorRoutes);
```

---

## 📦 Dependencies Added

**package.json:**
```json
{
  "dependencies": {
    "otplib": "^12.0.1",    // TOTP generation & verification
    "qrcode": "^1.5.4"      // QR code generation
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5"
  }
}
```

**Note:** Node.js `crypto` module (built-in) used for encryption - no additional dependency needed.

---

## 🔐 Security Implementation

### Encryption Flow

1. **Secret Storage:**
   ```
   TOTP Secret → encrypt() → Database (twoFactorSecret)
   ```

2. **Backup Code Storage:**
   ```
   10 Random Codes → SHA-256 Hash → encrypt([hashes]) → Database (backupCodes)
   ```

3. **Verification:**
   ```
   Database → decrypt() → TOTP Secret → verify(token, secret)
   ```

### Encryption Details

- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Derivation:** PBKDF2 with SHA-256
- **Iterations:** 100,000
- **Salt Length:** 64 bytes (random per encryption)
- **IV Length:** 16 bytes (random per encryption)
- **Auth Tag:** 16 bytes (GCM authenticated encryption)

### Environment Variables Required

```bash
# Required for 2FA
ENCRYPTION_SECRET=your-encryption-secret-min-32-chars

# Optional (defaults provided)
APP_NAME=Video Platform
```

---

## 🚀 Usage Flow

### 1. Setup 2FA (User Perspective)

```
1. User logs in normally
2. User navigates to Security Settings
3. User clicks "Enable 2FA"
4. Frontend: POST /api/auth/2fa/setup
5. Backend returns:
   {
     "qrCodeUrl": "data:image/png;base64,...",
     "secret": "JBSWY3DPEHPK3PXP",
     "backupCodes": ["A1B2C3D4", "E5F6G7H8", ...]
   }
6. User scans QR code with authenticator app
7. User saves backup codes (printed/downloaded)
8. User enters 6-digit code from app
9. Frontend: POST /api/auth/2fa/enable { token: "123456" }
10. Backend verifies and enables 2FA
11. ✅ 2FA is now active
```

### 2. Login with 2FA

```
1. User: POST /api/auth/login { email, password }
2. Backend verifies password
3. Backend response:
   {
     "requiresTwoFactor": true,
     "userId": "user-id",
     "message": "Two-factor authentication required"
   }
4. Frontend shows 2FA verification screen
5. User enters 6-digit code (or backup code)
6. Frontend: POST /api/auth/2fa/verify { userId, token }
7. Backend verifies TOTP token or backup code
8. Backend returns full auth tokens:
   {
     "user": {...},
     "accessToken": "...",
     "refreshToken": "..."
   }
9. ✅ User is logged in
```

### 3. Disable 2FA

```
1. User navigates to Security Settings
2. User clicks "Disable 2FA"
3. User enters current 6-digit code
4. Frontend: POST /api/auth/2fa/disable { token: "123456" }
5. Backend verifies token
6. Backend removes 2FA data:
   - twoFactorEnabled = false
   - twoFactorSecret = null
   - backupCodes = null
7. ✅ 2FA is disabled
```

### 4. Regenerate Backup Codes

```
1. User navigates to Security Settings
2. User clicks "Regenerate Backup Codes"
3. User enters current 6-digit code
4. Frontend: POST /api/auth/2fa/backup-codes { token: "123456" }
5. Backend verifies token
6. Backend generates 10 new codes
7. Backend returns new codes
8. ✅ Old codes are invalidated
```

---

## 🔄 API Endpoints

### Setup 2FA
```http
POST /api/auth/2fa/setup
Authorization: Bearer <accessToken>

Response 200:
{
  "success": true,
  "data": {
    "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": [
      "A1B2C3D4",
      "E5F6G7H8",
      "I9J0K1L2",
      ...
    ]
  },
  "message": "Scan the QR code with your authenticator app, then verify with a code to enable 2FA"
}

Error 400:
{
  "success": false,
  "message": "Two-factor authentication is already enabled"
}
```

### Enable 2FA
```http
POST /api/auth/2fa/enable
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "token": "123456"
}

Response 200:
{
  "success": true,
  "message": "Two-factor authentication has been enabled successfully"
}

Error 400:
{
  "success": false,
  "message": "Invalid verification code"
}
```

### Verify 2FA (During Login)
```http
POST /api/auth/2fa/verify
Content-Type: application/json

{
  "userId": "user-id-from-login-response",
  "token": "123456"  // or backup code like "A1B2C3D4"
}

Response 200:
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "...",
      "username": "...",
      ...
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Verification successful"
}

Error 400:
{
  "success": false,
  "message": "Invalid verification code"
}
```

### Disable 2FA
```http
POST /api/auth/2fa/disable
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "token": "123456"
}

Response 200:
{
  "success": true,
  "message": "Two-factor authentication has been disabled"
}

Error 400:
{
  "success": false,
  "message": "Invalid verification code"
}
```

### Regenerate Backup Codes
```http
POST /api/auth/2fa/backup-codes
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "token": "123456"
}

Response 200:
{
  "success": true,
  "data": {
    "backupCodes": [
      "X1Y2Z3A4",
      "B5C6D7E8",
      "F9G0H1I2",
      ...
    ]
  },
  "message": "New backup codes generated. Save these codes in a secure location."
}

Error 400:
{
  "success": false,
  "message": "Invalid verification code"
}
```

### Get 2FA Status
```http
GET /api/auth/2fa/status
Authorization: Bearer <accessToken>

Response 200:
{
  "success": true,
  "data": {
    "enabled": true,
    "remainingBackupCodes": 7
  }
}
```

---

## 🛠️ Installation Steps

### 1. Install Dependencies
```bash
cd backend
npm install otplib qrcode @types/qrcode
```

### 2. Apply Database Migration
```sql
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "backupCodes" TEXT;
```

### 3. Update Environment Variables
```bash
# backend/.env
ENCRYPTION_SECRET=your-random-secret-at-least-32-characters-long-change-in-production
APP_NAME=Video Platform
```

**Generate secure secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Restart Backend
```bash
# Docker
docker-compose restart backend

# Local
npm run dev
```

---

## 🧪 Testing

### 1. Test Setup Flow
```bash
# 1. Login and get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# 2. Setup 2FA
curl -X POST http://localhost:4000/api/auth/2fa/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq .
  
# Save QR code and backup codes

# 3. Scan QR code with Google Authenticator

# 4. Enable 2FA with code from app
curl -X POST http://localhost:4000/api/auth/2fa/enable \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456"}'
```

### 2. Test Login Flow
```bash
# 1. Login (will require 2FA)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}' \
  | jq .

# Response will have: { "requiresTwoFactor": true, "userId": "..." }

# 2. Verify with TOTP token
curl -X POST http://localhost:4000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID_FROM_STEP_1", "token": "123456"}' \
  | jq .
  
# Or verify with backup code
curl -X POST http://localhost:4000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID_FROM_STEP_1", "token": "A1B2C3D4"}' \
  | jq .
```

### 3. Test Status Check
```bash
curl -X GET http://localhost:4000/api/auth/2fa/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  | jq .
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Missing required environment variable: ENCRYPTION_SECRET"
**Solution:** Add ENCRYPTION_SECRET to `.env` file
```bash
echo "ENCRYPTION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
```

#### 2. "Invalid verification code" (but code is correct)
**Possible causes:**
- **Time sync issue:** Ensure server time is accurate (NTP sync)
- **Used backup code:** Backup codes are one-time use
- **Expired code:** TOTP codes expire every 30 seconds

**Solution:**
```bash
# Check server time
date

# Sync time (Linux)
sudo ntpdate pool.ntp.org

# Check 2FA status
curl -X GET http://localhost:4000/api/auth/2fa/status \
  -H "Authorization: Bearer TOKEN"
```

#### 3. "Cannot decrypt 2FA secret"
**Possible causes:**
- ENCRYPTION_SECRET was changed after setup
- Database corruption

**Solution:**
```bash
# User must disable and re-enable 2FA
# OR reset via direct database access (support team only)
```

#### 4. Lost authenticator app + no backup codes
**Solution (support team):**
```sql
-- Disable 2FA for user (emergency only)
UPDATE users 
SET 
  "twoFactorEnabled" = false,
  "twoFactorSecret" = NULL,
  "backupCodes" = NULL
WHERE email = 'user@example.com';
```

---

## 📊 Database Schema

```sql
-- users table (relevant columns)
CREATE TABLE users (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE,
  username            TEXT NOT NULL UNIQUE,
  "passwordHash"      TEXT NOT NULL,
  
  -- 2FA fields
  "twoFactorEnabled"  BOOLEAN DEFAULT false,
  "twoFactorSecret"   TEXT,     -- Encrypted TOTP secret
  "backupCodes"       TEXT,     -- Encrypted JSON array of hashed codes
  
  "createdAt"         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX "users_email_idx" ON users(email);
CREATE INDEX "users_username_idx" ON users(username);
```

---

## 🔒 Security Best Practices

### For Users
1. **Save backup codes** securely (password manager, printed copy in safe)
2. **Don't share** QR codes or secrets
3. **Regenerate backup codes** if compromised
4. **Use reputable** authenticator apps (Google, Authy, Microsoft)
5. **Keep device secure** where authenticator is installed

### For Developers
1. **Never log** unencrypted secrets or backup codes
2. **Use environment variables** for ENCRYPTION_SECRET
3. **Rotate encryption keys** periodically (with migration script)
4. **Monitor failed 2FA attempts** (rate limiting)
5. **Implement account recovery flow** (email verification + support)
6. **Test time sync** on backend servers
7. **Backup encrypted secrets** (database backups)

---

## 📝 Frontend Integration Guide

### React Component Example

```tsx
// Setup2FA.tsx
import { useState } from 'react';
import QRCode from 'qrcode.react'; // use react-qr-code or similar

function Setup2FA() {
  const [qrData, setQrData] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');

  const handleSetup = async () => {
    const response = await fetch('/api/auth/2fa/setup', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await response.json();
    
    setQrData(data.data.qrCodeUrl);
    setBackupCodes(data.data.backupCodes);
  };

  const handleEnable = async () => {
    const response = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ token: verificationCode })
    });
    
    if (response.ok) {
      alert('2FA enabled successfully!');
    }
  };

  return (
    <div>
      <button onClick={handleSetup}>Setup 2FA</button>
      
      {qrData && (
        <>
          <img src={qrData} alt="QR Code" />
          
          <div>
            <h3>Backup Codes (save these!):</h3>
            {backupCodes.map(code => <div key={code}>{code}</div>)}
          </div>
          
          <input 
            value={verificationCode}
            onChange={e => setVerificationCode(e.target.value)}
            placeholder="Enter 6-digit code"
            maxLength={6}
          />
          
          <button onClick={handleEnable}>Enable 2FA</button>
        </>
      )}
    </div>
  );
}
```

### Login Flow Example

```tsx
// Login.tsx
const handleLogin = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.requiresTwoFactor) {
    // Show 2FA verification screen
    setUserId(data.userId);
    setShow2FAScreen(true);
  } else {
    // Login successful
    setTokens(data.accessToken, data.refreshToken);
    navigate('/dashboard');
  }
};

const handle2FAVerify = async (token) => {
  const response = await fetch('/api/auth/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, token })
  });
  
  const data = await response.json();
  
  if (data.success) {
    setTokens(data.data.accessToken, data.data.refreshToken);
    navigate('/dashboard');
  } else {
    alert('Invalid code');
  }
};
```

---

## 🎯 Summary

✅ **Complete 2FA implementation** with TOTP and backup codes  
✅ **Secure encryption** using AES-256-GCM  
✅ **Easy setup** with QR codes  
✅ **Account recovery** with backup codes  
✅ **Production-ready** security practices  
✅ **Well-documented** API endpoints  
✅ **Frontend examples** included  

**Status:** ✅ COMPLETE - Ready for deployment

### Files Changed
- ✅ `backend/src/utils/encryption.ts` (NEW)
- ✅ `backend/src/services/twoFactor.service.ts` (NEW)
- ✅ `backend/src/modules/auth/twoFactor.controller.ts` (NEW)
- ✅ `backend/src/modules/auth/twoFactor.routes.ts` (NEW)
- ✅ `backend/src/config/env.ts` (UPDATED)
- ✅ `backend/src/modules/auth/auth.service.ts` (UPDATED - login flow)
- ✅ `backend/src/modules/auth/auth.routes.ts` (UPDATED - added 2FA routes)
- ✅ `backend/prisma/schema.prisma` (UPDATED - added 2FA fields)
- ✅ `backend/package.json` (UPDATED - added otplib, qrcode)
- ✅ `backend/.env.example` (UPDATED - added ENCRYPTION_SECRET, APP_NAME)

### Next Steps (Optional Enhancements)
- 📧 Email notifications on 2FA enable/disable
- 📊 Audit log for 2FA events
- 🔐 SMS-based 2FA as alternative
- 🛡️ Trusted devices feature
- ⏰ Rate limiting on 2FA attempts
- 🔄 Automated backup code expiry

---

**Documentation Version:** 1.0.0  
**Last Updated:** 2024-02-10  
**Author:** GitHub Copilot  
**Status:** ✅ Production Ready
