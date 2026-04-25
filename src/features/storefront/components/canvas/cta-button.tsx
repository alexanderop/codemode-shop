import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, ShoppingBag, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { errorMessage } from '#/lib/utils'
import { runHandler } from '#/features/storefront/api/run-handler'
import type { CTAButtonProps } from '#/features/storefront/types/ui-types'

export function CTAButton(props: CTAButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  async function handleClick() {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState('loading')
    try {
      const message = await runHandler(
        {
          handlerId: props.handlerId,
          payload: props.payload,
        },
        controller.signal,
      )
      if (controller.signal.aborted) return
      setState('done')
      if (message) toast.success(message)
    } catch (err) {
      if (controller.signal.aborted) return
      setState('error')
      toast.error(errorMessage(err, 'Add to cart failed'))
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }

  const icon =
    state === 'loading' ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : state === 'done' ? (
      <Check className="h-4 w-4" />
    ) : state === 'error' ? (
      <X className="h-4 w-4" />
    ) : (
      <ShoppingBag className="h-4 w-4" />
    )
  const label =
    state === 'loading'
      ? 'Checking stock…'
      : state === 'done'
        ? 'Added to cart'
        : state === 'error'
          ? 'Try again'
          : props.label

  return (
    <Button
      variant={state === 'done' || props.variant === 'secondary' ? 'secondary' : 'default'}
      disabled={state === 'loading'}
      onClick={handleClick}
      className="w-full gap-2"
    >
      {icon}
      {label}
    </Button>
  )
}
