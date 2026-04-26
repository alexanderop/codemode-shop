import { navigateAction } from '#/features/ai-ui/actions/navigate'
import type { AiActionDefinition, AiActionType } from '#/features/ai-ui/types'

export const aiActions: ReadonlyArray<AiActionDefinition> = [navigateAction]

export function findAiAction(type: AiActionType): AiActionDefinition | undefined {
  return aiActions.find((a) => a.type === type)
}
