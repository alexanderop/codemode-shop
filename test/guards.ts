import { afterEach, beforeEach } from 'vitest'

/**
 * Auto-guards installed in every vitest test:
 *
 *  1. Real Anthropic calls fail with a loud banner. Tests must use cassettes
 *     or canned programs via runProgram(), never the network.
 *  2. console.error during a test causes the test to fail. Catches silent
 *     failures (zod parse errors in bindings, React act warnings, etc.).
 */

const realFetch: typeof fetch = globalThis.fetch
const realConsoleError = console.error
const capturedConsoleErrors: Array<string> = []

const ANTHROPIC_HOSTS = ['api.anthropic.com']
const FETCH_BANNER =
  '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  'BLOCKED REAL ANTHROPIC CALL FROM TEST\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  'A test attempted a network request to api.anthropic.com.\n' +
  'Use a cassette or canned program via runProgram() instead.\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function guardedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = urlOf(input)
  if (ANTHROPIC_HOSTS.some((h) => url.includes(h))) {
    throw new Error(`${FETCH_BANNER}URL: ${url}`)
  }
  return realFetch(input as never, init)
}

beforeEach(() => {
  capturedConsoleErrors.length = 0
  globalThis.fetch = guardedFetch as typeof fetch
  console.error = (...args: Array<unknown>) => {
    capturedConsoleErrors.push(args.map((a) => formatArg(a)).join(' '))
    realConsoleError(...args)
  }
})

afterEach(() => {
  globalThis.fetch = realFetch
  console.error = realConsoleError

  const consoleErrors = capturedConsoleErrors.slice()
  capturedConsoleErrors.length = 0

  if (consoleErrors.length > 0) {
    throw new Error(
      `Test logged ${consoleErrors.length} console.error call(s):\n  ${consoleErrors.join('\n  ')}`,
    )
  }
})

function formatArg(a: unknown): string {
  if (a instanceof Error) return `${a.name}: ${a.message}`
  if (typeof a === 'string') return a
  try {
    return JSON.stringify(a)
  } catch {
    return String(a)
  }
}
