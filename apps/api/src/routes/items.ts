import { Router } from 'express'
import { getItems, getItem } from '../controllers/items'

export const itemsRouter = Router()

itemsRouter.get('/items', getItems)
itemsRouter.get('/items/:id', getItem)
