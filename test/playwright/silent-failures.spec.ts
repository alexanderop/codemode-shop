import { expect, test } from './test-utils'

const ROUTES = ['/'] as const

test.describe('silent failure budgets', () => {
  for (const route of ROUTES) {
    test(`${route} loads without console errors or hydration mismatches`, async ({
      page,
      consoleErrors,
      hydrationErrors,
    }) => {
      await page.goto(route)
      // Wait for the page to settle after hydration. networkidle is overkill
      // for this app (tanstack devtools etc.) — domcontentloaded + a tick is
      // enough for hydration warnings to surface.
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500)

      expect(hydrationErrors).toEqual([])
      expect(consoleErrors).toEqual([])
    })
  }
})
