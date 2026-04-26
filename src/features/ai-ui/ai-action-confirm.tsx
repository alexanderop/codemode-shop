import { useEffect } from 'react'
import { toast } from 'sonner'
import { aiUiStore, usePendingAiAction } from '#/features/ai-ui/store'
import { findAiAction } from '#/features/ai-ui/registry'

export function AiActionConfirm() {
  const pending = usePendingAiAction()

  useEffect(() => {
    if (!pending) return
    const def = findAiAction(pending.type)
    if (!def) {
      aiUiStore.dismiss()
      return
    }

    if (def.mode === 'immediate') {
      void aiUiStore.commit()
      return
    }

    const proposed = pending
    const payload = proposed.payload as never
    const id = toast(def.confirmLabel(payload), {
      description: def.confirmDescription(payload),
      duration: 5000,
      action: {
        label: 'Open',
        onClick: () => void aiUiStore.commit(),
      },
      cancel: {
        label: 'Dismiss',
        onClick: () => aiUiStore.dismiss(),
      },
      onAutoClose: () => {
        if (aiUiStore.getPending() === proposed) aiUiStore.dismiss()
      },
    })

    return () => {
      toast.dismiss(id)
    }
  }, [pending])

  return null
}
