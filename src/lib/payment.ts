export interface FakePaymentInput {
  cardNumber: string
  expiry: string
  cvc: string
  amount: number
}

export interface FakePaymentResult {
  ok: true
  last4: string
}

const PROCESSING_DELAY_MS = 1500

export async function processFakePayment(input: FakePaymentInput): Promise<FakePaymentResult> {
  const digits = input.cardNumber.replace(/\s+/g, '')
  if (!/^\d{13,19}$/.test(digits)) {
    throw new Error('Invalid card number')
  }
  if (!/^\d{2}\/\d{2}$/.test(input.expiry)) {
    throw new Error('Invalid expiry (expected MM/YY)')
  }
  if (!/^\d{3,4}$/.test(input.cvc)) {
    throw new Error('Invalid CVC')
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Invalid amount')
  }
  await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAY_MS))
  return { ok: true, last4: digits.slice(-4) }
}
