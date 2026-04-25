import { sessionContext, type SessionId } from '#/lib/session-context'

export const SESSION_COOKIE_NAME = 'sid'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=')
    if (rawName === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function buildSetCookie(value: string): string {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${value}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (process.env.NODE_ENV === 'production') attrs.push('Secure')
  return attrs.join('; ')
}

export function getOrCreateSessionId(request: Request): {
  sessionId: SessionId
  setCookie: string | null
} {
  const existing = readCookie(request, SESSION_COOKIE_NAME)
  if (existing) {
    return { sessionId: existing as SessionId, setCookie: null }
  }
  const sessionId = crypto.randomUUID() as SessionId
  return { sessionId, setCookie: buildSetCookie(sessionId) }
}

export async function withSession(
  request: Request,
  handler: () => Promise<Response> | Response,
): Promise<Response> {
  const { sessionId, setCookie } = getOrCreateSessionId(request)
  const response = await sessionContext.run({ sessionId }, async () => handler())
  if (setCookie) response.headers.append('Set-Cookie', setCookie)
  return response
}
