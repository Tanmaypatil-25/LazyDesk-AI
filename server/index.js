import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import healthRoutes from './routes/health.routes.js';
import documentRoutes from './routes/documents.routes.js';
import { checkOllamaStatus } from './services/ollama.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lazydesk-ai';

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || origin === CLIENT_URL || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from ${origin}`));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// API Routes
app.use('/api', healthRoutes);
app.use('/api/documents', documentRoutes);

// In production, serve the built frontend assets
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  });
}

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Database connection
async function connectDatabase() {
  try {
    console.log(`[Database] Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('[Database] MongoDB connection established successfully.');
  } catch (err) {
    console.warn(`[Database] MongoDB connection warning: ${err.message}`);
    console.warn('[Database] The server will still run, but document persistence requires MongoDB.');
  }
}

// Start Server
export async function startServer() {
  await connectDatabase();

  const server = app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`  🦥 LazyDesk AI Server running on http://localhost:${PORT}`);
    console.log(`  CORS Allowed Origin: ${CLIENT_URL}`);
    console.log(`  Target Ollama Model: ${process.env.OLLAMA_MODEL || 'gemma3:1b'}`);
    
    // Asynchronously probe Ollama for status info
    const ollama = await checkOllamaStatus();
    if (ollama.connected) {
      console.log(`  Ollama Status: CONNECTED at ${ollama.baseUrl}`);
      console.log(`  Installed Models: [${ollama.models.join(', ')}]`);
    } else {
      console.log(`  Ollama Status: DISCONNECTED (${ollama.error})`);
    }
    console.log(`====================================================`);
  });

  return server;
}

// Only auto-start when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

export default app;
