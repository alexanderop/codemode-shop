import { render } from 'vitest-browser-react'
import { SuggestedFollowups } from '#/features/storefront/components/canvas/suggested-followups'
import type { SuggestedFollowupsProps } from '#/features/storefront/types/ui-types'

export const suggestedFollowupsProps = (
  overrides?: Partial<SuggestedFollowupsProps>,
): SuggestedFollowupsProps => ({
  suggestions: [{ text: 'Show me trail runners' }, { text: 'Cheaper alternatives' }],
  ...overrides,
})

export async function renderSuggestedFollowups(overrides?: Partial<SuggestedFollowupsProps>) {
  const props = suggestedFollowupsProps(overrides)
  const screen = await render(<SuggestedFollowups {...props} />)
  return {
    screen,
    props,
    group: () => screen.container.querySelector('[role="group"]'),
    buttonFor: (text: string) => screen.getByRole('button', { name: text }),
  }
}
