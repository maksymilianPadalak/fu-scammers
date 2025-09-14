import { Router } from 'express';
import { getScammers } from '../controllers/scammers';

export const scammersRouter = Router();

scammersRouter.get('/scammers', getScammers);
