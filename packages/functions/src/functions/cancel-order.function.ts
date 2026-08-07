import { z } from 'zod'
import { pikkuFunc, pikkuPermission } from '#pikku'

export const CancelOrderInput = z.object({ orderId: z.string() })

export const CancelOrderOutput = z.object({
  orderId: z.string(),
  status: z.string(),
})

/**
 * "Is this order yours" depends on the row, not on the role, which is precisely
 * why it cannot be a scope.
 */
export const isOrderOwner = pikkuPermission(
  async ({ kysely }, { orderId }: { orderId: string }, { session }) => {
    const order = await kysely
      .selectFrom('order')
      .select('userId')
      .where('orderId', '=', orderId)
      .executeTakeFirst()
    return !!session && order?.userId === session.userId
  }
)

// @snippet start scopedFunction
export const cancelOrder = pikkuFunc({
  expose: true,
  description: 'Cancel a pending or paid order and restore stock.',
  input: CancelOrderInput,
  output: CancelOrderOutput,
  // Authorization is declared, not written. `scopes` is what the role entitles
  // the caller to and is AND-ed; `permissions` is what is true of this
  // particular row and is OR-ed across keys. Both run before the body, so the
  // function below only ever sees a caller who is allowed to be there.
  //
  // Support holds orders:cancel and owns nothing, so it passes on the scope; a
  // customer owns the order and passes on the permission. Neither needs a
  // branch in the body — which is what the old
  // `session.role === 'admin'` shape required.
  scopes: ['orders:cancel'],
  permissions: {
    owner: isOrderOwner,
  },
  audit: true,
  func: async ({ kysely }, { orderId }) => {
    const order = await kysely
      .selectFrom('order')
      .select(['orderId', 'status'])
      .where('orderId', '=', orderId)
      .executeTakeFirstOrThrow()

    if (!['pending', 'paid'].includes(order.status)) {
      throw new Error(`Cannot cancel an order that is ${order.status}`)
    }

    // Stock was taken when the order was placed, so cancelling gives it back.
    const lines = await kysely
      .selectFrom('orderItem')
      .select(['itemId', 'quantity'])
      .where('orderId', '=', orderId)
      .execute()

    for (const line of lines) {
      await kysely
        .updateTable('item')
        .set((eb) => ({ stock: eb('stock', '+', line.quantity) }))
        .where('itemId', '=', line.itemId)
        .execute()
    }

    await kysely
      .updateTable('order')
      .set({ status: 'cancelled' })
      .where('orderId', '=', orderId)
      .execute()

    return { orderId, status: 'cancelled' }
  },
})
// @snippet end scopedFunction
