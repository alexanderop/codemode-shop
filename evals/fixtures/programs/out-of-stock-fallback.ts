export const program = /* ts */ `
  const { productIds } = await external_searchProducts({ limit: 5 })
  const products = await Promise.all(
    productIds.map((id) => external_getProduct({ id })),
  )

  let chosen = null
  for (const p of products) {
    const stock = await external_getStockAndShipping({
      productId: p.id,
      size: p.sizes[0],
      width: 'standard',
      zipCode: '94107',
    })
    if (stock.inStock) {
      chosen = { product: p, stock }
      break
    }
  }

  if (!chosen) {
    return { error: 'all out of stock' }
  }

  await ui_addProductCard({
    id: 'card',
    productId: chosen.product.id,
    name: chosen.product.name,
    brand: chosen.product.brand,
    price: chosen.product.price,
    imageUrl: chosen.product.imageUrl,
  })

  await ui_addStockPill({
    id: 'pill',
    parentId: 'card',
    inStock: chosen.stock.inStock,
    quantity: chosen.stock.quantity,
    arrivesBy: chosen.stock.arrivesBy,
  })

  await ui_addCTA({
    id: 'cta',
    label: 'Buy ' + chosen.product.name,
    handlerId: 'addToCart',
    payload: { productId: chosen.product.id, size: chosen.product.sizes[0] },
  })

  return { chosen: chosen.product.id }
`
