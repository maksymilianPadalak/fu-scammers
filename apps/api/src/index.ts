import express from 'express'
import cors from 'cors'
import { healthRouter } from './routes/health'
import { itemsRouter } from './routes/items'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Mount routers under /api
app.use('/api', healthRouter)
app.use('/api', itemsRouter)

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`)
})
