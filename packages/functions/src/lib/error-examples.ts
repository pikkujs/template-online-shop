import { MissingServiceError, NotFoundError } from '@pikku/core/errors'
import { isExpectedError } from '@pikku/core/errors'

// @snippet start missingServiceError
export const requireJwt = (jwt: unknown) => {
  if (!jwt) {
    throw new MissingServiceError('JWT service is required')
  }
}
// @snippet end missingServiceError

// @snippet start isExpectedError
export const expectedChecks = [
  isExpectedError(new NotFoundError()), // true
  isExpectedError(new TypeError('x is undefined')), // false
]
// @snippet end isExpectedError
