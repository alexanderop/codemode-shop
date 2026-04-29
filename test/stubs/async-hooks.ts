export class AsyncLocalStorage<T> {
  run<R>(_ctx: T, fn: () => R): R {
    return fn()
  }
  getStore(): T | undefined {
    return undefined
  }
}
