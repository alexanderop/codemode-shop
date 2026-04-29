import { useState } from 'react'
import { CreditCard, Loader2, MapPin } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { currency } from '#/lib/format'
import { errorMessage } from '#/lib/utils'
import { invalidateCart, useCart } from '#/queries/cart'
import { checkout } from '#/queries/checkout'
import type { CheckoutFormProps } from '#/features/storefront/types/ui-types'

interface FormValues {
  fullName: string
  line1: string
  line2: string
  city: string
  state: string
  zipCode: string
  cardNumber: string
  expiry: string
  cvc: string
}

const DEMO_VALUES: FormValues = {
  fullName: 'Alex Demo',
  line1: '1 Infinite Loop',
  line2: '',
  city: 'Cupertino',
  state: 'CA',
  zipCode: '95014',
  cardNumber: '4242 4242 4242 4242',
  expiry: '12/29',
  cvc: '123',
}

export function CheckoutForm(_props: CheckoutFormProps) {
  const cart = useCart()
  const [values, setValues] = useState<FormValues>(DEMO_VALUES)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const { orderId } = await checkout({
        data: {
          shippingAddress: {
            fullName: values.fullName,
            line1: values.line1,
            line2: values.line2 || undefined,
            city: values.city,
            state: values.state,
            zipCode: values.zipCode,
          },
          payment: {
            cardNumber: values.cardNumber,
            expiry: values.expiry,
            cvc: values.cvc,
          },
        },
      })
      void invalidateCart(queryClient)
      void navigate({ to: '/orders/$orderId', params: { orderId } })
    } catch (err) {
      toast.error(errorMessage(err, 'Checkout failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-xl border bg-card text-sm shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <CreditCard className="h-4 w-4" />
          Checkout
        </div>
        <div className="text-xs text-muted-foreground">
          {cart.items.length} {cart.items.length === 1 ? 'line' : 'lines'} ·{' '}
          {currency.format(cart.subtotal)}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Shipping address
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Input
              required
              placeholder="Full name"
              value={values.fullName}
              onChange={(e) => set('fullName', e.target.value)}
            />
            <Input
              required
              placeholder="Address line 1"
              value={values.line1}
              onChange={(e) => set('line1', e.target.value)}
            />
            <Input
              placeholder="Apt / suite (optional)"
              value={values.line2}
              onChange={(e) => set('line2', e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                required
                placeholder="City"
                value={values.city}
                onChange={(e) => set('city', e.target.value)}
                className="col-span-2"
              />
              <Input
                required
                placeholder="State"
                value={values.state}
                onChange={(e) => set('state', e.target.value)}
                maxLength={2}
              />
            </div>
            <Input
              required
              inputMode="numeric"
              pattern="\d{5}"
              placeholder="ZIP"
              value={values.zipCode}
              onChange={(e) => set('zipCode', e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            Payment (test mode — any card works)
          </div>
          <div className="space-y-2">
            <Input
              required
              inputMode="numeric"
              placeholder="Card number"
              value={values.cardNumber}
              onChange={(e) => set('cardNumber', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                required
                placeholder="MM/YY"
                value={values.expiry}
                onChange={(e) => set('expiry', e.target.value)}
              />
              <Input
                required
                inputMode="numeric"
                placeholder="CVC"
                value={values.cvc}
                onChange={(e) => set('cvc', e.target.value)}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            No real charges. Payment always succeeds after a short delay.
          </p>
        </div>
      </div>

      <div className="border-t px-4 py-3">
        <Button type="submit" className="w-full gap-2" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Processing payment…' : `Place order · ${currency.format(cart.subtotal)}`}
        </Button>
      </div>
    </form>
  )
}
