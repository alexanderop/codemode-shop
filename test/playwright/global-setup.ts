/**
 * Playwright globalSetup — boots the cassette server so e2e tests can use
 * realistic SSE replay (with timing) for the storefront agent.
 *
 * Returns an async teardown function (Playwright's recommended pattern for
 * sharing state with teardown via closure). The server's URL is published via
 * the CASSETTE_SERVER_URL env var so it propagates to worker processes.
 */
import { startCassetteServer } from '../cassettes/server'

export default async function globalSetup() {
  const server = await startCassetteServer({ port: 0 })
  process.env.CASSETTE_SERVER_URL = server.url

  return async () => {
    await server.stop()
  }
}
