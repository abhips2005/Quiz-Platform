-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "QuizVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'SCHOOL_ONLY', 'CLASS_ONLY');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'CHECKBOX', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_IN_BLANK', 'MATCHING', 'ORDERING');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('LIVE', 'HOMEWORK', 'PRACTICE', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'STARTING', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('JOINED', 'READY', 'PLAYING', 'FINISHED', 'DISCONNECTED', 'KICKED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('PLAYER', 'HOST', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GAME_INVITATION', 'ASSIGNMENT_DUE', 'QUIZ_SHARED', 'ACHIEVEMENT_EARNED', 'GAME_STARTED', 'RESULTS_AVAILABLE', 'SYSTEM_UPDATE', 'WELCOME');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('ACHIEVEMENT', 'STREAK', 'SPEED', 'ACCURACY', 'PARTICIPATION');

-- CreateEnum
CREATE TYPE "BadgeRarity" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "AvatarCategory" AS ENUM ('CHARACTER', 'ANIMAL', 'FANTASY', 'ROBOT', 'SPORTS', 'ACADEMIC');

-- CreateEnum
CREATE TYPE "AvatarRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "XPSource" AS ENUM ('QUIZ_COMPLETION', 'CORRECT_ANSWER', 'SPEED_BONUS', 'STREAK_BONUS', 'DAILY_LOGIN', 'ACHIEVEMENT', 'POWER_UP_USE', 'SOCIAL_INTERACTION');

-- CreateEnum
CREATE TYPE "PowerUpType" AS ENUM ('TIME_BOOST', 'HINT_REVEAL', 'SKIP_QUESTION', 'DOUBLE_POINTS', 'FREEZE_OTHERS', 'EXTRA_LIFE', 'STREAK_SAVER', 'XP_MULTIPLIER');

-- CreateEnum
CREATE TYPE "PowerUpRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('ACCURACY', 'SPEED', 'STREAK', 'PARTICIPATION', 'MILESTONE', 'SOCIAL', 'EXPLORATION', 'MASTERY');

-- CreateEnum
CREATE TYPE "AchievementTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "ReactionCategory" AS ENUM ('CELEBRATION', 'DISAPPOINTMENT', 'SURPRISE', 'THINKING', 'CONFIDENT', 'FUNNY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatar" TEXT,
    "grade" TEXT,
    "school" TEXT,
    "subjects" TEXT[],
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "country" TEXT,
    "timezone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "notificationSettings" JSONB NOT NULL DEFAULT '{}',
    "privacySettings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "teacherId" TEXT NOT NULL,
    "schoolId" TEXT,
    "inviteCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_students" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageId" TEXT,
    "creatorId" TEXT NOT NULL,
    "visibility" "QuizVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "QuizStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "grade" TEXT,
    "estimatedTime" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "allowCopyByOthers" BOOLEAN NOT NULL DEFAULT false,
    "totalPlays" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "mediaId" TEXT,
    "timeLimit" INTEGER NOT NULL DEFAULT 30,
    "points" INTEGER NOT NULL DEFAULT 10,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "correctAnswers" TEXT[],
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "partialCredit" BOOLEAN NOT NULL DEFAULT false,
    "explanation" TEXT,
    "hints" TEXT[],
    "order" INTEGER NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT,
    "acceptedAnswers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "questionBankItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "explanation" TEXT,
    "mediaId" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "duration" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "mode" "GameMode" NOT NULL DEFAULT 'LIVE',
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "maxPlayers" INTEGER NOT NULL DEFAULT 100,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "questionStartTime" TIMESTAMP(3),
    "questionEndTime" TIMESTAMP(3),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_players" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PlayerStatus" NOT NULL DEFAULT 'JOINED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "incorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "powerUpsUsed" TEXT[],
    "powerUpsAvailable" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_answers" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptions" TEXT[],
    "textAnswer" TEXT,
    "timeSpent" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "powerUpUsed" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_results" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fastestTime" INTEGER NOT NULL DEFAULT 0,
    "slowestTime" INTEGER NOT NULL DEFAULT 0,
    "statistics" JSONB NOT NULL DEFAULT '{}',
    "leaderboard" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quizId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT,
    "studentIds" TEXT[],
    "dueDate" TIMESTAMP(3),
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT true,
    "allowLateSubmission" BOOLEAN NOT NULL DEFAULT false,
    "timeLimit" INTEGER,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gameSessionId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),
    "feedback" TEXT,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_invitations" (
    "id" TEXT NOT NULL,
    "gameId" TEXT,
    "assignmentId" TEXT,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientEmail" TEXT,
    "classId" TEXT,
    "message" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_analytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalQuizzesPlayed" INTEGER NOT NULL DEFAULT 0,
    "totalQuizzesCreated" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTimeSpent" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "favoriteSubjects" TEXT[],
    "skillLevels" JSONB NOT NULL DEFAULT '{}',
    "weeklyActivity" JSONB NOT NULL DEFAULT '[]',
    "monthlyProgress" JSONB NOT NULL DEFAULT '[]',
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_stats" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "uniquePlayers" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "topPerformers" JSONB NOT NULL DEFAULT '[]',
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_stats" (
    "id" TEXT NOT NULL,
    "quizStatsId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "incorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "skippedAnswers" INTEGER NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_analytics" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "totalPlayers" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "questionAnalytics" JSONB NOT NULL DEFAULT '[]',
    "playerEngagement" JSONB NOT NULL DEFAULT '{}',
    "powerUpUsage" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_performance_reports" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "generatedFor" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_performance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "type" "BadgeType" NOT NULL,
    "rarity" "BadgeRarity" NOT NULL,
    "criteria" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges_earned" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_earned_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatars" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "category" "AvatarCategory" NOT NULL,
    "rarity" "AvatarRarity" NOT NULL,
    "unlockCriteria" JSONB NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_avatars" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_xp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentXP" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalXPEarned" INTEGER NOT NULL DEFAULT 0,
    "xpToNextLevel" INTEGER NOT NULL DEFAULT 100,
    "prestige" INTEGER NOT NULL DEFAULT 0,
    "weeklyXP" INTEGER NOT NULL DEFAULT 0,
    "monthlyXP" INTEGER NOT NULL DEFAULT 0,
    "lastXPGain" TIMESTAMP(3),
    "xpMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_xp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "XPSource" NOT NULL,
    "reason" TEXT NOT NULL,
    "gameId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "power_ups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "type" "PowerUpType" NOT NULL,
    "rarity" "PowerUpRarity" NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "cooldown" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "effects" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "power_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_power_ups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "powerUpId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_power_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "power_up_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "powerUpId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "questionIndex" INTEGER,
    "effectApplied" JSONB NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "power_up_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "type" "AchievementType" NOT NULL,
    "tier" "AchievementTier" NOT NULL,
    "criteria" JSONB NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "badgeReward" TEXT,
    "powerUpReward" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "maxProgress" INTEGER NOT NULL DEFAULT 100,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "imageUrl" TEXT,
    "soundUrl" TEXT,
    "category" "ReactionCategory" NOT NULL,
    "unlockLevel" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_reactions" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "reactionId" TEXT NOT NULL,
    "questionIndex" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_collection_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "questions" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configurations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank_items" (
    "id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "correctAnswer" TEXT,
    "acceptedAnswers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "media" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_QuizCollaborator" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "classes_inviteCode_key" ON "classes"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "class_students_classId_studentId_key" ON "class_students"("classId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_pin_key" ON "game_sessions"("pin");

-- CreateIndex
CREATE UNIQUE INDEX "game_players_gameId_userId_key" ON "game_players"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "player_answers_playerId_questionId_key" ON "player_answers"("playerId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_results_gameId_questionId_key" ON "question_results"("gameId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_assignmentId_studentId_attempt_key" ON "assignment_submissions"("assignmentId", "studentId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "user_analytics_userId_key" ON "user_analytics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_stats_quizId_key" ON "quiz_stats"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "question_stats_quizStatsId_questionId_key" ON "question_stats"("quizStatsId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "game_analytics_gameId_key" ON "game_analytics"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

-- CreateIndex
CREATE UNIQUE INDEX "badges_earned_badgeId_playerId_key" ON "badges_earned"("badgeId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "avatars_name_key" ON "avatars"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_avatars_userId_avatarId_key" ON "user_avatars"("userId", "avatarId");

-- CreateIndex
CREATE UNIQUE INDEX "player_xp_userId_key" ON "player_xp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "power_ups_name_key" ON "power_ups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_power_ups_userId_powerUpId_key" ON "user_power_ups"("userId", "powerUpId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_name_key" ON "reactions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_collection_items_collectionId_quizId_key" ON "quiz_collection_items"("collectionId", "quizId");

-- CreateIndex
CREATE UNIQUE INDEX "system_configurations_key_key" ON "system_configurations"("key");

-- CreateIndex
CREATE UNIQUE INDEX "_QuizCollaborator_AB_unique" ON "_QuizCollaborator"("A", "B");

-- CreateIndex
CREATE INDEX "_QuizCollaborator_B_index" ON "_QuizCollaborator"("B");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_questionBankItemId_fkey" FOREIGN KEY ("questionBankItemId") REFERENCES "question_bank_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "game_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_results" ADD CONSTRAINT "question_results_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_invitations" ADD CONSTRAINT "game_invitations_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_invitations" ADD CONSTRAINT "game_invitations_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_invitations" ADD CONSTRAINT "game_invitations_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_invitations" ADD CONSTRAINT "game_invitations_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_invitations" ADD CONSTRAINT "game_invitations_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_analytics" ADD CONSTRAINT "user_analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_stats" ADD CONSTRAINT "quiz_stats_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_stats" ADD CONSTRAINT "question_stats_quizStatsId_fkey" FOREIGN KEY ("quizStatsId") REFERENCES "quiz_stats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_stats" ADD CONSTRAINT "question_stats_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_analytics" ADD CONSTRAINT "game_analytics_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_performance_reports" ADD CONSTRAINT "quiz_performance_reports_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges_earned" ADD CONSTRAINT "badges_earned_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges_earned" ADD CONSTRAINT "badges_earned_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "game_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "avatars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_xp" ADD CONSTRAINT "player_xp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "player_xp"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_power_ups" ADD CONSTRAINT "user_power_ups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_power_ups" ADD CONSTRAINT "user_power_ups_powerUpId_fkey" FOREIGN KEY ("powerUpId") REFERENCES "power_ups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "power_up_usage" ADD CONSTRAINT "power_up_usage_powerUpId_fkey" FOREIGN KEY ("powerUpId") REFERENCES "power_ups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_reactions" ADD CONSTRAINT "game_reactions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "game_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_reactions" ADD CONSTRAINT "game_reactions_reactionId_fkey" FOREIGN KEY ("reactionId") REFERENCES "reactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_collections" ADD CONSTRAINT "quiz_collections_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_collection_items" ADD CONSTRAINT "quiz_collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "quiz_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_collection_items" ADD CONSTRAINT "quiz_collection_items_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuizCollaborator" ADD CONSTRAINT "_QuizCollaborator_A_fkey" FOREIGN KEY ("A") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuizCollaborator" ADD CONSTRAINT "_QuizCollaborator_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
