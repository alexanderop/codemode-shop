import { beforeEach } from 'vitest'
import { uiStore } from '#/features/storefront/stores/ui-store'
import { activityStore } from '#/features/storefront/stores/activity-store'
import { clientCart } from '#/stores/client-cart'
import { assistantUi } from '#/stores/assistant-ui'

import './guards'

beforeEach(() => {
  uiStore.clear()
  activityStore.clear()
  clientCart.set({ items: [], itemCount: 0, subtotal: 0 })
  assistantUi.close()
})
