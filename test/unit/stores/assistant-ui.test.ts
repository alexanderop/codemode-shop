import { afterEach, describe, expect, it } from 'vitest'
import { assistantUi } from '#/stores/assistant-ui'

afterEach(() => {
  assistantUi.close()
})

describe('assistantUi', () => {
  it('starts closed', () => {
    expect(assistantUi.get()).toBe(false)
  })

  it('open and close flip the state', () => {
    assistantUi.open()
    expect(assistantUi.get()).toBe(true)
    assistantUi.close()
    expect(assistantUi.get()).toBe(false)
  })

  it('toggle inverts the state each call', () => {
    assistantUi.toggle()
    expect(assistantUi.get()).toBe(true)
    assistantUi.toggle()
    expect(assistantUi.get()).toBe(false)
  })

  it('set is a no-op when the value is unchanged', () => {
    const seen: Array<boolean> = []
    const unsub = assistantUi.subscribe((v) => seen.push(v))
    assistantUi.set(false)
    assistantUi.set(true)
    assistantUi.set(true)
    unsub()
    expect(seen).toEqual([true])
  })

  it('subscribe returns an unsubscribe that stops further notifications', () => {
    const seen: Array<boolean> = []
    const unsub = assistantUi.subscribe((v) => seen.push(v))
    assistantUi.open()
    unsub()
    assistantUi.close()
    expect(seen).toEqual([true])
  })
})
