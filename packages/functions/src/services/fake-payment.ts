import { randomUUID } from 'node:crypto'

export type PaymentResult =
  | { status: 'succeeded'; providerRef: string }
  | { status: 'failed'; reason: string }

/**
 * A fake payment provider for demo and testing purposes.
 * Always succeeds unless the card number ends in '0000'.
 * In production replace with a real provider (Stripe, etc.).
 */
export class FakePaymentService {
  async charge(opts: {
    amountCents: number
    currency?: string
    cardToken?: string
    orderId: string
  }): Promise<PaymentResult> {
    await new Promise((r) => setTimeout(r, 50))

    if (opts.cardToken?.endsWith('0000')) {
      return { status: 'failed', reason: 'Card declined (test decline token)' }
    }

    return { status: 'succeeded', providerRef: `fake_${randomUUID()}` }
  }
}
