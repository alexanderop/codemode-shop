import type { IsolateDriver } from '@tanstack/ai-code-mode'

const driverCache = new Map<string, Promise<IsolateDriver>>()

export interface DriverOptions {
  timeout: number
  memoryLimit: number
}

export function getStorefrontDriver(opts: DriverOptions): Promise<IsolateDriver> {
  const key = `${opts.timeout}:${opts.memoryLimit}`
  let pending = driverCache.get(key)
  if (!pending) {
    pending = (async () => {
      const { createNodeIsolateDriver } = await import('@tanstack/ai-isolate-node')
      return createNodeIsolateDriver(opts)
    })()
    driverCache.set(key, pending)
  }
  return pending
}
