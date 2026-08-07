import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku'

export const SendOrderConfirmationInput = z.object({
  orderId: z.string(),
  userId: z.string(),
})

// @snippet start sendOrderConfirmation
export const sendOrderConfirmation = pikkuSessionlessFunc({
  expose: false,
  description: 'Queue consumer: send order confirmation email after a successful payment.',
  input: SendOrderConfirmationInput,
  func: async ({ kysely, logger }, { orderId, userId }) => {
    const [order, user] = await Promise.all([
      kysely
        .selectFrom('order')
        .select(['orderId', 'totalCents', 'status', 'createdAt'])
        .where('orderId', '=', orderId)
        .executeTakeFirst(),
      kysely
        .selectFrom('appUser')
        .select(['email', 'name'])
        .where('userId', '=', userId)
        .executeTakeFirst(),
    ])

    if (!order || !user) {
      logger.warn(`sendOrderConfirmation: order or user not found (${orderId}, ${userId})`)
      return
    }

    // In production: call your email service here (SendGrid, Resend, etc.)
    logger.info({
      event: 'order_confirmation_sent',
      to: user.email,
      name: user.name,
      orderId: order.orderId,
      totalCents: order.totalCents,
    })
  },
})
// @snippet end sendOrderConfirmation
