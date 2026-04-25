import { beforeEach, describe, expect, it, vi } from 'vitest'

const runHandlerMock = vi.fn()

vi.mock('#/features/storefront/api/run-handler', () => ({
  runHandler: (...args: Array<unknown>) => runHandlerMock(...args),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { renderCTAButton } from './cta-button.page'

beforeEach(() => {
  runHandlerMock.mockReset()
})

describe('CTAButton', () => {
  it('renders the label in idle state', async () => {
    const cta = await renderCTAButton()
    await cta.expectIdle()
  })

  it('calls runHandler with the correct shape on click', async () => {
    runHandlerMock.mockResolvedValueOnce('Added!')
    const cta = await renderCTAButton()

    await cta.click()

    expect(runHandlerMock).toHaveBeenCalledTimes(1)
    const [request] = runHandlerMock.mock.calls[0]!
    expect(request).toEqual({
      handlerId: cta.props.handlerId,
      payload: cta.props.payload,
    })

    await cta.expectDone()
  })

  it('transitions through loading -> done', async () => {
    let resolve!: (value: string) => void
    runHandlerMock.mockImplementationOnce(() => new Promise<string>((r) => (resolve = r)))

    const cta = await renderCTAButton()
    await cta.click()

    await cta.expectLoading()

    resolve('done')
    await cta.expectDone()
  })

  it('shows error state and re-enables on rejection', async () => {
    runHandlerMock.mockRejectedValueOnce(new Error('boom'))
    const cta = await renderCTAButton()

    await cta.click()

    const retry = cta.expectRetry()
    await expect.element(retry).toBeVisible()
    await expect.element(retry).toBeEnabled()
  })

  it('cancelled requests (signal aborted) do not flip state', async () => {
    runHandlerMock.mockImplementationOnce((_req, signal: AbortSignal) => {
      return new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    })

    const cta = await renderCTAButton()
    await cta.click()
    await cta.screen.unmount()
    // No assertions to fail post-unmount; the test passes if React doesn't warn
    // about state updates on an unmounted component (the global console.error
    // guard would catch it).
  })
})
