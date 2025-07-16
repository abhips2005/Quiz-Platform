import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { validateBody, validateQuery } from '../middleware/validation';
import { AuthRequest, requireAdmin } from '../middleware/supabaseAuth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/profile/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      grade: true,
      school: true,
      subjects: true,
      createdAt: true,
      profile: {
        select: {
          bio: true,
          country: true,
          timezone: true,
          language: true
        }
      }
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user },
    timestamp: new Date()
  });
}));

// Search users
const searchUsersSchema = z.object({
  query: z.string().optional(),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']).optional(),
  school: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20')
});

router.get('/search', validateQuery(searchUsersSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { query, role, school, page, limit } = req.query as any;
  const skip = (page - 1) * limit;

  const where: any = {};
  
  if (query) {
    where.OR = [
      { username: { contains: query, mode: 'insensitive' } },
      { firstName: { contains: query, mode: 'insensitive' } },
      { lastName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } }
    ];
  }
  
  if (role) where.role = role;
  if (school) where.school = school;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        school: true,
        createdAt: true
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1
      }
    },
    timestamp: new Date()
  });
}));

// Admin routes
router.get('/admin/all', requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatar: true,
      grade: true,
      school: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    success: true,
    data: { users },
    timestamp: new Date()
  });
}));

const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
});

router.put('/:id/status', requireAdmin as any, validateBody(updateUserStatusSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatar: true,
      createdAt: true,
      updatedAt: true
    }
  });

  res.json({
    success: true,
    message: 'User status updated successfully',
    data: { user },
    timestamp: new Date()
  });
}));

export default router; 