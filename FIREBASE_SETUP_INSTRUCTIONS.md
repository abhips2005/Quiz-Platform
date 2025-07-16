# Firebase Setup Instructions

## Firebase Authentication Setup Guide

## Issue: Registration Failing with Firebase Private Key Error

**Problem**: The backend is failing with "Failed to parse private key: Error: Invalid PEM formatted message."

**Root Cause**: The `FIREBASE_PRIVATE_KEY` environment variable is not properly formatted.

### Solution: Fix Private Key Format

The Firebase private key must be properly formatted with actual newlines. Here are the **exact** steps:

#### Step 1: Check Your Current .env File
Look at your `packages/backend/.env` file and find the `FIREBASE_PRIVATE_KEY` line.

#### Step 2: Choose the Correct Format

**Option A: Single Line with \\n** (Recommended for .env files)
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB\nBhWGj+HSbWq1qzW7OhaqAYBQrQAcA6Hl0fgYq3mKXJFCkfVWJ/Z/P7VHQG7M3QZ1\n... (your actual key content) ...\nAoIBAQDNwqNdJQKpJlJXJ0Rd7I4p6Zc3qE+c7r5fVpq9VJ3cZ7Q8Qz1J6Z2F3q\n-----END PRIVATE KEY-----"
```

**Option B: Multi-line** (Alternative)
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
BhWGj+HSbWq1qzW7OhaqAYBQrQAcA6Hl0fgYq3mKXJFCkfVWJ/Z/P7VHQG7M3QZ1
... (your actual key content) ...
AoIBAQDNwqNdJQKpJlJXJ0Rd7I4p6Zc3qE+c7r5fVpq9VJ3cZ7Q8Qz1J6Z2F3q
-----END PRIVATE KEY-----"
```

#### Step 3: Common Mistakes to Avoid

❌ **Wrong**: Missing quotes
```env
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
```

❌ **Wrong**: Using single quotes instead of double quotes
```env
FIREBASE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...'
```

❌ **Wrong**: Missing \\n characters
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----MIIEvQ..."
```

#### Step 4: Get Your Key from Firebase Console

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. Copy the `private_key` value from the JSON (it should look like the examples above)

### Complete Backend .env Template

```env
# Firebase Configuration (Backend - Admin SDK)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

# Database
DATABASE_URL="your-database-url"

# Server
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

### Frontend .env file

Create `packages/frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your-web-app-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Testing the Fix

1. **Update your private key format** in the backend `.env` file using Option A above
2. **Restart the backend server**: `npm run dev`
3. **Look for the debug output** - you should see:
   ```
   🔑 Firebase Config Debug:
   - PROJECT_ID: ✅
   - PRIVATE_KEY_ID: ✅
   - PRIVATE_KEY: ✅ (-----BEGIN PRIVATE KEY-----...)
   - CLIENT_EMAIL: ✅
   - CLIENT_ID: ✅
   🔥 Firebase Admin initialized successfully!
   ```

If you still get errors, the debug output will tell you exactly what's wrong with your key format.

## Issue: Registration Failing with 401 Error

The registration is failing because Firebase environment variables are not configured. You need to create `.env` files with proper Firebase credentials.

## Required Setup

### 1. Create Backend Environment File

Create `packages/backend/.env` with these variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/quizzz_platform"

# Firebase Configuration (Backend) - GET FROM FIREBASE CONSOLE
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY_ID="your-private-key-id" 
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="your-client-id"
FIREBASE_CLIENT_X509_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# JWT (backup)
JWT_SECRET="dev-secret-key-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-key-change-in-production"
```

### 2. Create Frontend Environment File

Create `packages/frontend/.env` with these variables:

```bash
# API Configuration
VITE_API_URL="http://localhost:5000/api"

# Firebase Configuration (Frontend) - GET FROM FIREBASE CONSOLE
VITE_FIREBASE_API_KEY="your-firebase-web-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-firebase-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"
```

## How to Get Firebase Credentials

### Backend Credentials (Service Account)
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Use the values from the JSON in your backend .env file

### Frontend Credentials (Web App)
1. Go to Firebase Console → Project Settings → General
2. Scroll to "Your apps" section
3. Click on your web app or add a new one
4. Copy the config values to your frontend .env file

## After Creating .env Files

1. Restart both frontend and backend servers
2. Try registration again - it should work properly

## Security Note

- Never commit `.env` files to version control
- Use different credentials for production
- The `.env` files are already in `.gitignore` 