import assert from 'node:assert/strict'
import test from 'node:test'
import type { Session } from 'electron'
import { SessionManager } from './session-manager.ts'

type PermissionHandler = (webContents: never, permission: never, callback: (allowed: boolean) => void) => void
interface FakeSession {
  permissionHandler?: PermissionHandler
  clearCalls: number
}

function createManager() {
  const sessions: FakeSession[] = []
  const partitions: string[] = []
  const manager = new SessionManager(partition => {
    partitions.push(partition)
    const fake: FakeSession = { clearCalls: 0 }
    const session = {
      setPermissionRequestHandler: (handler: PermissionHandler) => { fake.permissionHandler = handler },
      clearData: async () => { fake.clearCalls++ }
    }
    sessions.push(fake)
    return session as unknown as Session
  })
  return { manager, sessions, partitions }
}

test('creates isolated sessions once per id and denies permission requests', () => {
  const { manager, sessions, partitions } = createManager()
  const first = manager.create(2)
  const second = manager.create(3)

  assert.equal(manager.create(2), first)
  assert.notEqual(first.session, second.session)
  assert.deepEqual(partitions, ['mtt-2-0', 'mtt-3-1'])

  let permissionGranted = true
  sessions[0].permissionHandler?.(undefined as never, undefined as never, allowed => { permissionGranted = allowed })
  assert.equal(permissionGranted, false)
})

test('gets known sessions and clears their data on reset', async () => {
  const { manager, sessions } = createManager()
  const managed = manager.create(0)

  assert.equal(manager.get(0), managed)
  await manager.reset(0)
  assert.equal(sessions[0].clearCalls, 1)
  assert.throws(() => manager.get(1), /Unknown session 1/)
  await assert.rejects(manager.reset(1), /Unknown session 1/)
})

test('delete and clear remove ids so they can be recreated', () => {
  const { manager, partitions } = createManager()
  const original = manager.create(4)
  manager.delete(4)
  const replacement = manager.create(4)

  assert.notEqual(replacement.session, original.session)
  manager.clear()
  assert.throws(() => manager.get(4), /Unknown session 4/)
  assert.deepEqual(partitions, ['mtt-4-0', 'mtt-4-1'])
})
