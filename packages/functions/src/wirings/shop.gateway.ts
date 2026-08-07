import type { GatewayAdapter, GatewayInboundMessage, GatewayOutboundMessage } from '@pikku/core/gateway'
import { wireGateway } from '@pikku/core/gateway'
import { pikkuSessionlessFunc } from '#pikku'

// @snippet start gatewayHandler
// A gateway handler receives a normalized GatewayInboundMessage regardless of platform.
export const handlePaymentWebhook = pikkuSessionlessFunc({
  expose: false,
  description: 'Process payment webhook events from the payment provider.',
  func: async ({ kysely, logger }, { text, raw }: { text: string; raw: unknown }) => {
    const payload = raw as { event: string; data: { orderId: string } }
    logger.info({ event: 'payment_webhook', type: payload.event })

    if (payload.event === 'payment.succeeded') {
      await kysely
        .updateTable('order')
        .set({ status: 'paid', updatedAt: new Date().toISOString() })
        .where('orderId', '=', payload.data.orderId)
        .execute()
    } else if (payload.event === 'payment.failed') {
      await kysely
        .updateTable('order')
        .set({ status: 'payment_failed', updatedAt: new Date().toISOString() })
        .where('orderId', '=', payload.data.orderId)
        .execute()
    }

    return { received: true }
  },
})
// @snippet end gatewayHandler

// @snippet start gatewayAdapter
// A gateway adapter normalizes platform-specific payloads into GatewayInboundMessage.
const paymentWebhookAdapter: GatewayAdapter = {
  name: 'payment-webhook',
  parse(data: unknown): GatewayInboundMessage | null {
    const body = data as Record<string, unknown>
    if (!body.event) return null
    return {
      senderId: String(body.merchant_id ?? 'unknown'),
      text: String(body.event),
      raw: data,
    }
  },
  async send(_senderId: string, _message: GatewayOutboundMessage) {
    // Webhooks are one-way — payment provider does not expect a reply
  },
  async init(_onMessage: (msg: GatewayInboundMessage) => Promise<void>) {
    // Webhook transport: incoming messages arrive via the POST route below
  },
  async close() {},
}
// @snippet end gatewayAdapter

// @snippet start gatewayWiring
// Wire the gateway — Pikku routes POST /webhooks/payment through the adapter and into your handler.
wireGateway({
  name: 'payment-webhook',
  type: 'webhook',
  route: '/webhooks/payment',
  adapter: paymentWebhookAdapter,
  func: handlePaymentWebhook,
  auth: false,
})
// @snippet end gatewayWiring

// @snippet start gatewayWebsocket
// WebSocket transport — browser clients connect directly.
// The adapter handles upgrade handshake and binary framing.
const webChatAdapter: GatewayAdapter = {
  name: 'webchat',
  parse: (data) => {
    const msg = data as Record<string, unknown>
    if (!msg.text) return null
    return { senderId: String(msg.clientId ?? 'anon'), text: String(msg.text), raw: data }
  },
  async send(_senderId: string, _message: GatewayOutboundMessage) {},
  async init(_onMessage: (msg: GatewayInboundMessage) => Promise<void>) {},
  async close() {},
}

wireGateway({
  name: 'webchat',
  type: 'websocket',
  route: '/chat',
  adapter: webChatAdapter,
  func: handlePaymentWebhook,
  auth: false,
})
// @snippet end gatewayWebsocket
