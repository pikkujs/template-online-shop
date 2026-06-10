import { z } from 'zod'
import { wireSecret } from '#pikku/secrets/pikku-secret-types.gen.js'
import { pikkuFunc } from '#pikku'

// @snippet start secrets
export const AuthSecretSchema = z.string()
export const StripeKeySchema = z.string()

wireSecret({
  name: 'authSecret',
  displayName: 'Auth Secret',
  description: 'Secret used to sign auth.js JWTs. Generate with: openssl rand -hex 32',
  secretId: 'AUTH_SECRET',
  schema: AuthSecretSchema,
})

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
