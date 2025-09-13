import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { healthRouter } from './routes/health'
import { itemsRouter } from './routes/items'
import { analyzeRouter } from './routes/analyze'
import { videoRouter } from './routes/video'
import { setupWebSocket } from './ws';

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = Number(process.env.WS_PORT) || 3789; // chosen random dedicated WS port

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Mount routers under /api
app.use('/api', healthRouter)
app.use('/api', itemsRouter)
app.use('/api', analyzeRouter)
app.use('/api', videoRouter)

// Create HTTP server and start servers
const server = createServer(app);
// Start WebSocket server on its own port for clarity
setupWebSocket(server, { port: WS_PORT });

server.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server at ws://localhost:${WS_PORT}/ws`);
});
