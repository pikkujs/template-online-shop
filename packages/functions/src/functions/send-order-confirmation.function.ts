import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku'

export const SendOrderConfirmationInput = z.object({
  orderId: z.string(),
  email: z.string().email(),
})

/**
 * Queued rather than sent inline at checkout.
 *
 * A shopper who has just paid should not wait on an SMTP round trip, and a mail
 * provider being slow should not turn a successful payment into a failed
 * request. Sessionless because the worker runs it and a worker has no user —
 * which is also why it carries no scopes: an anonymous caller holds none and
 * would satisfy none.
 */
// @snippet start queueWorkerFunction
export const sendOrderConfirmation = pikkuSessionlessFunc({
  description: 'Email a shopper the confirmation for a paid order.',
  input: SendOrderConfirmationInput,
  func: async ({ kysely, emailService, logger }, { orderId, email }) => {
    const order = await kysely
      .selectFrom('order')
      .select(['orderId', 'totalCents', 'status'])
      .where('orderId', '=', orderId)
      .executeTakeFirstOrThrow()

    // The queue can deliver a job more than once, so re-check rather than
    // trusting that this is the first attempt. Sending a second confirmation
    // is harmless; sending one for a cancelled order is not.
    if (order.status !== 'paid') {
      logger.info({ event: 'confirmation_skipped', orderId, status: order.status })
      return
    }

    await emailService.send({
      to: email,
      subject: `Your order ${orderId}`,
      text: `Thanks — we have your order. Total: ${(order.totalCents / 100).toFixed(2)}.`,
    })

    logger.info({ event: 'confirmation_sent', orderId })
  },
})
// @snippet end queueWorkerFunction
