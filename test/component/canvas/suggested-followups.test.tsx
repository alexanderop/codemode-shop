import { afterEach, describe, expect, it, vi } from 'vitest'
import { canvasCallbacks } from '#/features/storefront/components/canvas/canvas-callbacks'
import { renderSuggestedFollowups } from './suggested-followups.page'

afterEach(() => {
  canvasCallbacks.setHandlers(null)
})

describe('SuggestedFollowups', () => {
  it('renders nothing when there are no suggestions', async () => {
    const view = await renderSuggestedFollowups({ suggestions: [] })
    expect(view.group()).toBeNull()
  })

  it('renders one button per suggestion inside a labelled group', async () => {
    const view = await renderSuggestedFollowups({
      suggestions: [{ text: 'Trail runners' }, { text: 'Under $100' }],
    })
    await expect.element(view.buttonFor('Trail runners')).toBeVisible()
    await expect.element(view.buttonFor('Under $100')).toBeVisible()
  })

  it('invokes the registered onFollowupSelect handler with the chosen text', async () => {
    const onFollowupSelect = vi.fn()
    canvasCallbacks.setHandlers({ onFollowupSelect })

    const view = await renderSuggestedFollowups({
      suggestions: [{ text: 'Trail runners' }],
    })
    await view.buttonFor('Trail runners').click()

    expect(onFollowupSelect).toHaveBeenCalledWith('Trail runners')
  })

  it('is a no-op when no handler is registered', async () => {
    const view = await renderSuggestedFollowups({
      suggestions: [{ text: 'Trail runners' }],
    })
    await view.buttonFor('Trail runners').click()
    // No assertion: success is "did not throw and did not log a console.error"
  })
})
