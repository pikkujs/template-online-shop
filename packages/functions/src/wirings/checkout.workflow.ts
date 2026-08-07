import { pikkuWorkflowFunc } from '#pikku/workflow/pikku-workflow-types.gen.js'
import { pikkuFunc, pikkuSessionlessFunc, wireHTTP } from '#pikku'
import { randomUUID } from 'node:crypto'

type ShippingAddress = {
  line1: string
  city: string
  postcode: string
  country: string
}

// @snippet start workflowSteps
// Every step of a DSL workflow is an ordinary pikku function. That is what
// makes a step retryable on its own, replayable from the durable log, and
// visible as a node in the generated workflow graph.
export const validateBasket = pikkuSessionlessFunc({
  description: 'Confirm the basket has items and enough stock to sell.',
  func: async ({ kysely }, { basketId }: { basketId: string }) => {
    const rows = await kysely
      .selectFrom('basketItem')
      .innerJoin('item', 'item.itemId', 'basketItem.itemId')
      .select(['basketItem.itemId', 'basketItem.quantity', 'item.stock', 'item.name', 'item.priceCents'])
      .where('basketItem.basketId', '=', basketId)
      .execute()

    if (rows.length === 0) throw new Error('Basket is empty')
    for (const i of rows) {
      if (i.quantity > i.stock) throw new Error(`Insufficient stock for "${i.name}"`)
    }

    return {
      items: rows.map((i) => ({ itemId: i.itemId, quantity: i.quantity, priceCents: i.priceCents })),
      totalCents: rows.reduce((s, i) => s + i.priceCents * i.quantity, 0),
    }
  },
})
// @snippet end workflowSteps

export const createOrderRecord = pikkuSessionlessFunc({
  description: 'Persist the order and its line items.',
  func: async (
    { kysely },
    data: {
      userId: string
      totalCents: number
      shippingAddress: ShippingAddress
      items: Array<{ itemId: string; quantity: number; priceCents: number }>
    }
  ) => {
    const orderId = randomUUID()
    const now = new Date().toISOString()

    await kysely.insertInto('order').values({
      orderId, userId: data.userId, status: 'pending',
      totalCents: data.totalCents, shippingAddress: JSON.stringify(data.shippingAddress),
      createdAt: now, updatedAt: now,
    }).execute()

    await kysely.insertInto('orderItem').values(
      data.items.map((i) => ({
        orderItemId: randomUUID(), orderId,
        itemId: i.itemId, quantity: i.quantity, unitPriceCents: i.priceCents,
      }))
    ).execute()

    return { orderId }
  },
})

export const chargeCard = pikkuSessionlessFunc({
  description: 'Charge the card through the payment provider.',
  func: async (
    { paymentService },
    data: { orderId: string; totalCents: number; cardToken?: string }
  ) => {
    return paymentService.charge({
      amountCents: data.totalCents,
      cardToken: data.cardToken,
      orderId: data.orderId,
    })
  },
})

export const finalizeOrder = pikkuSessionlessFunc({
  description: 'Record the outcome, and on success clear the basket and queue the receipt.',
  func: async (
    { kysely, queueService },
    data: { orderId: string; basketId: string; userId: string; status: 'paid' | 'payment_failed' }
  ) => {
    await kysely
      .updateTable('order')
      .set({ status: data.status, updatedAt: new Date().toISOString() })
      .where('orderId', '=', data.orderId)
      .execute()

    if (data.status === 'paid') {
      await kysely.deleteFrom('basketItem').where('basketId', '=', data.basketId).execute()
      await queueService?.add('send-order-confirmation', { orderId: data.orderId, userId: data.userId })
    }
  },
})

// @snippet start checkoutWorkflow
// @snippet start wireWorkflow
// The workflow body is the plan, not the work: each `workflow.do` names a step
// and the function that performs it. Pikku records every step in a durable log,
// so a crash mid-payment resumes at the step that failed rather than charging
// the card twice.
export const checkoutWorkflow = pikkuWorkflowFunc<
  { basketId: string; userId: string; shippingAddress: ShippingAddress; cardToken?: string },
  { orderId: string; status: 'paid' | 'payment_failed'; totalCents: number }
>({
  expose: true,
  func: async (_services, data, { workflow }) => {
    const basket = await workflow.do('Validate basket', 'validateBasket', {
      basketId: data.basketId,
    })

    const order = await workflow.do('Create order', 'createOrderRecord', {
      userId: data.userId,
      totalCents: basket.totalCents,
      shippingAddress: data.shippingAddress,
      items: basket.items,
    })

    // Safely retried if the payment provider times out.
    const payment = await workflow.do('Process payment', 'chargeCard', {
      orderId: order.orderId,
      totalCents: basket.totalCents,
      cardToken: data.cardToken,
    })

    const status = payment.status === 'succeeded' ? ('paid' as const) : ('payment_failed' as const)

    await workflow.do('Finalize', 'finalizeOrder', {
      orderId: order.orderId,
      basketId: data.basketId,
      userId: data.userId,
      status,
    })

    return { orderId: order.orderId, status, totalCents: basket.totalCents }
  },
})
// @snippet end wireWorkflow
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

export const checkOrderRefundable = pikkuSessionlessFunc({
  description: 'Report whether an order is in a state that can be refunded.',
  func: async ({ kysely }, { orderId }: { orderId: string }) => {
    const order = await kysely
      .selectFrom('order').select(['status', 'totalCents'])
      .where('orderId', '=', orderId).executeTakeFirst()
    return { eligible: order?.status === 'paid', totalCents: order?.totalCents ?? 0 }
  },
})

export const issueRefund = pikkuSessionlessFunc({
  description: 'Mark an order refunded.',
  func: async ({ kysely }, { orderId }: { orderId: string }) => {
    await kysely
      .updateTable('order')
      .set({ status: 'refunded', updatedAt: new Date().toISOString() })
      .where('orderId', '=', orderId)
      .execute()
  },
})

// @snippet start workflowPatterns
// A refund workflow demonstrating conditional branching and a built-in sleep step.
export const refundWorkflow = pikkuWorkflowFunc<
  { orderId: string; reason: string },
  { orderId: string; refunded: boolean; message: string }
>({
  func: async (_services, data, { workflow }) => {
    // @snippet start workflowBranching
    const check = await workflow.do('Check order', 'checkOrderRefundable', {
      orderId: data.orderId,
    })

    if (!check.eligible) {
      return { orderId: data.orderId, refunded: false, message: 'Order is not eligible for a refund.' }
    }

    // Hold for a cooling-off period before issuing the refund
    await workflow.sleep('Cooling-off delay', '5s')

    await workflow.do('Issue refund', 'issueRefund', { orderId: data.orderId })
    // @snippet end workflowBranching

    return {
      orderId: data.orderId,
      refunded: true,
      message: `Refunded ${(check.totalCents / 100).toFixed(2)} — reason: ${data.reason}`,
    }
  },
})
// @snippet end workflowPatterns
