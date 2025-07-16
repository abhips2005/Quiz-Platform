import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { validateBody } from '../middleware/validation';
import { AuthRequest, requireTeacher } from '../middleware/supabaseAuth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();


// Generate random game PIN
function generateGamePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create Game Session
const createGameSchema = z.object({
  quizId: z.string().min(1, 'Quiz ID is required'),
  mode: z.enum(['LIVE', 'HOMEWORK', 'PRACTICE', 'TOURNAMENT']).default('LIVE'),
  maxPlayers: z.number().min(1).max(500).default(100),
  settings: z.object({
    allowLateJoin: z.boolean().default(true),
    showLeaderboard: z.boolean().default(true),
    showAnswerExplanations: z.boolean().default(true),
    enablePowerUps: z.boolean().default(false),
    enableChat: z.boolean().default(false),
    randomizeQuestions: z.boolean().default(false),
    randomizeOptions: z.boolean().default(false),
    autoAdvance: z.boolean().default(false),
    showCorrectAnswers: z.boolean().default(true),
    backgroundMusic: z.boolean().default(false),
    soundEffects: z.boolean().default(true),
    celebrationAnimation: z.boolean().default(true)
  }).default({})
});

router.post('/', requireTeacher, validateBody(createGameSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { quizId, mode, maxPlayers, settings } = req.body;

  // Verify quiz exists and user can host it
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true }
  });

  if (!quiz) {
    throw createError('Quiz not found', 404);
  }

  if (quiz.status !== 'PUBLISHED') {
    throw createError('Cannot create game for unpublished quiz', 400);
  }

  if (quiz.creatorId !== req.user!.id && quiz.visibility === 'PRIVATE') {
    throw createError('Cannot create game for private quiz you don\'t own', 403);
  }

  if (quiz.questions.length === 0) {
    throw createError('Cannot create game for quiz without questions', 400);
  }

  // Generate unique PIN
  let pin: string;
  let attempts = 0;
  do {
    pin = generateGamePin();
    const existingGame = await prisma.gameSession.findUnique({
      where: { pin }
    });
    if (!existingGame) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    throw createError('Failed to generate unique game PIN', 500);
  }

  const game = await prisma.gameSession.create({
    data: {
      pin: pin!,
      hostId: req.user!.id,
      quizId: quizId,
      mode: mode,
      maxPlayers: maxPlayers,
      settings: settings,
      status: 'WAITING'
    },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          description: true,
          coverImage: true,
          questions: {
            select: { id: true },
            orderBy: { order: 'asc' }
          }
        }
      },
      host: {
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
    message: 'Game session created successfully',
    data: { game },
    timestamp: new Date()
  });
}));

// Get Game by ID
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const gameId = req.params.id;

  const game = await prisma.gameSession.findUnique({
    where: { id: gameId },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          description: true,
          coverImage: true,
          estimatedTime: true,
          questions: {
            select: { id: true },
            orderBy: { order: 'asc' }
          }
        }
      },
      host: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true
        }
      },
      players: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        orderBy: { score: 'desc' }
      }
    }
  });

  if (!game) {
    throw createError('Game not found', 404);
  }

  res.json({
    success: true,
    data: { game },
    timestamp: new Date()
  });
}));

// Join Game by PIN
const joinGameSchema = z.object({
  pin: z.string().length(6, 'PIN must be 6 digits'),
  username: z.string().optional() // For guest users
});

router.post('/join', validateBody(joinGameSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { pin, username } = req.body;

  const game = await prisma.gameSession.findUnique({
    where: { pin },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          description: true,
          coverImage: true
        }
      },
      host: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true
        }
      },
      players: true
    }
  });

  if (!game) {
    throw createError('Game not found with this PIN', 404);
  }

  if (game.status === 'FINISHED' || game.status === 'CANCELLED') {
    throw createError('This game has ended', 400);
  }

  if (game.players.length >= game.maxPlayers) {
    throw createError('Game is full', 400);
  }

  // For authenticated users, check if already joined
  if (req.user) {
    const existingPlayer = game.players.find(p => p.userId === req.user!.id);
    if (existingPlayer) {
      return res.json({
        success: true,
        message: 'Already joined this game',
        data: { 
          game: {
            id: game.id,
            pin: game.pin,
            status: game.status,
            quiz: game.quiz,
            host: game.host
          },
          playerId: existingPlayer.id
        },
        timestamp: new Date()
      });
    }
  }

  res.json({
    success: true,
    message: 'Game found, ready to join',
    data: { 
      game: {
        id: game.id,
        pin: game.pin,
        status: game.status,
        quiz: game.quiz,
        host: game.host,
        currentPlayers: game.players.length,
        maxPlayers: game.maxPlayers
      }
    },
    timestamp: new Date()
  });
}));

// Get User's Games (as host)
router.get('/my/hosted', asyncHandler(async (req: AuthRequest, res) => {
  const games = await prisma.gameSession.findMany({
    where: { hostId: req.user!.id },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          coverImage: true
        }
      },
      _count: {
        select: { players: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  res.json({
    success: true,
    data: { games },
    timestamp: new Date()
  });
}));

// Get User's Games (as player)
router.get('/my/played', asyncHandler(async (req: AuthRequest, res) => {
  const games = await prisma.gameSession.findMany({
    where: {
      players: {
        some: { userId: req.user!.id }
      }
    },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          coverImage: true
        }
      },
      host: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true
        }
      },
      players: {
        where: { userId: req.user!.id },
        select: {
          score: true,
          correctAnswers: true,
          incorrectAnswers: true,
          position: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  res.json({
    success: true,
    data: { games },
    timestamp: new Date()
  });
}));

// End Game (Host only)
router.put('/:id/end', asyncHandler(async (req: AuthRequest, res) => {
  const gameId = req.params.id;

  const game = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { hostId: true, status: true }
  });

  if (!game) {
    throw createError('Game not found', 404);
  }

  if (game.hostId !== req.user!.id) {
    throw createError('Only the host can end the game', 403);
  }

  if (game.status === 'FINISHED' || game.status === 'CANCELLED') {
    throw createError('Game is already ended', 400);
  }

  await prisma.gameSession.update({
    where: { id: gameId },
    data: { 
      status: 'FINISHED',
      endedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Game ended successfully',
    timestamp: new Date()
  });
}));

export default router; 