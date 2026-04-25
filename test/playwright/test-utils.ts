import { test as base, expect, type Page, type Route } from '@playwright/test'

/**
 * Banner that flags any unmocked external request — same shape as npmx.dev's
 * `failUnmockedRequest` pattern but adapted for our single-vendor surface.
 *
 * Tests must never hit api.anthropic.com or any other external API; the
 * cassette server is the only allowed upstream for the storefront agent.
 */
const BLOCK_BANNER = (where: string, url: string) =>
  '\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  `BLOCKED ${where} REQUEST IN E2E TEST\n` +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  `URL:  ${url}\n` +
  '\n' +
  'Add a cassette under test/cassettes/, or expand the route map in\n' +
  'test/playwright/test-utils.ts.\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'

const HYDRATION_PATTERNS = [
  // React hydration mismatches surface as warnings/errors via console.
  'Hydration failed',
  'There was an error while hydrating',
  'did not match',
  // ui-store warnings
  'orphan parent',
  '[uiStore]',
]

const KNOWN_NOISE = [
  // dev-only React warnings we don't want to fail on
  'Download the React DevTools',
  'TanStack Devtools',
]

function isHydrationFailure(text: string): boolean {
  return HYDRATION_PATTERNS.some((p) => text.includes(p))
}

function isKnownNoise(text: string): boolean {
  return KNOWN_NOISE.some((p) => text.includes(p))
}

async function setupAgentInterception(page: Page): Promise<void> {
  const cassetteUrl = process.env.CASSETTE_SERVER_URL
  if (!cassetteUrl) throw new Error('CASSETTE_SERVER_URL not set — globalSetup did not run')

  await page.route('**/api/storefront-agent', async (route) => {
    await route.continue({ url: `${cassetteUrl}/api/storefront-agent` })
  })

  // Block raw Anthropic calls outright if anything tries to reach them.
  await page.route(/api\.anthropic\.com/, (route: Route) => {
    const url = route.request().url()
    throw new Error(BLOCK_BANNER('ANTHROPIC', url))
  })
}

export const test = base.extend<{
  mockAgent: void
  consoleErrors: Array<string>
  hydrationErrors: Array<string>
}>({
  mockAgent: [
    async ({ page }, use) => {
      await setupAgentInterception(page)
      await use()
    },
    { auto: true },
  ],

  consoleErrors: [
    async ({ page }, use) => {
      const errors: Array<string> = []
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (isKnownNoise(text)) return
        errors.push(text)
      })
      page.on('pageerror', (err) => {
        errors.push(err.message)
      })
      await use(errors)
    },
    { auto: true },
  ],

  hydrationErrors: [
    async ({ page }, use) => {
      const errors: Array<string> = []
      page.on('console', (msg) => {
        const text = msg.text()
        if (isHydrationFailure(text)) errors.push(text)
      })
      await use(errors)
    },
    { auto: true },
  ],
})

export { expect }
