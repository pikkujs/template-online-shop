import { pikkuConfig } from '../.pikku/pikku-types.gen.js'

export const createConfig = pikkuConfig(async () => ({
  port: parseInt(process.env.API_PORT || '4003', 10),
  hostname: process.env.HOST || '0.0.0.0',
}))
