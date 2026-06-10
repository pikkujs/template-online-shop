import { wireScheduler } from '#pikku/pikku-types.gen.js'
import { pikkuVoidFunc, pikkuMiddleware } from '#pikku'
import { dailySalesReport } from '../functions/reports/daily-sales-report.function.js'
import { cleanupAbandonedBaskets } from '../functions/reports/cleanup-abandoned-baskets.function.js'

// @snippet start cronWirings
wireScheduler({
  name: 'dailySalesReport',
  schedule: '0 6 * * *',   // 06:00 UTC every day
  func: dailySalesReport,
})

wireScheduler({
  name: 'cleanupAbandonedBaskets',
  schedule: '0 3 * * *',   // 03:00 UTC every day
  func: cleanupAbandonedBaskets,
})
// @snippet end cronWirings

// @snippet start cronSkip
// A scheduled task can skip its own execution by calling wire.scheduledTask.skip().
export const conditionalReport = pikkuVoidFunc({
  func: async ({ kysely, logger }, _, wire) => {
    const count = await kysely
      .selectFrom('order')
      .where('status', '=', 'pending')
      .select(kysely.fn.countAll<number>().as('n'))
      .executeTakeFirstOrThrow()

    if (count.n === 0) {
      wire.scheduledTask?.skip('No pending orders — nothing to report')
      return
    }

    logger.info({ event: 'report_run', pendingOrders: count.n })
  },
})

wireScheduler({
  name: 'conditionalReport',
  schedule: '0 7 * * *',
  func: conditionalReport,
})
// @snippet end cronSkip

// @snippet start cronMiddleware
// Apply middleware to log execution time for every run of a scheduled task.
const timingMiddleware = pikkuMiddleware(async ({ logger }, _data, next) => {
  const start = Date.now()
  await next()
  logger.info({ event: 'scheduler_timing', ms: Date.now() - start })
})

wireScheduler({
  name: 'dailySalesReport',
  schedule: '0 6 * * *',
  func: dailySalesReport,
  middleware: [timingMiddleware],
})
// @snippet end cronMiddleware
