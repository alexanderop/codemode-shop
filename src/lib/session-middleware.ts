import { createMiddleware } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { sessionContext, type SessionId } from '#/lib/session-context'
import { SESSION_COOKIE_NAME } from '#/lib/session'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export const sessionMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  let sessionId = getCookie(SESSION_COOKIE_NAME) as SessionId | undefined
  if (!sessionId) {
    sessionId = crypto.randomUUID() as SessionId
    setCookie(SESSION_COOKIE_NAME, sessionId, {
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }
  return sessionContext.run({ sessionId }, () => next())
})
