import { z } from 'zod'
import { toolDefinition } from '@tanstack/ai'
import {
  PRODUCTS,
  REVIEWS,
  STOCK,
  addToCart as addToCartState,
  buildPriceHistory,
  getCart as getCartState,
  shippingEtaDays,
} from '#/lib/catalog'

const widthSchema = z.enum(['narrow', 'standard', 'wide'])

export const searchProducts = toolDefinition({
  name: 'searchProducts',
  description:
    'Search the shoe catalog. All filters are optional and combined (AND). Returns product IDs so you can then fetch details in parallel.',
  inputSchema: z.object({
    query: z.string().optional().describe('Free-text match against name/brand'),
    category: z
      .enum(['Running', 'Lifestyle', 'Trail', 'Basketball', 'Training', 'Racing'])
      .optional(),
    colors: z.array(z.string()).optional().describe('Substring match on color'),
    brand: z.string().optional(),
    maxPrice: z.number().optional(),
    minPrice: z.number().optional(),
    size: z.string().optional().describe('e.g. "10"'),
    width: widthSchema.optional(),
    limit: z.number().default(10),
  }),
  outputSchema: z.object({
    productIds: z.array(z.string()),
    totalMatches: z.number(),
  }),
}).server((input) => {
  const q = input.query?.toLowerCase()
  const matches = PRODUCTS.filter((p) => {
    if (q && !(`${p.name} ${p.brand}`.toLowerCase().includes(q))) return false
    if (input.category && p.category !== input.category) return false
    if (input.brand && p.brand.toLowerCase() !== input.brand.toLowerCase()) return false
    if (input.maxPrice != null && p.price > input.maxPrice) return false
    if (input.minPrice != null && p.price < input.minPrice) return false
    if (input.size && !p.sizes.includes(input.size)) return false
    if (input.width && !p.widths.includes(input.width)) return false
    if (input.colors?.length) {
      const colorLower = p.color.toLowerCase()
      if (!input.colors.some((c) => colorLower.includes(c.toLowerCase()))) return false
    }
    return true
  })
  return {
    productIds: matches.slice(0, input.limit).map((p) => p.id),
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
  const p = PRODUCTS.find((x) => x.id === id)
  if (!p) throw new Error(`Product not found: ${id}`)
  return p
})

export const getStockAndShipping = toolDefinition({
  name: 'getStockAndShipping',
  description:
    'Check stock for a specific size+width SKU and compute shipping ETA for a US zip code. arrivesBy is an ISO date.',
  inputSchema: z.object({
    productId: z.string(),
    size: z.string(),
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
  const row = STOCK.find(
    (s) => s.productId === productId && s.size === size && s.width === width,
  )
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
  const p = PRODUCTS.find((x) => x.id === productId)
  const r = REVIEWS[productId]
  if (!p || !r) throw new Error(`No reviews for ${productId}`)
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
    days: z.number().default(30),
  }),
  outputSchema: z.object({
    productId: z.string(),
    points: z.array(z.object({ date: z.string(), price: z.number() })),
    currentPrice: z.number(),
    lowestPrice: z.number(),
    highestPrice: z.number(),
  }),
}).server(({ productId, days }) => {
  const points = buildPriceHistory(productId, days)
  const prices = points.map((p) => p.price)
  return {
    productId,
    points,
    currentPrice: prices[prices.length - 1] ?? 0,
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
  }
})

export const addToCart = toolDefinition({
  name: 'addToCart',
  description: 'Add a product to the shopper’s cart. Returns the new cart total.',
  inputSchema: z.object({
    productId: z.string(),
    size: z.string(),
    width: widthSchema.default('standard'),
    quantity: z.number().default(1),
  }),
  outputSchema: z.object({
    itemCount: z.number(),
    lineCount: z.number(),
  }),
}).server((input) =>
  addToCartState({
    productId: input.productId,
    size: input.size,
    width: input.width ?? 'standard',
    quantity: input.quantity ?? 1,
  }),
)

export const getCart = toolDefinition({
  name: 'getCart',
  description:
    "Read the shopper's current cart. Returns one entry per product/size/width line, enriched with name, brand, and unit price, plus subtotal and total item count. Returns empty items if the cart is empty.",
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
    subtotal: z.number(),
  }),
}).server(() => {
  const items = getCartState().map((line) => {
    const p = PRODUCTS.find((x) => x.id === line.productId)
    const unitPrice = p?.price ?? 0
    return {
      productId: line.productId,
      name: p?.name ?? 'Unknown',
      brand: p?.brand ?? 'Unknown',
      size: line.size,
      width: line.width,
      quantity: line.quantity,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
    }
  })
  return {
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: items.reduce((n, i) => n + i.lineTotal, 0),
  }
})

export const catalogTools = [
  searchProducts,
  getProduct,
  getStockAndShipping,
  getReviewSummary,
  getPriceHistory,
  addToCart,
  getCart,
]
