import { z } from 'zod'
import { WIDTHS } from '#/lib/catalog'
import type { ComponentType } from '#/features/storefront/types/ui-types'

const widthSchema = z.enum(WIDTHS)
const widthUnion = WIDTHS.map((w) => `'${w}'`).join(' | ')

export type UIPrimitiveDefinition = {
  type: ComponentType
  functionName: string
  description: string
  propsShape: z.ZodRawShape
  promptDeclaration: string
}

export const storefrontUIPrimitives = [
  {
    type: 'loading',
    functionName: 'ui_showLoading',
    description:
      'Show a loading placeholder while you fetch data. Remove it with ui_remove when results are ready.',
    propsShape: { label: z.string() },
    promptDeclaration: `declare function ui_showLoading(input: {
  id: string
  parentId?: string
  label: string
}): Promise<{ ok: boolean }>`,
  },
  {
    type: 'productCard',
    functionName: 'ui_addProductCard',
    description: 'Render a product card in the canvas. Use one per candidate match.',
    propsShape: {
      productId: z.string(),
      name: z.string(),
      brand: z.string(),
      price: z.number(),
      imageUrl: z.string(),
      rating: z.number().optional(),
      color: z.string().optional(),
      highlight: z.boolean().optional(),
    },
    promptDeclaration: `declare function ui_addProductCard(input: {
  id: string
  parentId?: string
  productId: string
  name: string
  brand: string
  price: number
  imageUrl: string
  rating?: number
  color?: string
  highlight?: boolean
}): Promise<{ ok: boolean }>`,
  },
  {
    type: 'stockPill',
    functionName: 'ui_addStockPill',
    description:
      'Attach a stock/shipping pill to a product card. parentId must be the productCard id.',
    propsShape: {
      inStock: z.boolean(),
      quantity: z.number().optional(),
      arrivesBy: z.string().optional(),
      shippingCost: z.number().optional(),
    },
    promptDeclaration: `declare function ui_addStockPill(input: {
  id: string
  parentId: string  // productCard id
  inStock: boolean
  quantity?: number
  arrivesBy?: string
  shippingCost?: number
}): Promise<{ ok: boolean }>`,
  },
  {
    type: 'priceSparkline',
    functionName: 'ui_addPriceSparkline',
    description:
      'Attach a tiny price-history chart to a product card. Use the output of external_getPriceHistory directly. parentId must be the productCard id.',
    propsShape: {
      points: z.array(z.object({ date: z.string(), price: z.number() })),
      currentPrice: z.number(),
      lowestPrice: z.number(),
      highestPrice: z.number(),
    },
    promptDeclaration: `declare function ui_addPriceSparkline(input: {
  id: string
  parentId: string  // productCard id
  points: Array<{ date: string; price: number }>
  currentPrice: number
  lowestPrice: number
  highestPrice: number
}): Promise<{ ok: boolean }>`,
  },
  {
    type: 'reviewBar',
    functionName: 'ui_addReviewBar',
    description:
      'Attach a review summary (rating + top praise + top complaints) to a product card. parentId must be the productCard id.',
    propsShape: {
      rating: z.number(),
      reviewCount: z.number(),
      praise: z.array(z.string()),
      complaints: z.array(z.string()),
    },
    promptDeclaration: `declare function ui_addReviewBar(input: {
  id: string
  parentId: string  // productCard id
  rating: number
  reviewCount: number
  praise: string[]
  complaints: string[]
}): Promise<{ ok: boolean }>`,
  },
  {
    type: 'comparisonTable',
    functionName: 'ui_addComparisonTable',
    description:
      'Side-by-side comparison of 2-4 products. Set winnerColumn (0-indexed) to flag the best pick.',
    propsShape: {
      columnHeaders: z.array(z.string()),
      rows: z.array(
        z.object({
          label: z.string(),
          values: z.array(z.string()),
        }),
      ),
      winnerColumn: z.number().optional(),
    },
    promptDeclaration: `declare function ui_addComparisonTable(input: {
  id: string
  parentId?: string
  columnHeaders: string[]
  rows: Array<{ label: string; values: string[] }>
  winnerColumn?: number  // 0-indexed
}): Promise<{ ok: boolean }>`,
  },
  {
    type: 'ctaButton',
    functionName: 'ui_addCTA',
    description: 'Add a call-to-action button. handlerId routes the click back to the server.',
    propsShape: {
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
    promptDeclaration: `declare function ui_addCTA(input: {
  id: string
  parentId?: string
  label: string
  handlerId: 'addToCart'
  payload: {
    productId: string
    size: string
    width?: ${widthUnion}
    quantity?: number
  }
  variant?: 'primary' | 'secondary'
}): Promise<{ ok: boolean }>`,
  },
  {
    type: 'cartSummary',
    functionName: 'ui_addCartSummary',
    description:
      "Render the shopper's current cart contents, including empty-cart state, line totals, item count, and subtotal. The rendered cart is interactive — the shopper can adjust quantities, remove lines, and proceed to checkout right inside the canvas.",
    propsShape: {
      items: z.array(
        z.object({
          productId: z.string(),
          name: z.string(),
          brand: z.string(),
          size: z.string(),
          width: widthSchema,
          quantity: z.number(),
          unitPrice: z.number(),
          lineTotal: z.number(),
        }),
      ),
      itemCount: z.number(),
      subtotal: z.number(),
    },
    promptDeclaration: `declare function ui_addCartSummary(input: {
  id: string
  parentId?: string
  items: Array<{
    productId: string
    name: string
    brand: string
    size: string
    width: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
  itemCount: number
  subtotal: number
}): Promise<{ ok: boolean }>`,
  },
  {
    type: 'checkoutForm',
    functionName: 'ui_addCheckoutForm',
    description:
      'Render an interactive checkout form (address + fake payment). The shopper fills it in and submits — submission runs the fake payment, places the order, and navigates to the order confirmation page. Use this when the shopper says they want to check out / pay / place the order, instead of trying to collect their address and card number through chat.',
    propsShape: {
      subtotal: z.number(),
      lineCount: z.number(),
    },
    promptDeclaration: `declare function ui_addCheckoutForm(input: {
  id: string
  parentId?: string
  subtotal: number
  lineCount: number
}): Promise<{ ok: boolean }>`,
  },
  {
    type: 'orderConfirmation',
    functionName: 'ui_addOrderConfirmation',
    description:
      'Render an order confirmation receipt after external_placeOrder succeeds. Pass the full Order returned by placeOrder.',
    propsShape: {
      orderId: z.string(),
      lines: z.array(
        z.object({
          productId: z.string(),
          name: z.string(),
          brand: z.string(),
          size: z.string(),
          width: widthSchema,
          quantity: z.number(),
          unitPrice: z.number(),
          lineTotal: z.number(),
        }),
      ),
      itemCount: z.number(),
      subtotal: z.number(),
      shippingCost: z.number(),
      tax: z.number(),
      total: z.number(),
      shippingAddress: z.object({
        fullName: z.string(),
        line1: z.string(),
        line2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
      }),
      paymentLast4: z.string(),
      arrivesBy: z.string(),
    },
    promptDeclaration: `declare function ui_addOrderConfirmation(input: {
  id: string
  parentId?: string
  orderId: string
  lines: Array<{
    productId: string
    name: string
    brand: string
    size: string
    width: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
  itemCount: number
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  shippingAddress: {
    fullName: string
    line1: string
    line2?: string
    city: string
    state: string
    zipCode: string
  }
  paymentLast4: string
  arrivesBy: string
}): Promise<{ ok: boolean }>`,
  },
  {
    type: 'suggestedFollowups',
    functionName: 'ui_addSuggestedFollowups',
    description:
      'Render 2-3 short tappable next-step prompts after a substantive answer. Each suggestion is a phrase the shopper might tap to continue the conversation (e.g. "Show cheaper options", "Add to cart", "Compare with the Pegasus"). Skip for trivial answers and error responses.',
    propsShape: {
      suggestions: z
        .array(z.object({ text: z.string() }))
        .min(1)
        .max(4),
    },
    promptDeclaration: `declare function ui_addSuggestedFollowups(input: {
  id: string
  parentId?: string
  suggestions: Array<{ text: string }>  // 2-3 short phrases the shopper might tap
}): Promise<{ ok: boolean }>`,
  },
] satisfies Array<UIPrimitiveDefinition>

export const storefrontUIPrimitiveTypes = new Set<ComponentType>(
  storefrontUIPrimitives.map((primitive) => primitive.type),
)

export function createStorefrontUIPromptDeclarations(): string {
  return storefrontUIPrimitives.map((primitive) => primitive.promptDeclaration).join('\n\n')
}
