import { pikkuAuth, pikkuPermission, pikkuFunc, wireHTTP } from '#pikku'

// @snippet start shopIsAuthenticated
export const isAuthenticated = pikkuAuth(
  async (_services, session) => !!session
)
// @snippet end shopIsAuthenticated

// @snippet start shopIsOrderOwner
export const isOrderOwner = pikkuPermission(
  async ({ kysely }, { orderId }: { orderId: string }, { session }) => {
    const order = await kysely
      .selectFrom('order')
      .select('userId')
      .where('orderId', '=', orderId)
      .executeTakeFirst()
    return order?.userId === session?.userId
  }
)
// @snippet end shopIsOrderOwner

// @snippet start permissionsCompact
// scopes: ['orders:cancel']            AND — every scope required
// permissions: { owner: isOrderOwner } OR  — any key may pass
// @snippet end permissionsCompact

// Scopes and permissions answer different questions, and run in that order.
//
// `scopes` is what the *role* entitles you to, checked first and AND-ed: hold
// every one or the call never reaches the function. It is narrowed to the
// generated `ScopeId` union, so a typo is a compile error rather than a gate
// that silently never matches.
//
// `permissions` is what is true of *this row*, OR-ed across keys. No scope can
// express "your own order", because that depends on the data.
//
// A scope can only narrow access — it cannot grant what a permission refuses.
// See cancel-order.function.ts for the pair used together on a real function.

// @snippet start scopedFunction
// Administration is a scope, not a string comparison against a column. The old
// `session.role === 'admin'` shape could not be checked at build time, could
// not be granted through the console, and said nothing about *which* admin
// capability was needed.
export const deleteOrder = pikkuFunc({
  func: async ({ kysely }, { orderId }: { orderId: string }) => {
    await kysely.deleteFrom('order').where('orderId', '=', orderId).execute()
  },
  scopes: ['orders'],
})
// @snippet end scopedFunction

// @snippet start shopGetProfile
export const getProfile = pikkuFunc({
  func: async ({ kysely }, _data, { session }) => {
    return kysely
      .selectFrom('appUser')
      .select(['userId', 'name', 'email', 'role'])
      .where('userId', '=', session.userId)
      .executeTakeFirstOrThrow()
  },
})
// @snippet end shopGetProfile

// @snippet start shopAuthScope
// Sessions arrive from Better Auth — the CLI generates the session-bridge
// middleware from src/wirings/auth.wiring.ts, so nothing here has to read a
// cookie or a bearer header itself.
//
// `auth: true` is the baseline: no session, no call. Authorization lives on
// the function (see deleteOrder above); the wiring only maps the route to it.
wireHTTP({
  method: 'delete',
  route: '/orders/:orderId',
  func: deleteOrder,
  auth: true,
})
// @snippet end shopAuthScope
