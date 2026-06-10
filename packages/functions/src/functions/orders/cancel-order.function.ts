import { z } from 'zod'
import { pikkuFunc } from '#pikku'

export const CancelOrderInput = z.object({ orderId: z.string() })

// @snippet start cancelOrder
export const cancelOrder = pikkuFunc({
  expose: true,
  description: 'Cancel a pending order and restore stock.',
  input: CancelOrderInput,
  func: async ({ kysely, queueService, userSession }, { orderId }) => {
    const order = await kysely
      .selectFrom('order')
      .select(['orderId', 'userId', 'status'])
      .where('orderId', '=', orderId)
      .executeTakeFirst()

    if (!order) throw new Error('Order not found')
    if (order.userId !== userSession.userId && userSession.role !== 'admin') {
      throw new Error('Forbidden')
    }
    if (!['pending', 'paid'].includes(order.status)) {
      throw new Error(`Cannot cancel order in status: ${order.status}`)
    }

    // Restore stock
    const items = await kysely
      .selectFrom('orderItem')
      .select(['itemId', 'quantity'])
      .where('orderId', '=', orderId)
      .execute()

    const now = new Date().toISOString()
    for (const item of items) {
      await kysely
        .updateTable('item')
        .set((eb) => ({ stock: eb('stock', '+', item.quantity), updatedAt: now }))
        .where('itemId', '=', item.itemId)
        .execute()
    }

    await kysely
      .updateTable('order')
      .set({ status: 'cancelled', updatedAt: now })
      .where('orderId', '=', orderId)
      .execute()

    await queueService.add('audit-event', {
      entityType: 'order', entityId: orderId, action: 'cancelled', actorId: userSession.userId,
    })
  },
})
// @snippet end cancelOrder
