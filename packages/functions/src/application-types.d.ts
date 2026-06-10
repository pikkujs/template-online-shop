import type { CoreServices, CoreSingletonServices, CoreConfig, CoreUserSession } from '@pikku/core'
import type { Kysely } from 'kysely'
import type { DB } from './types/db.types.js'
import type { TypedSecretService } from '../.pikku/secrets/pikku-secrets.gen.js'
import type { TypedVariablesService } from '../.pikku/variables/pikku-variables.gen.js'
import type { FakePaymentService } from './services/fake-payment.js'

export interface UserSession extends CoreUserSession {
  userId: string
  role: 'customer' | 'admin'
}

export interface Config extends CoreConfig {}

export interface SingletonServices extends CoreSingletonServices<Config> {
  variables: TypedVariablesService
  secrets: TypedSecretService
  kysely: Kysely<DB>
  paymentService: FakePaymentService
}

export interface Services extends CoreServices<SingletonServices> {}
