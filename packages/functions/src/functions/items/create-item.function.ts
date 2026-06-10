import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { pikkuFunc } from '#pikku'

export const CreateItemInput = z.object({
  categoryId: z.string(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  priceCents: z.number().int().positive(),
  stock: z.number().int().min(0).default(0),
  imageUrl: z.string().url().optional(),
})

export const CreateItemOutput = z.object({
  itemId: z.string(),
  name: z.string(),
  slug: z.string(),
  priceCents: z.number(),
  stock: z.number(),
})

// @snippet start createItem
export const createItem = pikkuFunc({
  expose: true,
  description: 'Create a new product. Admin only.',
  input: CreateItemInput,
  output: CreateItemOutput,
  func: async ({ kysely, queueService }, data) => {
    const itemId = randomUUID()
    const now = new Date().toISOString()

    await kysely
      .insertInto('item')
      .values({
        itemId,
        categoryId: data.categoryId,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        priceCents: data.priceCents,
        stock: data.stock,
        imageUrl: data.imageUrl ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .execute()

    await queueService.add('audit-event', {
      entityType: 'item',
      entityId: itemId,
      action: 'created',
    })

    return { itemId, name: data.name, slug: data.slug, priceCents: data.priceCents, stock: data.stock }
  },
})
// @snippet end createItem
