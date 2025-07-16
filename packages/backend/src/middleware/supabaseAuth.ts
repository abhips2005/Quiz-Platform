import { Request, Response, NextFunction, RequestHandler } from 'express'
import { PrismaClient } from '@prisma/client'
import { supabaseAdmin } from '../config/supabase'
import { createError } from './errorHandler'

const prisma = new PrismaClient()

// Define the database user type to match what we return
export interface DbUser {
  id: string
  auth_user_id: string
  email: string
  username: string
  firstName: string
  lastName: string
  role: string
  status: string
  avatar?: string | null
  grade?: string | null
  school?: string | null
  subjects: string[]
  emailVerified: boolean
  lastLoginAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AuthRequest extends Request {
  user?: DbUser
  supabaseUser?: any
}

// Custom request handler type for AuthRequest
export type AuthRequestHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>

export const supabaseAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return next(createError('Access token required', 401))
    }

    // Verify Supabase JWT token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error) {
      console.error('Supabase auth verification error:', error.message)
      if (error.message?.includes('JWT')) {
        return next(createError('Invalid token format', 401))
      } else if (error.message?.includes('expired')) {
        return next(createError('Token expired', 401))
      } else {
        return next(createError('Invalid token', 401))
      }
    }
    
    if (!user) {
      return next(createError('Invalid token - no user found', 401))
    }

    // Store Supabase user info
    req.supabaseUser = user

    // Fetch user from database using Supabase auth user ID
    const dbUser = await prisma.user.findUnique({
      where: { auth_user_id: user.id },
      select: {
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
    })

    if (!dbUser) {
      console.error(`User not found in database for auth_user_id: ${user.id}`)
      return next(createError('User not found in database. Please complete registration.', 401))
    }

    if (dbUser.status !== 'ACTIVE') {
      console.warn(`Inactive user attempted access: ${dbUser.id}, status: ${dbUser.status}`)
      return next(createError('Account is inactive. Please contact support.', 401))
    }

    // Check if email verification status matches between Supabase and our DB
    if (user.email_confirmed_at && !dbUser.emailVerified) {
      try {
        // Update our database if Supabase shows email is verified
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { emailVerified: true }
        })
        dbUser.emailVerified = true
      } catch (updateError) {
        console.error('Failed to update email verification status:', updateError)
      }
    }

    req.user = dbUser
    next()
  } catch (error: any) {
    console.error('Auth middleware error:', error)
    
    if (error.message?.includes('JWT')) {
      return next(createError('Invalid token format', 401))
    } else if (error.message?.includes('expired')) {
      return next(createError('Token expired', 401))
    } else if (error.message?.includes('database') || error.code?.startsWith('P')) {
      return next(createError('Database error during authentication', 500))
    } else {
      return next(createError('Authentication failed', 401))
    }
  }
}

// Optional auth middleware (doesn't fail if no token)
export const optionalSupabaseAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return next()
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (!error && user) {
      req.supabaseUser = user
      
      const dbUser = await prisma.user.findUnique({
        where: { auth_user_id: user.id },
        select: {
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
      })
      
      if (dbUser && dbUser.status === 'ACTIVE') {
        req.user = dbUser
      }
    }
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    // Ignore auth errors for optional auth - continue without user
  }
  
  next()
}

// Role-based middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401))
    }
    
    if (!roles.includes(req.user.role)) {
      console.warn(`User ${req.user.id} attempted to access resource requiring roles [${roles.join(', ')}] but has role: ${req.user.role}`)
      return next(createError('Insufficient permissions', 403))
    }
    
    next()
  }
}

export const requireTeacher = requireRole(['TEACHER', 'ADMIN'])
export const requireAdmin = requireRole(['ADMIN'])

// Middleware to check if user owns a resource
export const requireOwnership = (getUserIdFromParams: (req: Request) => string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401))
    }

    const resourceOwnerId = getUserIdFromParams(req)
    
    if (req.user.id !== resourceOwnerId && req.user.role !== 'ADMIN') {
      console.warn(`User ${req.user.id} attempted to access resource owned by ${resourceOwnerId}`)
      return next(createError('Access denied - not the owner', 403))
    }
    
    next()
  }
}

// Middleware to check class membership
export const requireClassMembership = (getClassIdFromParams: (req: Request) => string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401))
    }

    const classId = getClassIdFromParams(req)
    
    try {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        select: {
          teacherId: true,
          students: {
            where: { studentId: req.user.id },
            select: { id: true }
          }
        }
      })

      if (!classData) {
        return next(createError('Class not found', 404))
      }

      // Check if user is teacher or student of the class, or admin
      const isTeacher = classData.teacherId === req.user.id
      const isStudent = classData.students.length > 0
      const isAdmin = req.user.role === 'ADMIN'

      if (!isTeacher && !isStudent && !isAdmin) {
        console.warn(`User ${req.user.id} attempted to access class ${classId} without membership`)
        return next(createError('Access denied - not a member of this class', 403))
      }

      next()
    } catch (error) {
      console.error('Class membership check error:', error)
      return next(createError('Failed to verify class membership', 500))
    }
  }
} 