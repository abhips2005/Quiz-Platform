export interface UserAnalytics {
  userId: string;
  totalQuizzesPlayed: number;
  totalQuizzesCreated: number;
  averageScore: number;
  totalTimeSpent: number; // in minutes
  longestStreak: number;
  favoriteSubjects: string[];
  skillLevels: {
    subject: string;
    level: number; // 0-100
    trend: 'improving' | 'stable' | 'declining';
  }[];
  achievements: {
    id: string;
    name: string;
    earnedAt: Date;
  }[];
  weeklyActivity: {
    week: string; // ISO week
    quizzesPlayed: number;
    timeSpent: number;
    averageScore: number;
  }[];
  monthlyProgress: {
    month: string; // YYYY-MM
    improvement: number; // percentage
    goals: {
      target: number;
      achieved: number;
    };
  }[];
}

export interface TeacherAnalytics {
  teacherId: string;
  totalStudents: number;
  totalQuizzes: number;
  totalGamesSessions: number;
  classPerformance: {
    classId: string;
    className: string;
    averageScore: number;
    engagement: number; // 0-100
    improvement: number; // percentage
    strugglingStudents: {
      studentId: string;
      studentName: string;
      averageScore: number;
      subjects: string[];
    }[];
    topPerformers: {
      studentId: string;
      studentName: string;
      averageScore: number;
      subjects: string[];
    }[];
  }[];
  subjectAnalytics: {
    subject: string;
    totalQuizzes: number;
    averageScore: number;
    difficultTopics: {
      topic: string;
      successRate: number;
      questionsAsked: number;
    }[];
  }[];
  engagementMetrics: {
    averageSessionLength: number;
    completionRate: number;
    participationRate: number;
    repeatPlayRate: number;
  };
}

export interface QuizPerformanceReport {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  uniquePlayers: number;
  averageScore: number;
  completionRate: number;
  averageTime: number;
  difficulty: number; // calculated based on performance
  questionBreakdown: {
    questionId: string;
    questionText: string;
    type: string;
    correctAnswers: number;
    incorrectAnswers: number;
    skipRate: number;
    averageTime: number;
    difficulty: number;
    commonWrongAnswers: {
      answer: string;
      count: number;
      percentage: number;
    }[];
  }[];
  performanceByDemographic: {
    grade?: {
      grade: string;
      averageScore: number;
      attempts: number;
    }[];
    school?: {
      school: string;
      averageScore: number;
      attempts: number;
    }[];
  };
  timeSeriesData: {
    date: string;
    attempts: number;
    averageScore: number;
  }[];
}

export interface ClassReport {
  classId: string;
  className: string;
  teacherId: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  studentPerformance: {
    studentId: string;
    studentName: string;
    quizzesCompleted: number;
    averageScore: number;
    timeSpent: number;
    improvement: number; // percentage
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }[];
  overallMetrics: {
    classSize: number;
    averageScore: number;
    completionRate: number;
    engagement: number;
    improvement: number;
  };
  subjectBreakdown: {
    subject: string;
    averageScore: number;
    questionsAnswered: number;
    timeSpent: number;
    topicPerformance: {
      topic: string;
      successRate: number;
    }[];
  }[];
  comparisonData: {
    schoolAverage?: number;
    gradeAverage?: number;
    globalAverage?: number;
  };
}

export interface PlatformAnalytics {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  totalQuizzes: number;
  totalGameSessions: number;
  totalQuestionsAnswered: number;
  userGrowth: {
    date: string;
    newUsers: number;
    totalUsers: number;
  }[];
  engagementMetrics: {
    averageSessionLength: number;
    bounceRate: number;
    retentionRate: {
      day1: number;
      day7: number;
      day30: number;
    };
  };
  popularContent: {
    quizzes: {
      id: string;
      title: string;
      plays: number;
      rating: number;
    }[];
    subjects: {
      name: string;
      quizCount: number;
      totalPlays: number;
    }[];
    creators: {
      userId: string;
      username: string;
      quizCount: number;
      totalPlays: number;
    }[];
  };
  technicalMetrics: {
    averageLoadTime: number;
    errorRate: number;
    uptimePercentage: number;
    peakConcurrentUsers: number;
  };
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel' | 'json';
  includeCharts: boolean;
  includeIndividualResults: boolean;
  includeAnswerDetails: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  filters?: {
    classes?: string[];
    students?: string[];
    subjects?: string[];
    quizzes?: string[];
  };
}

export interface LearningInsights {
  studentId: string;
  insights: {
    type: 'strength' | 'weakness' | 'improvement' | 'recommendation';
    category: string;
    message: string;
    confidence: number; // 0-100
    data: any;
  }[];
  predictiveAnalytics: {
    nextQuizPerformance: number;
    strugglingAreas: string[];
    recommendedTopics: string[];
    optimalStudyTime: number; // in minutes
  };
  goalTracking: {
    currentGoals: {
      id: string;
      description: string;
      target: number;
      current: number;
      deadline: Date;
    }[];
    completedGoals: {
      id: string;
      description: string;
      completedAt: Date;
      achievementLevel: 'bronze' | 'silver' | 'gold';
    }[];
  };
}

export interface RealtimeMetrics {
  timestamp: Date;
  activeGames: number;
  activePlayers: number;
  questionsAnsweredPerMinute: number;
  averageResponseTime: number;
  serverLoad: number;
  connectionHealth: {
    connected: number;
    disconnected: number;
    errors: number;
  };
} 