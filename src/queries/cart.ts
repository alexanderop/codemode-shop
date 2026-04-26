import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import {
  applyMutationToCart,
  EMPTY_CART,
  type CartMutation,
  type DetailedCart,
  type DetailedCartLine,
} from '#/lib/cart-mutation'

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

export function cartQueryOptions() {
  return queryOptions({
    queryKey: cartQueryKey,
    queryFn: async () => {
      const res = await fetch('/api/cart')
      if (!res.ok) throw new Error(`Cart fetch failed: ${res.status}`)
      return (await res.json()) as DetailedCart
    },
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
    mutationFn: async (body: CartMutation) => {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Cart update failed: ${res.status}`)
      return (await res.json()) as DetailedCart
    },
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

type ServerOrder = Omit<OrderQueryData, 'orderId'> & { id: string }

export class OrderNotFoundError extends Error {
  constructor() {
    super('Order not found')
    this.name = 'OrderNotFoundError'
  }
}

export function orderQueryOptions(orderId: string) {
  return queryOptions({
    queryKey: ['order', orderId] as const,
    queryFn: async (): Promise<OrderQueryData> => {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.status === 404) throw new OrderNotFoundError()
      if (!res.ok) throw new Error(`Order fetch failed: ${res.status}`)
      const { id, ...rest } = (await res.json()) as ServerOrder
      return { ...rest, orderId: id }
    },
    retry: false,
  })
}
