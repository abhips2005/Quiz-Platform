# Quizzz Platform 🎯

A modern, real-time quiz and learning engagement platform inspired by Quizizz. Built with React, Node.js, Socket.io, and PostgreSQL.

## ✨ Features

### 🎮 Core Functionality
- **Real-time Quiz Gaming**: Live multiplayer quiz sessions with instant feedback
- **Multiple Question Types**: MCQ, True/False, Checkbox, Short Answer, Fill-in-the-blank
- **Interactive Learning**: Gamified experience with points, streaks, and leaderboards
- **Media Support**: Images, audio, and video in questions and answers

### 👥 User Management
- **Role-based System**: Students, Teachers, and Admins
- **Authentication**: Email/password with JWT, Google/Microsoft SSO ready
- **Profile Management**: Avatars, grades, subjects, and preferences
- **Class Management**: Create classes, invite students, manage groups

### 🎯 Quiz Creation & Management
- **Intuitive Quiz Builder**: Drag-and-drop question creation
- **Question Bank**: Reuse questions across quizzes
- **Collaboration**: Co-edit quizzes with other teachers
- **Import/Export**: Support for Excel/CSV and Google Forms
- **Templates**: Pre-built quiz templates for quick creation

### 🏆 Gamification & Engagement
- **Power-ups**: 50/50, Time Freeze, Double Points, Skip Question
- **Achievements**: Badges for various accomplishments
- **Streaks & XP**: Continuous engagement rewards
- **Customization**: Themes, memes, sound effects
- **Avatars**: Personalized player representations

### 📊 Analytics & Reporting
- **Real-time Analytics**: Live performance tracking during games
- **Detailed Reports**: Student progress, question difficulty analysis
- **Export Options**: PDF, CSV, Excel formats
- **Learning Insights**: AI-powered recommendations
- **Class Analytics**: Teacher dashboard with student performance

### 🎪 Game Modes
- **Live Mode**: Teacher-hosted real-time sessions
- **Homework Mode**: Self-paced assignments with deadlines
- **Practice Mode**: Individual study sessions
- **Tournament Mode**: Competitive multi-round games

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, TypeScript, Socket.io
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.io for live game synchronization
- **Authentication**: JWT with refresh tokens
- **File Storage**: Local storage with S3 support
- **State Management**: Zustand for client state

### Project Structure
```
Quizzz Platform/
├── packages/
│   ├── frontend/           # React app
│   │   ├── src/
│   │   │   ├── components/ # Reusable UI components
│   │   │   ├── pages/      # Route components
│   │   │   ├── hooks/      # Custom React hooks
│   │   │   ├── stores/     # Zustand stores
│   │   │   ├── services/   # API services
│   │   │   └── utils/      # Helper functions
│   │   └── public/         # Static assets
│   ├── backend/            # Node.js API server
│   │   ├── src/
│   │   │   ├── controllers/# Route handlers
│   │   │   ├── middleware/ # Express middleware
│   │   │   ├── routes/     # API routes
│   │   │   ├── services/   # Business logic
│   │   │   ├── sockets/    # Socket.io handlers
│   │   │   └── utils/      # Helper functions
│   │   ├── prisma/         # Database schema
│   │   └── uploads/        # File uploads
│   └── shared/             # Shared types & utilities
│       └── src/types/      # TypeScript definitions
├── package.json            # Root package.json
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Quizzz Platform"
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd packages/frontend && npm install
   cd ../backend && npm install
   cd ../shared && npm install
   cd ../..
   ```

3. **Set up environment variables**
   ```bash
   # Backend environment
   cd packages/backend
   cp .env.example .env
   # Edit .env with your database URL and JWT secrets
   ```

4. **Set up the database**
   ```bash
   cd packages/backend
   npx prisma generate
   npx prisma db push
   # Optional: seed with sample data
   npm run db:seed
   ```

5. **Start the development servers**
   ```bash
   # From project root
   npm run dev
   ```

   This starts both frontend (localhost:3000) and backend (localhost:5000) servers.

### Environment Variables

Create `.env` file in `packages/backend/`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/quizzz_platform"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_SECRET="your-refresh-token-secret-here"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Server
PORT=5000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# Optional: Email, OAuth, S3, Stripe configurations
```

## 🎮 How to Use

### For Teachers

1. **Create Account**: Sign up as a teacher
2. **Build Quiz**: Use the quiz builder to create questions
3. **Start Game**: Generate a PIN and share with students
4. **Monitor Live**: Watch real-time participation and results
5. **Review Analytics**: Analyze student performance and learning gaps

### For Students

1. **Join Game**: Enter the 6-digit PIN shared by teacher
2. **Play Quiz**: Answer questions within time limits
3. **Compete**: See live leaderboard and use power-ups
4. **Learn**: Review correct answers and explanations
5. **Track Progress**: Monitor your improvement over time

## 🔧 Development

### Available Scripts

From project root:
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run lint` - Run linting across all packages
- `npm run test` - Run tests across all packages

Backend specific:
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data

### API Documentation

The API follows RESTful conventions with these main endpoints:

- **Authentication**: `/api/auth/*` - Login, register, token refresh
- **Users**: `/api/users/*` - User management and profiles
- **Quizzes**: `/api/quizzes/*` - Quiz creation and management
- **Question Bank**: `/api/question-bank/*` - Reusable question library with tags and categories
- **Games**: `/api/games/*` - Live game sessions
- **Classes**: `/api/classes/*` - Class and student management
- **Analytics**: `/api/analytics/*` - Performance data
- **Uploads**: `/api/uploads/*` - File upload handling

### WebSocket Events

Real-time features use Socket.io with these key events:

- `join_game` - Join a game session
- `start_game` - Begin quiz (host only)
- `submit_answer` - Submit answer to question
- `next_question` - Advance to next question (host only)
- `game_event` - Receive game state updates

## 🎯 Implementation Status

### ✅ Recently Completed Features

#### Live Game Hosting System
**Comprehensive Game Management Platform**
- **Multi-Mode Support**: Live games, homework assignments, and practice sessions with full workflow support
- **PIN-Based Joining**: Secure 6-digit PIN system for easy student access with collision prevention
- **Game Creation Wizard**: Intuitive interface for teachers to create games with comprehensive settings
- **Real-Time Management**: Live player tracking, game status monitoring, and automatic leaderboards
- **Advanced Game Settings**: Question/answer randomization, time limits, retake options, and class integration
- **Scalable Architecture**: Support for up to 500 concurrent players per live game session

#### Media & Mathematics Support
**Rich Content Creation Tools**
- **Media Upload System**: Drag-and-drop support for images, audio, and video with organized file management
- **LaTeX Math Rendering**: Full mathematical expression support using KaTeX with real-time preview
- **File Security**: Comprehensive validation, size limits, and secure storage with automatic cleanup
- **Math Integration**: Seamless LaTeX rendering in questions, answers, and previews using `$math$` and `$$math$$` syntax
- **Media Library**: Organized file management with preview, metadata tracking, and deletion capabilities

#### Question Bank System
**Advanced Question Management & Reuse**
- **Centralized Library**: Create and manage reusable questions with comprehensive metadata (tags, categories, subjects, difficulty)
- **Smart Search & Filtering**: Advanced filtering system with real-time search across all question attributes
- **Usage Analytics**: Track question usage across quizzes with detailed performance statistics
- **Bulk Operations**: Efficient multi-question management with bulk actions and operations
- **Permission System**: Private/public question sharing with usage tracking and analytics
- **Seamless Integration**: Direct integration with quiz creator for immediate question reuse

### 🚧 In Development
- **Scoring System**: Timer-based scoring with speed bonuses and accuracy tracking
- **Student Game Interface**: Animated question flow with real-time feedback and visual effects
- **Teacher Dashboard**: Live game monitoring with real-time analytics and controls
- **Advanced Analytics**: Detailed performance reports with exportable data (CSV, PDF)
- **Gamification Features**: Power-ups, achievements, badges, and XP system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page for existing solutions
2. Create a new issue with detailed description
3. Join our community discussions

## 🚀 Deployment

### Production Setup

1. **Database**: Set up PostgreSQL database
2. **Environment**: Configure production environment variables
3. **Build**: Run `npm run build` to create production builds
4. **Deploy**: Deploy backend to your preferred hosting (Railway, Heroku, AWS)
5. **Frontend**: Deploy frontend to Vercel, Netlify, or CDN

### Docker Support (Coming Soon)

We're working on Docker configurations for easy deployment and development setup.

---

**Built with ❤️ for educators and students worldwide** 