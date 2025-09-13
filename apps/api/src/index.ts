import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health'
import { itemsRouter } from './routes/items'
import { analyzeRouter } from './routes/analyze'
import { videoRouter } from './routes/video'
const app = express();
const PORT = process.env.PORT || 3001;

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
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});
