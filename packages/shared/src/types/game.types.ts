import { Question, Quiz } from './quiz.types';
import type { User } from './user.types';

export enum GameMode {
  LIVE = 'LIVE',           // Teacher-hosted live session
  HOMEWORK = 'HOMEWORK',   // Self-paced assignment
  PRACTICE = 'PRACTICE',   // Individual practice mode
  TOURNAMENT = 'TOURNAMENT' // Competitive tournament
}

export enum GameStatus {
  WAITING = 'WAITING',     // Waiting for players to join
  STARTING = 'STARTING',   // Game is about to start
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED'
}

export enum PlayerStatus {
  JOINED = 'JOINED',
  READY = 'READY',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
  DISCONNECTED = 'DISCONNECTED',
  KICKED = 'KICKED'
}

export enum PowerUpType {
  FIFTY_FIFTY = '50_50',           // Remove 2 wrong answers
  TIME_FREEZE = 'TIME_FREEZE',     // Stop timer for everyone
  DOUBLE_POINTS = 'DOUBLE_POINTS', // Double points for next question
  SKIP_QUESTION = 'SKIP_QUESTION', // Skip current question
  REVEAL_ANSWER = 'REVEAL_ANSWER', // Show correct answer
  EXTRA_TIME = 'EXTRA_TIME',       // Add 10 seconds
  STREAK_SAVER = 'STREAK_SAVER',   // Protect current streak
  POINT_STEALER = 'POINT_STEALER'  // Steal points from leader
}

export interface PowerUp {
  type: PowerUpType;
  name: string;
  description: string;
  cost: number; // in game points or coins
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  cooldown?: number; // in seconds
}

export interface GamePlayer {
  id: string;
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  status: PlayerStatus;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  streak: number;
  longestStreak: number;
  averageTime: number;
  powerUpsUsed: PowerUpType[];
  powerUpsAvailable: PowerUpType[];
  position: number;
  isBot?: boolean;
  joinedAt: Date;
  lastSeen: Date;
}

export interface PlayerAnswer {
  playerId: string;
  questionId: string;
  selectedOptions?: string[]; // for MCQ, checkbox
  textAnswer?: string;        // for short answer, fill in blank
  timeSpent: number;          // in milliseconds
  pointsEarned: number;
  isCorrect: boolean;
  powerUpUsed?: PowerUpType;
  submittedAt: Date;
}

export interface QuestionResult {
  questionId: string;
  question: Question;
  answers: PlayerAnswer[];
  correctAnswers: string[];
  statistics: {
    totalAnswers: number;
    correctCount: number;
    incorrectCount: number;
    averageTime: number;
    fastestTime: number;
    slowestTime: number;
  };
  leaderboard: {
    playerId: string;
    username: string;
    score: number;
    timeSpent: number;
    isCorrect: boolean;
  }[];
}

export interface GameSession {
  id: string;
  pin: string;
  hostId: string;
  host: User;
  quiz: Quiz;
  mode: GameMode;
  status: GameStatus;
  players: GamePlayer[];
  maxPlayers: number;
  currentQuestionIndex: number;
  currentQuestion?: Question;
  questionStartTime?: Date;
  questionEndTime?: Date;
  totalQuestions: number;
  settings: GameSettings;
  results: QuestionResult[];
  finalLeaderboard: FinalLeaderboard[];
  analytics: GameAnalytics;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameSettings {
  allowLateJoin: boolean;
  showLeaderboard: boolean;
  showAnswerExplanations: boolean;
  enablePowerUps: boolean;
  enableChat: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  autoAdvance: boolean;
  showCorrectAnswers: boolean;
  backgroundMusic: boolean;
  soundEffects: boolean;
  theme?: string;
  lobbyMusic?: string;
  questionTransition: 'instant' | 'fade' | 'slide';
  celebrationAnimation: boolean;
}

export interface FinalLeaderboard {
  rank: number;
  playerId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  totalScore: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTime: number;
  longestStreak: number;
  powerUpsUsed: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'achievement' | 'streak' | 'speed' | 'accuracy' | 'participation';
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedAt: Date;
}

export interface GameAnalytics {
  gameId: string;
  totalPlayers: number;
  completionRate: number;
  averageScore: number;
  averageTime: number;
  questionAnalytics: {
    questionId: string;
    difficulty: number;
    averageTime: number;
    correctPercentage: number;
    skipRate: number;
  }[];
  playerEngagement: {
    joinRate: number;
    dropOffRate: number;
    averageSessionTime: number;
  };
  powerUpUsage: {
    type: PowerUpType;
    timesUsed: number;
    effectiveness: number;
  }[];
}

export interface GameInvitation {
  id: string;
  gameId: string;
  senderId: string;
  recipientId?: string;
  recipientEmail?: string;
  classId?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

// Real-time events
export interface GameEvent {
  type: GameEventType;
  gameId: string;
  data: any;
  timestamp: Date;
}

export enum GameEventType {
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  PLAYER_READY = 'PLAYER_READY',
  GAME_STARTED = 'GAME_STARTED',
  QUESTION_STARTED = 'QUESTION_STARTED',
  QUESTION_ENDED = 'QUESTION_ENDED',
  TIMER_UPDATE = 'TIMER_UPDATE',
  TIMER_WARNING = 'TIMER_WARNING',
  ANSWER_SUBMITTED = 'ANSWER_SUBMITTED',
  POWER_UP_USED = 'POWER_UP_USED',
  LEADERBOARD_UPDATED = 'LEADERBOARD_UPDATED',
  SCORE_UPDATE = 'SCORE_UPDATE',
  STREAK_UPDATE = 'STREAK_UPDATE',
  GAME_PAUSED = 'GAME_PAUSED',
  GAME_RESUMED = 'GAME_RESUMED',
  GAME_ENDED = 'GAME_ENDED',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  HOST_MESSAGE = 'HOST_MESSAGE'
}

export interface ChatMessage {
  id: string;
  gameId: string;
  senderId: string;
  senderName: string;
  message: string;
  type: 'player' | 'host' | 'system';
  timestamp: Date;
}

// Homework/Assignment specific types
export interface Assignment {
  id: string;
  title: string;
  description?: string;
  quizId: string;
  quiz: Quiz;
  teacherId: string;
  teacher: User;
  classId?: string;
  studentIds: string[];
  dueDate?: Date;
  attempts: number; // max attempts allowed
  showCorrectAnswers: boolean;
  allowLateSubmission: boolean;
  timeLimit?: number; // in minutes
  settings: GameSettings;
  submissions: AssignmentSubmission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  student: User;
  gameSessionId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in minutes
  attempt: number;
  answers: PlayerAnswer[];
  submittedAt: Date;
  isLate: boolean;
} 