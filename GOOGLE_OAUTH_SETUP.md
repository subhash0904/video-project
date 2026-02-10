# Google OAuth Setup Guide

## 📋 Overview

This guide will help you set up Google OAuth authentication for the video platform backend.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pnpm install
```

New packages added:
- `passport`: Authentication middleware
- `passport-google-oauth20`: Google OAuth 2.0 strategy
- `@types/passport` & `@types/passport-google-oauth20`: TypeScript definitions

### 2. Get Google OAuth Credentials

#### Step 1: Go to Google Cloud Console
Visit: https://console.cloud.google.com/

#### Step 2: Create a New Project (or select existing)
- Click "Select a project" → "New Project"
- Name: "Video Platform" (or your preferred name)
- Click "Create"

#### Step 3: Enable Google+ API
- Navigate to "APIs & Services" → "Library"
- Search for "Google+ API"
- Click "Enable"

#### Step 4: Create OAuth 2.0 Credentials
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth client ID"
- Application type: "Web application"
- Name: "Video Platform Backend"

**Authorized JavaScript origins:**
```
http://localhost:5173
http://localhost:4000
```

**Authorized redirect URIs:**
```
http://localhost:4000/api/auth/google/callback
```

- Click "Create"
- **Copy the Client ID and Client Secret** (you'll need these!)

### 3. Configure Environment Variables

Update your `.env` file in the `backend` directory:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Frontend URL (for redirect after OAuth)
FRONTEND_URL=http://localhost:5173
```

### 4. Update Database Schema

Run the Prisma migration to add the `googleId` field:

```bash
cd backend
pnpm db:push
```

This will add:
- `googleId` (String, optional, unique)
- Make `passwordHash` optional (for OAuth-only users)
- Add index on `googleId`

### 5. Copy Updated Files to Docker Container (if using Docker)

```bash
# From project root
docker cp backend/src/config/passport.ts video-platform-backend:/app/src/config/passport.ts
docker cp backend/src/config/env.ts video-platform-backend:/app/src/config/env.ts
docker cp backend/src/modules/auth/auth.controller.ts video-platform-backend:/app/src/modules/auth/auth.controller.ts
docker cp backend/src/modules/auth/auth.routes.ts video-platform-backend:/app/src/modules/auth/auth.routes.ts
docker cp backend/src/app.ts video-platform-backend:/app/src/app.ts
docker cp backend/package.json video-platform-backend:/app/package.json

# Install new dependencies in container
docker-compose exec backend pnpm install

# Restart backend to apply changes
docker-compose restart backend
```

---

## 🔐 API Endpoints

### Google OAuth Flow

#### **1. Initiate OAuth**
```
GET /api/auth/google
```

Redirects user to Google's consent screen.

**Frontend Usage:**
```javascript
window.location.href = 'http://localhost:4000/api/auth/google';
```

#### **2. OAuth Callback** (handled automatically)
```
GET /api/auth/google/callback
```

After user approves, Google redirects here. The backend:
1. Verifies the OAuth token
2. Creates or updates the user
3. Generates JWT tokens
4. Redirects to frontend with tokens

**Redirect Format:**
```
http://localhost:5173/auth/callback?accessToken=xxx&refreshToken=yyy&user=%7B...%7D
```

---

## 🎯 Frontend Integration

### 1. Create Google Sign-In Button

```tsx
// src/components/auth/GoogleSignInButton.tsx
import React from 'react';

const GoogleSignInButton: React.FC = () => {
  const handleGoogleLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      <img 
        src="https://www.google.com/favicon.ico" 
        alt="Google" 
        className="w-5 h-5"
      />
      <span>Continue with Google</span>
    </button>
  );
};

export default GoogleSignInButton;
```

### 2. Handle OAuth Callback

```tsx
// src/pages/AuthCallback.tsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userParam = searchParams.get('user');

    if (accessToken && refreshToken && userParam) {
      // Parse user data
      const user = JSON.parse(decodeURIComponent(userParam));

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect to home
      navigate('/');
    } else {
      // Authentication failed
      navigate('/login?error=auth_failed');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
```

### 3. Add Route to App

```tsx
// src/App.tsx
import AuthCallback from './pages/AuthCallback';

// Add to your routes
<Route path="/auth/callback" element={<AuthCallback />} />
```

### 4. Update Login Page

```tsx
// src/pages/Login.tsx
import GoogleSignInButton from '../components/auth/GoogleSignInButton';

// In your login form, add:
<div className="mt-6">
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-300"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-2 bg-white text-gray-500">Or continue with</span>
    </div>
  </div>

  <div className="mt-6">
    <GoogleSignInButton />
  </div>
</div>
```

---

## 🔧 How It Works

### Backend Flow

1. **User clicks "Sign in with Google"** → Frontend redirects to `/api/auth/google`
2. **Passport middleware** → Redirects to Google's OAuth consent screen
3. **User approves** → Google redirects to `/api/auth/google/callback` with auth code
4. **Passport verifies** → Exchanges code for user profile
5. **Backend checks database:**
   - **User exists** → Update `googleId` if needed
   - **User doesn't exist** → Create new user with:
     - Email from Google
     - Auto-generated username
     - Display name from Google
     - Avatar from Google profile picture
     - `googleId` set
     - `emailVerified = true`
     - No password (OAuth-only account)
6. **Generate JWT tokens** → Create accessToken & refreshToken
7. **Redirect to frontend** → With tokens in URL params

### Database Changes

**User Model Updates:**
- `passwordHash`: Now optional (`String?`) for OAuth users
- `googleId`: New field for Google account linking (`String?`, unique)
- Index added on `googleId` for fast lookups

**Channel Creation:**
- Automatically creates channel for new OAuth users
- Handle format: `@{username}`
- Uses Google avatar if available

---

## 🧪 Testing

### Test the OAuth Flow

1. **Start the backend:**
   ```bash
   docker-compose up -d
   # or
   cd backend && pnpm dev
   ```

2. **Start the frontend:**
   ```bash
   cd frontend && pnpm dev
   ```

3. **Navigate to login page:**
   ```
   http://localhost:5173/login
   ```

4. **Click "Continue with Google"**

5. **Verify:**
   - Redirected to Google consent screen
   - After approval, redirected back to your app
   - Logged in successfully
   - Check database for new user with `googleId`

### Manual API Testing

```bash
# 1. Initiate OAuth (in browser)
open http://localhost:4000/api/auth/google

# 2. After callback, you'll receive tokens in URL
# Use the accessToken for subsequent requests

# 3. Test authenticated endpoint
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🔒 Security Considerations

### ✅ Implemented

- Email verification automatic (trusted by Google)
- Secure token generation with JWT
- OAuth 2.0 standard flow
- HTTPS required in production
- CORS protection

### 🚨 Production Checklist

- [ ] Update redirect URIs to production domain
- [ ] Use HTTPS for all OAuth callbacks
- [ ] Set secure cookie flags
- [ ] Implement rate limiting on OAuth endpoints
- [ ] Add session timeout
- [ ] Verify domain ownership in Google Console
- [ ] Enable OAuth consent screen branding
- [ ] Add privacy policy & terms of service links

---

## 🌐 Production Deployment

### Update Environment Variables

```env
# Production Google OAuth
GOOGLE_CLIENT_ID=your-prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-prod-client-secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/auth/google/callback

# Production Frontend
FRONTEND_URL=https://yourdomain.com
```

### Update Google Cloud Console

1. Add production domain to **Authorized JavaScript origins:**
   ```
   https://yourdomain.com
   https://api.yourdomain.com
   ```

2. Add production callback to **Authorized redirect URIs:**
   ```
   https://api.yourdomain.com/api/auth/google/callback
   ```

3. Configure **OAuth consent screen:**
   - App name: Your App Name
   - User support email
   - Developer contact information
   - Privacy Policy URL
   - Terms of Service URL

---

## 🐛 Troubleshooting

### Error: "Invalid OAuth credentials"
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check that environment variables are loaded (`console.log(config)`)

### Error: "Redirect URI mismatch"
- Ensure callback URL matches exactly in Google Console
- Include protocol (http/https), domain, and full path
- No trailing slashes

### User created without channel
- Check transaction in `passport.ts`
- Verify Prisma schema relationship
- Run database migrations

### Tokens not received on frontend
- Check browser console for errors
- Verify `FRONTEND_URL` is correct
- Check backend logs for OAuth flow

### "No email found in Google profile"
- Ensure email scope is requested
- User must share email with your app
- Check Google OAuth consent screen settings

---

## 📚 Additional Resources

- [Passport.js Documentation](http://www.passportjs.org/)
- [Passport Google OAuth20 Strategy](https://github.com/jaredhanson/passport-google-oauth2)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## ✅ Verification Checklist

- [ ] Google Cloud project created
- [ ] OAuth credentials generated
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Database schema updated
- [ ] Backend restarted
- [ ] Frontend components created
- [ ] OAuth flow tested successfully
- [ ] User created in database with `googleId`
- [ ] JWT tokens working correctly

---

**🎉 Setup Complete!**

Users can now sign in with Google seamlessly. OAuth accounts are automatically created and linked to channels.
