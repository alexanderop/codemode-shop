import { describe, expect, it } from 'vitest'
import { processFakePayment } from './payment'

describe('processFakePayment', () => {
  it('returns the last4 digits on a well-formed card', async () => {
    const result = await processFakePayment({
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/29',
      cvc: '123',
      amount: 199,
    })
    expect(result.ok).toBe(true)
    expect(result.last4).toBe('4242')
  }, 5_000)

  it('rejects malformed card number', async () => {
    await expect(
      processFakePayment({ cardNumber: 'abc', expiry: '12/29', cvc: '123', amount: 1 }),
    ).rejects.toThrow(/card/i)
  })

  it('rejects malformed expiry', async () => {
    await expect(
      processFakePayment({
        cardNumber: '4242424242424242',
        expiry: 'bad',
        cvc: '123',
        amount: 1,
      }),
    ).rejects.toThrow(/expiry/i)
  })

  it('rejects malformed cvc', async () => {
    await expect(
      processFakePayment({
        cardNumber: '4242424242424242',
        expiry: '12/29',
        cvc: '12',
        amount: 1,
      }),
    ).rejects.toThrow(/cvc/i)
  })

  it('rejects non-positive amount', async () => {
    await expect(
      processFakePayment({
        cardNumber: '4242424242424242',
        expiry: '12/29',
        cvc: '123',
        amount: 0,
      }),
    ).rejects.toThrow(/amount/i)
  })
})
