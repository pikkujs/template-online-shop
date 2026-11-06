import { betterAuth } from 'better-auth'
import {
  VIRTUAL_USER_SIGN_IN_OPT_IN_ENV,
  pikkuBan,
  pikkuVirtualUser,
} from '@pikku/better-auth'
import { virtualUserList } from '#pikku/scenarios/pikku-virtual-users.gen.js'
import { pikkuBetterAuth } from '#pikku/auth'

/**
 * Better Auth configuration — email + password sign-in.
 *
 * `pikkuBetterAuth` has no side effects: the pikku CLI statically inspects this single
 * exported `auth` const and generates the catch-all `/api/auth/**` HTTP wiring,
 * the session-bridge middleware, and a `defineSecret` for `BETTER_AUTH_SECRET` (and
 * one per social provider, if you add any) — so the auth routes and secret
 * requirements flow through normal inspection into the deploy manifest.
 *
 * The factory runs once when singleton services are built, pulling the secret
 * (and the database) off the injected `services`; the resolved instance is then
 * available to every function as `services.auth`. Better Auth is given the app's
 * own kysely: the CamelCasePlugin maps Better Auth's camelCase field names onto
 * the snake_case columns created in db/sqlite/0001-init.sql, keeping the whole DB
 * on one naming convention. To offer Google / GitHub / ... add a `socialProviders`
 * entry (and a button on the login page) — the CLI will wire its secret too.
 */
// The factory receives the FULL singleton services (emailService, logger, …) —
// destructure whatever you need, e.g. `{ kysely, secrets, emailService }` to wire
// sendResetPassword/verification emails. It runs lazily after all services exist,
// so never re-construct a service here or reach for a dynamic import.
// @snippet start betterAuthConfig
export const auth = pikkuBetterAuth(async ({ kysely, secrets, variables, emailService, scopeService }) => {
  // `.reveal()` at the sink, not earlier: getSecret hands back a nominal
  // SecretValue that no concretely-typed parameter accepts, so every disclosure
  // is one greppable call. Better Auth wants the raw string, and this is where
  // it stops being a secret in the type system.
  const BETTER_AUTH_SECRET = (await secrets.getSecret('BETTER_AUTH_SECRET')).reveal()
  // The public half of this stage's virtual user key pair, from the deployer;
  // `pikku dev` sets it for you. Without it no caller outside the app can sign
  // in as a virtual user. Runs inside the app don't need it.
  const VIRTUAL_USER_VERIFY_KEY = await variables.get('VIRTUAL_USER_VERIFY_KEY')
  // The opt-in, read through `variables` because a Worker has no populated
  // environment for the plugin to find it in.
  const ALLOW_VIRTUAL_USER_SIGN_IN = await variables.get(VIRTUAL_USER_SIGN_IN_OPT_IN_ENV)

  return betterAuth({
    secret: BETTER_AUTH_SECRET,
    database: { db: kysely, type: 'sqlite' },
    emailAndPassword: {
      enabled: true,
      // Without this, `requestPasswordReset` succeeds on the client and silently
      // sends nothing — the "Forgot password?" flow looks wired and dead-ends.
      // Better Auth builds `url` from its baseURL + the client's redirectTo, so
      // the app only supplies the message. Errors are logged, never swallowed:
      // a reset the user never receives must be visible in the logs.
      sendResetPassword: async ({ user, url }) => {
        await emailService.send({
          to: user.email,
          template: {
            name: 'reset-password',
            data: { email: user.email, resetUrl: url },
          },
        })
      },
    },
    // @snippet skip
    // Stateless session: CLI splits out betterAuthStatelessSession so non-auth
    // units verify the signed cookie instead of bundling better-auth. pikku #737.
    session: { cookieCache: { enabled: true } },
    advanced: { database: { generateId: 'uuid' } },
    // Scenario virtual users: synthetic users (user.virtualUser = true) that
    // sign in with a short-lived signed statement, never a password. The same
    // plugin serves the "Sign in as" switcher. Never signs in real users.
    //
    // pikkuBan(): adds the `banned`/`banReason`/`banExpires` columns (see
    // db/sqlite/0003-admin.sql) and the checks that refuse a banned user's
    // sign-in.
    plugins: [
      pikkuVirtualUser({
        allowSignIn: ALLOW_VIRTUAL_USER_SIGN_IN,
        verifyKey: VIRTUAL_USER_VERIFY_KEY,
        virtualUserSignIn: { virtualUsers: virtualUserList },
        // Under `pikku dev` sign-in creates the account, so it also grants the
        // roles defineVirtualUsers declares.
        scopeService,
      }),
      pikkuBan(),
    ],
  })
})

// @snippet end betterAuthConfig
