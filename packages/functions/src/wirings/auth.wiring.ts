import { betterAuth } from 'better-auth'
import { pikkuBetterAuth, actor } from '@pikku/better-auth'
import type { CoreSingletonServices } from '@pikku/core'
import type { Kysely } from 'kysely'
import type { DB } from '../types/db.types.js'

// @snippet start authConfig
/**
 * Better Auth owns identity: the `user`, `session`, `account` and
 * `verification` tables are its own, and `pikku db generate` writes the
 * migration for them alongside the shop's tables.
 *
 * The CLI inspects this export and generates the catch-all `/auth/**` HTTP
 * wiring, the session-bridge middleware and a `wireSecret` per configured
 * provider — so auth routes and secret requirements flow through normal
 * inspection into the deploy manifest.
 */
export const auth = pikkuBetterAuth(async ({
  secrets,
  variables,
  kysely,
}: CoreSingletonServices & { kysely: Kysely<DB> }) => {
  return betterAuth({
    secret: await secrets.getSecret('BETTER_AUTH_SECRET'),
    baseURL: await variables.get('BETTER_AUTH_URL'),
    database: { db: kysely, type: 'sqlite' },
    emailAndPassword: { enabled: true },
    // Lets the CLI split the stateless session middleware out, so workers that
    // never touch auth don't bundle the full Better Auth server.
    session: { cookieCache: { enabled: true } },
    databaseHooks: {
      user: {
        create: {
          // Mirror every new identity into the shop's own profile table, so
          // baskets and orders have something of ours to point at.
          after: async (user) => {
            await kysely
              .insertInto('appUser')
              .values({
                userId: user.id,
                email: user.email,
                name: user.name,
                role: 'customer',
                createdAt: new Date().toISOString(),
              })
              .onConflict((oc) => oc.column('userId').doNothing())
              .execute()
          },
        },
      },
    },
    plugins: [
      // `pikku scenario run` signs its actors in through this plugin, at
      // POST /auth/sign-in/actor. Only rows flagged `actor: true` can use it,
      // so holding the secret never impersonates a real customer.
      actor({
        secret: (await variables.get('SCENARIO_ACTOR_SECRET')) ?? '',
      }),
    ],
  })
})
// @snippet end authConfig
