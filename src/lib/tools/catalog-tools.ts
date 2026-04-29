import { z } from 'zod'
import { toolDefinition } from '@tanstack/ai'
import {
  PRODUCTS,
  PRODUCT_BY_ID,
  REVIEWS,
  SEARCH_HAYSTACK,
  WIDTHS,
  buildPriceHistory,
  findStock,
  shippingEtaDays,
} from '#/lib/catalog'
import { getCart, mutateCart } from '#/lib/cart'
import { getOrder as getOrderState, placeOrder as placeOrderState } from '#/lib/orders'
import { processFakePayment } from '#/lib/payment'
import { sessionContext, type SessionId } from '#/lib/session-context'

const widthSchema = z.enum(WIDTHS)
const categories = ['Running', 'Lifestyle', 'Trail', 'Basketball', 'Training', 'Racing'] as const
const categorySchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const normalized = value.toLowerCase()
  return categories.find((category) => category.toLowerCase() === normalized) ?? value
}, z.enum(categories))
const SEARCH_STOP_WORDS = new Set([
  'shoe',
  'shoes',
  'under',
  'over',
  'size',
  'top',
  'rated',
  'best',
  'three',
  'compare',
  'with',
  'and',
  'for',
  'the',
  'that',
  'are',
  'in',
])

function queryTokens(query: unknown): Array<string> {
  if (typeof query !== 'string' || !query) return []
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2)
    .filter((token) => !SEARCH_STOP_WORDS.has(token))
    .filter((token) => !/^\d+$/.test(token))
}

function normalizeCategory(value: unknown): (typeof categories)[number] | undefined {
  if (value == null) return undefined
  const normalized = String(value).toLowerCase()
  return categories.find((category) => category.toLowerCase() === normalized)
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined
  return String(value)
}

export const searchProducts = toolDefinition({
  name: 'searchProducts',
  description:
    'Search the shoe catalog. All filters are optional and combined (AND). Returns product IDs so you can then fetch details in parallel.',
  inputSchema: z.object({
    query: z.string().optional().describe('Free-text match against name/brand'),
    category: categorySchema.optional(),
    colors: z.array(z.string()).optional().describe('Substring match on color'),
    brand: z.string().optional(),
    maxPrice: z.coerce.number().optional(),
    minPrice: z.coerce.number().optional(),
    size: z.coerce.string().optional().describe('e.g. "10"'),
    width: widthSchema.optional(),
    limit: z.coerce.number().default(10),
  }),
  outputSchema: z.object({
    productIds: z.array(z.string()),
    totalMatches: z.number(),
  }),
}).server((input) => {
  const raw = input as Record<string, unknown>
  const tokens = queryTokens(raw.query)
  const category = normalizeCategory(raw.category)
  const maxPrice = optionalNumber(raw.maxPrice)
  const minPrice = optionalNumber(raw.minPrice)
  const size = optionalString(raw.size)
  const limit = optionalNumber(raw.limit) ?? 10
  const brandLower =
    typeof raw.brand === 'string' && raw.brand ? raw.brand.toLowerCase() : undefined
  const colorsLower = Array.isArray(raw.colors)
    ? raw.colors.map((c) => String(c).toLowerCase())
    : undefined
  const matches = PRODUCTS.filter((p) => {
    if (tokens.length) {
      const haystack = SEARCH_HAYSTACK.get(p.id)!
      if (!tokens.some((token) => haystack.includes(token))) return false
    }
    if (category && p.category !== category) return false
    if (brandLower && p.brand.toLowerCase() !== brandLower) return false
    if (maxPrice != null && p.price > maxPrice) return false
    if (minPrice != null && p.price < minPrice) return false
    if (size && !p.sizes.includes(size)) return false
    if (raw.width && !p.widths.includes(raw.width as never)) return false
    if (colorsLower?.length) {
      const colorLower = p.color.toLowerCase()
      if (!colorsLower.some((c) => colorLower.includes(c))) return false
    }
    return true
  })
  return {
    productIds: matches.slice(0, limit).map((p) => p.id),
    totalMatches: matches.length,
  }
})

export const getProduct = toolDefinition({
  name: 'getProduct',
  description: 'Get full product details for a single product by id.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    brand: z.string(),
    price: z.number(),
    category: z.string(),
    color: z.string(),
    imageUrl: z.string(),
    sizes: z.array(z.string()),
    widths: z.array(z.string()),
    rating: z.number(),
    reviewCount: z.number(),
  }),
}).server(({ id }) => {
  const p = PRODUCT_BY_ID.get(id)
  if (!p) throw new Error(`Product not found: ${id}`)
  return p
})

export const getStockAndShipping = toolDefinition({
  name: 'getStockAndShipping',
  description:
    'Check stock for a specific size+width SKU and compute shipping ETA for a US zip code. arrivesBy is an ISO date.',
  inputSchema: z.object({
    productId: z.string(),
    size: z.coerce.string(),
    width: widthSchema.default('standard'),
    zipCode: z.string().describe('5-digit US zip'),
  }),
  outputSchema: z.object({
    inStock: z.boolean(),
    quantity: z.number(),
    arrivesBy: z.string(),
    shippingCost: z.number(),
  }),
}).server(({ productId, size, width, zipCode }) => {
  const row = findStock(productId, String(size), width ?? 'standard')
  const quantity = row?.quantity ?? 0
  const days = shippingEtaDays(zipCode)
  const arrival = new Date()
  arrival.setDate(arrival.getDate() + days)
  return {
    inStock: quantity > 0,
    quantity,
    arrivesBy: arrival.toISOString().slice(0, 10),
    shippingCost: days <= 2 ? 12 : days <= 3 ? 7 : 0,
  }
})

export const getReviewSummary = toolDefinition({
  name: 'getReviewSummary',
  description:
    'Summary of a product’s reviews: average rating, review count, and the most common praise + complaints.',
  inputSchema: z.object({ productId: z.string() }),
  outputSchema: z.object({
    averageRating: z.number(),
    reviewCount: z.number(),
    commonPraise: z.array(z.string()),
    commonComplaints: z.array(z.string()),
  }),
}).server(({ productId }) => {
  const p = PRODUCT_BY_ID.get(productId)
  const r = REVIEWS[productId]
  if (!p || !r) throw new Error(`Unknown product: ${productId}`)
  return {
    averageRating: r.rating,
    reviewCount: p.reviewCount,
    commonPraise: r.commonPraise,
    commonComplaints: r.commonComplaints,
  }
})

export const getPriceHistory = toolDefinition({
  name: 'getPriceHistory',
  description: 'Get daily price history for a product (default last 30 days).',
  inputSchema: z.object({
    productId: z.string(),
    days: z.coerce.number().default(30),
  }),
  outputSchema: z.object({
    productId: z.string(),
    points: z.array(z.object({ date: z.string(), price: z.number() })),
    currentPrice: z.number(),
    lowestPrice: z.number(),
    highestPrice: z.number(),
  }),
}).server(({ productId, days }) => {
  const points = buildPriceHistory(productId, optionalNumber(days) ?? 30)
  const prices = points.map((p) => p.price)
  return {
    productId,
    points,
    currentPrice: prices[prices.length - 1] ?? 0,
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
  }
})

const shippingAddressSchema = z.object({
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
})

const orderLineSchema = z.object({
  productId: z.string(),
  name: z.string(),
  brand: z.string(),
  size: z.string(),
  width: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
})

function cartSummary(cart: { itemCount: number; items: ReadonlyArray<unknown> }) {
  return { itemCount: cart.itemCount, lineCount: cart.items.length }
}

const orderSchema = z.object({
  id: z.string(),
  lines: z.array(orderLineSchema),
  itemCount: z.number(),
  subtotal: z.number(),
  shippingCost: z.number(),
  tax: z.number(),
  total: z.number(),
  shippingAddress: shippingAddressSchema,
  paymentLast4: z.string(),
  status: z.enum(['placed', 'shipped', 'delivered']),
  arrivesBy: z.string(),
  createdAt: z.string(),
})

export const catalogTools = [
  searchProducts,
  getProduct,
  getStockAndShipping,
  getReviewSummary,
  getPriceHistory,
]

export function createSessionScopedCatalogTools(sessionId: SessionId) {
  const inSession = <T>(fn: () => T): T => sessionContext.run({ sessionId }, fn)

  const addToCart = toolDefinition({
    name: 'addToCart',
    description: 'Add a product to the shopper’s cart. Returns the new cart total.',
    inputSchema: z.object({
      productId: z.string(),
      size: z.coerce.string(),
      width: widthSchema.default('standard'),
      quantity: z.coerce.number().default(1),
    }),
    outputSchema: z.object({
      itemCount: z.number(),
      lineCount: z.number(),
    }),
  }).server((input) =>
    inSession(() =>
      cartSummary(
        mutateCart({
          action: 'add',
          productId: input.productId,
          size: String(input.size),
          width: input.width ?? 'standard',
          quantity: optionalNumber(input.quantity) ?? 1,
        }),
      ),
    ),
  )

  const getCartTool = toolDefinition({
    name: 'getCart',
    description:
      "Read the shopper's current cart. Returns one entry per product/size/width line, enriched with name, brand, and unit price, plus subtotal, total item count, and the number of distinct lines. Returns empty items if the cart is empty.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      items: z.array(
        z.object({
          productId: z.string(),
          name: z.string(),
          brand: z.string(),
          size: z.string(),
          width: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          lineTotal: z.number(),
        }),
      ),
      itemCount: z.number(),
      lineCount: z.number(),
      subtotal: z.number(),
    }),
  }).server(() =>
    inSession(() => {
      const cart = getCart()
      return { ...cart, lineCount: cart.items.length }
    }),
  )

  const removeFromCart = toolDefinition({
    name: 'removeFromCart',
    description: 'Remove a single line (productId + size + width) from the cart entirely.',
    inputSchema: z.object({
      productId: z.string(),
      size: z.coerce.string(),
      width: widthSchema.default('standard'),
    }),
    outputSchema: z.object({
      itemCount: z.number(),
      lineCount: z.number(),
    }),
  }).server(({ productId, size, width }) =>
    inSession(() =>
      cartSummary(
        mutateCart({
          action: 'remove',
          productId,
          size: String(size),
          width: width ?? 'standard',
        }),
      ),
    ),
  )

  const setCartQuantity = toolDefinition({
    name: 'setCartQuantity',
    description: 'Set the quantity of a cart line. quantity = 0 removes the line.',
    inputSchema: z.object({
      productId: z.string(),
      size: z.coerce.string(),
      width: widthSchema.default('standard'),
      quantity: z.coerce.number(),
    }),
    outputSchema: z.object({
      itemCount: z.number(),
      lineCount: z.number(),
    }),
  }).server(({ productId, size, width, quantity }) =>
    inSession(() =>
      cartSummary(
        mutateCart({
          action: 'set',
          productId,
          size: String(size),
          width: width ?? 'standard',
          quantity: optionalNumber(quantity) ?? 0,
        }),
      ),
    ),
  )

  const clearCart = toolDefinition({
    name: 'clearCart',
    description: 'Empty the cart completely.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      itemCount: z.number(),
      lineCount: z.number(),
    }),
  }).server(() => inSession(() => cartSummary(mutateCart({ action: 'clear' }))))

  const placeOrder = toolDefinition({
    name: 'placeOrder',
    description:
      'Run the fake payment processor and place an order with the current cart. Clears the cart on success. Always succeeds for any well-formed card after a ~1.5s simulated delay.',
    inputSchema: z.object({
      shippingAddress: shippingAddressSchema,
      payment: z.object({
        cardNumber: z.string(),
        expiry: z.string().describe('MM/YY'),
        cvc: z.string(),
      }),
    }),
    outputSchema: orderSchema,
  }).server(async ({ shippingAddress, payment }) => {
    const cart = inSession(() => getCart())
    if (cart.items.length === 0) {
      throw new Error('Cart is empty')
    }
    const result = await processFakePayment({ ...payment, amount: cart.subtotal })
    return inSession(() => placeOrderState({ shippingAddress, paymentLast4: result.last4 }))
  })

  const getOrder = toolDefinition({
    name: 'getOrder',
    description: 'Fetch a previously placed order by id.',
    inputSchema: z.object({ id: z.string() }),
    outputSchema: orderSchema,
  }).server(({ id }) => {
    const order = inSession(() => getOrderState(id))
    if (!order) throw new Error(`Order not found: ${id}`)
    return order
  })

  return [addToCart, getCartTool, removeFromCart, setCartQuantity, clearCart, placeOrder, getOrder]
}
