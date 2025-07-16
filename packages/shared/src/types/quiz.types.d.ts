export declare enum QuestionType {
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
    CHECKBOX = "CHECKBOX",
    TRUE_FALSE = "TRUE_FALSE",
    SHORT_ANSWER = "SHORT_ANSWER",
    FILL_IN_BLANK = "FILL_IN_BLANK",
    MATCHING = "MATCHING",
    ORDERING = "ORDERING"
}
export declare enum DifficultyLevel {
    EASY = "EASY",
    MEDIUM = "MEDIUM",
    HARD = "HARD"
}
export declare enum QuizVisibility {
    PUBLIC = "PUBLIC",
    PRIVATE = "PRIVATE",
    SCHOOL_ONLY = "SCHOOL_ONLY",
    CLASS_ONLY = "CLASS_ONLY"
}
export declare enum QuizStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    ARCHIVED = "ARCHIVED"
}
export interface MediaFile {
    id: string;
    type: 'image' | 'audio' | 'video';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    duration?: number;
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
    description?: string;
    media?: MediaFile;
    timeLimit: number;
    points: number;
    difficulty: DifficultyLevel;
    tags: string[];
    options?: QuestionOption[];
    correctAnswers?: string[];
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
    estimatedTime: number;
    tags: string[];
    isPublic: boolean;
    allowCopyByOthers: boolean;
    collaborators: string[];
    totalPlays: number;
    averageScore: number;
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
    timeMultiplier: number;
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
    difficulty: number;
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
//# sourceMappingURL=quiz.types.d.ts.map