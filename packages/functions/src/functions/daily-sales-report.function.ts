import { pikkuVoidFunc } from '#pikku'

/**
 * Yesterday's takings.
 *
 * Scheduled rather than computed on demand: the number is asked for every
 * morning by the same person, and computing it once beats recomputing it every
 * time somebody opens the dashboard.
 */
// @snippet start scheduledFunction
export const dailySalesReport = pikkuVoidFunc(async ({ kysely, logger }) => {
  const rows = await kysely
    .selectFrom('order')
    .select(['totalCents'])
    .where('status', 'in', ['paid', 'shipped'])
    .where('createdAt', '>=', new Date(Date.now() - 86_400_000).toISOString())
    .execute()

  logger.info({
    event: 'daily_sales',
    orders: rows.length,
    totalCents: rows.reduce((n, r) => n + r.totalCents, 0),
  })
})
// @snippet end scheduledFunction
