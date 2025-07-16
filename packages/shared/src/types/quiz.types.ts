export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  CHECKBOX = 'CHECKBOX',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  FILL_IN_BLANK = 'FILL_IN_BLANK',
  MATCHING = 'MATCHING',
  ORDERING = 'ORDERING'
}

export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum QuizVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  SCHOOL_ONLY = 'SCHOOL_ONLY',
  CLASS_ONLY = 'CLASS_ONLY'
}

export enum QuizStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export interface MediaFile {
  id: string;
  type: 'image' | 'audio' | 'video';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  duration?: number; // for audio/video in seconds
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
  media?: MediaFile;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  question: string; // alias for title for backward compatibility
  description?: string;
  media?: MediaFile;
  timeLimit: number; // in seconds
  points: number;
  difficulty: DifficultyLevel;
  tags: string[];
  options?: QuestionOption[]; // for MCQ, checkbox
  correctAnswers?: string[]; // for short answer, fill in blank
  correctAnswer?: string; // backward compatibility for single correct answer
  acceptedAnswers?: string[]; // accepted alternative answers
  caseSensitive?: boolean;
  partialCredit?: boolean;
  explanation?: string;
  hints?: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  coverImage?: MediaFile;
  creatorId: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar?: string;
  };
  questions: Question[];
  settings: QuizSettings;
  visibility: QuizVisibility;
  status: QuizStatus;
  subject?: string;
  grade?: string;
  estimatedTime: number; // in minutes
  tags: string[];
  isPublic: boolean;
  allowCopyByOthers: boolean;
  collaborators: string[]; // user IDs
  totalPlays: number;
  averageScore: number;
  // Backward compatibility properties
  difficulty?: DifficultyLevel;
  timePerQuestion?: number;
  showAnswers?: boolean;
  randomizeQuestions?: boolean;
  _count?: {
    games?: number;
    questions?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizSettings {
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showCorrectAnswers: boolean;
  showAnswerExplanations: boolean;
  allowReviewAnswers: boolean;
  showLeaderboard: boolean;
  enablePowerUps: boolean;
  musicEnabled: boolean;
  backgroundMusic?: string;
  theme?: string;
  pointsPerQuestion: number;
  timeMultiplier: number; // for speed bonus
  negativeMarking: boolean;
  showProgressBar: boolean;
  exitScreenRequired: boolean;
}

export interface QuizStats {
  id: string;
  quizId: string;
  totalAttempts: number;
  averageScore: number;
  averageTime: number;
  completionRate: number;
  questionStats: QuestionStats[];
  topPerformers: {
    userId: string;
    username: string;
    score: number;
    time: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionStats {
  questionId: string;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedAnswers: number;
  averageTime: number;
  difficulty: number; // calculated difficulty based on performance
}

export interface QuizCollection {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  quizIds: string[];
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
  settings: QuizSettings;
  isOfficial: boolean;
  createdAt: Date;
  updatedAt: Date;
} 