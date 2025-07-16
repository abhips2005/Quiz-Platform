import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';
import { supabaseAuthMiddleware } from './middleware/supabaseAuth';
import { validateRequest } from './middleware/validation';

// Import routes
import supabaseAuthRoutes from './routes/supabaseAuth'; // Changed from firebaseAuthRoutes
import userRoutes from './routes/users';
import quizRoutes from './routes/quizzes';
import gameRoutes from './routes/games';
import classRoutes from './routes/classes';
import analyticsRoutes from './routes/analytics';
import uploadRoutes from './routes/uploads';
import questionBankRoutes from './routes/questionBank';
import mediaRoutes from './routes/media';
import gameHostRoutes from './routes/gameHost';
import gamificationRoutes from './routes/gamification';

// Import socket handlers
import { initializeSocketHandlers } from './sockets';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173", 
      process.env.CORS_ORIGIN
    ].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "Cache-Control"]
  },
  allowEIO3: true // Allow Engine.IO v3 clients to connect
});

// Initialize Prisma
export const prisma = new PrismaClient();

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute (was 15 minutes)
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per minute (was 100 per 15 minutes)
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false // Allow cross-origin requests for development
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked origin ${origin}`);
      callback(null, true); // Allow all for development - change to false for production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type', 
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-Forwarded-For',
    'X-Real-IP'
  ],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Additional CORS middleware to handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: 'healthy',
        websocket: 'healthy',
        auth: 'supabase'  // Changed from 'firebase'
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: io.engine.clientsCount
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: 'Database connection failed'
    });
  }
});

// Apply rate limiting to API routes (excluding health check)
app.use('/api', limiter);

// API Routes - Updated to use Supabase authentication
app.use('/api/auth', supabaseAuthRoutes); // Changed from firebaseAuthRoutes
app.use('/api/users', supabaseAuthMiddleware, userRoutes);
app.use('/api/quizzes', supabaseAuthMiddleware, quizRoutes);
app.use('/api/games', supabaseAuthMiddleware, gameRoutes);
app.use('/api/classes', supabaseAuthMiddleware, classRoutes);
app.use('/api/analytics', supabaseAuthMiddleware, analyticsRoutes);
app.use('/api/gamification', supabaseAuthMiddleware, gamificationRoutes);
app.use('/api/uploads', supabaseAuthMiddleware, uploadRoutes);
app.use('/api/question-bank', supabaseAuthMiddleware, questionBankRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/game-host', gameHostRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date()
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize Socket.io handlers
initializeSocketHandlers(io);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
  console.log(`🔗 WebSocket server ready for connections`);
});

export { io }; 