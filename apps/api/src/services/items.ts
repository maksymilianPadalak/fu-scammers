export type Item = { id: number; name: string }

const MOCK_ITEMS: Item[] = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' },
]

export const listItems = async (): Promise<Item[]> => {
  return Promise.resolve(MOCK_ITEMS)
}

export const getItemById = async (id: number): Promise<Item | undefined> => {
  return Promise.resolve(MOCK_ITEMS.find((i) => i.id === id))
}
