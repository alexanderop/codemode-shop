import { AsyncLocalStorage } from 'node:async_hooks'

export type SessionId = string & { readonly __brand: 'SessionId' }

interface SessionContext {
  sessionId: SessionId
}

const als = new AsyncLocalStorage<SessionContext>()

export const sessionContext = {
  run<T>(ctx: SessionContext, fn: () => T): T {
    return als.run(ctx, fn)
  },
  get(): SessionContext {
    const ctx = als.getStore()
    if (!ctx) {
      throw new Error(
        'sessionContext.get() called outside sessionContext.run() — wrap server entry points (route handlers, tool executors, tests) in sessionContext.run({ sessionId }, ...).',
      )
    }
    return ctx
  },
}
