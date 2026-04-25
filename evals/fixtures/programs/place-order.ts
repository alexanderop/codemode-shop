export const program = /* ts */ `
  const { productIds } = await external_searchProducts({ limit: 1, category: 'Lifestyle' })
  const p = await external_getProduct({ id: productIds[0] })

  await external_addToCart({
    productId: p.id,
    size: p.sizes[0],
    width: p.widths[0],
    quantity: 1,
  })

  await ui_addProductCard({
    id: 'card-' + p.id,
    productId: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    imageUrl: p.imageUrl,
  })

  await ui_addCTA({
    id: 'cta',
    label: 'Order placed',
    handlerId: 'addToCart',
    payload: { productId: p.id, size: p.sizes[0] },
    variant: 'secondary',
  })

  const order = await external_placeOrder({
    shippingAddress: {
      fullName: 'Alex Demo',
      line1: '1 Infinite Loop',
      city: 'Cupertino',
      state: 'CA',
      zipCode: '95014',
    },
    payment: {
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/29',
      cvc: '123',
    },
  })

  await ui_addOrderConfirmation({
    id: 'order',
    orderId: order.id,
    lines: order.lines,
    itemCount: order.itemCount,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    tax: order.tax,
    total: order.total,
    shippingAddress: order.shippingAddress,
    paymentLast4: order.paymentLast4,
    arrivesBy: order.arrivesBy,
  })

  return { orderId: order.id, total: order.total }
`
