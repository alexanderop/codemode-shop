import { useHotkey } from '@tanstack/react-hotkeys'
import { StorekeeperDrawer } from '#/features/storefront/components/storekeeper-drawer'
import { assistantUi, useAssistantOpen } from '#/stores/assistant-ui'

export function AssistantShortcut() {
  const open = useAssistantOpen()

  useHotkey('Mod+K', () => {
    assistantUi.toggle()
  })

  return <StorekeeperDrawer open={open} onOpenChange={assistantUi.set} />
}
