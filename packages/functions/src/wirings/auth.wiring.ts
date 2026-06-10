import Credentials from '@auth/core/providers/credentials'
import { createAuthRoutes } from '@pikku/auth-js'
import type { AuthConfigOrFactory } from '@pikku/auth-js'
import { wireHTTPRoutes } from '#pikku'
import { verifyPassword } from '../services/password.js'

const DEV_AUTH_SECRET = 'dev-insecure-auth-secret-change-me'

// @snippet start authConfig
const configFactory: AuthConfigOrFactory = async (services) => {
  const { kysely, secrets } = services as any
  const secret = (await secrets.getSecret('AUTH_SECRET').catch(() => null)) ?? DEV_AUTH_SECRET

  return {
    providers: [
      Credentials({
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          const email = (credentials?.email as string | undefined)?.toLowerCase()
          const password = credentials?.password as string | undefined
          if (!email || !password) return null

          const user = await kysely
            .selectFrom('appUser')
            .where('email', '=', email)
            .select(['userId', 'role', 'name', 'email', 'passwordHash'])
            .executeTakeFirst()

          if (!user || !user.passwordHash) return null
          const ok = await verifyPassword(password, user.passwordHash)
          if (!ok) return null

          return { id: user.userId, email: user.email, name: user.name, role: user.role }
        },
      }),
    ],
    callbacks: {
      jwt({ token, user }: any) {
        if (user) { token.role = user.role; token.userId = user.id }
        return token
      },
      session({ session, token }: any) {
        if (token) { session.role = token.role; session.userId = token.userId }
        return session
      },
    },
    session: { strategy: 'jwt' as const },
    secret,
    trustHost: true,
    basePath: '/auth',
  }
}
// @snippet end authConfig

wireHTTPRoutes({ routes: { auth: createAuthRoutes(configFactory) as any } })

// @snippet start authProviders
// providers: [ Google({ clientId, clientSecret }), Okta({ clientId, clientSecret, issuer }), ... ]
// @snippet end authProviders
