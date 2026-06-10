import { pikkuVoidFunc } from '#pikku'

// @snippet start cleanupAbandonedBaskets
export const cleanupAbandonedBaskets = pikkuVoidFunc({
  expose: false,
  description: 'Cron job: remove anonymous baskets older than 7 days.',
  func: async ({ kysely, logger }) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)

    const result = await kysely
      .deleteFrom('basket')
      .where('userId', 'is', null)
      .where('updatedAt', '<', cutoff.toISOString())
      .executeTakeFirst()

    logger.info({ event: 'cleanup_abandoned_baskets', deleted: Number(result.numDeletedRows ?? 0) })
  },
})
// @snippet end cleanupAbandonedBaskets
