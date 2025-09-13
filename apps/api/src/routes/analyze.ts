import { Router } from 'express'
import { analyze } from '../controllers/analyze'

export const analyzeRouter = Router()

analyzeRouter.post('/analyze', analyze)