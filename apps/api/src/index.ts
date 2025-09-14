import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { healthRouter } from './routes/health'
import { itemsRouter } from './routes/items'
import { analyzeRouter } from './routes/analyze'
import { videoRouter } from './routes/video'
import { screenshotRouter } from './routes/screenshot'
import { recordingRouter } from './routes/recording'
import { scammersRouter } from './routes/scammers'
// import { weaviateRouter } from './routes/weaviate'
import { fineTuneRouter } from './routes/fineTune'
import { setupWebSocket } from './ws'
import { ensureVideosClass } from './services/weaviate'

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = Number(process.env.WS_PORT) || 3789; // chosen random dedicated WS port

// Middleware
app.use(cors());
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

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
app.use('/api', screenshotRouter)
app.use('/api', recordingRouter)
app.use('/api', scammersRouter)
// app.use('/api', weaviateRouter)
app.use('/api', fineTuneRouter)
// Create HTTP server and start servers
const server = createServer(app);

// Increase HTTP server timeouts to allow long-running video analysis
server.setTimeout(10 * 60 * 1000); // 10 minutes for inactive sockets
// @ts-ignore - headersTimeout exists on Node http.Server
server.headersTimeout = 11 * 60 * 1000; // allow headers for long requests
// @ts-ignore - keepAliveTimeout exists on Node http.Server
server.keepAliveTimeout = 10 * 60 * 1000; // keep alive during long processing

// Start WebSocket server on its own port for clarity
setupWebSocket(server, { port: WS_PORT });

server.listen(PORT, async () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server at ws://localhost:${WS_PORT}/ws`);
  
  // Initialize Weaviate Videos class
  console.log('Initializing Weaviate...');
  await ensureVideosClass();
});
