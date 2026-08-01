import { pikkuAuth, pikkuPermission, pikkuFunc, wireHTTP } from '#pikku'

// @snippet start shopIsAuthenticated
export const isAuthenticated = pikkuAuth(
  async (_services, session) => !!session
)

export const isAdmin = pikkuAuth(
  async (_services, session) => session?.role === 'admin'
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
// permissions: { admin: isAdmin, owner: [isAuthenticated, isOrderOwner] }
// @snippet end permissionsCompact

// @snippet start shopPermissions
export const deleteOrder = pikkuFunc({
  func: async ({ kysely }, { orderId }: { orderId: string }) => {
    await kysely.deleteFrom('order').where('orderId', '=', orderId).execute()
  },
  // OR logic across keys, AND within arrays
  permissions: {
    admin: isAdmin,                          // OR: admins can always delete
    owner: [isAuthenticated, isOrderOwner],  // OR: authenticated owner can delete
  },
})
// @snippet end shopPermissions

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
