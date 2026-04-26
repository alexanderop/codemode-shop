import { describe, expect, it } from 'vitest'
import { renderLoading } from './loading.page'

describe('Loading', () => {
  it('renders the provided label', async () => {
    const view = await renderLoading({ label: 'Looking for trail runners…' })
    await expect.element(view.label).toBeVisible()
  })
})
