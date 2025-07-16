import { Server as SocketServer, Socket } from 'socket.io';
import { supabaseAdmin } from '../config/supabase'; // Changed from Firebase
import { GameStatus, PlayerStatus } from '@prisma/client';
import { GameEvent, GameEventType } from '@quizizz-platform/shared';
import { prisma } from '../index';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  authUserId?: string; // Changed from firebaseUid to authUserId
  gameId?: string;
  playerId?: string;
}

interface GameRoom {
  id: string;
  hostId: string;
  players: Map<string, AuthenticatedSocket>;
  currentQuestionIndex: number;
  questionStartTime?: Date;
  questionTimeLimit?: number;
  status: GameStatus;
}

// Store active games in memory
const activeGames = new Map<string, GameRoom>();

export const initializeSocketHandlers = (io: SocketServer) => {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify Supabase auth token (changed from Firebase)
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        return next(new Error('Authentication error: Invalid token'));
      }
      
      // Verify user exists in our database and is active
      const dbUser = await prisma.user.findUnique({
        where: { auth_user_id: user.id }, // Changed from firebaseUid to auth_user_id
        select: { id: true, auth_user_id: true, status: true }
      });

      if (!dbUser || dbUser.status !== 'ACTIVE') {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      socket.userId = dbUser.id;
      socket.authUserId = dbUser.auth_user_id; // Changed from firebaseUid
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);

    // Join Game Room
    socket.on('join_game', async (data: { gameId: string; pin?: string }) => {
      try {
        const { gameId, pin } = data;

        // Verify game exists and user can join
        const game = await prisma.gameSession.findUnique({
          where: { id: gameId },
          include: {
            quiz: {
              select: { id: true, title: true, questions: { select: { id: true } } }
            },
            host: {
              select: { id: true, firstName: true, lastName: true, username: true }
            }
          }
        });

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (game.pin !== pin && game.hostId !== socket.userId) {
          socket.emit('error', { message: 'Invalid game PIN' });
          return;
        }

        if (game.status === 'FINISHED' || game.status === 'CANCELLED') {
          socket.emit('error', { message: 'Game has ended' });
          return;
        }

        // Check if user is already a player
        let gamePlayer = await prisma.gamePlayer.findUnique({
          where: {
            gameId_userId: {
              gameId: gameId,
              userId: socket.userId!
            }
          }
        });

        // Create player if doesn't exist
        if (!gamePlayer) {
          const user = await prisma.user.findUnique({
            where: { id: socket.userId },
            select: { id: true, username: true, firstName: true, lastName: true, avatar: true }
          });

          gamePlayer = await prisma.gamePlayer.create({
            data: {
              gameId: gameId,
              userId: socket.userId!,
              status: 'JOINED'
            }
          });

          // Notify other players
          const playerJoinedEvent: GameEvent = {
            type: GameEventType.PLAYER_JOINED,
            gameId: gameId,
            data: {
              player: {
                id: gamePlayer.id,
                userId: socket.userId,
                username: user!.username,
                firstName: user!.firstName,
                lastName: user!.lastName,
                avatar: user!.avatar,
                status: 'JOINED'
              }
            },
            timestamp: new Date()
          };

          socket.to(gameId).emit('game_event', playerJoinedEvent);
          // Also notify the monitor
          socket.to(`${gameId}_monitor`).emit('game_event', playerJoinedEvent);
        }

        // Join socket room
        socket.join(gameId);
        socket.gameId = gameId;
        socket.playerId = gamePlayer.id;

        // Add to active games tracking
        if (!activeGames.has(gameId)) {
          activeGames.set(gameId, {
            id: gameId,
            hostId: game.hostId,
            players: new Map(),
            currentQuestionIndex: game.currentQuestionIndex,
            status: game.status
          });
        }

        const activeGame = activeGames.get(gameId)!;
        activeGame.players.set(socket.userId!, socket);

        // Update player status to READY if game is waiting
        if (game.status === 'WAITING') {
          await prisma.gamePlayer.update({
            where: { id: gamePlayer.id },
            data: { status: 'READY' }
          });
        }

        // Send game state to joined player
        const currentGameState = await getGameState(gameId);
        socket.emit('game_joined', currentGameState);

        console.log(`User ${socket.userId} joined game ${gameId}`);
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Start Game (Host only)
    socket.on('start_game', async (data: { gameId: string }) => {
      try {
        const { gameId } = data;

        const game = await prisma.gameSession.findUnique({
          where: { id: gameId },
          include: { quiz: { include: { questions: true } } }
        });

        if (!game || game.hostId !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized: Only the host can start the game' });
          return;
        }

        if (game.status !== 'WAITING') {
          socket.emit('error', { message: 'Game cannot be started' });
          return;
        }

        // Update game status
        await prisma.gameSession.update({
          where: { id: gameId },
          data: { 
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            currentQuestionIndex: 0
          }
        });

        // Update all players to PLAYING status
        await prisma.gamePlayer.updateMany({
          where: { gameId: gameId },
          data: { status: 'PLAYING' }
        });

        // Update active game state
        const activeGame = activeGames.get(gameId);
        if (activeGame) {
          activeGame.status = 'IN_PROGRESS';
          activeGame.currentQuestionIndex = 0;
        }

        // Emit game started event
        const gameStartedEvent: GameEvent = {
          type: GameEventType.GAME_STARTED,
          gameId: gameId,
          data: { startedAt: new Date() },
          timestamp: new Date()
        };

        io.to(gameId).emit('game_event', gameStartedEvent);
        // Also notify the monitor
        io.to(`${gameId}_monitor`).emit('game_event', gameStartedEvent);

        // Start first question
        await startQuestion(gameId, 0);

        console.log(`Game ${gameId} started by ${socket.userId}`);
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Submit Answer
    socket.on('submit_answer', async (data: {
      gameId: string;
      questionId: string;
      selectedOptions?: string[];
      textAnswer?: string;
      timeSpent: number;
    }) => {
      try {
        const { gameId, questionId, selectedOptions, textAnswer, timeSpent } = data;

        if (socket.gameId !== gameId || !socket.playerId) {
          socket.emit('error', { message: 'Not joined to this game' });
          return;
        }

        // Verify question belongs to current game
        const question = await prisma.question.findFirst({
          where: {
            id: questionId,
            quiz: { gameSessions: { some: { id: gameId } } }
          },
          include: { media: true }
        });

        if (!question) {
          socket.emit('error', { message: 'Invalid question' });
          return;
        }

        // Check if already answered
        const existingAnswer = await prisma.playerAnswer.findUnique({
          where: {
            playerId_questionId: {
              playerId: socket.playerId,
              questionId: questionId
            }
          }
        });

        if (existingAnswer) {
          socket.emit('error', { message: 'Already answered this question' });
          return;
        }

        // Calculate base score
        const { isCorrect, pointsEarned: basePoints } = calculateScore(question, selectedOptions, textAnswer, timeSpent);

        // Get current player data for streak calculations
        const player = await prisma.gamePlayer.findUnique({
          where: { id: socket.playerId }
        });

        if (!player) {
          socket.emit('error', { message: 'Player not found' });
          return;
        }

        // Calculate streak and apply streak bonus
        const newStreak = isCorrect ? player.streak + 1 : 0;
        const streakMultiplier = isCorrect ? calculateStreakBonus(newStreak) : 1.0;
        const finalPoints = Math.floor(basePoints * streakMultiplier);

        // Save answer with final points
        const answer = await prisma.playerAnswer.create({
          data: {
            playerId: socket.playerId,
            gameId: gameId,
            questionId: questionId,
            selectedOptions: selectedOptions || [],
            textAnswer: textAnswer,
            timeSpent: timeSpent,
            pointsEarned: finalPoints,
            isCorrect: isCorrect
          }
        });

        // Calculate new average time
        const totalAnswers = player.correctAnswers + player.incorrectAnswers;
        const newAverageTime = totalAnswers > 0 
          ? ((player.averageTime * totalAnswers) + timeSpent) / (totalAnswers + 1)
          : timeSpent;

        // Update player score and stats
        await prisma.gamePlayer.update({
          where: { id: socket.playerId },
          data: {
            score: player.score + finalPoints,
            correctAnswers: isCorrect ? player.correctAnswers + 1 : player.correctAnswers,
            incorrectAnswers: isCorrect ? player.incorrectAnswers : player.incorrectAnswers + 1,
            streak: newStreak,
            longestStreak: Math.max(player.longestStreak, newStreak),
            averageTime: newAverageTime,
            lastSeen: new Date()
          }
        });

        // Update leaderboard positions and emit to all players
        await updatePlayerPositions(gameId);

        // Emit answer submitted event
        const answerEvent: GameEvent = {
          type: GameEventType.ANSWER_SUBMITTED,
          gameId: gameId,
          data: {
            playerId: socket.playerId,
            questionId: questionId,
            isCorrect: isCorrect,
            pointsEarned: finalPoints,
            timeSpent: timeSpent
          },
          timestamp: new Date()
        };

        socket.emit('answer_result', {
          isCorrect: isCorrect,
          pointsEarned: finalPoints,
          basePoints: basePoints,
          streakBonus: streakMultiplier,
          newStreak: newStreak,
          correctAnswer: question.correctAnswers,
          explanation: question.explanation
        });

        io.to(gameId).emit('game_event', answerEvent);

        // Also emit to monitor room for host tracking
        io.to(`${gameId}_monitor`).emit('game_event', answerEvent);

        console.log(`Answer submitted by ${socket.userId} for question ${questionId}`);
      } catch (error) {
        console.error('Error submitting answer:', error);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    // Next Question (Host only)
    socket.on('next_question', async (data: { gameId: string }) => {
      try {
        const { gameId } = data;

        const game = await prisma.gameSession.findUnique({
          where: { id: gameId },
          include: { quiz: { include: { questions: true } } }
        });

        if (!game || game.hostId !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized: Only the host can advance questions' });
          return;
        }

        const nextQuestionIndex = game.currentQuestionIndex + 1;

        if (nextQuestionIndex >= game.quiz.questions.length) {
          // Game finished
          await endGame(gameId);
          return;
        }

        // Update game question index
        await prisma.gameSession.update({
          where: { id: gameId },
          data: { currentQuestionIndex: nextQuestionIndex }
        });

        // Start next question
        await startQuestion(gameId, nextQuestionIndex);

        console.log(`Game ${gameId} advanced to question ${nextQuestionIndex}`);
      } catch (error) {
        console.error('Error advancing to next question:', error);
        socket.emit('error', { message: 'Failed to advance question' });
      }
    });

    // Join Game Monitor (Host only)
    socket.on('join_game_monitor', async (data: { gameId: string }) => {
      try {
        const { gameId } = data;

        const game = await prisma.gameSession.findUnique({
          where: { id: gameId },
          include: { 
            host: true,
            quiz: { include: { questions: true } },
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

        if (!game || game.hostId !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized: Only the host can monitor this game' });
          return;
        }

        // Join the monitor room
        socket.join(`${gameId}_monitor`);
        socket.gameId = gameId;

        // Send current game state
        const gameState = {
          id: game.id,
          pin: game.pin,
          status: game.status,
          currentQuestionIndex: game.currentQuestionIndex,
          totalQuestions: game.quiz.questions.length,
          players: game.players,
          quiz: game.quiz
        };

        socket.emit('monitor_joined', gameState);

        console.log(`Host ${socket.userId} joined monitor for game ${gameId}`);
      } catch (error) {
        console.error('Error joining game monitor:', error);
        socket.emit('error', { message: 'Failed to join game monitor' });
      }
    });

    // Game Control Commands (Host only)
    socket.on('game_control', async (data: { gameId: string; action: 'pause' | 'resume' | 'end' | 'next' }) => {
      try {
        const { gameId, action } = data;

        const game = await prisma.gameSession.findUnique({
          where: { id: gameId },
          include: { quiz: { include: { questions: true } } }
        });

        if (!game || game.hostId !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized: Only the host can control this game' });
          return;
        }

        switch (action) {
          case 'pause':
            await prisma.gameSession.update({
              where: { id: gameId },
              data: { status: 'PAUSED' }
            });
            
            const pausedEvent: GameEvent = {
              type: GameEventType.GAME_PAUSED,
              gameId: gameId,
              data: { pausedAt: new Date() },
              timestamp: new Date()
            };
            
            io.to(gameId).emit('game_event', pausedEvent);
            io.to(`${gameId}_monitor`).emit('game_event', pausedEvent);
            break;

          case 'resume':
            await prisma.gameSession.update({
              where: { id: gameId },
              data: { status: 'IN_PROGRESS' }
            });
            
            const resumedEvent: GameEvent = {
              type: GameEventType.GAME_RESUMED,
              gameId: gameId,
              data: { resumedAt: new Date() },
              timestamp: new Date()
            };
            
            io.to(gameId).emit('game_event', resumedEvent);
            io.to(`${gameId}_monitor`).emit('game_event', resumedEvent);
            break;

          case 'end':
            await endGame(gameId);
            break;

          case 'next':
            if (game.status === 'IN_PROGRESS') {
              const nextQuestionIndex = game.currentQuestionIndex + 1;
              if (nextQuestionIndex < game.quiz.questions.length) {
                await startQuestion(gameId, nextQuestionIndex);
              } else {
                await endGame(gameId);
              }
            }
            break;

          default:
            socket.emit('error', { message: 'Invalid game control action' });
            return;
        }

        socket.emit('control_executed', { action });
        console.log(`Game ${gameId} control: ${action} by ${socket.userId}`);
      } catch (error) {
        console.error('Error executing game control:', error);
        socket.emit('error', { message: 'Failed to execute game control' });
      }
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      try {
        if (socket.gameId && socket.playerId) {
          // Update player status
          await prisma.gamePlayer.update({
            where: { id: socket.playerId },
            data: { 
              status: 'DISCONNECTED',
              lastSeen: new Date()
            }
          });

          // Remove from active game tracking
          const activeGame = activeGames.get(socket.gameId);
          if (activeGame) {
            activeGame.players.delete(socket.userId!);
          }

          // Notify other players
          const playerLeftEvent: GameEvent = {
            type: GameEventType.PLAYER_LEFT,
            gameId: socket.gameId,
            data: { playerId: socket.playerId },
            timestamp: new Date()
          };

          socket.to(socket.gameId).emit('game_event', playerLeftEvent);
        }

        console.log(`User ${socket.userId} disconnected`);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  // Helper functions
  async function getGameState(gameId: string) {
    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
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

    return game;
  }

  async function startQuestion(gameId: string, questionIndex: number) {
    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
      include: { 
        quiz: { 
          include: { 
            questions: { 
              include: { 
                questionOptions: true,
                media: true 
              },
              orderBy: { order: 'asc' } 
            } 
          } 
        } 
      }
    });

    if (!game || questionIndex >= game.quiz.questions.length) {
      await endGame(gameId);
      return;
    }

    const question = game.quiz.questions[questionIndex];
    const timeLimit = question.timeLimit || 30; // Default 30 seconds

    // Update game with current question info
    await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        currentQuestionIndex: questionIndex,
        questionStartTime: new Date(),
        questionEndTime: new Date(Date.now() + timeLimit * 1000)
      }
    });

    // Update active game state
    const activeGame = activeGames.get(gameId);
    if (activeGame) {
      activeGame.currentQuestionIndex = questionIndex;
      activeGame.questionStartTime = new Date();
      activeGame.questionTimeLimit = timeLimit;
    }

    // Send question to all players
    const questionStartedEvent: GameEvent = {
      type: GameEventType.QUESTION_STARTED,
      gameId: gameId,
      data: {
        questionIndex: questionIndex,
        question: {
          id: question.id,
          question: question.question,
          type: question.type,
          options: question.questionOptions.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            // Don't send isCorrect to players
          })),
          media: question.media,
          timeLimit: timeLimit,
          points: question.points
        },
        totalQuestions: game.quiz.questions.length,
        startTime: new Date()
      },
      timestamp: new Date()
    };

    io.to(gameId).emit('game_event', questionStartedEvent);

    // Start real-time timer updates
    const timerInterval = setInterval(() => {
      const now = Date.now();
      const startTime = activeGame?.questionStartTime?.getTime() || now;
      const timeElapsed = Math.floor((now - startTime) / 1000);
      const timeRemaining = Math.max(0, timeLimit - timeElapsed);

      // Send timer update
      const timerEvent: GameEvent = {
        type: GameEventType.TIMER_UPDATE,
        gameId: gameId,
        data: {
          timeRemaining: timeRemaining,
          timeElapsed: timeElapsed,
          timeLimit: timeLimit
        },
        timestamp: new Date()
      };

      io.to(gameId).emit('game_event', timerEvent);

      // Send warning at 10 seconds remaining
      if (timeRemaining === 10) {
        const warningEvent: GameEvent = {
          type: GameEventType.TIMER_WARNING,
          gameId: gameId,
          data: { timeRemaining: 10 },
          timestamp: new Date()
        };
        io.to(gameId).emit('game_event', warningEvent);
      }

      // Stop timer when time runs out
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000); // Update every second

    // Auto-advance after time limit
    setTimeout(async () => {
      try {
        clearInterval(timerInterval);
        
        const questionEndedEvent: GameEvent = {
          type: GameEventType.QUESTION_ENDED,
          gameId: gameId,
          data: {
            questionId: question.id,
            questionIndex: questionIndex,
            correctAnswer: question.correctAnswers,
            explanation: question.explanation
          },
          timestamp: new Date()
        };

        io.to(gameId).emit('game_event', questionEndedEvent);

        // Update leaderboard after question ends
        await updatePlayerPositions(gameId);

        // Move to next question after a short delay
        setTimeout(async () => {
          if (questionIndex + 1 < game.quiz.questions.length) {
            await startQuestion(gameId, questionIndex + 1);
          } else {
            await endGame(gameId);
          }
        }, 5000); // 5 second delay between questions

      } catch (error) {
        console.error('Error ending question:', error);
      }
    }, timeLimit * 1000);
  }

  async function endGame(gameId: string) {
    // Update game status
    await prisma.gameSession.update({
      where: { id: gameId },
      data: { 
        status: 'FINISHED',
        endedAt: new Date()
      }
    });

    // Update all players to FINISHED status
    await prisma.gamePlayer.updateMany({
      where: { gameId: gameId },
      data: { status: 'FINISHED' }
    });

    // Get final leaderboard
    const finalLeaderboard = await prisma.gamePlayer.findMany({
      where: { gameId: gameId },
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
      orderBy: [
        { score: 'desc' },
        { averageTime: 'asc' }
      ]
    });

    // Remove from active games
    activeGames.delete(gameId);

    // Emit game ended event
    const gameEndedEvent: GameEvent = {
      type: GameEventType.GAME_ENDED,
      gameId: gameId,
      data: {
        finalLeaderboard: finalLeaderboard.map((player, index) => ({
          rank: index + 1,
          playerId: player.id,
          userId: player.userId,
          username: player.user.username,
          firstName: player.user.firstName,
          lastName: player.user.lastName,
          avatar: player.user.avatar,
          score: player.score,
          correctAnswers: player.correctAnswers,
          incorrectAnswers: player.incorrectAnswers,
          averageTime: player.averageTime,
          longestStreak: player.longestStreak
        }))
      },
      timestamp: new Date()
    };

    io.to(gameId).emit('game_event', gameEndedEvent);

    console.log(`Game ${gameId} ended`);
  }

  function calculateScore(question: any, selectedOptions?: string[], textAnswer?: string, timeSpent?: number): { isCorrect: boolean; pointsEarned: number } {
    let isCorrect = false;
    let basePoints = question.points || 1000; // Default to 1000 points per question

    // Check answer based on question type
    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
      const correctOptions = question.questionOptions.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.id);
      isCorrect = selectedOptions?.length === 1 && correctOptions.includes(selectedOptions[0]);
    } else if (question.type === 'CHECKBOX') {
      const correctOptions = question.questionOptions.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.id);
      isCorrect = selectedOptions?.length === correctOptions.length && 
                  selectedOptions && selectedOptions.every(option => correctOptions.includes(option));
    } else if (question.type === 'SHORT_ANSWER' || question.type === 'FILL_IN_BLANK') {
      if (textAnswer && question.correctAnswers) {
        const normalizedAnswer = question.caseSensitive ? textAnswer.trim() : textAnswer.trim().toLowerCase();
        const correctAnswers = question.caseSensitive 
          ? question.correctAnswers 
          : question.correctAnswers.map((ans: string) => ans.toLowerCase());
        isCorrect = correctAnswers.includes(normalizedAnswer);
      }
    }

    if (!isCorrect) {
      return { isCorrect: false, pointsEarned: 0 };
    }

    // Calculate speed-based scoring with multiple tiers
    let speedMultiplier = 1.0;
    if (timeSpent && question.timeLimit) {
      const timeLimit = question.timeLimit * 1000; // Convert to milliseconds
      const timeRatio = timeSpent / timeLimit;
      
      if (timeRatio <= 0.25) {
        // Answered in first 25% of time - Lightning bonus
        speedMultiplier = 2.0;
      } else if (timeRatio <= 0.5) {
        // Answered in first 50% of time - Speed bonus  
        speedMultiplier = 1.5;
      } else if (timeRatio <= 0.75) {
        // Answered in first 75% of time - Quick bonus
        speedMultiplier = 1.25;
      } else {
        // No speed bonus for answers in last 25%
        speedMultiplier = 1.0;
      }
    }

    const pointsEarned = Math.floor(basePoints * speedMultiplier);
    return { isCorrect, pointsEarned };
  }

  // Enhanced function to calculate streak bonus
  function calculateStreakBonus(currentStreak: number): number {
    if (currentStreak >= 10) return 2.0; // Double points for 10+ streak
    if (currentStreak >= 5) return 1.5;  // 50% bonus for 5+ streak
    if (currentStreak >= 3) return 1.25; // 25% bonus for 3+ streak
    return 1.0; // No bonus
  }

  // Function to update player position based on score
  async function updatePlayerPositions(gameId: string) {
    const players = await prisma.gamePlayer.findMany({
      where: { gameId },
      orderBy: [
        { score: 'desc' },
        { averageTime: 'asc' },
        { joinedAt: 'asc' }
      ],
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
      }
    });

    // Update positions in database
    for (let i = 0; i < players.length; i++) {
      await prisma.gamePlayer.update({
        where: { id: players[i].id },
        data: { position: i + 1 }
      });
    }

    // Emit updated leaderboard to all players
    const leaderboard = players.map((player, index) => ({
      playerId: player.id,
      username: player.user.username,
      firstName: player.user.firstName,
      lastName: player.user.lastName,
      avatar: player.user.avatar,
      score: player.score,
      correctAnswers: player.correctAnswers,
      streak: player.streak,
      position: index + 1,
      change: 0 // Will be calculated on frontend
    }));

    const leaderboardEvent: GameEvent = {
      type: GameEventType.LEADERBOARD_UPDATED,
      gameId: gameId,
      data: { leaderboard },
      timestamp: new Date()
    };

    io.to(gameId).emit('game_event', leaderboardEvent);
    return leaderboard;
  }
};

export { activeGames }; 