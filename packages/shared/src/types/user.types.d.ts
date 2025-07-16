export declare enum UserRole {
    STUDENT = "STUDENT",
    TEACHER = "TEACHER",
    ADMIN = "ADMIN"
}
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED"
}
export interface User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    avatar?: string;
    grade?: string;
    school?: string;
    subjects?: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface UserProfile {
    id: string;
    userId: string;
    bio?: string;
    dateOfBirth?: Date;
    country?: string;
    timezone?: string;
    language?: string;
    preferences: UserPreferences;
}
export interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    notifications: {
        email: boolean;
        push: boolean;
        gameInvites: boolean;
        quizUpdates: boolean;
    };
    privacy: {
        showProfile: boolean;
        showStats: boolean;
    };
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
    role: UserRole;
    grade?: string;
    school?: string;
}
export interface AuthResponse {
    user: User;
    tokens: AuthTokens;
}
export interface Class {
    id: string;
    name: string;
    description?: string;
    teacherId: string;
    teacher: User;
    students: User[];
    inviteCode: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface School {
    id: string;
    name: string;
    domain?: string;
    country?: string;
    timezone?: string;
    logo?: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=user.types.d.ts.map