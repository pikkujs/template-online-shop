import { wireQueueWorker } from '#pikku/queue/pikku-queue-types.gen.js'
import { pikkuSessionlessFunc, pikkuFunc } from '#pikku'
import { sendOrderConfirmation } from '../functions/notifications/send-order-confirmation.function.js'
import { writeAuditEvent } from '../functions/notifications/write-audit-event.function.js'
import { randomUUID } from 'node:crypto'

// @snippet start queueWirings
wireQueueWorker({
  name: 'send-order-confirmation',
  func: sendOrderConfirmation,
})

wireQueueWorker({
  name: 'audit-event',
  func: writeAuditEvent,
})
// @snippet end queueWirings

// @snippet start queueConfig
// Configure concurrency, retries, and job retention per worker.
wireQueueWorker({
  name: 'send-order-confirmation',
  func: sendOrderConfirmation,
  config: {
    // Process 5 emails in parallel
    batchSize: 5,
    // Keep last 100 completed jobs for debugging
    removeOnComplete: 100,
  },
})
// @snippet end queueConfig

// @snippet start queuePublish
export const placeOrder = pikkuFunc({
  func: async (
    { queueService, kysely },
    { basketId }: { basketId: string },
    { session }
  ) => {
    const orderId = randomUUID()
    const now = new Date().toISOString()

    await kysely.insertInto('order').values({
      orderId, userId: session.userId,
      status: 'pending', totalCents: 0,
      shippingAddress: '{}',
      createdAt: now, updatedAt: now,
    }).execute()

    // Typed — PikkuQueue knows 'send-order-confirmation' payload shape
    await queueService?.add('send-order-confirmation', {
      orderId, userId: session.userId,
    })

    return { orderId }
  },
})
// @snippet end queuePublish

// @snippet start queueJobControl
// Wire object available inside every queue worker:
export const processExport = pikkuSessionlessFunc({
  func: async ({ logger }, { exportId }, wire) => {
    const rows = await fetchRows(exportId)

    if (!rows.length) {
      // No work — remove from queue, no retry
      wire.queue?.discard('Nothing to export')
      return
    }

    for (let i = 0; i < rows.length; i++) {
      // Report 0-100 progress
      await wire.queue?.updateProgress(
        Math.round((i / rows.length) * 100),
      )
    }
  },
})
// @snippet end queueJobControl

export const processLargeExport = pikkuSessionlessFunc({
  func: async ({ kysely, logger }, { exportId }: { exportId: string }, wire) => {
    const rows = await kysely.selectFrom('order').selectAll().execute()

    if (rows.length === 0) {
      wire.queue?.discard('No orders to export')
      return
    }

    for (let i = 0; i < rows.length; i++) {
      const pct = Math.round((i / rows.length) * 100)
      await wire.queue?.updateProgress(pct)
    }

    logger.info({ exportId, count: rows.length })
  },
})

wireQueueWorker({
  name: 'process-export',
  func: processLargeExport,
})
