import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  rarity: string;
  unlockCriteria: any;
  cost: number;
  isDefault: boolean;
  isOwned?: boolean;
  isEquipped?: boolean;
}

export interface XPData {
  id: string;
  currentXP: number;
  level: number;
  totalXPEarned: number;
  xpToNextLevel: number;
  prestige: number;
  weeklyXP: number;
  monthlyXP: number;
  lastXPGain: string | null;
  xpMultiplier: number;
  xpTransactions: XPTransaction[];
}

export interface XPTransaction {
  id: string;
  amount: number;
  source: string;
  reason: string;
  gameId?: string;
  createdAt: string;
}

export interface PowerUp {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  rarity: string;
  cost: number;
  cooldown: number;
  duration: number;
  effects: any;
  quantity?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  tier: string;
  criteria: any;
  xpReward: number;
  badgeReward?: string;
  powerUpReward?: string;
  isHidden: boolean;
  progress?: number;
  maxProgress?: number;
  isCompleted?: boolean;
  completedAt?: string;
}

export interface Reaction {
  id: string;
  name: string;
  emoji: string;
  imageUrl?: string;
  soundUrl?: string;
  category: string;
  unlockLevel: number;
  isDefault: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  level: number;
  totalXP: number;
  currentXP: number;
}

export const gamificationApi = {
  // Avatar Management
  getAvatars: async (token: string) => {
    const response = await api.get<{ success: boolean; data: Avatar[] }>(
      '/gamification/avatars',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  unlockAvatar: async (token: string, avatarId: string) => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/gamification/avatars/${avatarId}/unlock`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  equipAvatar: async (token: string, avatarId: string) => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/gamification/avatars/${avatarId}/equip`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // XP System
  getXP: async (token: string) => {
    const response = await api.get<{ success: boolean; data: XPData }>(
      '/gamification/xp',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  awardXP: async (
    token: string, 
    amount: number, 
    source: string, 
    reason: string, 
    gameId?: string
  ) => {
    const response = await api.post<{ 
      success: boolean; 
      data: {
        currentXP: number;
        level: number;
        leveledUp: boolean;
        xpGained: number;
      }
    }>(
      '/gamification/xp/award',
      { amount, source, reason, gameId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Power-ups
  getPowerUps: async (token: string) => {
    const response = await api.get<{ success: boolean; data: PowerUp[] }>(
      '/gamification/powerups',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  purchasePowerUp: async (token: string, powerUpId: string, quantity: number = 1) => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/gamification/powerups/${powerUpId}/purchase`,
      { quantity },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  usePowerUp: async (
    token: string, 
    powerUpId: string, 
    gameId: string, 
    questionIndex?: number
  ) => {
    const response = await api.post<{ 
      success: boolean; 
      data: { powerUp: PowerUp; effects: any } 
    }>(
      `/gamification/powerups/${powerUpId}/use`,
      { gameId, questionIndex },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Achievements
  getAchievements: async (token: string) => {
    const response = await api.get<{ success: boolean; data: Achievement[] }>(
      '/gamification/achievements',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Reactions
  getReactions: async (token: string) => {
    const response = await api.get<{ success: boolean; data: Reaction[] }>(
      '/gamification/reactions',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  useReaction: async (
    token: string, 
    reactionId: string, 
    gameId: string, 
    questionIndex?: number
  ) => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/gamification/reactions/${reactionId}/use`,
      { gameId, questionIndex },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Leaderboards
  getLeaderboards: async (
    token: string, 
    type: 'xp' | 'level' = 'xp', 
    timeframe: 'all' | 'weekly' | 'monthly' = 'all'
  ) => {
    const response = await api.get<{ success: boolean; data: LeaderboardEntry[] }>(
      `/gamification/leaderboards?type=${type}&timeframe=${timeframe}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Utility functions
  calculateXPForLevel: (level: number): number => {
    return Math.floor(100 * Math.pow(1.2, level - 1));
  },

  getLevelFromXP: (totalXP: number): number => {
    let level = 1;
    let xpRequired = 0;
    
    while (xpRequired <= totalXP) {
      xpRequired += gamificationApi.calculateXPForLevel(level);
      if (xpRequired <= totalXP) {
        level++;
      }
    }
    
    return level;
  },

  getXPProgress: (currentXP: number, level: number): number => {
    const xpForCurrentLevel = gamificationApi.calculateXPForLevel(level);
    const xpForPreviousLevel = level > 1 ? gamificationApi.calculateXPForLevel(level - 1) : 0;
    const xpInCurrentLevel = currentXP - xpForPreviousLevel;
    
    return Math.min((xpInCurrentLevel / xpForCurrentLevel) * 100, 100);
  },
}; 