export const program = /* ts */ `
  const { productIds } = await external_searchProducts({ limit: 2 })
  const [a, b] = await Promise.all(
    productIds.map((id) => external_getProduct({ id })),
  )

  await ui_addComparisonTable({
    id: 'cmp',
    columnHeaders: [a.name, b.name],
    rows: [
      { label: 'Brand', values: [a.brand, b.brand] },
      { label: 'Price', values: ['$' + a.price, '$' + b.price] },
      { label: 'Color', values: [a.color, b.color] },
    ],
    winnerColumn: a.price <= b.price ? 0 : 1,
  })

  const winner = a.price <= b.price ? a : b
  await ui_addCTA({
    id: 'cta',
    label: 'Buy ' + winner.name,
    handlerId: 'addToCart',
    payload: { productId: winner.id, size: winner.sizes[0] },
  })

  return { winner: winner.id }
`
