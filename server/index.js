import 'express-async-errors';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

import { connectDB, isDBConnected } from './config/database.js';
import logger from './utils/logger.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import productRoutes from './routes/productRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

const app = express();
const PORT = 5000;

// ---- Security & middleware ----
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(mongoSanitize());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api', limiter);

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FieldTrack API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isDBConnected() ? 'connected' : 'disconnected',
  });
});

// ---- Routes ----
const API_BASE = '/api/v1';

app.use(`${API_BASE}/auth`, authRoutes);
app.use(`${API_BASE}/employees`, employeeRoutes);
app.use(`${API_BASE}/sessions`, sessionRoutes);
app.use(`${API_BASE}/locations`, locationRoutes);
app.use(`${API_BASE}/stores`, storeRoutes);
app.use(`${API_BASE}/products`, productRoutes);
app.use(`${API_BASE}/visits`, visitRoutes);
app.use(`${API_BASE}/reports`, reportRoutes);
app.use(`${API_BASE}/dashboard`, dashboardRoutes);
app.use(`${API_BASE}/audit`, auditRoutes);
app.use(`${API_BASE}/settings`, settingsRoutes);

// ---- Error handling ----
app.use(notFound);
app.use(errorHandler);

// ---- Start server ----
async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
}

start();

export default app;
