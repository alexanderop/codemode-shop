import { render } from 'vitest-browser-react'
import { Loading } from '#/features/storefront/components/canvas/loading'
import type { LoadingProps } from '#/features/storefront/types/ui-types'

export const loadingProps = (overrides?: Partial<LoadingProps>): LoadingProps => ({
  label: 'Searching for shoes…',
  ...overrides,
})

export async function renderLoading(overrides?: Partial<LoadingProps>) {
  const props = loadingProps(overrides)
  const screen = await render(<Loading {...props} />)
  return {
    screen,
    props,
    label: screen.getByText(props.label),
  }
}
