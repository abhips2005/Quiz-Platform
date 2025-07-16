# 🎯 Quizzz Platform

A modern, real-time quiz platform built with React, Node.js, and Supabase. Create engaging quizzes, host live quiz sessions, and analyze performance with detailed analytics.

![Quiz Platform](https://img.shields.io/badge/Status-Active-green)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)

## ✨ Features

### 🏫 Quiz Management
- **Quiz Creator**: Intuitive drag-and-drop quiz builder
- **Question Bank**: Reusable question library with categorization
- **Media Support**: Images, audio, and video in questions
- **Math Rendering**: LaTeX support for mathematical expressions
- **Multiple Question Types**: Multiple choice, true/false, short answer, fill-in-blank

### 🎮 Live Gaming
- **Real-time Sessions**: Live quiz sessions with WebSocket support
- **Game Modes**: Classic, Speed, and Team modes
- **Live Monitoring**: Real-time participant tracking and analytics
- **Interactive Features**: Live leaderboards and instant feedback

### 📊 Analytics & Insights
- **Performance Analytics**: Detailed quiz and participant analytics
- **Progress Tracking**: Individual and group progress monitoring
- **Data Visualization**: Charts and graphs for performance insights
- **Export Functionality**: Export results and analytics data

### 🎨 Gamification
- **XP System**: Experience points and leveling
- **Achievements**: Unlock achievements and badges
- **Leaderboards**: Global and local leaderboards
- **Avatars**: Customizable user avatars
- **Power-ups**: Special abilities during quizzes

### 🔐 Authentication & Security
- **Supabase Auth**: Secure authentication with email/password
- **Role-based Access**: Student, Teacher, and Admin roles
- **Data Protection**: Secure data handling and privacy
- **Session Management**: Secure session handling

## 🏗️ Architecture

This is a monorepo project with three main packages:

```
quizzz-platform/
├── packages/
│   ├── frontend/          # React + TypeScript + Vite
│   ├── backend/           # Node.js + Express + TypeScript
│   └── shared/            # Shared types and utilities
├── scripts/               # Setup and utility scripts
└── docs/                  # Documentation
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- React Router for navigation
- Socket.io Client for real-time features
- Chart.js for analytics visualization
- KaTeX for math rendering
- Tailwind CSS for styling

**Backend:**
- Node.js with Express and TypeScript
- Prisma ORM with PostgreSQL
- Socket.io for real-time communication
- Supabase for authentication
- File upload handling
- Comprehensive error handling

**Database:**
- PostgreSQL (via Supabase)
- Prisma ORM for database operations
- Migrations for schema management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/quizzz-platform.git
cd quizzz-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create environment files for both frontend and backend:

**Backend (.env):**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/quizzz_db"

# Supabase
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-key"

# Server
PORT=5000
JWT_SECRET="your-jwt-secret"
NODE_ENV="development"
```

**Frontend (.env):**
```env
VITE_API_URL="http://localhost:5000"
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

### 4. Database Setup

```bash
# Generate Prisma client
cd packages/backend
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed
```

### 5. Start Development Servers

```bash
# Start all services (from root directory)
npm run dev

# Or start individually:
npm run dev:frontend   # Frontend on http://localhost:5173
npm run dev:backend    # Backend on http://localhost:5000
npm run dev:shared     # Shared package watcher
```

## 📖 Usage

### For Teachers/Educators

1. **Register** as a teacher account
2. **Create Quizzes** using the intuitive quiz builder
3. **Host Live Sessions** with real-time participant interaction
4. **Analyze Results** with comprehensive analytics
5. **Manage Classes** and track student progress

### For Students

1. **Register** with a student account
2. **Join Quiz Sessions** using room codes
3. **Participate** in live quizzes with real-time feedback
4. **Track Progress** and view personal analytics
5. **Compete** on leaderboards and earn achievements

### For Administrators

1. **Manage Users** and permissions
2. **Monitor Platform** usage and performance
3. **Configure Settings** and platform features
4. **Access Analytics** across all users and content

## 🛠️ Development

### Project Structure

```
packages/frontend/src/
├── components/          # Reusable UI components
├── pages/              # Route components
├── contexts/           # React contexts (auth, etc.)
├── services/           # API service functions
├── hooks/              # Custom React hooks
└── utils/              # Utility functions

packages/backend/src/
├── routes/             # API route handlers
├── middleware/         # Express middleware
├── services/           # Business logic services
├── config/             # Configuration files
└── utils/              # Backend utilities

packages/shared/src/
├── types/              # TypeScript type definitions
└── utils/              # Shared utility functions
```

### Available Scripts

```bash
# Development
npm run dev                # Start all development servers
npm run dev:frontend      # Start frontend only
npm run dev:backend       # Start backend only

# Building
npm run build             # Build all packages
npm run build:frontend    # Build frontend only
npm run build:backend     # Build backend only

# Testing
npm run test              # Run all tests
npm run test:frontend     # Test frontend only
npm run test:backend      # Test backend only

# Database
npm run db:migrate        # Run database migrations
npm run db:reset          # Reset database
npm run db:seed           # Seed database with sample data

# Deployment
npm run deploy            # Deploy to production
```

## 🚢 Deployment

### Using Vercel (Frontend) + Railway (Backend)

1. **Frontend (Vercel):**
   ```bash
   cd packages/frontend
   vercel --prod
   ```

2. **Backend (Railway):**
   ```bash
   cd packages/backend
   railway deploy
   ```

### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Environment Variables for Production

Update your production environment variables:
- Set `NODE_ENV=production`
- Configure production database URLs
- Set up proper CORS origins
- Configure secure session secrets

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** for providing excellent authentication and database services
- **Prisma** for the amazing ORM experience
- **React** and **TypeScript** communities for excellent tooling
- **Socket.io** for real-time communication capabilities

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/quizzz-platform/issues) page
2. Create a new issue with detailed information
3. Join our [Discord Community](https://discord.gg/your-invite) for real-time help

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration with learning management systems
- [ ] AI-powered question generation
- [ ] Voice-to-text question input
- [ ] Multi-language support
- [ ] Advanced gamification features

---

**Built with ❤️ by the Quizzz Platform Team** 