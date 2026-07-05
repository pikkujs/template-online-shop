import { pikkuScenario } from '#pikku/workflow/pikku-workflow-types.gen.js'

// @snippet start scenarioBasics
// A scenario is a workflow whose steps run as real users ("actors") over the
// real transport — sign-in, auth middleware, permissions and serialization are
// all exercised end-to-end. The same flow doubles as an e2e test and a
// staging/production health check. Actors are registered in pikku.config.json.
export const shopperBuysAnItem = pikkuScenario({
  title: 'Shopper buys an item',
  description: 'Browse the catalogue, fill a basket and pay for an order.',
  tags: ['checkout'],
  func: async ({ logger }, _input, { workflow, actors }) => {
    const shopper = actors!.shopper

    // Each actor step names an exposed RPC and who performs it. The call goes
    // through the actor's authenticated client — never internal dispatch.
    const basket = await workflow.do(
      'Shopper opens their basket',
      'getBasket',
      {},
      { actor: shopper }
    )

    const { items } = await workflow.do(
      'Shopper browses the catalogue',
      'listItems',
      { search: 'mug' },
      { actor: shopper }
    )
    if (items.length === 0) throw new Error('Catalogue has no mugs to buy')

    await workflow.do(
      'Shopper adds a mug to the basket',
      'addToBasket',
      { basketId: basket.basketId, itemId: items[0].itemId, quantity: 1 },
      { actor: shopper }
    )

    const order = await workflow.do(
      'Shopper checks out',
      'createOrder',
      {
        basketId: basket.basketId,
        shippingAddress: { line1: '1 High Street', city: 'London', postcode: 'N1 1AA', country: 'GB' },
      },
      { actor: shopper }
    )

    // Durable polling step: re-invokes the RPC as the actor until the
    // predicate passes (or the timeout fails the scenario).
    await workflow.expectEventually(
      'Order is paid',
      'getOrder',
      { orderId: order.orderId },
      (o) => o.status === 'paid',
      { actor: shopper }
    )

    logger.info(`Scenario order ${order.orderId} paid: ${order.totalCents} cents`)
    return { orderId: order.orderId, totalCents: order.totalCents }
  },
})
// @snippet end scenarioBasics

// @snippet start scenarioConverse
// Actors can also hold a free-form conversation with one of your AI agents,
// in persona. The actor drives the agent over the real transport, answers its
// tool-approval requests, and returns a verdict on whether the task was met.
export const shopperAsksTheAssistant = pikkuScenario({
  title: 'Shopper gets help from the assistant',
  description: 'The shop assistant finds a product and adds it to the basket.',
  tags: ['agents'],
  func: async ({ logger }, _input, { workflow, actors }) => {
    const shopper = actors!.shopper

    const verdict = await workflow.do('Shopper chats to the assistant', async () =>
      shopper.converse({
        agent: 'shop-assistant',
        task: 'Find a coffee mug in the shop and add one to my basket.',
        evaluate: 'The assistant found a mug and confirmed it is in the basket.',
      })
    )
    if (!verdict.passed) {
      logger.error(verdict.transcript.join('\n'))
      throw new Error(`Assistant flow failed: ${verdict.reasoning}`)
    }

    // The verdict is the persona's judgement — follow up with a deterministic
    // check through the same actor.
    const basket = await workflow.do('Basket really has the mug', 'getBasket', {}, { actor: shopper })
    if (basket.itemCount === 0) throw new Error('Assistant claimed success but the basket is empty')

    return { itemCount: basket.itemCount }
  },
})
// @snippet end scenarioConverse
