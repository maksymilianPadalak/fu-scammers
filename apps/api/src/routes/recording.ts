import { Router } from 'express'
import { handleRecording } from '../controllers/recording'

export const recordingRouter = Router()

recordingRouter.post('/recording', handleRecording)