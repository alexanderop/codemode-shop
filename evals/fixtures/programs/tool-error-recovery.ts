export const program = /* ts */ `
  // Try a deliberately bad id first; the program must catch the throw and
  // fall back to a real search, still producing a visible recommendation.
  let chosen = null
  try {
    chosen = await external_getProduct({ id: 'no-such-product' })
  } catch (err) {
    const { productIds } = await external_searchProducts({ limit: 1 })
    chosen = await external_getProduct({ id: productIds[0] })
  }

  await ui_addProductCard({
    id: 'card',
    productId: chosen.id,
    name: chosen.name,
    brand: chosen.brand,
    price: chosen.price,
    imageUrl: chosen.imageUrl,
  })

  await ui_addCTA({
    id: 'cta',
    label: 'Buy ' + chosen.name,
    handlerId: 'addToCart',
    payload: { productId: chosen.id, size: chosen.sizes[0] },
  })

  return { recovered: chosen.id }
`
