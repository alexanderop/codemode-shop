export const program = /* ts */ `
  const { productIds } = await external_searchProducts({ limit: 3 })
  const products = await Promise.all(
    productIds.map((id) => external_getProduct({ id })),
  )

  for (const p of products) {
    await ui_addProductCard({
      id: 'card-' + p.id,
      productId: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      imageUrl: p.imageUrl,
    })
  }

  const winner = products[0]
  await ui_addCTA({
    id: 'cta',
    label: 'Add ' + winner.name + ' to cart',
    handlerId: 'addToCart',
    payload: { productId: winner.id, size: winner.sizes[0] },
  })

  return { recommended: winner.id, count: products.length }
`
