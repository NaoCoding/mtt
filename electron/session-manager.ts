import type { Session } from 'electron'

export interface ManagedSession { id: number; partition: string; session: Session }

export class SessionManager {
  private readonly sessions = new Map<number, ManagedSession>()
  private readonly fromPartition: (partition: string) => Session
  private generation = 0

  constructor(fromPartition: (partition: string) => Session) { this.fromPartition = fromPartition }

  create(id: number): ManagedSession {
    const existing = this.sessions.get(id)
    if (existing) return existing
    const partition = `mtt-${id}-${this.generation++}`
    const ses = this.fromPartition(partition)
    ses.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
    const managed = { id, partition, session: ses }
    this.sessions.set(id, managed)
    return managed
  }

  get(id: number): ManagedSession {
    const managed = this.sessions.get(id)
    if (!managed) throw new Error(`Unknown session ${id}`)
    return managed
  }

  async reset(id: number): Promise<void> {
    const managed = this.get(id)
    await managed.session.clearData()
  }

  delete(id: number): void { this.sessions.delete(id) }
  clear(): void { this.sessions.clear() }
}
