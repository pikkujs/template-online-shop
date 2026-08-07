import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { pikkuFunc } from '#pikku'

export const CreateCategoryInput = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
})

export const CreateCategoryOutput = z.object({
  categoryId: z.string(),
  name: z.string(),
  slug: z.string(),
})

// @snippet start createCategory
export const createCategory = pikkuFunc({
  expose: true,
  description: 'Create a new product category. Admin only.',
  input: CreateCategoryInput,
  output: CreateCategoryOutput,
  func: async ({ kysely }, { name, slug, description }) => {
    const categoryId = randomUUID()
    await kysely
      .insertInto('category')
      .values({ categoryId, name, slug, description: description ?? null })
      .execute()
    return { categoryId, name, slug }
  },
})
// @snippet end createCategory
