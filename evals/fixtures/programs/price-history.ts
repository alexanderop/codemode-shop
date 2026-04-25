export const program = /* ts */ `
  const { productIds } = await external_searchProducts({ limit: 1 })
  const id = productIds[0]
  const [p, history] = await Promise.all([
    external_getProduct({ id }),
    external_getPriceHistory({ productId: id, days: 14 }),
  ])

  await ui_addProductCard({
    id: 'card',
    productId: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    imageUrl: p.imageUrl,
  })

  await ui_addPriceSparkline({
    id: 'sp',
    parentId: 'card',
    points: history.points,
    currentPrice: history.currentPrice,
    lowestPrice: history.lowestPrice,
    highestPrice: history.highestPrice,
  })

  await ui_addCTA({
    id: 'cta',
    label: 'Add ' + p.name + ' to cart',
    handlerId: 'addToCart',
    payload: { productId: p.id, size: p.sizes[0] },
  })

  return { id }
`
