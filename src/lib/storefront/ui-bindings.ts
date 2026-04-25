import { z } from 'zod'
import { convertSchemaToJsonSchema } from '@tanstack/ai'
import type { ToolBinding, ToolExecutionContext } from '@tanstack/ai-code-mode'
import type { ComponentPropsByType, ComponentType, UIEvent } from './ui-types'

function binding<T extends z.ZodType>(
  name: string,
  description: string,
  schema: T,
  toEvent: (input: z.infer<T>) => UIEvent,
): ToolBinding {
  return {
    name,
    description,
    inputSchema: convertSchemaToJsonSchema(schema) || {
      type: 'object',
      properties: {},
    },
    outputSchema: convertSchemaToJsonSchema(z.object({ ok: z.boolean() })),
    execute: async (args: unknown, context?: ToolExecutionContext) => {
      const parsed = schema.parse(args)
      const event = toEvent(parsed)
      context?.emitCustomEvent?.('storefront:ui', event)
      return { ok: true }
    },
  }
}

function component<T extends z.ZodRawShape>(
  type: ComponentType,
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
    switch (type) {
      case 'loading':
        return {
          op: 'add',
          id,
          type: 'loading',
          parentId,
          props: props as unknown as ComponentPropsByType['loading'],
        }
      case 'productCard':
        return {
          op: 'add',
          id,
          type: 'productCard',
          parentId,
          props: props as unknown as ComponentPropsByType['productCard'],
        }
      case 'stockPill':
        return {
          op: 'add',
          id,
          type: 'stockPill',
          parentId,
          props: props as unknown as ComponentPropsByType['stockPill'],
        }
      case 'priceSparkline':
        return {
          op: 'add',
          id,
          type: 'priceSparkline',
          parentId,
          props: props as unknown as ComponentPropsByType['priceSparkline'],
        }
      case 'reviewBar':
        return {
          op: 'add',
          id,
          type: 'reviewBar',
          parentId,
          props: props as unknown as ComponentPropsByType['reviewBar'],
        }
      case 'comparisonTable':
        return {
          op: 'add',
          id,
          type: 'comparisonTable',
          parentId,
          props: props as unknown as ComponentPropsByType['comparisonTable'],
        }
      case 'ctaButton':
        return {
          op: 'add',
          id,
          type: 'ctaButton',
          parentId,
          props: props as unknown as ComponentPropsByType['ctaButton'],
        }
    }
  })
}

const widthSchema = z.enum(['narrow', 'standard', 'wide'])

export function createStorefrontUIBindings(): Record<string, ToolBinding> {
  return {
    ui_showLoading: component(
      'loading',
      'Show a loading placeholder while you fetch data. Remove it with ui_remove when results are ready.',
      'ui_showLoading',
      { label: z.string() },
    ),

    ui_addProductCard: component(
      'productCard',
      'Render a product card in the canvas. Use one per candidate match.',
      'ui_addProductCard',
      {
        productId: z.string(),
        name: z.string(),
        brand: z.string(),
        price: z.number(),
        imageUrl: z.string(),
        rating: z.number().optional(),
        color: z.string().optional(),
        highlight: z.boolean().optional(),
      },
    ),

    ui_addStockPill: component(
      'stockPill',
      'Attach a stock/shipping pill to a product card. parentId must be the productCard id.',
      'ui_addStockPill',
      {
        inStock: z.boolean(),
        quantity: z.number().optional(),
        arrivesBy: z.string().optional(),
        shippingCost: z.number().optional(),
      },
    ),

    ui_addPriceSparkline: component(
      'priceSparkline',
      "Attach a tiny price-history chart to a product card. Use the output of external_getPriceHistory directly. parentId must be the productCard id.",
      'ui_addPriceSparkline',
      {
        points: z.array(z.object({ date: z.string(), price: z.number() })),
        currentPrice: z.number(),
        lowestPrice: z.number(),
        highestPrice: z.number(),
      },
    ),

    ui_addReviewBar: component(
      'reviewBar',
      'Attach a review summary (rating + top praise + top complaints) to a product card. parentId must be the productCard id.',
      'ui_addReviewBar',
      {
        rating: z.number(),
        reviewCount: z.number(),
        praise: z.array(z.string()),
        complaints: z.array(z.string()),
      },
    ),

    ui_addComparisonTable: component(
      'comparisonTable',
      'Side-by-side comparison of 2–4 products. Set winnerColumn (0-indexed) to flag the best pick.',
      'ui_addComparisonTable',
      {
        columnHeaders: z.array(z.string()),
        rows: z.array(
          z.object({
            label: z.string(),
            values: z.array(z.string()),
          }),
        ),
        winnerColumn: z.number().optional(),
      },
    ),

    ui_addCTA: component(
      'ctaButton',
      'Add a call-to-action button. handlerId routes the click back to the server.',
      'ui_addCTA',
      {
        label: z.string(),
        handlerId: z.literal('addToCart'),
        payload: z.object({
          productId: z.string(),
          size: z.string(),
          width: widthSchema.optional(),
          quantity: z.number().optional(),
        }),
        variant: z.enum(['primary', 'secondary']).optional(),
      },
    ),

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
