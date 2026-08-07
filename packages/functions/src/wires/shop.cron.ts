import { wireScheduler } from '#pikku/pikku-types.gen.js'
import { dailySalesReport } from '../functions/daily-sales-report.function.js'

/**
 * 06:00 UTC, so the number is waiting before anyone asks for it.
 */
// @snippet start wireScheduler
wireScheduler({
  name: 'dailySalesReport',
  schedule: '0 6 * * *',
  func: dailySalesReport,
})
// @snippet end wireScheduler
