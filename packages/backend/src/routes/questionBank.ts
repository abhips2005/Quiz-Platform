import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { validateBody, validateQuery } from '../middleware/validation';
import { AuthRequest, supabaseAuthMiddleware, requireTeacher } from '../middleware/supabaseAuth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();


// Validation schemas
const createQuestionSchema = z.object({
  type: z.enum(['MULTIPLE_CHOICE', 'CHECKBOX', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_IN_BLANK']),
  question: z.string().min(1, 'Question text is required'),
  explanation: z.string().optional(),
  points: z.number().min(1).max(10).default(1),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  category: z.string().min(1, 'Category is required'),
  subject: z.string().min(1, 'Subject is required'),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
  options: z.array(z.object({
    text: z.string().min(1),
    isCorrect: z.boolean(),
    explanation: z.string().optional()
  })).optional(),
  correctAnswer: z.string().optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  media: z.object({
    type: z.enum(['IMAGE', 'AUDIO', 'VIDEO']),
    url: z.string().url(),
    alt: z.string().optional()
  }).optional()
});

const updateQuestionSchema = createQuestionSchema.partial();

const searchQuestionsSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['MULTIPLE_CHOICE', 'CHECKBOX', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_IN_BLANK']).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  category: z.string().optional(),
  subject: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  isPublic: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20')
});

const bulkDeleteSchema = z.object({
  questionIds: z.array(z.string().min(1))
});

// Get all questions in bank with filtering and pagination
router.get('/', supabaseAuthMiddleware, validateQuery(searchQuestionsSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { search, type, difficulty, category, subject, tags, isPublic, page, limit } = req.query as any;
  const skip = (page - 1) * limit;

  const where: any = {
    OR: [
      { createdById: req.user!.id }, // User's own questions
      { isPublic: true } // Public questions
    ]
  };

  // Apply filters
  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { question: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { tags: { hasSome: [search] } }
        ]
      }
    ];
  }

  if (type) {
    where.type = type;
  }

  if (difficulty) {
    where.difficulty = difficulty;
  }

  if (category) {
    where.category = { contains: category, mode: 'insensitive' };
  }

  if (subject) {
    where.subject = { contains: subject, mode: 'insensitive' };
  }

  if (tags) {
    const tagArray = tags.split(',').map((tag: string) => tag.trim());
    where.tags = { hasEvery: tagArray };
  }

  if (isPublic !== undefined) {
    where.isPublic = isPublic;
  }

  const [questions, total] = await Promise.all([
    prisma.questionBankItem.findMany({
      where,
      include: {
        _count: {
          select: {
            quizQuestions: true // Usage count
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.questionBankItem.count({ where })
  ]);

  // Format questions with usage count
  const formattedQuestions = questions.map(question => ({
    ...question,
    usageCount: question._count.quizQuestions,
    _count: undefined
  }));

  res.json({
    success: true,
    data: {
      questions: formattedQuestions,
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

// Get question bank metadata (tags, categories, subjects)
router.get('/metadata', supabaseAuthMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  // Get unique values for filters
  const [tags, categories, subjects] = await Promise.all([
    prisma.questionBankItem.findMany({
      where: {
        OR: [
          { createdById: userId },
          { isPublic: true }
        ]
      },
      select: { tags: true },
      distinct: ['tags']
    }).then(items => {
      const allTags = new Set<string>();
      items.forEach(item => {
        item.tags.forEach(tag => allTags.add(tag));
      });
      return Array.from(allTags).sort();
    }),

    prisma.questionBankItem.findMany({
      where: {
        OR: [
          { createdById: userId },
          { isPublic: true }
        ]
      },
      select: { category: true },
      distinct: ['category']
    }).then(items => items.map(item => item.category).sort()),

    prisma.questionBankItem.findMany({
      where: {
        OR: [
          { createdById: userId },
          { isPublic: true }
        ]
      },
      select: { subject: true },
      distinct: ['subject']
    }).then(items => items.map(item => item.subject).sort())
  ]);

  res.json({
    success: true,
    data: {
      tags,
      categories,
      subjects
    },
    timestamp: new Date()
  });
}));

// Get single question from bank
router.get('/:id', supabaseAuthMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const question = await prisma.questionBankItem.findFirst({
    where: {
      id,
      OR: [
        { createdById: userId },
        { isPublic: true }
      ]
    },
    include: {
      _count: {
        select: {
          quizQuestions: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true
        }
      }
    }
  });

  if (!question) {
    throw createError('Question not found', 404);
  }

  const formattedQuestion = {
    ...question,
    usageCount: question._count.quizQuestions,
    _count: undefined
  };

  res.json({
    success: true,
    data: { question: formattedQuestion },
    timestamp: new Date()
  });
}));

// Create new question in bank
router.post('/', requireTeacher, validateBody(createQuestionSchema), asyncHandler(async (req: AuthRequest, res) => {
  const questionData = req.body;
  const userId = req.user!.id;

  // Validate question data based on type
  if (questionData.type === 'MULTIPLE_CHOICE' || questionData.type === 'CHECKBOX') {
    if (!questionData.options || questionData.options.length < 2) {
      throw createError('Multiple choice questions require at least 2 options', 400);
    }
    if (!questionData.options.some((opt: any) => opt.isCorrect)) {
      throw createError('At least one option must be marked as correct', 400);
    }
  }

  if (questionData.type === 'TRUE_FALSE') {
    if (!questionData.correctAnswer || !['true', 'false'].includes(questionData.correctAnswer)) {
      throw createError('True/False questions require a correct answer of "true" or "false"', 400);
    }
  }

  if (questionData.type === 'SHORT_ANSWER') {
    if (!questionData.acceptedAnswers || questionData.acceptedAnswers.length === 0) {
      throw createError('Short answer questions require at least one accepted answer', 400);
    }
  }

  if (questionData.type === 'FILL_IN_BLANK') {
    if (!questionData.correctAnswer) {
      throw createError('Fill in the blank questions require a correct answer', 400);
    }
  }

  const question = await prisma.questionBankItem.create({
    data: {
      ...questionData,
      createdById: userId
    },
    include: {
      _count: {
        select: {
          quizQuestions: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true
        }
      }
    }
  });

  const formattedQuestion = {
    ...question,
    usageCount: question._count.quizQuestions,
    _count: undefined
  };

  res.status(201).json({
    success: true,
    message: 'Question added to bank successfully',
    data: { question: formattedQuestion },
    timestamp: new Date()
  });
}));

// Update question in bank
router.put('/:id', supabaseAuthMiddleware, validateBody(updateQuestionSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const userId = req.user!.id;

  // Check if user owns the question
  const existingQuestion = await prisma.questionBankItem.findFirst({
    where: {
      id,
      createdById: userId
    }
  });

  if (!existingQuestion) {
    throw createError('Question not found or you do not have permission to edit it', 404);
  }

  const question = await prisma.questionBankItem.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: {
          quizQuestions: true
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true
        }
      }
    }
  });

  const formattedQuestion = {
    ...question,
    usageCount: question._count.quizQuestions,
    _count: undefined
  };

  res.json({
    success: true,
    message: 'Question updated successfully',
    data: { question: formattedQuestion },
    timestamp: new Date()
  });
}));

// Delete question from bank
router.delete('/:id', supabaseAuthMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if user owns the question
  const existingQuestion = await prisma.questionBankItem.findFirst({
    where: {
      id,
      createdById: userId
    }
  });

  if (!existingQuestion) {
    throw createError('Question not found or you do not have permission to delete it', 404);
  }

  await prisma.questionBankItem.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Question deleted successfully',
    timestamp: new Date()
  });
}));

// Bulk delete questions
router.post('/bulk-delete', supabaseAuthMiddleware, validateBody(bulkDeleteSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { questionIds } = req.body;
  const userId = req.user!.id;

  // Delete only questions owned by the user
  const result = await prisma.questionBankItem.deleteMany({
    where: {
      id: { in: questionIds },
      createdById: userId
    }
  });

  res.json({
    success: true,
    message: `${result.count} question(s) deleted successfully`,
    data: { deletedCount: result.count },
    timestamp: new Date()
  });
}));

// Import question from bank to quiz
router.post('/:id/import', supabaseAuthMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { quizId } = req.body;
  const userId = req.user!.id;

  if (!quizId) {
    throw createError('Quiz ID is required', 400);
  }

  // Check if user has access to the question
  const question = await prisma.questionBankItem.findFirst({
    where: {
      id,
      OR: [
        { createdById: userId },
        { isPublic: true }
      ]
    }
  });

  if (!question) {
    throw createError('Question not found', 404);
  }

  // Check if user owns the quiz
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      createdById: userId
    }
  });

  if (!quiz) {
    throw createError('Quiz not found or you do not have permission to edit it', 404);
  }

  // Get the highest order number for the quiz
  const lastQuestion = await prisma.question.findFirst({
    where: { quizId },
    orderBy: { order: 'desc' }
  });

  const nextOrder = lastQuestion ? lastQuestion.order + 1 : 1;

  // Create new question in the quiz based on the bank question
  const newQuestion = await prisma.question.create({
    data: {
      quizId,
      type: question.type,
      question: question.question,
      explanation: question.explanation,
      points: question.points,
      timeLimit: quiz.timePerQuestion,
      order: nextOrder,
      options: question.options || [],
      correctAnswer: question.correctAnswer,
      acceptedAnswers: question.acceptedAnswers,
      media: question.media,
      questionBankItemId: question.id // Link to bank question for usage tracking
    }
  });

  res.json({
    success: true,
    message: 'Question imported to quiz successfully',
    data: { question: newQuestion },
    timestamp: new Date()
  });
}));

export default router; 
