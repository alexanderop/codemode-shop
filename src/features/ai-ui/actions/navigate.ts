import { z } from 'zod'
import { defineAiAction } from '#/features/ai-ui/types'

export const navigateTargets = ['/', '/cart', '/checkout'] as const
export type NavigateTarget = (typeof navigateTargets)[number]

export const navigateSchema = z.object({
  to: z.enum(navigateTargets),
  reason: z.string().min(1).describe('Short user-facing sentence shown in the confirmation toast'),
})

export type NavigatePayload = z.infer<typeof navigateSchema>

const targetLabels: Record<NavigateTarget, string> = {
  '/': 'the storefront',
  '/cart': 'your cart',
  '/checkout': 'checkout',
}

export const navigateAction = defineAiAction({
  type: 'navigate',
  functionName: 'ui_navigate',
  mode: 'proposed',
  description:
    'Propose a route change to the shopper. They see a confirmation toast and choose whether to navigate. Use only when a dedicated page is the better answer than an inline canvas component.',
  payloadSchema: navigateSchema,
  promptDeclaration: `declare function ui_navigate(input: {
  to: '/' | '/cart' | '/checkout'
  reason: string  // one-sentence explanation shown in the confirmation toast
}): Promise<{ ok: boolean }>`,
  confirmLabel: (p) => `Open ${targetLabels[p.to]}`,
  confirmDescription: (p) => p.reason,
})
