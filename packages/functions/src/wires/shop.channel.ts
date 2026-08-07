import {
  wireChannel,
  pikkuChannelFunc,
  pikkuChannelConnectionFunc,
  pikkuChannelDisconnectionFunc,
} from '#pikku/channel/pikku-channel-types.gen.js'

export const onConnect = pikkuChannelConnectionFunc(
  async ({ logger }, _, { channel }) => {
    logger.info({ event: 'order_watch_connected', channelId: channel.channelId })
  }
)

export const onDisconnect = pikkuChannelDisconnectionFunc(
  async ({ logger }, _, { channel }) => {
    logger.info({ event: 'order_watch_disconnected', channelId: channel.channelId })
  }
)

/**
 * Order status, live.
 *
 * A shopper watching "paid → shipped" and a support agent watching the same
 * order want the same events, so the subscription is per order rather than per
 * user — and per order rather than a firehose, because somebody tracking one
 * parcel should not receive every other shopper's updates.
 */
// @snippet start wireChannel
export const watchOrder = pikkuChannelFunc<{ orderId: string }, void>(
  async ({ eventHub }, { orderId }, { channel }) => {
    await eventHub?.subscribe(`order:${orderId}`, channel.channelId)
  }
)

wireChannel({
  name: 'orders',
  route: '/orders',
  auth: true,
  onConnect,
  onDisconnect,
  onMessageWiring: {
    action: {
      watchOrder,
    },
  },
})
// @snippet end wireChannel
