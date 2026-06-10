import { pikkuAuth, pikkuPermission, pikkuFunc } from '#pikku'
import { authBearer, authCookie } from '@pikku/core/middleware'
import { addHTTPMiddleware, addHTTPPermission, wireHTTP } from '#pikku'
import { verifyPassword } from '../services/password.js'

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

// @snippet start shopLogin
export const shopLogin = pikkuFunc({
  auth: false,
  func: async (
    { kysely },
    { email, password }: { email: string; password: string },
    { setSession }
  ) => {
    const user = await kysely
      .selectFrom('appUser')
      .select(['userId', 'role', 'passwordHash'])
      .where('email', '=', email.toLowerCase())
      .executeTakeFirst()

    if (!user || !(await verifyPassword(password, user.passwordHash ?? ''))) {
      throw new Error('Invalid credentials')
    }

    setSession?.({ userId: user.userId, role: user.role })
    return { userId: user.userId, role: user.role }
  },
})
// @snippet end shopLogin

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

// @snippet start shopLogout
export const shopLogout = pikkuFunc({
  func: async (_services, _data, { clearSession }) => {
    clearSession?.()
  },
})
// @snippet end shopLogout

// @snippet start shopAuthMiddleware
// JWT Bearer — reads Authorization: Bearer <token> header
addHTTPMiddleware('*', [authBearer({})])

// Cookie-based sessions — auto-refreshes JWT on each request
addHTTPMiddleware('*', [
  authCookie({
    name: 'session',
    expiresIn: { value: 30, unit: 'day' },
    options: { httpOnly: true, secure: true },
  }),
])
// @snippet end shopAuthMiddleware

// @snippet start shopAuthScope
// Global: apply auth middleware to all routes
addHTTPMiddleware('*', [authBearer({})])

// Prefix-based: tighter permissions for admin routes only
addHTTPPermission('/admin/*', { admin: isAdmin })

// Inline: per-route permission override
wireHTTP({
  method: 'delete',
  route: '/orders/:orderId',
  func: deleteOrder,
  auth: true,
  permissions: { admin: isAdmin, owner: [isAuthenticated, isOrderOwner] },
})
// @snippet end shopAuthScope
