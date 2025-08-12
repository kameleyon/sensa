import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { config } from './config';
import WebSocketHandler from './websocket/socketHandler';
import { generalRateLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/authRoutes';
import conversationRoutes from './routes/conversationRoutes';
import messageRoutes from './routes/messageRoutes';
import agentRoutes from './routes/agentRoutes';
import userRoutes from './routes/userRoutes';

// Create Express app
const app: Express = express();
const httpServer = createServer(app);

// Create Socket.IO server
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.CORS_ORIGIN,
    credentials: true,
  },
});

// Initialize WebSocket handler
const websocketHandler = new WebSocketHandler(io);

// Middleware
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalRateLimiter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Internal server error',
    message: config.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = parseInt(config.PORT, 10);

httpServer.listen(PORT, () => {
  console.log(`
    🚀 Sensacall Backend Server Started
    ====================================
    Environment: ${config.NODE_ENV}
    Server: http://localhost:${PORT}
    WebSocket: ws://localhost:${PORT}
    Health: http://localhost:${PORT}/health
    ====================================
    
    API Endpoints:
    - POST   /api/auth/register
    - POST   /api/auth/login
    - POST   /api/auth/logout
    - POST   /api/auth/refresh
    
    - GET    /api/conversations
    - POST   /api/conversations
    - GET    /api/conversations/:id
    - PATCH  /api/conversations/:id/archive
    - DELETE /api/conversations/:id
    
    - POST   /api/messages/send
    - GET    /api/messages/conversation/:id
    - DELETE /api/messages/:id
    
    - GET    /api/agents
    - GET    /api/agents/recommended
    - GET    /api/agents/:id
    
    - GET    /api/users/profile
    - PATCH  /api/users/profile
    - GET    /api/users/preferences
    - PATCH  /api/users/preferences
    - GET    /api/users/usage
    - GET    /api/users/subscription-history
    
    WebSocket Events:
    - join_conversation
    - leave_conversation
    - send_message
    - typing
    - new_message
    - message_chunk
    - agent_typing
    - user_typing
    ====================================
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export { app, httpServer, websocketHandler };