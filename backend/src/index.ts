import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import monteurRoutes from './routes/monteurRoutes';
import { initializeDatabase } from './config/db';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// CORS configuration - allow frontend to connect
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Basic health check route
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'DispoTool Backend is running' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Order routes
app.use('/api/orders', orderRoutes);

// Monteur routes
app.use('/api/monteure', monteurRoutes);

// 404 handler - must come after all other routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler - must be last middleware
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize database and start server
initializeDatabase().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

export { app, io };
