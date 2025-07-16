import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient, UserRole } from '@prisma/client'
import { validateBody } from '../middleware/validation'
import { supabaseAuthMiddleware, AuthRequest, optionalSupabaseAuth, AuthRequestHandler, DbUser } from '../middleware/supabaseAuth'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { supabaseAdmin } from '../config/supabase'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const syncUserSchema = z.object({
  auth_user_id: z.string().min(1, 'Auth user ID is required'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
  grade: z.string().optional(),
  school: z.string().optional().transform(val => val && val.trim() !== '' ? val : undefined)
})

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens').optional(),
  grade: z.string().optional(),
  school: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  avatar: z.string().url().optional().or(z.literal(''))
})

const excludePassword = {
  id: true,
  auth_user_id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  avatar: true,
  grade: true,
  school: true,
  subjects: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
}

// Health check for auth service
router.get('/health', asyncHandler(async (req: any, res: any) => {
  try {
    // Test database connection
    await prisma.user.count()
    
    // Test Supabase connection
    const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 })
    
    if (error) {
      throw new Error('Supabase connection failed')
    }

    res.json({
      success: true,
      message: 'Auth service is healthy',
      timestamp: new Date(),
      services: {
        database: 'connected',
        supabase: 'connected'
      }
    })
  } catch (error) {
    throw createError('Auth service unhealthy', 503)
  }
}))

// Sync user from Supabase Auth to database
router.post('/sync-user', validateBody(syncUserSchema), asyncHandler(async (req: any, res: any) => {
  const { auth_user_id, email, firstName, lastName, username, role, grade, school } = req.body

  // Verify the token and get user from Supabase
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    throw createError('Access token required', 401)
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  
  if (error) {
    console.error('Supabase auth error:', error)
    throw createError('Invalid token', 401)
  }
  
  if (!user || user.id !== auth_user_id) {
    throw createError('Invalid token or user ID mismatch', 401)
  }

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { auth_user_id },
        { email },
        { username }
      ]
    },
    select: { ...excludePassword, auth_user_id: true }
  })

  if (existingUser) {
    if (existingUser.auth_user_id === auth_user_id) {
      // User already exists, return existing user
      const { auth_user_id: _, ...userWithoutAuthId } = existingUser
      res.json({
        success: true,
        message: 'User already exists',
        data: { user: userWithoutAuthId },
        timestamp: new Date()
      })
      return
    }
    if (existingUser.email === email) {
      throw createError('Email already registered', 409)
    }
    if (existingUser.username === username) {
      throw createError('Username already taken', 409)
    }
  }

  try {
    // Create user in database with transaction
    const dbUser = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          auth_user_id,
          email,
          firstName,
          lastName,
          username,
          role: role as UserRole,
          grade: grade || null,
          school: school || null,
          emailVerified: true, // Supabase handles email verification
          profile: {
            create: {
              // Create default profile
            }
          }
        },
        select: excludePassword
      })

      // Create welcome notification
      await tx.notification.create({
        data: {
          userId: newUser.id,
          type: 'WELCOME',
          title: 'Welcome to Quizzz Platform!',
          message: `Welcome ${firstName}! Start creating and playing quizzes to enhance your learning experience.`
        }
      })

      return newUser
    })

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: dbUser },
      timestamp: new Date()
    })
  } catch (error: any) {
    console.error('Database user creation error:', error)
    if (error.code === 'P2002') {
      // Unique constraint violation
      if (error.meta?.target?.includes('email')) {
        throw createError('Email already registered', 409)
      } else if (error.meta?.target?.includes('username')) {
        throw createError('Username already taken', 409)
      }
    }
    throw createError('Failed to create user account', 500)
  }
}))

// Get user profile
router.get('/profile', supabaseAuthMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!

  try {
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    res.json({
      success: true,
      data: { user },
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Failed to update last login:', error)
    // Still return user data even if last login update fails
    res.json({
      success: true,
      data: { user },
      timestamp: new Date()
    })
  }
}))

// Check if username is available
router.get('/check-username/:username', asyncHandler(async (req: any, res: any) => {
  const { username } = req.params
  
  if (!username || username.length < 3 || username.length > 30) {
    throw createError('Username must be between 3 and 30 characters', 400)
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw createError('Username can only contain letters, numbers, underscores, and hyphens', 400)
  }
  
  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true }
  })

  res.json({
    success: true,
    data: { 
      available: !existingUser,
      username: username 
    },
    timestamp: new Date()
  })
}))

// Check if email is available
router.get('/check-email/:email', asyncHandler(async (req: any, res: any) => {
  const { email } = req.params
  
  if (!email || !email.includes('@')) {
    throw createError('Invalid email format', 400)
  }
  
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  })

  res.json({
    success: true,
    data: { 
      available: !existingUser,
      email: email 
    },
    timestamp: new Date()
  })
}))

// Update user profile
router.put('/profile', supabaseAuthMiddleware, validateBody(updateProfileSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!
  const updateData = req.body

  // If username is being updated, check availability
  if (updateData.username && updateData.username !== user.username) {
    const existingUser = await prisma.user.findUnique({
      where: { username: updateData.username },
      select: { id: true }
    })
    
    if (existingUser) {
      throw createError('Username already taken', 409)
    }
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      select: excludePassword
    })

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
      timestamp: new Date()
    })
  } catch (error: any) {
    console.error('Profile update error:', error)
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('username')) {
        throw createError('Username already taken', 409)
      }
    }
    throw createError('Failed to update profile', 500)
  }
}))

// Delete user account
router.delete('/account', supabaseAuthMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!
  const supabaseUser = req.supabaseUser!

  try {
    // Delete from database first
    await prisma.$transaction(async (tx) => {
      // Delete user's data in order to respect foreign key constraints
      await tx.notification.deleteMany({ where: { userId: user.id } })
      await tx.userAchievement.deleteMany({ where: { userId: user.id } })
      await tx.userPowerUp.deleteMany({ where: { userId: user.id } })
      await tx.userAvatar.deleteMany({ where: { userId: user.id } })
      await tx.playerXP.deleteMany({ where: { userId: user.id } })
      await tx.refreshToken.deleteMany({ where: { userId: user.id } })
      
      // Delete the user
      await tx.user.delete({ where: { id: user.id } })
    })

    // Delete from Supabase
    const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseUser.id)
    
    if (error) {
      console.error('Failed to delete Supabase user:', error)
      // User is already deleted from database, so we log but don't throw
    }

    res.json({
      success: true,
      message: 'Account deleted successfully',
      timestamp: new Date()
    })
  } catch (error: any) {
    console.error('Account deletion error:', error)
    throw createError('Failed to delete account', 500)
  }
}))

// Get user statistics
router.get('/stats', supabaseAuthMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!

  try {
    const stats = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            createdQuizzes: true,
            hostedGames: true,
            gameParticipations: true,
            notifications: true,
            questionBankItems: true
          }
        }
      }
    })

    res.json({
      success: true,
      data: { stats },
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Failed to get user stats:', error)
    throw createError('Failed to get user statistics', 500)
  }
}))

// Refresh user data from database
router.post('/refresh', supabaseAuthMiddleware as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const supabaseUser = req.supabaseUser!

  try {
    const dbUser = await prisma.user.findUnique({
      where: { auth_user_id: supabaseUser.id },
      select: excludePassword
    })

    if (!dbUser) {
      throw createError('User not found in database', 404)
    }

    if (dbUser.status !== 'ACTIVE') {
      throw createError('Account is inactive', 401)
    }

    res.json({
      success: true,
      data: { user: dbUser },
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Failed to refresh user data:', error)
    throw error
  }
}))

export default router 