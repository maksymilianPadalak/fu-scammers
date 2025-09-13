import type { Request, Response } from 'express'
import { listItems, getItemById } from '../services/items'

export const getItems = async (_req: Request, res: Response) => {
  const items = await listItems()
  res.json({ data: items })
}

export const getItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' })
  }

  const item = await getItemById(id)
  if (!item) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.json({ data: item })
}
