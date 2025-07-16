import express from 'express';
import { supabaseAuthMiddleware } from '../middleware/supabaseAuth';
import { prisma } from '../index';
import { io } from '../index';
import { z } from 'zod';

const router = express.Router();


// Generate random game PIN (6 digits)
const generateGamePin = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validation schemas
const createGameSchema = z.object({
  quizId: z.string().cuid(),
  mode: z.enum(['LIVE', 'HOMEWORK', 'PRACTICE']),
  settings: z.object({
    randomizeQuestions: z.boolean().default(false),
    randomizeAnswers: z.boolean().default(false),
    allowRetake: z.boolean().default(false),
    showAnswersAfterSubmission: z.boolean().default(true),
    timePerQuestion: z.number().min(5).max(300).optional(),
    maxAttempts: z.number().min(1).max(10).default(1),
    availableFrom: z.string().datetime().optional(),
    availableUntil: z.string().datetime().optional(),
    classId: z.string().cuid().optional()
  }).optional()
});

const joinGameSchema = z.object({
  pin: z.string().length(6),
  playerName: z.string().min(1).max(50)
});

// Create a new game session
router.post('/create', supabaseAuthMiddleware, async (req, res) => {
  try {
    const validatedData = createGameSchema.parse(req.body);
    const hostId = req.user!.id;

    // Verify quiz exists and user has permission
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: validatedData.quizId,
        createdBy: hostId
      },
      include: {
        questions: {
          include: {
            questionOptions: true
          }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found or access denied' });
    }

    if (quiz.questions.length === 0) {
      return res.status(400).json({ error: 'Cannot create game for quiz with no questions' });
    }

    // Generate unique PIN
    let pin: string;
    let attempts = 0;
    do {
      pin = generateGamePin();
      const existingGame = await prisma.gameSession.findFirst({
        where: { 
          pin,
          status: { in: ['WAITING', 'IN_PROGRESS'] }
        }
      });
      if (!existingGame) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({ error: 'Unable to generate unique game PIN' });
    }

    // Create game session
    const gameSession = await prisma.gameSession.create({
      data: {
        pin,
        hostId,
        quizId: validatedData.quizId,
        mode: validatedData.mode,
        status: validatedData.mode === 'LIVE' ? 'WAITING' : 'SCHEDULED',
        settings: validatedData.settings || {},
        maxPlayers: validatedData.mode === 'LIVE' ? 500 : 1000,
        currentQuestionIndex: 0
      }
    });

    // If homework mode and class specified, create invitations
    if (validatedData.mode === 'HOMEWORK' && validatedData.settings?.classId) {
      const classStudents = await prisma.classStudent.findMany({
        where: { classId: validatedData.settings.classId },
        include: { student: true }
      });

      const invitations = classStudents.map(cs => ({
        gameSessionId: gameSession.id,
        invitedUserId: cs.studentId,
        invitedBy: hostId,
        status: 'PENDING' as const
      }));

      await prisma.gameInvitation.createMany({
        data: invitations
      });
    }

    res.status(201).json({
      gameId: gameSession.id,
      pin: gameSession.pin,
      mode: gameSession.mode,
      status: gameSession.status,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questionCount: quiz.questions.length
      }
    });

  } catch (error) {
    console.error('Create game error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create game session' });
  }
});

// Join a game via PIN
router.post('/join', async (req, res) => {
  try {
    const validatedData = joinGameSchema.parse(req.body);
    const { pin, playerName } = validatedData;

    // Find active game session
    const gameSession = await prisma.gameSession.findFirst({
      where: {
        pin,
        status: { in: ['WAITING', 'IN_PROGRESS', 'SCHEDULED'] }
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            description: true
          }
        },
        _count: {
          select: {
            players: true
          }
        }
      }
    });

    if (!gameSession) {
      return res.status(404).json({ error: 'Game not found or no longer active' });
    }

    // Check if game is full
    if (gameSession._count.players >= gameSession.maxPlayers) {
      return res.status(400).json({ error: 'Game is full' });
    }

    // Check if player name is already taken
    const existingPlayer = await prisma.gamePlayer.findFirst({
      where: {
        gameSessionId: gameSession.id,
        playerName
      }
    });

    if (existingPlayer) {
      return res.status(400).json({ error: 'Player name already taken' });
    }

    // Check game mode specific rules
    if (gameSession.mode === 'HOMEWORK') {
      // For homework mode, verify invitation exists (if user is logged in)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // TODO: Verify invitation for authenticated users
      }
    }

    // Create anonymous player
    const player = await prisma.gamePlayer.create({
      data: {
        gameSessionId: gameSession.id,
        playerName,
        status: 'JOINED',
        score: 0,
        joinedAt: new Date()
      }
    });

    res.status(201).json({
      playerId: player.id,
      gameId: gameSession.id,
      playerName: player.playerName,
      quiz: gameSession.quiz,
      gameMode: gameSession.mode,
      gameStatus: gameSession.status,
      playerCount: gameSession._count.players + 1
    });

  } catch (error) {
    console.error('Join game error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// Start a game (host only)
router.post('/:gameId/start', supabaseAuthMiddleware, async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const hostId = req.user!.id;

    const gameSession = await prisma.gameSession.findFirst({
      where: {
        id: gameId,
        hostId,
        status: 'WAITING'
      },
      include: {
        _count: {
          select: {
            players: true
          }
        }
      }
    });

    if (!gameSession) {
      return res.status(404).json({ error: 'Game not found or cannot be started' });
    }

    if (gameSession._count.players === 0) {
      return res.status(400).json({ error: 'Cannot start game with no players' });
    }

    // Update game status
    const updatedGame = await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        currentQuestionIndex: 0
      }
    });

    res.json({
      gameId: updatedGame.id,
      status: updatedGame.status,
      startedAt: updatedGame.startedAt,
      playerCount: gameSession._count.players
    });

  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Get game details
router.get('/:gameId', supabaseAuthMiddleware, async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const userId = req.user!.id;

    const gameSession = await prisma.gameSession.findFirst({
      where: {
        id: gameId,
        hostId: userId
      },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                media: true
              },
              orderBy: { order: 'asc' }
            }
          }
        },
        players: {
          select: {
            id: true,
            playerName: true,
            score: true,
            status: true,
            joinedAt: true
          },
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!gameSession) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    res.json({
      id: gameSession.id,
      pin: gameSession.pin,
      mode: gameSession.mode,
      status: gameSession.status,
      currentQuestionIndex: gameSession.currentQuestionIndex,
      maxPlayers: gameSession.maxPlayers,
      startedAt: gameSession.startedAt,
      endedAt: gameSession.endedAt,
      settings: gameSession.settings,
      quiz: gameSession.quiz,
      players: gameSession.players,
      playerCount: gameSession.players.length
    });

  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to get game details' });
  }
});

// End a game (host only)
router.post('/:gameId/end', supabaseAuthMiddleware, async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const hostId = req.user!.id;

    const gameSession = await prisma.gameSession.findFirst({
      where: {
        id: gameId,
        hostId,
        status: { in: ['WAITING', 'IN_PROGRESS'] }
      }
    });

    if (!gameSession) {
      return res.status(404).json({ error: 'Game not found or cannot be ended' });
    }

    // Update game status
    const updatedGame = await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date()
      }
    });

    // Generate final analytics
    const analytics = await prisma.gameAnalytics.create({
      data: {
        gameSessionId: gameId,
        totalPlayers: await prisma.gamePlayer.count({
          where: { gameSessionId: gameId }
        }),
        completionRate: 100, // TODO: Calculate actual completion rate
        averageScore: 0, // TODO: Calculate average score
        totalQuestions: await prisma.question.count({
          where: { quizId: gameSession.quizId }
        }),
        totalCorrectAnswers: 0, // TODO: Calculate from player answers
        sessionDuration: gameSession.startedAt ? 
          Math.floor((new Date().getTime() - gameSession.startedAt.getTime()) / 1000) : 0
      }
    });

    res.json({
      gameId: updatedGame.id,
      status: updatedGame.status,
      endedAt: updatedGame.endedAt,
      analyticsId: analytics.id
    });

  } catch (error) {
    console.error('End game error:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
});

// Get host's active games
router.get('/host/active', supabaseAuthMiddleware, async (req, res) => {
  try {
    const hostId = req.user!.id;

    const activeGames = await prisma.gameSession.findMany({
      where: {
        hostId,
        status: { in: ['WAITING', 'IN_PROGRESS', 'SCHEDULED'] }
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            players: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(activeGames.map(game => ({
      id: game.id,
      pin: game.pin,
      mode: game.mode,
      status: game.status,
      quiz: game.quiz,
      playerCount: game._count.players,
      maxPlayers: game.maxPlayers,
      createdAt: game.createdAt,
      startedAt: game.startedAt
    })));

  } catch (error) {
    console.error('Get active games error:', error);
    res.status(500).json({ error: 'Failed to get active games' });
  }
});

// Get game leaderboard
router.get('/:gameId/leaderboard', async (req, res) => {
  try {
    const gameId = req.params.gameId;

    const players = await prisma.gamePlayer.findMany({
      where: { gameSessionId: gameId },
      select: {
        id: true,
        playerName: true,
        score: true,
        status: true,
        totalAnswered: true,
        correctAnswers: true
      },
      orderBy: [
        { score: 'desc' },
        { totalAnswered: 'desc' },
        { joinedAt: 'asc' }
      ]
    });

    const leaderboard = players.map((player, index) => ({
      rank: index + 1,
      playerId: player.id,
      playerName: player.playerName,
      score: player.score,
      accuracy: player.totalAnswered > 0 ? 
        Math.round((player.correctAnswers / player.totalAnswered) * 100) : 0,
      status: player.status
    }));

    res.json(leaderboard);

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Delete/cancel a game (host only)
router.delete('/:gameId', supabaseAuthMiddleware, async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const hostId = req.user!.id;

    const gameSession = await prisma.gameSession.findFirst({
      where: {
        id: gameId,
        hostId
      }
    });

    if (!gameSession) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    if (gameSession.status === 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Cannot delete game in progress. End the game first.' });
    }

    // Delete related records first
    await prisma.gameInvitation.deleteMany({
      where: { gameSessionId: gameId }
    });

    await prisma.playerAnswer.deleteMany({
      where: { 
        player: {
          gameSessionId: gameId
        }
      }
    });

    await prisma.gamePlayer.deleteMany({
      where: { gameSessionId: gameId }
    });

    // Delete the game session
    await prisma.gameSession.delete({
      where: { id: gameId }
    });

    res.json({ message: 'Game deleted successfully' });

  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

export default router; 