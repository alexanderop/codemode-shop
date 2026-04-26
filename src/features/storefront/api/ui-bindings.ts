import { z } from 'zod'
import type { ToolBinding } from '@tanstack/ai-code-mode'
import type { ComponentPropsByType, UIEvent } from '#/features/storefront/types/ui-types'
import { storefrontUIPrimitives } from '#/features/storefront/api/ui-registry'
import { makeBinding } from '#/lib/code-mode-binding'

function binding<T extends z.ZodType>(
  name: string,
  description: string,
  schema: T,
  toEvent: (input: z.infer<T>) => UIEvent,
): ToolBinding {
  return makeBinding(name, description, schema, async (parsed, context) => {
    const event = toEvent(parsed)
    context?.emitCustomEvent?.('storefront:ui', event)
    return { ok: true }
  })
}

function component<T extends z.ZodRawShape>(
  type: keyof ComponentPropsByType,
  description: string,
  name: string,
  propsShape: T,
) {
  const schema = z
    .object({
      id: z.string().describe('Unique id for this component — reuse to update'),
      parentId: z.string().optional(),
    })
    .extend(propsShape)
  return binding(name, description, schema, (input) => {
    const { id, parentId, ...props } = input as {
      id: string
      parentId?: string
    } & Record<string, unknown>
    return {
      op: 'add',
      id,
      type,
      parentId,
      props: props as unknown as ComponentPropsByType[typeof type],
    } as UIEvent
  })
}

export function createStorefrontUIBindings(): Record<string, ToolBinding> {
  const bindings = Object.fromEntries(
    storefrontUIPrimitives.map((primitive) => [
      primitive.functionName,
      component(
        primitive.type,
        primitive.description,
        primitive.functionName,
        primitive.propsShape as unknown as z.ZodRawShape,
      ),
    ]),
  )

  return {
    ...bindings,
    ui_update: binding(
      'ui_update',
      'Patch props on a previously added component (merges into its props).',
      z.object({ id: z.string(), props: z.record(z.string(), z.unknown()) }),
      ({ id, props }) => ({ op: 'update', id, props }),
    ),

    ui_remove: binding(
      'ui_remove',
      'Remove a component by id.',
      z.object({ id: z.string() }),
      ({ id }) => ({ op: 'remove', id }),
    ),
  }
}
