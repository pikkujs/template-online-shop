import { asI18nStub } from '@pikku/react'

import type { AppStory, AppStoryMeta } from './csf.types'
import { AuthCard } from './AuthCard'

// App lens: AuthCard is driven entirely by the PAGE's sign-in mutation, so each
// story is one state of that mutation rather than one visual variant.

export default {
  title: 'AuthCard',
  component: AuthCard,
  group: 'Auth',
  description: 'The sign-in / sign-up form inside the AuthShell frame.',
  inputs: [
    {
      name: 'signIn',
      kind: 'mutation',
      type: 'useMutation<void, Error, AuthFormValues>',
      description: 'Drives `busy` and `error`; owned by the page, not the card.',
    },
  ],
  argTypes: {
    includeName: { description: 'Show the Name field — sign-up only.' },
    error: { description: 'Server-side failure from the mutation, or null.' },
    busy: { description: 'Mutation is in flight; spins the primary button.' },
  },
} satisfies AppStoryMeta

const base = {
  appName: asI18nStub('Acme'),
  title: asI18nStub('Welcome back'),
  description: asI18nStub('Sign in to continue.'),
  cta: asI18nStub('Sign in'),
  passwordAutoComplete: 'current-password' as const,
  error: null,
  googleBusy: false,
  busy: false,
  footer: asI18nStub('New here? Create an account'),
  secondaryAction: asI18nStub('Forgot your password?'),
  onAuthSubmit: () => {},
  onGoogle: () => {},
}

export const Idle: AppStory = { tag: 'signIn: idle', args: base }

export const Submitting: AppStory = { tag: 'signIn: pending', args: { ...base, busy: true } }

export const Rejected: AppStory = {
  tag: 'signIn: error',
  args: { ...base, error: asI18nStub('That email and password do not match.') },
}

export const SignUp: AppStory = {
  tag: 'signIn: idle (sign-up)',
  args: {
    ...base,
    title: asI18nStub('Create your account'),
    description: asI18nStub('Start your free trial.'),
    cta: asI18nStub('Create account'),
    includeName: true,
    passwordAutoComplete: 'new-password' as const,
    footer: asI18nStub('Already have an account? Sign in'),
    secondaryAction: undefined,
  },
}
