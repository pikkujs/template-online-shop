import { pikkuConfig } from '../.pikku/pikku-types.gen.js'

// @snippet start shopConfig
// Wrapping the factory in pikkuConfig is what lets the CLI find it — the dev
// server, `pikku db` and the deploy manifest all resolve config through here.
export const createConfig = pikkuConfig(async () => {
  return {}
})
// @snippet end shopConfig
