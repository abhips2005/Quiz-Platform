export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchFilters {
  query?: string;
  subjects?: string[];
  grades?: string[];
  difficulty?: string[];
  tags?: string[];
  creators?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  isPublic?: boolean;
  sortBy?: 'created' | 'updated' | 'popular' | 'rating' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationSettings {
  gameStarted: boolean;
  playerJoined: boolean;
  assignmentDue: boolean;
  newQuizShared: boolean;
  achievementEarned: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export enum NotificationType {
  GAME_INVITATION = 'GAME_INVITATION',
  ASSIGNMENT_DUE = 'ASSIGNMENT_DUE',
  QUIZ_SHARED = 'QUIZ_SHARED',
  ACHIEVEMENT_EARNED = 'ACHIEVEMENT_EARNED',
  GAME_STARTED = 'GAME_STARTED',
  RESULTS_AVAILABLE = 'RESULTS_AVAILABLE',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  WELCOME = 'WELCOME'
}

export interface UploadProgress {
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface FileUploadResponse {
  success: boolean;
  file?: {
    id: string;
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  };
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: ValidationError[];
  code?: string;
  timestamp: Date;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
    websocket: 'healthy' | 'unhealthy';
  };
  metrics: {
    uptime: number;
    memory: number;
    cpu: number;
    connections: number;
  };
}

export interface SystemConfiguration {
  features: {
    googleOAuth: boolean;
    microsoftOAuth: boolean;
    fileUploads: boolean;
    realTimeChat: boolean;
    powerUps: boolean;
    analytics: boolean;
    monetization: boolean;
  };
  limits: {
    maxFileSize: number; // in bytes
    maxPlayersPerGame: number;
    maxQuestionsPerQuiz: number;
    maxQuizzesPerUser: number;
    maxClassSize: number;
  };
  security: {
    passwordMinLength: number;
    sessionTimeout: number; // in minutes
    maxLoginAttempts: number;
    rateLimits: {
      api: number; // requests per minute
      auth: number; // login attempts per hour
      upload: number; // uploads per hour
    };
  };
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    heading: string;
    body: string;
    monospace: string;
  };
  borderRadius: string;
  shadows: {
    small: string;
    medium: string;
    large: string;
  };
  isCustom: boolean;
  createdAt: Date;
}

export interface SocketEvent<T = any> {
  event: string;
  data: T;
  timestamp: Date;
  userId?: string;
  gameId?: string;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// API endpoint types
export interface LoginEndpoint {
  path: '/auth/login';
  method: 'POST';
  body: { email: string; password: string };
  response: ApiResponse<{ user: any; tokens: any }>;
}

export interface RegisterEndpoint {
  path: '/auth/register';
  method: 'POST';
  body: { email: string; password: string; firstName: string; lastName: string; username: string; role: string };
  response: ApiResponse<{ user: any; tokens: any }>;
}

// Constants
export const SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Geography',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Art',
  'Music',
  'Physical Education',
  'Foreign Language',
  'Social Studies',
  'Other'
] as const;

export const GRADES = [
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
  'University',
  'Adult'
] as const;

export const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Japan',
  'South Korea',
  'China',
  'India',
  'Brazil',
  'Mexico',
  'Other'
] as const;

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland'
] as const; 