import { pikkuWorkflowFunc } from '#pikku/workflow/pikku-workflow-types.gen.js'
import { pikkuFunc, wireHTTP } from '#pikku'
import { randomUUID } from 'node:crypto'

type ShippingAddress = {
  line1: string
  city: string
  postcode: string
  country: string
}

// @snippet start checkoutWorkflow
export const checkoutWorkflow = pikkuWorkflowFunc<
  { basketId: string; userId: string; shippingAddress: ShippingAddress; cardToken?: string },
  { orderId: string; status: 'paid' | 'payment_failed'; totalCents: number }
>({
  expose: true,
  func: async ({ kysely, paymentService, queueService }, data, { workflow }) => {
    // Step 1: Validate basket — confirm items exist and stock is sufficient
    const { items, totalCents } = await workflow.do('Validate basket', async () => {
      const rows = await kysely
        .selectFrom('basketItem')
        .innerJoin('item', 'item.itemId', 'basketItem.itemId')
        .select(['basketItem.itemId', 'basketItem.quantity', 'item.stock', 'item.name', 'item.priceCents'])
        .where('basketItem.basketId', '=', data.basketId)
        .execute()
      if (rows.length === 0) throw new Error('Basket is empty')
      for (const i of rows) {
        if (i.quantity > i.stock) throw new Error(`Insufficient stock for "${i.name}"`)
      }
      return { items: rows, totalCents: rows.reduce((s, i) => s + i.priceCents * i.quantity, 0) }
    })

    // Step 2: Persist order record and line items
    const orderId = randomUUID()
    await workflow.do('Create order', async () => {
      const now = new Date().toISOString()
      await kysely.insertInto('order').values({
        orderId, userId: data.userId, status: 'pending',
        totalCents, shippingAddress: JSON.stringify(data.shippingAddress),
        createdAt: now, updatedAt: now,
      }).execute()
      await kysely.insertInto('orderItem').values(
        items.map((i) => ({
          orderItemId: randomUUID(), orderId,
          itemId: i.itemId, quantity: i.quantity, unitPriceCents: i.priceCents,
        }))
      ).execute()
    })

    // Step 3: Charge the card — safely retried if the payment provider times out
    const payment = await workflow.do('Process payment', async () =>
      paymentService.charge({ amountCents: totalCents, cardToken: data.cardToken, orderId })
    )

    // Step 4: Finalize order status and clear the basket on success
    const status = payment.status === 'succeeded' ? ('paid' as const) : ('payment_failed' as const)
    await workflow.do('Finalize', async () => {
      const now = new Date().toISOString()
      await kysely.updateTable('order').set({ status, updatedAt: now }).where('orderId', '=', orderId).execute()
      if (status === 'paid') {
        await kysely.deleteFrom('basketItem').where('basketId', '=', data.basketId).execute()
        await queueService?.add('send-order-confirmation', { orderId, userId: data.userId })
      }
    })

    return { orderId, status, totalCents }
  },
})
// @snippet end checkoutWorkflow

// @snippet start workflowHTTPWiring
// Expose the checkout workflow via HTTP. rpc.startWorkflow() returns a runId
// immediately — the workflow runs async in the background.
// Pikku also auto-generates /workflow/:name/start and /workflow/:name/status/:id routes.
export const startCheckout = pikkuFunc({
  func: async ({}, { basketId, userId, shippingAddress, cardToken }: {
    basketId: string
    userId: string
    shippingAddress: ShippingAddress
    cardToken?: string
  }, { rpc }) => {
    return rpc.startWorkflow('checkoutWorkflow', { basketId, userId, shippingAddress, cardToken })
  },
})

wireHTTP({
  method: 'post',
  route: '/checkout',
  func: startCheckout,
  auth: true,
})
// @snippet end workflowHTTPWiring

// @snippet start workflowPatterns
// A refund workflow demonstrating conditional branching and a built-in sleep step.
export const refundWorkflow = pikkuWorkflowFunc<
  { orderId: string; reason: string },
  { orderId: string; refunded: boolean; message: string }
>({
  func: async ({ kysely }, data, { workflow }) => {
    const { eligible, totalCents } = await workflow.do('Check order', async () => {
      const order = await kysely
        .selectFrom('order').select(['status', 'totalCents'])
        .where('orderId', '=', data.orderId).executeTakeFirst()
      return { eligible: order?.status === 'paid', totalCents: order?.totalCents ?? 0 }
    })

    if (!eligible) {
      return { orderId: data.orderId, refunded: false, message: 'Order is not eligible for a refund.' }
    }

    // Hold for a cooling-off period before issuing the refund
    await workflow.sleep('Cooling-off delay', '5s')

    await workflow.do('Issue refund', async () => {
      await kysely
        .updateTable('order')
        .set({ status: 'refunded', updatedAt: new Date().toISOString() })
        .where('orderId', '=', data.orderId)
        .execute()
    })

    return {
      orderId: data.orderId,
      refunded: true,
      message: `Refunded ${(totalCents / 100).toFixed(2)} — reason: ${data.reason}`,
    }
  },
})
// @snippet end workflowPatterns
