export function createStorefrontUIPrompt({ zipCode }: { zipCode: string }): string {
  const exampleZipCode = JSON.stringify(zipCode)

  return `## Render-on-the-fly UI

In addition to the catalog APIs, you have these UI-rendering functions inside execute_typescript. Call them to build the answer as a visual canvas while your code runs — the shopper sees the components appear live.

Each UI node has a unique \`id\` (your choice). Nodes can nest via \`parentId\`.

### Available UI functions

\`\`\`typescript
declare function ui_showLoading(input: {
  id: string
  parentId?: string
  label: string
}): Promise<{ ok: boolean }>

declare function ui_addProductCard(input: {
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
}): Promise<{ ok: boolean }>

declare function ui_addStockPill(input: {
  id: string
  parentId: string  // productCard id
  inStock: boolean
  quantity?: number
  arrivesBy?: string
  shippingCost?: number
}): Promise<{ ok: boolean }>

declare function ui_addPriceSparkline(input: {
  id: string
  parentId: string  // productCard id
  points: Array<{ date: string; price: number }>
  currentPrice: number
  lowestPrice: number
  highestPrice: number
}): Promise<{ ok: boolean }>

declare function ui_addReviewBar(input: {
  id: string
  parentId: string  // productCard id
  rating: number
  reviewCount: number
  praise: string[]
  complaints: string[]
}): Promise<{ ok: boolean }>

declare function ui_addComparisonTable(input: {
  id: string
  parentId?: string
  columnHeaders: string[]
  rows: Array<{ label: string; values: string[] }>
  winnerColumn?: number  // 0-indexed
}): Promise<{ ok: boolean }>

declare function ui_addCTA(input: {
  id: string
  parentId?: string
  label: string
  handlerId: 'addToCart'
  payload: {
    productId: string
    size: string
    width?: 'narrow' | 'standard' | 'wide'
    quantity?: number
  }
  variant?: 'primary' | 'secondary'
}): Promise<{ ok: boolean }>

declare function ui_addCartSummary(input: {
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
}): Promise<{ ok: boolean }>

declare function ui_update(input: {
  id: string
  props: Record<string, unknown>
}): Promise<{ ok: boolean }>

declare function ui_remove(input: { id: string }): Promise<{ ok: boolean }>
\`\`\`

### Recommended pattern

\`\`\`typescript
await ui_showLoading({ id: 'l', label: 'Searching…' })

const { productIds } = await external_searchProducts({ query: 'running', maxPrice: 160, size: '10' })
const rows = await Promise.all(productIds.slice(0, 3).map(async (id) => {
  const [p, ship, rev] = await Promise.all([
    external_getProduct({ id }),
    external_getStockAndShipping({ productId: id, size: '10', zipCode: ${exampleZipCode} }),
    external_getReviewSummary({ productId: id }),
  ])
  return { p, ship, rev }
}))

await ui_remove({ id: 'l' })

for (const [i, { p, ship, rev }] of rows.entries()) {
  const cardId = \`card-\${p.id}\`
  await ui_addProductCard({
    id: cardId,
    productId: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    imageUrl: p.imageUrl,
    rating: rev.averageRating,
    color: p.color,
    highlight: i === 0,
  })
  await ui_addStockPill({
    id: \`pill-\${p.id}\`, parentId: cardId,
    inStock: ship.inStock, quantity: ship.quantity, arrivesBy: ship.arrivesBy, shippingCost: ship.shippingCost,
  })
  await ui_addReviewBar({
    id: \`rev-\${p.id}\`, parentId: cardId,
    rating: rev.averageRating, reviewCount: rev.reviewCount,
    praise: rev.commonPraise, complaints: rev.commonComplaints,
  })
}

const best = rows[0]
await ui_addCTA({
  id: 'cta',
  label: \`Add \${best.p.name} to cart\`,
  handlerId: 'addToCart',
  payload: { productId: best.p.id, size: '10', quantity: 1 },
  variant: 'primary',
})

return \`\${best.p.brand} \${best.p.name} — best match at $\${best.p.price}.\`
\`\`\`

### Cart lookup pattern

When the shopper asks where the cart is, what is in the cart, whether anything
was added, or asks to see the cart, do not search products. Read the cart and
render it:

\`\`\`typescript
const cart = await external_getCart()
await ui_addCartSummary({ id: 'cart', ...cart })
return cart.itemCount === 0
  ? 'Your cart is empty right now.'
  : \`Your cart has \${cart.itemCount} item(s), subtotal $\${cart.subtotal}.\`
\`\`\`

### Rules

- Always \`await\` ui_* calls.
- Reuse the same \`id\` if you call \`ui_update\` later.
- Remove loaders before adding results so the canvas stays clean.
- For cart questions, \`ui_addCartSummary\` is the visual answer. Do not force product cards.
- The \`ctaButton\`'s \`handlerId\` must be exactly \`"addToCart"\`.`
}
