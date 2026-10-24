import express from 'express';
import mongoose from 'mongoose';
import { checkOllamaStatus } from '../services/ollama.service.js';

const router = express.Router();

router.get('/health', async (req, res) => {
  const mongoStatus = {
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    statusText: ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'][
      mongoose.connection.readyState
    ] || 'Unknown'
  };

  const ollamaStatus = await checkOllamaStatus();

  const isHealthy = mongoStatus.connected;

  res.status(isHealthy ? 200 : 207).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'LazyDesk AI Core Server',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoStatus,
      ollama: ollamaStatus
    }
  });
});

export default router;
