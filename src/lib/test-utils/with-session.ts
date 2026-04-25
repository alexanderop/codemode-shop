import { sessionContext, type SessionId } from '#/lib/session-context'

export function withTestSession<T>(fn: () => T, sessionId?: string): T {
  const id = (sessionId ?? crypto.randomUUID()) as SessionId
  return sessionContext.run({ sessionId: id }, fn)
}
