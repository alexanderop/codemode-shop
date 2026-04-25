import { useEffect } from 'react'
import { clientCart } from '#/stores/client-cart'

export function CartHydrator() {
  useEffect(() => {
    void clientCart.refresh()
  }, [])
  return null
}
