/**
 * Playwright globalSetup — boots an MSW node server so worker processes can
 * import the same handler module and resolve responses via `getResponse()`.
 *
 * `setupServer().listen()` here is mostly ceremony for clean shutdown; the
 * actual interception runs per-worker inside `setupAgentInterception()` in
 * `test-utils.ts`, which feeds Playwright's `route.fulfill({ response })`.
 */
import { setupServer } from 'msw/node'
import { handlers } from '../msw/handlers'

export default async function globalSetup() {
  const server = setupServer(...handlers)
  server.listen({ onUnhandledRequest: 'bypass' })

  return async () => {
    server.close()
  }
}
