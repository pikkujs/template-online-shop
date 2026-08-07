import { z } from 'zod'
import { pikkuFunc } from '#pikku'

export const ListItemsInput = z.object({
  categorySlug: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(24),
})

export const ListItemsOutput = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      name: z.string(),
      slug: z.string(),
      category: z.string(),
      priceCents: z.number(),
      stock: z.number(),
      imageUrl: z.string().nullable(),
    })
  ),
})

// @snippet start readFunction
export const listItems = pikkuFunc({
  expose: true,
  readonly: true,
  description: 'Browse the catalogue, optionally filtered by category or search.',
  input: ListItemsInput,
  output: ListItemsOutput,
  // Browsing is the one thing everybody who works here can do, and the scope
  // exists so that "can see the catalogue" is a grantable fact rather than an
  // absence of checks.
  scopes: ['catalogue:read'],
  func: async ({ kysely }, { categorySlug, search, limit }) => {
    let query = kysely
      .selectFrom('item')
      .innerJoin('category', 'category.categoryId', 'item.categoryId')
      .select([
        'item.itemId',
        'item.name',
        'item.slug',
        'item.priceCents',
        'item.stock',
        'item.imageUrl',
        'category.name as category',
      ])
      .orderBy('item.name')
      .limit(limit)

    if (categorySlug) query = query.where('category.slug', '=', categorySlug)
    if (search) query = query.where('item.name', 'like', `%${search}%`)

    return { items: await query.execute() }
  },
})
// @snippet end readFunction
