import { createHash } from 'node:crypto'

// Simple password hashing for demo — use bcrypt or argon2 in production.
export async function hashPassword(password: string): Promise<string> {
  return createHash('sha256').update(password).digest('hex')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = createHash('sha256').update(password).digest('hex')
  return computed === hash
}
