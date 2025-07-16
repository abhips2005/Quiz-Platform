import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validation';
import { AuthRequest, requireTeacher } from '../middleware/supabaseAuth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { prisma } from '../index';

const router = Router();

// Create Quiz
const createQuizSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'SCHOOL_ONLY', 'CLASS_ONLY']).default('PRIVATE'),
  settings: z.object({
    randomizeQuestions: z.boolean().default(false),
    randomizeOptions: z.boolean().default(false),
    showCorrectAnswers: z.boolean().default(true),
    showAnswerExplanations: z.boolean().default(true),
    allowReviewAnswers: z.boolean().default(true),
    showLeaderboard: z.boolean().default(true),
    enablePowerUps: z.boolean().default(false),
    musicEnabled: z.boolean().default(false),
    pointsPerQuestion: z.number().default(10),
    timeMultiplier: z.number().default(1),
    negativeMarking: z.boolean().default(false),
    showProgressBar: z.boolean().default(true),
    exitScreenRequired: z.boolean().default(false)
  }).default({})
});

router.post('/', requireTeacher, validateBody(createQuizSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { title, description, subject, grade, tags, visibility, settings } = req.body;

  const quiz = await prisma.quiz.create({
    data: {
      title,
      description,
      creatorId: req.user!.id,
      subject,
      grade,
      tags,
      visibility,
      settings,
      status: 'DRAFT'
    },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Quiz created successfully',
    data: { quiz },
    timestamp: new Date()
  });
}));

// Get Quiz by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const quizId = req.params.id;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true
        }
      },
      questions: {
        include: {
          options: true,
          media: true
        },
        orderBy: { order: 'asc' }
      },
      coverImage: true
    }
  });

  if (!quiz) {
    throw createError('Quiz not found', 404);
  }

  // Check if user can access this quiz
  if (quiz.visibility === 'PRIVATE' && quiz.creatorId !== req.user?.id) {
    throw createError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { quiz },
    timestamp: new Date()
  });
}));

// Search/List Quizzes
const searchQuizzesSchema = z.object({
  query: z.string().optional(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  tags: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'SCHOOL_ONLY', 'CLASS_ONLY']).optional(),
  creatorId: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  sortBy: z.enum(['created', 'updated', 'popular', 'title']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

router.get('/', validateQuery(searchQuizzesSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { query, subject, grade, tags, visibility, creatorId, page, limit, sortBy, sortOrder } = req.query as any;
  const skip = (page - 1) * limit;

  const where: any = {};

  // Filter by visibility and user access
  if (!req.user) {
    // Anonymous users: only public published quizzes
    where.status = 'PUBLISHED';
    where.visibility = 'PUBLIC';
  } else if (visibility) {
    where.visibility = visibility;
    where.status = 'PUBLISHED';
  } else {
    // Logged-in users: show public published quizzes + all their own quizzes (draft & published)
    where.OR = [
      { visibility: 'PUBLIC', status: 'PUBLISHED' },
      { creatorId: req.user.id } // User's own quizzes (any status)
    ];
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { tags: { hasSome: [query] } }
    ];
  }

  if (subject) where.subject = subject;
  if (grade) where.grade = grade;
  if (tags) where.tags = { hasSome: tags.split(',') };
  if (creatorId) where.creatorId = creatorId;

  let orderBy: any = {};
  switch (sortBy) {
    case 'created':
      orderBy.createdAt = sortOrder;
      break;
    case 'updated':
      orderBy.updatedAt = sortOrder;
      break;
    case 'popular':
      orderBy.totalPlays = sortOrder;
      break;
    case 'title':
      orderBy.title = sortOrder;
      break;
  }

  const [quizzes, total] = await Promise.all([
    prisma.quiz.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true
          }
        },
        coverImage: true,
        _count: {
          select: { questions: true }
        }
      },
      skip,
      take: limit,
      orderBy
    }),
    prisma.quiz.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      quizzes,
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

// Update Quiz
const updateQuizSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'SCHOOL_ONLY', 'CLASS_ONLY']).optional(),
  settings: z.object({
    randomizeQuestions: z.boolean().optional(),
    randomizeOptions: z.boolean().optional(),
    showCorrectAnswers: z.boolean().optional(),
    showAnswerExplanations: z.boolean().optional(),
    allowReviewAnswers: z.boolean().optional(),
    showLeaderboard: z.boolean().optional(),
    enablePowerUps: z.boolean().optional(),
    musicEnabled: z.boolean().optional(),
    pointsPerQuestion: z.number().optional(),
    timeMultiplier: z.number().optional(),
    negativeMarking: z.boolean().optional(),
    showProgressBar: z.boolean().optional(),
    exitScreenRequired: z.boolean().optional()
  }).optional()
});

router.put('/:id', validateBody(updateQuizSchema), asyncHandler(async (req: AuthRequest, res) => {
  const quizId = req.params.id;
  const updateData = req.body;

  // Check ownership
  const existingQuiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { creatorId: true }
  });

  if (!existingQuiz) {
    throw createError('Quiz not found', 404);
  }

  if (existingQuiz.creatorId !== req.user!.id) {
    throw createError('You can only edit your own quizzes', 403);
  }

  const quiz = await prisma.quiz.update({
    where: { id: quizId },
    data: updateData,
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true
        }
      }
    }
  });

  res.json({
    success: true,
    message: 'Quiz updated successfully',
    data: { quiz },
    timestamp: new Date()
  });
}));

// Delete Quiz
router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const quizId = req.params.id;

  // Check ownership
  const existingQuiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { creatorId: true }
  });

  if (!existingQuiz) {
    throw createError('Quiz not found', 404);
  }

  if (existingQuiz.creatorId !== req.user!.id) {
    throw createError('You can only delete your own quizzes', 403);
  }

  await prisma.quiz.delete({
    where: { id: quizId }
  });

  res.json({
    success: true,
    message: 'Quiz deleted successfully',
    timestamp: new Date()
  });
}));

// Publish Quiz
router.put('/:id/publish', asyncHandler(async (req: AuthRequest, res) => {
  const quizId = req.params.id;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true }
  });

  if (!quiz) {
    throw createError('Quiz not found', 404);
  }

  if (quiz.creatorId !== req.user!.id) {
    throw createError('You can only publish your own quizzes', 403);
  }

  if (quiz.questions.length === 0) {
    throw createError('Cannot publish quiz without questions', 400);
  }

  const updatedQuiz = await prisma.quiz.update({
    where: { id: quizId },
    data: { status: 'PUBLISHED' }
  });

  res.json({
    success: true,
    message: 'Quiz published successfully',
    data: { quiz: updatedQuiz },
    timestamp: new Date()
  });
}));

export default router; 