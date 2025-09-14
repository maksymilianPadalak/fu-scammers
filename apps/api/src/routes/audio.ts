import { Router } from 'express'
import { handleAudio } from '../controllers/audio'

export const audioRouter = Router()

audioRouter.post('/audio', handleAudio)