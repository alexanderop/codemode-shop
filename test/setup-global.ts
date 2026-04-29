import { beforeEach, vi } from 'vitest'
import { uiStore } from '#/features/storefront/stores/ui-store'
import { activityStore } from '#/features/storefront/stores/activity-store'
import { assistantUi } from '#/stores/assistant-ui'

import './guards'

vi.mock('@tanstack/react-start', () => {
  const makeServerFnBuilder = () => {
    const builder: Record<string, unknown> = {}
    builder.middleware = () => builder
    builder.inputValidator = () => builder
    builder.handler = () => vi.fn()
    return builder
  }
  const makeMiddlewareBuilder = () => {
    const m: Record<string, unknown> = {}
    m.server = () => m
    m.middleware = () => m
    return m
  }
  return {
    createServerFn: () => makeServerFnBuilder(),
    createMiddleware: () => makeMiddlewareBuilder(),
  }
})

vi.mock('@tanstack/react-start/server', () => ({
  getCookie: () => undefined,
  setCookie: () => {},
}))

beforeEach(() => {
  uiStore.clear()
  activityStore.clear()
  assistantUi.close()
})
