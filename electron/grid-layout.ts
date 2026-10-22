export interface Rect { x: number; y: number; width: number; height: number }
export interface GridCell extends Rect { id: number; headerHeight: number }

export function calculateGrid(count: number, width: number, height: number): GridCell[] {
  if (![1, 2, 3, 4, 6].includes(count)) return []
  const columns = count === 1 ? 1 : count === 2 ? 2 : count === 6 ? 3 : 2
  const rows = Math.ceil(count / columns)
  const gap = 1
  const cellWidth = Math.floor((width - gap * (columns - 1)) / columns)
  const cellHeight = Math.floor((height - gap * (rows - 1)) / rows)
  return Array.from({ length: count }, (_, id) => ({
    id, x: (id % columns) * (cellWidth + gap), y: Math.floor(id / columns) * (cellHeight + gap),
    width: cellWidth, height: cellHeight, headerHeight: 26
  }))
}
