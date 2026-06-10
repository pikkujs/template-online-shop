import { z } from 'zod'
import { wireVariable } from '#pikku/variables/pikku-variable-types.gen.js'

// @snippet start variables
export const DatabaseUrlSchema = z.string()
export const LowStockThresholdSchema = z.number().int().positive()

wireVariable({
  name: 'databaseUrl',
  displayName: 'Database URL',
  description: 'Primary database connection string (Postgres or libsql URL)',
  variableId: 'DATABASE_URL',
  schema: DatabaseUrlSchema,
})

wireVariable({
  name: 'lowStockThreshold',
  displayName: 'Low Stock Threshold',
  description: 'Item stock level that triggers a low-stock alert',
  variableId: 'LOW_STOCK_THRESHOLD',
  schema: LowStockThresholdSchema,
})
// @snippet end variables
