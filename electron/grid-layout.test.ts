import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateGrid } from './grid-layout.ts'

test('calculates the documented layouts for supported session counts', () => {
  const expected = new Map([[1, [1, 1]], [2, [2, 1]], [3, [2, 2]], [4, [2, 2]], [6, [3, 2]]])
  for (const [count, [columns, rows]] of expected) {
    const cells = calculateGrid(count, 1200, 800)
    assert.equal(cells.length, count)
    assert.equal(new Set(cells.map(cell => cell.x)).size, columns)
    assert.equal(new Set(cells.map(cell => cell.y)).size, rows)
    assert.ok(cells.every(cell => cell.width > 0 && cell.height > 0))
  }
})

test('returns no cells for an unsupported session count', () => {
  assert.deepEqual(calculateGrid(5, 1200, 800), [])
})

test('keeps cells within the available bounds without overlap for odd dimensions', () => {
  const width = 1001
  const height = 703
  for (const count of [1, 2, 3, 4, 6]) {
    const cells = calculateGrid(count, width, height)
    for (const cell of cells) {
      assert.ok(cell.x >= 0 && cell.y >= 0)
      assert.ok(cell.width > 0 && cell.height > 0)
      assert.ok(cell.x + cell.width <= width)
      assert.ok(cell.y + cell.height <= height)
    }
    for (let left = 0; left < cells.length; left++) {
      for (let right = left + 1; right < cells.length; right++) {
        const a = cells[left]
        const b = cells[right]
        const separated = a.x + a.width <= b.x || b.x + b.width <= a.x ||
          a.y + a.height <= b.y || b.y + b.height <= a.y
        assert.ok(separated, `cells ${a.id} and ${b.id} overlap for count ${count}`)
      }
    }
  }
})
