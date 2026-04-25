import { expect, test } from './test-utils'

test.describe('chat-flow', () => {
  test('asks for a running shoe → product card + CTA appear → no console errors', async ({
    page,
    consoleErrors,
    hydrationErrors,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /This week's drops/i })).toBeVisible()

    // Open the storekeeper drawer
    await page.getByRole('button', { name: /Try the storekeeper/i }).click()

    const input = page.getByPlaceholder(/Ask|message|search/i).first()
    await expect(input).toBeVisible({ timeout: 10_000 })
    await input.fill('show me running shoes')
    await input.press('Enter')

    // Cassette emits a productCard with id card-shoe-01 (Pegasus)
    await expect(page.getByText(/Pegasus/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Add Pegasus/i })).toBeVisible()

    // No regressions in either error budget
    expect(hydrationErrors, 'hydration errors must stay empty').toEqual([])
    expect(consoleErrors, 'console errors must stay empty').toEqual([])
  })
})
