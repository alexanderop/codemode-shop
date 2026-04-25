import type { Width } from '#/lib/catalog'

export function cartLineKey(productId: string, size: string, width: Width) {
  return `${productId}|${size}|${width}`
}
