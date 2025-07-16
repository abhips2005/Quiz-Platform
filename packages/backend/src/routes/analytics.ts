import express from 'express';
import { PrismaClient } from '@prisma/client';
import { supabaseAuthMiddleware } from '../middleware/supabaseAuth';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard analytics summary
router.get('/dashboard', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const timeframe = req.query.timeframe as string || '30'; // days

    console.log('Analytics request for user:', userId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    // Get basic stats with error handling
    let totalQuizzes = 0;
    let totalGames = 0;
    let totalStudents = 0;
    let recentActivity: any[] = [];

    try {
      totalQuizzes = await prisma.quiz.count({
        where: { creatorId: userId }
      });
    } catch (error) {
      console.log('Error counting quizzes:', error);
    }

    try {
      totalGames = await prisma.gameSession.count({
        where: { 
          hostId: userId,
          createdAt: { gte: startDate }
        }
      });
    } catch (error) {
      console.log('Error counting games:', error);
    }

    try {
      totalStudents = await prisma.gamePlayer.count({
        where: { 
          game: { hostId: userId },
          joinedAt: { gte: startDate }
        }
      });
    } catch (error) {
      console.log('Error counting students:', error);
    }

    try {
      recentActivity = await prisma.gameSession.findMany({
        where: { 
          hostId: userId,
          createdAt: { gte: startDate }
        },
        include: {
          quiz: { select: { title: true } },
          _count: { select: { players: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
    } catch (error) {
      console.log('Error fetching recent activity:', error);
    }

    // Calculate basic engagement metrics
    const averageAccuracy = totalGames > 0 ? 75.5 : 0; // Placeholder calculation
    const averageGameDuration = totalGames > 0 ? 15.2 : 0; // Placeholder calculation

    // Format recent activity
    const formattedActivity = recentActivity.map(game => ({
      id: game.id,
      quizTitle: game.quiz?.title || 'Untitled Quiz',
      playerCount: game._count?.players || 0,
      status: game.status,
      createdAt: game.createdAt.toISOString()
    }));

    // Generate trends data (placeholder for now)
    const trends = {
      gamesPerDay: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 5)
      })).reverse(),
      popularQuizzes: []
    };

    const response = {
      data: {
        overview: {
          totalQuizzes,
          totalGames,
          totalStudents,
          averageAccuracy,
          averageGameDuration
        },
        recentActivity: formattedActivity,
        trends
      }
    };

    console.log('Analytics response:', response);
    res.json(response);

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get detailed game analytics
router.get('/game/:gameId', supabaseAuthMiddleware, async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const userId = req.user!.id;

    const game = await prisma.gameSession.findFirst({
      where: { 
        id: gameId, 
        hostId: userId 
      },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true
              },
              orderBy: { order: 'asc' }
            }
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
            },
            answers: {
              include: {
                question: {
                  select: {
                    id: true,
                    question: true,
                    type: true,
                    correctAnswers: true
                  }
                }
              }
            }
          },
          orderBy: { score: 'desc' }
        },
        analytics: true
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Calculate question-level analytics
    const questionAnalytics = await Promise.all(
      game.quiz.questions.map(async (question) => {
        const answers = await prisma.playerAnswer.findMany({
          where: { 
            questionId: question.id,
            gameId: gameId
          }
        });

        const totalAnswers = answers.length;
        const correctAnswers = answers.filter(a => a.isCorrect).length;
        const averageTime = totalAnswers > 0 
          ? answers.reduce((sum, a) => sum + a.timeSpent, 0) / totalAnswers / 1000
          : 0;

        // Option distribution for MCQ questions
        let optionDistribution: any = {};
        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
          optionDistribution = question.options.reduce((dist: any, option) => {
            const selectedCount = answers.filter(a => 
              a.selectedOptions.includes(option.id)
            ).length;
            dist[option.text] = {
              count: selectedCount,
              percentage: totalAnswers > 0 ? (selectedCount / totalAnswers) * 100 : 0,
              isCorrect: option.isCorrect
            };
            return dist;
          }, {});
        }

        return {
          questionId: question.id,
          question: question.question,
          type: question.type,
          totalAnswers,
          correctAnswers,
          accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
          averageTime: Math.round(averageTime * 10) / 10,
          difficulty: totalAnswers > 0 ? 
            (correctAnswers / totalAnswers > 0.8 ? 'Easy' : 
             correctAnswers / totalAnswers > 0.5 ? 'Medium' : 'Hard') : 'Unknown',
          optionDistribution
        };
      })
    );

    // Calculate player analytics
    const playerAnalytics = game.players.map(player => {
      const answers = player.answers;
      const totalTime = answers.reduce((sum, a) => sum + a.timeSpent, 0);
      
      return {
        playerId: player.id,
        user: player.user,
        finalScore: player.score,
        rank: player.position,
        correctAnswers: player.correctAnswers,
        incorrectAnswers: player.incorrectAnswers,
        accuracy: player.correctAnswers + player.incorrectAnswers > 0 
          ? (player.correctAnswers / (player.correctAnswers + player.incorrectAnswers)) * 100 
          : 0,
        averageTime: answers.length > 0 ? totalTime / answers.length / 1000 : 0,
        longestStreak: player.longestStreak,
        questionBreakdown: answers.map(answer => ({
          questionId: answer.questionId,
          question: answer.question.question,
          isCorrect: answer.isCorrect,
          timeSpent: answer.timeSpent / 1000,
          pointsEarned: answer.pointsEarned,
          selectedAnswer: answer.selectedOptions.length > 0 ? answer.selectedOptions : [answer.textAnswer || '']
        }))
      };
    });

    // Game summary stats
    const summary = {
      gameId: game.id,
      quizTitle: game.quiz.title,
      totalPlayers: game.players.length,
      completionRate: game.players.filter(p => p.status === 'FINISHED').length / game.players.length * 100,
      averageScore: game.players.length > 0 
        ? game.players.reduce((sum, p) => sum + p.score, 0) / game.players.length 
        : 0,
      totalQuestions: game.quiz.questions.length,
      gameMode: game.mode,
      duration: game.endedAt && game.startedAt 
        ? Math.floor((game.endedAt.getTime() - game.startedAt.getTime()) / 1000)
        : 0,
      startedAt: game.startedAt,
      endedAt: game.endedAt
    };

    res.json({
      success: true,
      data: {
        summary,
        questionAnalytics,
        playerAnalytics,
        gameAnalytics: game.analytics
      }
    });

  } catch (error) {
    console.error('Game analytics error:', error);
    res.status(500).json({ error: 'Failed to get game analytics' });
  }
});

// Get quiz performance analytics
router.get('/quiz/:quizId', supabaseAuthMiddleware, async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const userId = req.user!.id;

    const quiz = await prisma.quiz.findFirst({
      where: { 
        id: quizId, 
        createdBy: userId 
      },
      include: {
        questions: {
          include: {
            options: true
          },
          orderBy: { order: 'asc' }
        },
        gameSessions: {
          include: {
            players: true,
            _count: { select: { players: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found or access denied' });
    }

    // Aggregate question performance across all games
    const questionPerformance = await Promise.all(
      quiz.questions.map(async (question) => {
        const allAnswers = await prisma.playerAnswer.findMany({
          where: { 
            questionId: question.id,
            game: { quizId: quizId }
          }
        });

        const gamesPlayed = await prisma.gameSession.count({
          where: { 
            quizId: quizId,
            status: 'FINISHED'
          }
        });

        const totalAnswers = allAnswers.length;
        const correctAnswers = allAnswers.filter(a => a.isCorrect).length;
        const averageTime = totalAnswers > 0 
          ? allAnswers.reduce((sum, a) => sum + a.timeSpent, 0) / totalAnswers / 1000
          : 0;

        return {
          questionId: question.id,
          question: question.question,
          type: question.type,
          timesAsked: gamesPlayed,
          totalAnswers,
          correctAnswers,
          accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
          averageTime: Math.round(averageTime * 10) / 10,
          difficultyRating: totalAnswers > 0 ? 
            (correctAnswers / totalAnswers > 0.8 ? 'Easy' : 
             correctAnswers / totalAnswers > 0.5 ? 'Medium' : 'Hard') : 'Untested'
        };
      })
    );

    // Quiz usage statistics
    const usageStats = {
      totalGames: quiz.gameSessions.length,
      totalPlayers: quiz.gameSessions.reduce((sum, game) => sum + game._count.players, 0),
      averagePlayersPerGame: quiz.gameSessions.length > 0 
        ? quiz.gameSessions.reduce((sum, game) => sum + game._count.players, 0) / quiz.gameSessions.length
        : 0,
      lastPlayed: quiz.gameSessions.length > 0 ? quiz.gameSessions[0].createdAt : null,
      popularityTrend: await getQuizPopularityTrend(quizId)
    };

    res.json({
      success: true,
      data: {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          totalQuestions: quiz.questions.length,
          createdAt: quiz.createdAt
        },
        questionPerformance,
        usageStats,
        recentGames: quiz.gameSessions.slice(0, 10).map(game => ({
          id: game.id,
          playerCount: game._count.players,
          status: game.status,
          createdAt: game.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Quiz analytics error:', error);
    res.status(500).json({ error: 'Failed to get quiz analytics' });
  }
});

// Export game data as CSV
router.get('/export/game/:gameId/csv', supabaseAuthMiddleware, async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const userId = req.user!.id;

    const game = await prisma.gameSession.findFirst({
      where: { 
        id: gameId, 
        hostId: userId 
      },
      include: {
        quiz: { select: { title: true } },
        players: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                username: true
              }
            },
            answers: {
              include: {
                question: {
                  select: {
                    question: true,
                    order: true
                  }
                }
              },
              orderBy: {
                question: { order: 'asc' }
              }
            }
          },
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Format data for CSV export
    const csvData = game.players.map(player => {
      const baseData = {
        'Player Name': `${player.user.firstName} ${player.user.lastName}`,
        'Username': player.user.username,
        'Final Score': player.score,
        'Rank': player.position,
        'Correct Answers': player.correctAnswers,
        'Incorrect Answers': player.incorrectAnswers,
        'Accuracy (%)': player.correctAnswers + player.incorrectAnswers > 0 
          ? Math.round((player.correctAnswers / (player.correctAnswers + player.incorrectAnswers)) * 100)
          : 0,
        'Longest Streak': player.longestStreak,
        'Average Time (s)': Math.round(player.averageTime / 1000)
      };

      // Add question-specific data
      player.answers.forEach((answer, index) => {
        baseData[`Q${index + 1} Correct`] = answer.isCorrect ? 'Yes' : 'No';
        baseData[`Q${index + 1} Time (s)`] = Math.round(answer.timeSpent / 1000);
        baseData[`Q${index + 1} Points`] = answer.pointsEarned;
      });

      return baseData;
    });

    const csv = new Parser().parse(csvData);
    const filename = `${game.quiz.title.replace(/[^a-z0-9]/gi, '_')}_results_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);

  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Export game data as PDF
router.get('/export/game/:gameId/pdf', supabaseAuthMiddleware, async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const userId = req.user!.id;

    const game = await prisma.gameSession.findFirst({
      where: { 
        id: gameId, 
        hostId: userId 
      },
      include: {
        quiz: { 
          select: { 
            title: true,
            description: true 
          } 
        },
        host: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        players: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                username: true
              }
            }
          },
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${game.quiz.title.replace(/[^a-z0-9]/gi, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // PDF Header
    doc.fontSize(20).text('Quiz Game Report', { align: 'center' });
    doc.moveDown();

    // Game Information
    doc.fontSize(16).text('Game Information', { underline: true });
    doc.fontSize(12);
    doc.text(`Quiz Title: ${game.quiz.title}`);
    doc.text(`Host: ${game.host.firstName} ${game.host.lastName}`);
    doc.text(`Game Mode: ${game.mode}`);
    doc.text(`Date: ${game.createdAt.toLocaleDateString()}`);
    doc.text(`Total Players: ${game.players.length}`);
    if (game.startedAt && game.endedAt) {
      const duration = Math.floor((game.endedAt.getTime() - game.startedAt.getTime()) / 1000 / 60);
      doc.text(`Duration: ${duration} minutes`);
    }
    doc.moveDown();

    // Summary Statistics
    doc.fontSize(16).text('Summary Statistics', { underline: true });
    doc.fontSize(12);
    
    const avgScore = game.players.length > 0 
      ? Math.round(game.players.reduce((sum, p) => sum + p.score, 0) / game.players.length)
      : 0;
    const avgAccuracy = game.players.length > 0
      ? Math.round(game.players.reduce((sum, p) => {
          const total = p.correctAnswers + p.incorrectAnswers;
          return sum + (total > 0 ? (p.correctAnswers / total) * 100 : 0);
        }, 0) / game.players.length)
      : 0;

    doc.text(`Average Score: ${avgScore} points`);
    doc.text(`Average Accuracy: ${avgAccuracy}%`);
    doc.text(`Completion Rate: ${Math.round((game.players.filter(p => p.status === 'FINISHED').length / game.players.length) * 100)}%`);
    doc.moveDown();

    // Leaderboard
    doc.fontSize(16).text('Final Leaderboard', { underline: true });
    doc.fontSize(10);

    // Table headers
    const tableTop = doc.y;
    const itemHeight = 20;
    doc.text('Rank', 50, tableTop);
    doc.text('Player Name', 100, tableTop);
    doc.text('Score', 250, tableTop);
    doc.text('Accuracy', 300, tableTop);
    doc.text('Streak', 380, tableTop);

    // Draw line under headers
    doc.moveTo(50, tableTop + 15)
       .lineTo(450, tableTop + 15)
       .stroke();

    // Player rows
    game.players.slice(0, 20).forEach((player, index) => {
      const y = tableTop + (index + 1) * itemHeight;
      const accuracy = player.correctAnswers + player.incorrectAnswers > 0 
        ? Math.round((player.correctAnswers / (player.correctAnswers + player.incorrectAnswers)) * 100)
        : 0;

      doc.text(`${player.position}`, 50, y);
      doc.text(`${player.user.firstName} ${player.user.lastName}`, 100, y);
      doc.text(`${player.score}`, 250, y);
      doc.text(`${accuracy}%`, 300, y);
      doc.text(`${player.longestStreak}`, 380, y);
    });

    if (game.players.length > 20) {
      doc.text(`... and ${game.players.length - 20} more players`, 50, doc.y + 20);
    }

    // Footer
    doc.fontSize(8)
       .text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
         align: 'center'
       });

    doc.end();

  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Helper functions
async function getGamesPerDay(userId: string, startDate: Date) {
  const games = await prisma.gameSession.findMany({
    where: {
      hostId: userId,
      createdAt: { gte: startDate }
    },
    select: { createdAt: true }
  });

  const gamesPerDay: { [key: string]: number } = {};
  games.forEach(game => {
    const date = game.createdAt.toISOString().split('T')[0];
    gamesPerDay[date] = (gamesPerDay[date] || 0) + 1;
  });

  return Object.entries(gamesPerDay).map(([date, count]) => ({ date, count }));
}

async function getPopularQuizzes(userId: string, startDate: Date) {
  const quizzes = await prisma.quiz.findMany({
    where: { createdBy: userId },
    include: {
      gameSessions: {
        where: { createdAt: { gte: startDate } },
        select: { id: true }
      }
    },
    orderBy: {
      gameSessions: { _count: 'desc' }
    },
    take: 5
  });

  return quizzes.map(quiz => ({
    id: quiz.id,
    title: quiz.title,
    gamesCount: quiz.gameSessions.length
  }));
}

async function getQuizPopularityTrend(quizId: string) {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const games = await prisma.gameSession.findMany({
    where: {
      quizId: quizId,
      createdAt: { gte: last30Days }
    },
    select: { createdAt: true }
  });

  const trend: { [key: string]: number } = {};
  games.forEach(game => {
    const date = game.createdAt.toISOString().split('T')[0];
    trend[date] = (trend[date] || 0) + 1;
  });

  return Object.entries(trend).map(([date, count]) => ({ date, count }));
}

export default router; 