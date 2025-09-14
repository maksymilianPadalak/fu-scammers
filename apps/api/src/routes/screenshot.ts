import { Router } from 'express'
import { handleScreenshot } from '../controllers/screenshot'

export const screenshotRouter = Router()

screenshotRouter.post('/screenshot', handleScreenshot)