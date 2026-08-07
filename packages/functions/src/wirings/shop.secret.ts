import { z } from 'zod'
import { defineSecret } from '#pikku/secrets/pikku-secret-types.gen.js'
import { pikkuFunc } from '#pikku'

// @snippet start secrets
// BETTER_AUTH_SECRET is not declared here — the CLI generates its defineSecret
// into src/scaffold/auth/ from the pikkuBetterAuth config, along with one per
// configured provider.
export const StripeKeySchema = z.string()

defineSecret({
  name: 'stripeSecretKey',
  displayName: 'Stripe Secret Key',
  description: 'Stripe secret key (optional — only needed for real payments)',
  secretId: 'STRIPE_SECRET_KEY',
  schema: StripeKeySchema,
})
// @snippet end secrets

// @snippet start shopSecretUsage
// Note what is *absent* here: `secrets`.
//
// Every function-, permission- and auth-facing services type in pikku is
// bounded by `SecretlessServices`, which omits `secrets` outright. A function
// cannot read one, so a secret cannot leak through a return value, a log line
// or an error thrown from business logic — the class of bug you only find in
// somebody else's incident report.
//
// Secrets are read once, where services are built (see services.ts and
// auth.wiring.ts), and the constructed service carries whatever it needs.
// `processPayment` asks the payment service to charge; it never learns the key.
export const processPayment = pikkuFunc({
  func: async ({ paymentService }, { orderId, amountCents }: { orderId: string; amountCents: number }) => {
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
