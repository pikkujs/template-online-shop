import { z } from 'zod'
import { wireTrigger, wireTriggerSource } from '#pikku/trigger/pikku-trigger-types.gen.js'
import { pikkuSessionlessFunc, pikkuTriggerFunc } from '#pikku'

export const LowStockPayload = z.object({
  itemId: z.string(),
  name: z.string(),
  stock: z.number(),
})

// @snippet start lowStockTrigger
export const onLowStock = pikkuSessionlessFunc({
  expose: false,
  description: 'Trigger: fires when an item stock drops below the configured threshold.',
  input: LowStockPayload,
  func: async ({ logger }, { itemId, name, stock }) => {
    logger.warn({ event: 'low_stock_alert', itemId, name, stock })
    // In production: send Slack notification, create restocking ticket, etc.
  },
})

wireTrigger({
  name: 'low-stock',
  func: onLowStock,
})
// @snippet end lowStockTrigger

// @snippet start triggerSource
// A trigger SOURCE defines how Pikku subscribes to external events.
// It receives typed input and calls trigger.invoke() to fire the handler.
export const stockPollTrigger = pikkuTriggerFunc<
  { thresholdStock: number },
  { itemId: string; name: string; stock: number }
>(async ({ kysely, logger }, { thresholdStock }, { trigger }) => {
  const interval = setInterval(async () => {
    const items = await kysely
      .selectFrom('item')
      .select(['itemId', 'name', 'stock'])
      .where('stock', '<=', thresholdStock)
      .where('isActive', '=', 1)
      .execute()

    for (const item of items) {
      trigger.invoke({ itemId: item.itemId, name: item.name, stock: item.stock })
    }
  }, 60_000)

  logger.info({ event: 'stock_poll_started', thresholdStock })

  return () => clearInterval(interval)
})

wireTriggerSource({
  name: 'stock-poll',
  func: stockPollTrigger,
  input: { thresholdStock: 5 },
})
// @snippet end triggerSource
