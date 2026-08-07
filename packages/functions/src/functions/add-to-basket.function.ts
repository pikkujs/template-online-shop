import { z } from 'zod'
import { pikkuFunc } from '#pikku'
import { randomUUID } from 'node:crypto'

export const AddToBasketInput = z.object({
  itemId: z.string(),
  quantity: z.number().int().positive().default(1),
})

export const AddToBasketOutput = z.object({
  basketId: z.string(),
  itemCount: z.number(),
})

// @snippet start writeFunction
export const addToBasket = pikkuFunc({
  expose: true,
  description: 'Put an item in the signed-in shopper’s basket.',
  input: AddToBasketInput,
  output: AddToBasketOutput,
  scopes: ['orders:create'],
  // `audit: true` wraps kysely so every table write is captured, rather than
  // relying on somebody remembering to log it.
  audit: true,
  func: async ({ kysely }, { itemId, quantity }, { session }) => {
    const item = await kysely
      .selectFrom('item')
      .select(['itemId', 'stock'])
      .where('itemId', '=', itemId)
      .executeTakeFirstOrThrow()

    if (item.stock < quantity) {
      throw new Error(`Only ${item.stock} left`)
    }

    // One basket per shopper — the unique index enforces it, so this is a
    // read-or-create rather than a race between two tabs.
    const existing = await kysely
      .selectFrom('basket')
      .select('basketId')
      .where('userId', '=', session.userId)
      .executeTakeFirst()

    const basketId = existing?.basketId ?? randomUUID()
    if (!existing) {
      await kysely
        .insertInto('basket')
        .values({ basketId, userId: session.userId })
        .execute()
    }

    const line = await kysely
      .selectFrom('basketItem')
      .select(['basketItemId', 'quantity'])
      .where('basketId', '=', basketId)
      .where('itemId', '=', itemId)
      .executeTakeFirst()

    if (line) {
      await kysely
        .updateTable('basketItem')
        .set({ quantity: line.quantity + quantity })
        .where('basketItemId', '=', line.basketItemId)
        .execute()
    } else {
      await kysely
        .insertInto('basketItem')
        .values({ basketItemId: randomUUID(), basketId, itemId, quantity })
        .execute()
    }

    const rows = await kysely
      .selectFrom('basketItem')
      .select('quantity')
      .where('basketId', '=', basketId)
      .execute()

    return {
      basketId,
      itemCount: rows.reduce((n, r) => n + r.quantity, 0),
    }
  },
})
// @snippet end writeFunction
