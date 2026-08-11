import { pikkuFunc } from '#pikku'

// @snippet start shopGetProfile
/**
 * The signed-in user's stored record, as opposed to the claims in their session.
 *
 * It reads `user` — the Better Auth table that accounts are actually created
 * in — and not `appUser`, which this schema also defines and which nothing has
 * ever written a row to. The original sample read the empty one, so wiring it
 * up turned every account page into a 500 with `no result`.
 */
export const getProfile = pikkuFunc({
  // Wired and exposed. It was neither: the function existed as a documentation
  // sample, so the one call that reads a user's stored row could not be made by
  // anything.
  expose: true,
  description: "Read the signed-in user's stored profile row.",
  func: async ({ kysely }, _data, { session }) => {
    return kysely
      .selectFrom('user')
      .select(['id', 'name', 'email', 'role'])
      .where('id', '=', session.userId)
      .executeTakeFirstOrThrow()
  },
})
// @snippet end shopGetProfile
