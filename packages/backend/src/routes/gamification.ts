import express from 'express';
import { supabaseAuthMiddleware } from '../middleware/supabaseAuth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Avatar Management Routes
router.get('/avatars', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const [availableAvatars, userAvatars] = await Promise.all([
      prisma.avatar.findMany({
        where: { isActive: true },
        orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
      }),
      prisma.userAvatar.findMany({
        where: { userId },
        include: { avatar: true }
      })
    ]);

    const userAvatarIds = userAvatars.map(ua => ua.avatarId);
    const avatarsWithOwnership = availableAvatars.map(avatar => ({
      ...avatar,
      isOwned: userAvatarIds.includes(avatar.id),
      isEquipped: userAvatars.find(ua => ua.avatarId === avatar.id && ua.isEquipped) !== undefined
    }));

    res.json({
      success: true,
      data: avatarsWithOwnership
    });
  } catch (error) {
    console.error('Get avatars error:', error);
    res.status(500).json({ error: 'Failed to get avatars' });
  }
});

router.post('/avatars/:avatarId/unlock', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { avatarId } = req.params;

    // Check if avatar exists and is available
    const avatar = await prisma.avatar.findFirst({
      where: { id: avatarId, isActive: true }
    });

    if (!avatar) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    // Check if user already owns this avatar
    const existingUserAvatar = await prisma.userAvatar.findFirst({
      where: { userId, avatarId }
    });

    if (existingUserAvatar) {
      return res.status(400).json({ error: 'Avatar already owned' });
    }

    // Check if user has enough XP
    const playerXP = await prisma.playerXP.findUnique({
      where: { userId }
    });

    if (!playerXP || playerXP.currentXP < avatar.cost) {
      return res.status(400).json({ error: 'Insufficient XP' });
    }

    // Unlock avatar and deduct XP
    await prisma.$transaction([
      prisma.userAvatar.create({
        data: {
          userId,
          avatarId,
          isEquipped: false
        }
      }),
      prisma.playerXP.update({
        where: { userId },
        data: { currentXP: playerXP.currentXP - avatar.cost }
      }),
      prisma.xPTransaction.create({
        data: {
          userId,
          amount: -avatar.cost,
          source: 'SOCIAL_INTERACTION',
          reason: `Unlocked avatar: ${avatar.name}`
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Avatar unlocked successfully'
    });
  } catch (error) {
    console.error('Unlock avatar error:', error);
    res.status(500).json({ error: 'Failed to unlock avatar' });
  }
});

router.post('/avatars/:avatarId/equip', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { avatarId } = req.params;

    // Check if user owns this avatar
    const userAvatar = await prisma.userAvatar.findFirst({
      where: { userId, avatarId }
    });

    if (!userAvatar) {
      return res.status(404).json({ error: 'Avatar not owned' });
    }

    // Unequip current avatar and equip new one
    await prisma.$transaction([
      prisma.userAvatar.updateMany({
        where: { userId, isEquipped: true },
        data: { isEquipped: false }
      }),
      prisma.userAvatar.update({
        where: { id: userAvatar.id },
        data: { isEquipped: true }
      })
    ]);

    res.json({
      success: true,
      message: 'Avatar equipped successfully'
    });
  } catch (error) {
    console.error('Equip avatar error:', error);
    res.status(500).json({ error: 'Failed to equip avatar' });
  }
});

// XP System Routes
router.get('/xp', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;

    let playerXP = await prisma.playerXP.findUnique({
      where: { userId },
      include: {
        xpTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    // Create XP record if it doesn't exist
    if (!playerXP) {
      playerXP = await prisma.playerXP.create({
        data: {
          userId,
          currentXP: 0,
          level: 1,
          totalXPEarned: 0,
          xpToNextLevel: 100
        },
        include: {
          xpTransactions: true
        }
      });
    }

    res.json({
      success: true,
      data: playerXP
    });
  } catch (error) {
    console.error('Get XP error:', error);
    res.status(500).json({ error: 'Failed to get XP data' });
  }
});

router.post('/xp/award', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { amount, source, reason, gameId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid XP amount' });
    }

    let playerXP = await prisma.playerXP.findUnique({
      where: { userId }
    });

    if (!playerXP) {
      playerXP = await prisma.playerXP.create({
        data: {
          userId,
          currentXP: 0,
          level: 1,
          totalXPEarned: 0,
          xpToNextLevel: 100
        }
      });
    }

    const newCurrentXP = playerXP.currentXP + amount;
    const newTotalXP = playerXP.totalXPEarned + amount;
    
    // Calculate level progression
    let newLevel = playerXP.level;
    let xpToNextLevel = playerXP.xpToNextLevel;
    let remainingXP = newCurrentXP;

    while (remainingXP >= xpToNextLevel) {
      remainingXP -= xpToNextLevel;
      newLevel++;
      xpToNextLevel = calculateXPToNextLevel(newLevel);
    }

    // Update XP and create transaction
    await prisma.$transaction([
      prisma.playerXP.update({
        where: { userId },
        data: {
          currentXP: newCurrentXP,
          level: newLevel,
          totalXPEarned: newTotalXP,
          xpToNextLevel: xpToNextLevel - remainingXP,
          lastXPGain: new Date()
        }
      }),
      prisma.xPTransaction.create({
        data: {
          userId,
          amount,
          source: source || 'QUIZ_COMPLETION',
          reason: reason || 'XP awarded',
          gameId
        }
      })
    ]);

    // Check for level-up achievements
    if (newLevel > playerXP.level) {
      await checkLevelUpAchievements(userId, newLevel);
    }

    res.json({
      success: true,
      data: {
        currentXP: newCurrentXP,
        level: newLevel,
        leveledUp: newLevel > playerXP.level,
        xpGained: amount
      }
    });
  } catch (error) {
    console.error('Award XP error:', error);
    res.status(500).json({ error: 'Failed to award XP' });
  }
});

// Power-ups Routes
router.get('/powerups', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;

    const [availablePowerUps, userPowerUps] = await Promise.all([
      prisma.powerUp.findMany({
        where: { isActive: true },
        orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
      }),
      prisma.userPowerUp.findMany({
        where: { userId },
        include: { powerUp: true }
      })
    ]);

    const powerUpsWithQuantity = availablePowerUps.map(powerUp => {
      const userPowerUp = userPowerUps.find(up => up.powerUpId === powerUp.id);
      return {
        ...powerUp,
        quantity: userPowerUp?.quantity || 0
      };
    });

    res.json({
      success: true,
      data: powerUpsWithQuantity
    });
  } catch (error) {
    console.error('Get power-ups error:', error);
    res.status(500).json({ error: 'Failed to get power-ups' });
  }
});

router.post('/powerups/:powerUpId/purchase', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { powerUpId } = req.params;
    const { quantity = 1 } = req.body;

    // Check if power-up exists
    const powerUp = await prisma.powerUp.findFirst({
      where: { id: powerUpId, isActive: true }
    });

    if (!powerUp) {
      return res.status(404).json({ error: 'Power-up not found' });
    }

    // Check if user has enough XP
    const playerXP = await prisma.playerXP.findUnique({
      where: { userId }
    });

    const totalCost = powerUp.cost * quantity;
    if (!playerXP || playerXP.currentXP < totalCost) {
      return res.status(400).json({ error: 'Insufficient XP' });
    }

    // Purchase power-up
    await prisma.$transaction([
      prisma.userPowerUp.upsert({
        where: {
          userId_powerUpId: { userId, powerUpId }
        },
        create: {
          userId,
          powerUpId,
          quantity
        },
        update: {
          quantity: { increment: quantity }
        }
      }),
      prisma.playerXP.update({
        where: { userId },
        data: { currentXP: playerXP.currentXP - totalCost }
      }),
      prisma.xPTransaction.create({
        data: {
          userId,
          amount: -totalCost,
          source: 'POWER_UP_USE',
          reason: `Purchased ${quantity}x ${powerUp.name}`
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Power-up purchased successfully'
    });
  } catch (error) {
    console.error('Purchase power-up error:', error);
    res.status(500).json({ error: 'Failed to purchase power-up' });
  }
});

router.post('/powerups/:powerUpId/use', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { powerUpId } = req.params;
    const { gameId, questionIndex } = req.body;

    // Check if user has this power-up
    const userPowerUp = await prisma.userPowerUp.findFirst({
      where: { userId, powerUpId, quantity: { gt: 0 } },
      include: { powerUp: true }
    });

    if (!userPowerUp) {
      return res.status(400).json({ error: 'Power-up not available' });
    }

    // Use power-up
    await prisma.$transaction([
      prisma.userPowerUp.update({
        where: { id: userPowerUp.id },
        data: { quantity: { decrement: 1 } }
      }),
      prisma.powerUpUsage.create({
        data: {
          userId,
          powerUpId,
          gameId,
          questionIndex,
          effectApplied: userPowerUp.powerUp.effects
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        powerUp: userPowerUp.powerUp,
        effects: userPowerUp.powerUp.effects
      }
    });
  } catch (error) {
    console.error('Use power-up error:', error);
    res.status(500).json({ error: 'Failed to use power-up' });
  }
});

// Achievements Routes
router.get('/achievements', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;

    const [achievements, userAchievements] = await Promise.all([
      prisma.achievement.findMany({
        where: { isActive: true },
        orderBy: [{ tier: 'asc' }, { name: 'asc' }]
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true }
      })
    ]);

    const achievementsWithProgress = achievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
      return {
        ...achievement,
        progress: userAchievement?.progress || 0,
        maxProgress: userAchievement?.maxProgress || 100,
        isCompleted: userAchievement?.isCompleted || false,
        completedAt: userAchievement?.completedAt,
        isHidden: achievement.isHidden && !userAchievement
      };
    }).filter(achievement => !achievement.isHidden);

    res.json({
      success: true,
      data: achievementsWithProgress
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

// Reactions Routes
router.get('/reactions', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get player level to filter available reactions
    const playerXP = await prisma.playerXP.findUnique({
      where: { userId }
    });

    const playerLevel = playerXP?.level || 1;

    const reactions = await prisma.reaction.findMany({
      where: {
        isActive: true,
        unlockLevel: { lte: playerLevel }
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    res.json({
      success: true,
      data: reactions
    });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ error: 'Failed to get reactions' });
  }
});

router.post('/reactions/:reactionId/use', supabaseAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { reactionId } = req.params;
    const { gameId, questionIndex } = req.body;

    // Check if reaction exists and user can use it
    const reaction = await prisma.reaction.findFirst({
      where: { id: reactionId, isActive: true }
    });

    if (!reaction) {
      return res.status(404).json({ error: 'Reaction not found' });
    }

    // Get player to check if they're in the game
    const gamePlayer = await prisma.gamePlayer.findFirst({
      where: { userId, gameId }
    });

    if (!gamePlayer) {
      return res.status(400).json({ error: 'Player not in game' });
    }

    // Record reaction usage
    await prisma.gameReaction.create({
      data: {
        gameId,
        playerId: gamePlayer.id,
        reactionId,
        questionIndex
      }
    });

    res.json({
      success: true,
      message: 'Reaction used successfully'
    });
  } catch (error) {
    console.error('Use reaction error:', error);
    res.status(500).json({ error: 'Failed to use reaction' });
  }
});

// Leaderboards Route
router.get('/leaderboards', supabaseAuthMiddleware, async (req, res) => {
  try {
    const { type = 'xp', timeframe = 'all' } = req.query;

    let orderBy: any = {};
    let include: any = {};

    switch (type) {
      case 'xp':
        orderBy = { totalXPEarned: 'desc' };
        include = {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        };
        break;
      case 'level':
        orderBy = { level: 'desc' };
        include = {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        };
        break;
      default:
        return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    const leaderboard = await prisma.playerXP.findMany({
      include,
      orderBy,
      take: 100
    });

    res.json({
      success: true,
      data: leaderboard.map((entry, index) => ({
        rank: index + 1,
        user: entry.user,
        level: entry.level,
        totalXP: entry.totalXPEarned,
        currentXP: entry.currentXP
      }))
    });
  } catch (error) {
    console.error('Get leaderboards error:', error);
    res.status(500).json({ error: 'Failed to get leaderboards' });
  }
});

// Helper Functions
function calculateXPToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

async function checkLevelUpAchievements(userId: string, newLevel: number) {
  // Check for level milestone achievements
  const levelMilestones = [5, 10, 25, 50, 100];
  
  for (const milestone of levelMilestones) {
    if (newLevel >= milestone) {
      const achievement = await prisma.achievement.findFirst({
        where: {
          name: `Level ${milestone} Master`,
          isActive: true
        }
      });

      if (achievement) {
        await prisma.userAchievement.upsert({
          where: {
            userId_achievementId: { userId, achievementId: achievement.id }
          },
          create: {
            userId,
            achievementId: achievement.id,
            progress: 100,
            maxProgress: 100,
            isCompleted: true,
            completedAt: new Date()
          },
          update: {
            progress: 100,
            isCompleted: true,
            completedAt: new Date()
          }
        });

        // Award XP bonus for achievement
        if (achievement.xpReward > 0) {
          await prisma.playerXP.update({
            where: { userId },
            data: {
              currentXP: { increment: achievement.xpReward },
              totalXPEarned: { increment: achievement.xpReward }
            }
          });
        }
      }
    }
  }
}

export default router; 