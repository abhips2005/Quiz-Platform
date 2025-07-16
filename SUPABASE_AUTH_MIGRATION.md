# 🔄 Firebase to Supabase Auth Migration Guide

## Why Migrate to Supabase Auth?

✅ **Eliminate Firebase private key issues**  
✅ **Single service for database + auth**  
✅ **Built-in email verification & password reset**  
✅ **Better integration with your database**  
✅ **Simpler environment configuration**  
✅ **Real-time auth state management**  

## Migration Overview

**Current**: Firebase Auth + Supabase Database  
**Target**: Supabase Auth + Supabase Database  

## Phase 1: Backend Migration

### 1. Update Environment Variables

**Update `packages/backend/.env`:**
```env
# Database Configuration (keep existing)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# Supabase Configuration (replace Firebase vars)
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_ANON_KEY="your_anon_key_here"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"

# JWT Configuration (can keep existing or let Supabase handle)
JWT_SECRET="your-existing-jwt-secret"  # Optional with Supabase Auth

# Server Configuration (keep existing)
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### 2. Install Supabase Client for Backend

```bash
cd packages/backend
npm install @supabase/supabase-js
```

### 3. Update Database Schema

**Remove Firebase UID, add Supabase auth integration:**

```prisma
model User {
  id        String   @id @default(cuid())
  // Remove: firebaseUid String @unique
  auth_user_id String @unique  // Supabase auth user ID
  email     String   @unique
  username  String   @unique
  firstName String
  lastName  String
  role      UserRole @default(STUDENT)
  status    UserStatus @default(ACTIVE)
  // ... rest of fields stay the same
}
```

### 4. Create Supabase Auth Middleware

**Replace Firebase auth middleware with Supabase:**

```typescript
// packages/backend/src/middleware/supabaseAuth.ts
import { createClient } from '@supabase/supabase-js'
import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AuthRequest extends Request {
  user?: any
  supabaseUser?: any
}

export const supabaseAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    // Verify Supabase JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { auth_user_id: user.id }
    })

    if (!dbUser) {
      return res.status(401).json({ error: 'User not found in database' })
    }

    req.user = dbUser
    req.supabaseUser = user
    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}
```

### 5. Update Auth Routes

**Create new Supabase auth routes:**

```typescript
// packages/backend/src/routes/supabaseAuth.ts
import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Sync user after Supabase registration
router.post('/sync-user', async (req, res) => {
  try {
    const { auth_user_id, email, firstName, lastName, username, role } = req.body

    // Create user in database
    const user = await prisma.user.create({
      data: {
        auth_user_id,
        email,
        firstName,
        lastName,
        username,
        role,
        emailVerified: true, // Supabase handles verification
        profile: {
          create: {}
        }
      }
    })

    res.json({ success: true, user })
  } catch (error) {
    res.status(400).json({ error: 'Failed to sync user' })
  }
})

// Get user profile
router.get('/profile', supabaseAuthMiddleware, async (req, res) => {
  res.json({ success: true, user: req.user })
})

export default router
```

## Phase 2: Frontend Migration

### 1. Update Frontend Environment

**Update `packages/frontend/.env`:**
```env
# API Configuration
VITE_API_URL="http://localhost:5000/api"

# Supabase Configuration (replace Firebase)
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="your_anon_key_here"
```

### 2. Install Supabase Client

```bash
cd packages/frontend
npm install @supabase/supabase-js
npm uninstall firebase  # Remove Firebase
```

### 3. Create Supabase Client

**Replace Firebase config:**

```typescript
// packages/frontend/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 4. Update Auth Context

**Replace Firebase auth context:**

```typescript
// packages/frontend/src/contexts/SupabaseAuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  dbUser: any | null
  loading: boolean
  signUp: (email: string, password: string, metadata: any) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [dbUser, setDbUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchDbUser(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchDbUser(session.user.id)
      } else {
        setDbUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchDbUser = async (authUserId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setDbUser(data.user)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  const signUp = async (email: string, password: string, metadata: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) throw error

    // Sync with database
    if (data.user) {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/sync-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.session?.access_token}`
        },
        body: JSON.stringify({
          auth_user_id: data.user.id,
          email,
          ...metadata
        })
      })
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      user,
      dbUser,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within SupabaseAuthProvider')
  }
  return context
}
```

### 5. Update Login/Register Pages

**Simplified login:**

```typescript
// packages/frontend/src/pages/Login.tsx
import { useAuth } from '../contexts/SupabaseAuthContext'

const Login = () => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signIn(email, password)
      // User automatically redirected via auth state change
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  // ... rest of component
}
```

## Phase 3: Database Migration

### 1. Run Prisma Migration

```bash
cd packages/backend

# Create migration for schema changes
npx prisma migrate dev --name "switch-to-supabase-auth"

# Apply to database
npx prisma db push
```

### 2. Enable Supabase Auth

**In Supabase Dashboard:**
1. Go to **Authentication → Settings**
2. Enable **Email** provider
3. Configure **Email templates** (optional)
4. Set **Redirect URLs** for your app

## Benefits After Migration

✅ **No more Firebase private key errors**  
✅ **Simplified configuration** - just URL + anon key  
✅ **Built-in features**: Email verification, password reset, social auth  
✅ **Better security**: Row Level Security integration  
✅ **Real-time**: Built-in auth state management  
✅ **One dashboard**: Manage auth + database in one place  

## Migration Checklist

- [ ] Update backend environment variables
- [ ] Install Supabase client in backend
- [ ] Update Prisma schema (remove firebaseUid, add auth_user_id)
- [ ] Create Supabase auth middleware
- [ ] Create new auth routes
- [ ] Update frontend environment variables
- [ ] Install Supabase client in frontend
- [ ] Replace Firebase config with Supabase
- [ ] Update auth context
- [ ] Update login/register pages
- [ ] Run database migration
- [ ] Enable Supabase Auth in dashboard
- [ ] Test authentication flow

This migration will eliminate all your Firebase configuration issues and provide a much simpler, integrated authentication system! 