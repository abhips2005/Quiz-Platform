import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface DashboardAnalytics {
  overview: {
    totalQuizzes: number;
    totalGames: number;
    totalStudents: number;
    averageAccuracy: number;
    averageGameDuration: number;
  };
  recentActivity: Array<{
    id: string;
    quizTitle: string;
    playerCount: number;
    status: string;
    createdAt: string;
  }>;
  trends: {
    gamesPerDay: Array<{ date: string; count: number }>;
    popularQuizzes: Array<{ id: string; title: string; gamesCount: number }>;
  };
}

export interface GameAnalytics {
  summary: {
    gameId: string;
    quizTitle: string;
    totalPlayers: number;
    completionRate: number;
    averageScore: number;
    totalQuestions: number;
    gameMode: string;
    duration: number;
    startedAt: string;
    endedAt: string | null;
  };
  questionAnalytics: Array<{
    questionId: string;
    question: string;
    type: string;
    totalAnswers: number;
    correctAnswers: number;
    accuracy: number;
    averageTime: number;
    difficulty: string;
    optionDistribution: Record<string, {
      count: number;
      percentage: number;
      isCorrect: boolean;
    }>;
  }>;
  playerAnalytics: Array<{
    playerId: string;
    user: {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    finalScore: number;
    rank: number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number;
    averageTime: number;
    longestStreak: number;
    questionBreakdown: Array<{
      questionId: string;
      question: string;
      isCorrect: boolean;
      timeSpent: number;
      pointsEarned: number;
      selectedAnswer: string[];
    }>;
  }>;
  gameAnalytics: any;
}

export interface QuizAnalytics {
  quiz: {
    id: string;
    title: string;
    description: string;
    totalQuestions: number;
    createdAt: string;
  };
  questionPerformance: Array<{
    questionId: string;
    question: string;
    type: string;
    timesAsked: number;
    totalAnswers: number;
    correctAnswers: number;
    accuracy: number;
    averageTime: number;
    difficultyRating: string;
  }>;
  usageStats: {
    totalGames: number;
    totalPlayers: number;
    averagePlayersPerGame: number;
    lastPlayed: string | null;
    popularityTrend: Array<{ date: string; count: number }>;
  };
  recentGames: Array<{
    id: string;
    playerCount: number;
    status: string;
    createdAt: string;
  }>;
}

export const analyticsApi = {
  // Get dashboard analytics
  getDashboardAnalytics: async (token: string, timeframe: string = '30') => {
    const response = await api.get<{ success: boolean; data: DashboardAnalytics }>(
      `/analytics/dashboard?timeframe=${timeframe}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get detailed game analytics
  getGameAnalytics: async (token: string, gameId: string) => {
    const response = await api.get<{ success: boolean; data: GameAnalytics }>(
      `/analytics/game/${gameId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get quiz performance analytics
  getQuizAnalytics: async (token: string, quizId: string) => {
    const response = await api.get<{ success: boolean; data: QuizAnalytics }>(
      `/analytics/quiz/${quizId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Export game data as CSV
  exportGameCSV: async (token: string, gameId: string) => {
    const response = await api.get(`/analytics/export/game/${gameId}/csv`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from response headers or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `game_${gameId}_results.csv`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Export game data as PDF
  exportGamePDF: async (token: string, gameId: string) => {
    const response = await api.get(`/analytics/export/game/${gameId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from response headers or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `game_${gameId}_report.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Get games list for analytics
  getGames: async (token: string, page: number = 1, limit: number = 20) => {
    const response = await api.get(
      `/games?page=${page}&limit=${limit}&analytics=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get quizzes list for analytics
  getQuizzes: async (token: string, page: number = 1, limit: number = 20) => {
    const response = await api.get(
      `/quizzes?page=${page}&limit=${limit}&analytics=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },
}; 