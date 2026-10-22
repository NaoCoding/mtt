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
