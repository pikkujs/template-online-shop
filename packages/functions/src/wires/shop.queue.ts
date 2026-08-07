import { wireQueueWorker } from '#pikku/queue/pikku-queue-types.gen.js'
import { sendOrderConfirmation } from '../functions/send-order-confirmation.function.js'

/**
 * Confirmation email. `batchSize` is modest because the constraint is the mail
 * provider's rate limit, not this process — a queue that drains faster than the
 * downstream accepts just converts a backlog into a pile of 429s.
 */
// @snippet start wireQueue
wireQueueWorker({
  name: 'send-order-confirmation',
  func: sendOrderConfirmation,
  config: {
    batchSize: 2,
  },
})
// @snippet end wireQueue
