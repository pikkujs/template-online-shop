import { z } from 'zod'
import { wireSecret } from '#pikku/secrets/pikku-secret-types.gen.js'
import { pikkuFunc } from '#pikku'

// @snippet start secrets
// BETTER_AUTH_SECRET is not declared here — the CLI generates its wireSecret
// into src/scaffold/auth/ from the pikkuBetterAuth config, along with one per
// configured provider.
export const StripeKeySchema = z.string()

wireSecret({
  name: 'stripeSecretKey',
  displayName: 'Stripe Secret Key',
  description: 'Stripe secret key (optional — only needed for real payments)',
  secretId: 'STRIPE_SECRET_KEY',
  schema: StripeKeySchema,
})
// @snippet end secrets

// @snippet start shopSecretUsage
export const processPayment = pikkuFunc({
  func: async ({ secrets, paymentService }, { orderId, amountCents }: { orderId: string; amountCents: number }) => {
    const stripeKey = await secrets.getSecret('STRIPE_SECRET_KEY')
    console.log(`Processing payment with Stripe key: ${stripeKey ? '[set]' : '[missing]'}`)

    const result = await paymentService.charge({
      orderId,
      amountCents,
      currency: 'usd',
    })

    if (result.status === 'failed') {
      throw new Error(`Payment failed: ${result.reason}`)
    }

    return { providerRef: result.providerRef, status: result.status }
  },
})
// @snippet end shopSecretUsage
