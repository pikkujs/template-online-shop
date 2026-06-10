import { pikkuSessionlessFunc, pikkuFunc } from '#pikku'
import { getBasket } from '../functions/basket/get-basket.function.js'

// @snippet start rpcFunc
// Any pikkuSessionlessFunc is automatically available for internal RPC calls.
// Add expose: true to also make it reachable via the external RPC endpoint.
export const checkItemAvailability = pikkuSessionlessFunc({
  expose: true,
  description: 'Check whether an item is in stock and return available quantity.',
  func: async ({ kysely }, { itemId }: { itemId: string }) => {
    const item = await kysely
      .selectFrom('item')
      .select(['stock', 'name', 'isActive'])
      .where('itemId', '=', itemId)
      .executeTakeFirst()

    if (!item) throw new Error(`Item not found: ${itemId}`)
    return { available: item.stock > 0 && item.isActive === 1, stock: item.stock, name: item.name }
  },
})
// @snippet end rpcFunc

// @snippet start rpcInternalCall
// Call other Pikku functions by name from within any function — fully typed.
export const createOrderWithValidation = pikkuFunc({
  func: async ({ logger }, { sessionId }: { sessionId: string }, { rpc }) => {
    const basket = await rpc.invoke('getBasket', { sessionId })
    logger.info({ event: 'order_validation', itemCount: basket.items?.length ?? 0 })
    return { valid: true, itemCount: basket.items?.length ?? 0, sessionId }
  },
})
// @snippet end rpcInternalCall

