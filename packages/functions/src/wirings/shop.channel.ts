import { wireChannel, pikkuChannelFunc, pikkuChannelConnectionFunc, pikkuChannelDisconnectionFunc } from '#pikku/channel/pikku-channel-types.gen.js'
import { pikkuFunc } from '#pikku'

const onConnect = pikkuChannelConnectionFunc(
  async ({ logger }, _, { channel }) => {
    logger.info({ event: 'ws_connected', channelId: channel.channelId })
  }
)

const onDisconnect = pikkuChannelDisconnectionFunc(
  async ({ logger }, _, { channel }) => {
    logger.info({ event: 'ws_disconnected', channelId: channel.channelId })
  }
)

// @snippet start orderStatusChannel
const subscribeToOrder = pikkuChannelFunc<{ orderId: string }, void>(
  async ({ eventHub }, { orderId }, { channel }) => {
    await eventHub?.subscribe(`order:${orderId}`, channel.channelId)
  }
)

const unsubscribeFromOrder = pikkuChannelFunc<{ orderId: string }, void>(
  async ({ eventHub }, { orderId }, { channel }) => {
    await eventHub?.unsubscribe(`order:${orderId}`, channel.channelId)
  }
)
// @snippet end orderStatusChannel

// @snippet start channelWiring
wireChannel({
  name: 'order-status',
  route: '/orders/status',
  auth: true,
  onConnect,
  onDisconnect,
  onMessageWiring: {
    type: {
      subscribe: subscribeToOrder,
      unsubscribe: unsubscribeFromOrder,
    },
  },
})
// @snippet end channelWiring

// @snippet start channelPubSub
// Publish from any HTTP handler to all WebSocket clients subscribed to that order.
export const notifyOrderShipped = pikkuFunc<{ orderId: string }, void>({
  func: async ({ eventHub, kysely }, { orderId }) => {
    await kysely
      .updateTable('order')
      .set({ status: 'shipped', updatedAt: new Date().toISOString() })
      .where('orderId', '=', orderId)
      .execute()

    await eventHub?.publish(`order:${orderId}`, null, { orderId, status: 'shipped' })
  },
})
// @snippet end channelPubSub
