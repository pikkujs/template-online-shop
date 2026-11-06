import { z } from 'zod'
import { defineVariable } from '#pikku/variables/pikku-variable-types.gen.js'

// @snippet start variables
export const DatabaseUrlSchema = z.string()
export const LowStockThresholdSchema = z.number().int().positive()
// @snippet hide
export const VirtualUserVerifyKeySchema = z.string()
export const SeedDemoDataSchema = z.string()
export const BetterAuthUrlSchema = z.string().url()
// @snippet show

defineVariable({
  name: 'databaseUrl',
  displayName: 'Database URL',
  description: 'Primary database connection string (Postgres or libsql URL)',
  variableId: 'DATABASE_URL',
  schema: DatabaseUrlSchema,
})

defineVariable({
  name: 'lowStockThreshold',
  displayName: 'Low Stock Threshold',
  description: 'Item stock level that triggers a low-stock alert',
  variableId: 'LOW_STOCK_THRESHOLD',
  schema: LowStockThresholdSchema,
})

// @snippet hide
defineVariable({
  name: 'virtualUserVerifyKey',
  displayName: 'Virtual User Verify Key',
  description: 'Public key that checks the signed statements callers outside the app present to sign in as a virtual user. Leave unset to refuse them.',
  variableId: 'VIRTUAL_USER_VERIFY_KEY',
  schema: VirtualUserVerifyKeySchema,
  optional: true,
})

defineVariable({
  name: 'seedDemoData',
  displayName: 'Seed Demo Data',
  description: 'Set to `true` to load the sample catalogue on startup',
  variableId: 'SEED_DEMO_DATA',
  schema: SeedDemoDataSchema,
  optional: true,
})

defineVariable({
  name: 'betterAuthUrl',
  displayName: 'Better Auth Base URL',
  description: 'Public origin the API is served from, used for auth callbacks and redirects',
  variableId: 'BETTER_AUTH_URL',
  schema: BetterAuthUrlSchema,
})
// @snippet show
// @snippet end variables
