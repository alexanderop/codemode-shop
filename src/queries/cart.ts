import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  applyMutationToCart,
  cartMutationSchema,
  EMPTY_CART,
  type CartMutation,
  type DetailedCart,
  type DetailedCartLine,
} from '#/lib/cart-mutation'
import {
  addToCart,
  clearCart,
  getCartDetailed,
  removeFromCart,
  setCartLineQuantity,
} from '#/lib/cart'
import { getOrder as getOrderFromStore } from '#/lib/orders'
import { sessionMiddleware } from '#/lib/session-middleware'

function applyMutation(input: CartMutation): void {
  if (input.action === 'clear') {
    clearCart()
    return
  }
  const width = input.width ?? 'standard'
  if (input.action === 'add') {
    addToCart({
      productId: input.productId,
      size: input.size,
      width,
      quantity: input.quantity ?? 1,
    })
    return
  }
  if (input.action === 'set') {
    setCartLineQuantity({
      productId: input.productId,
      size: input.size,
      width,
      quantity: input.quantity,
    })
    return
  }
  removeFromCart({ productId: input.productId, size: input.size, width })
}

export interface OrderShippingAddress {
  fullName: string
  line1: string
  line2?: string
  city: string
  state: string
  zipCode: string
}

export interface OrderQueryData {
  orderId: string
  lines: Array<DetailedCartLine>
  itemCount: number
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  shippingAddress: OrderShippingAddress
  paymentLast4: string
  arrivesBy: string
}

export const cartQueryKey = ['cart'] as const

export const getCart = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .handler((): DetailedCart => getCartDetailed())

export const mutateCart = createServerFn({ method: 'POST' })
  .middleware([sessionMiddleware])
  .inputValidator(cartMutationSchema)
  .handler(({ data }): DetailedCart => {
    applyMutation(data)
    return getCartDetailed()
  })

export function cartQueryOptions() {
  return queryOptions({
    queryKey: cartQueryKey,
    queryFn: () => getCart(),
  })
}

export function useCart(): DetailedCart {
  const { data } = useQuery(cartQueryOptions())
  return data ?? EMPTY_CART
}

export function useCartCount(): number {
  return useCart().itemCount
}

export function useCartMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CartMutation) => mutateCart({ data: body }),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey })
      const prev = queryClient.getQueryData<DetailedCart>(cartQueryKey)
      queryClient.setQueryData<DetailedCart>(cartQueryKey, (old) =>
        applyMutationToCart(old ?? EMPTY_CART, body),
      )
      return { prev }
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(cartQueryKey, ctx.prev)
    },
    onSuccess: (next) => {
      queryClient.setQueryData(cartQueryKey, next)
    },
  })
}

export function invalidateCart(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: cartQueryKey })
}

export class OrderNotFoundError extends Error {
  constructor() {
    super('Order not found')
    this.name = 'OrderNotFoundError'
  }
}

// Server fns serialize errors via Seroval, which strips Error subclass
// identity (and even `.name`) across the wire. Return null for the
// not-found case and let the client-side queryFn throw the typed error.
export const getOrder = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .inputValidator(z.object({ orderId: z.string().min(1) }))
  .handler(({ data }): OrderQueryData | null => {
    const order = getOrderFromStore(data.orderId)
    if (!order) return null
    const { id, status: _status, createdAt: _createdAt, ...rest } = order
    return { ...rest, orderId: id }
  })

export function orderQueryOptions(orderId: string) {
  return queryOptions({
    queryKey: ['order', orderId] as const,
    queryFn: async () => {
      const result = await getOrder({ data: { orderId } })
      if (result === null) throw new OrderNotFoundError()
      return result
    },
    retry: false,
  })
}
