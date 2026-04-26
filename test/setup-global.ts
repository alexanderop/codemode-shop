import { beforeEach } from 'vitest'
import { uiStore } from '#/features/storefront/stores/ui-store'
import { activityStore } from '#/features/storefront/stores/activity-store'
import { assistantUi } from '#/stores/assistant-ui'

import './guards'

beforeEach(() => {
  uiStore.clear()
  activityStore.clear()
  assistantUi.close()
})
