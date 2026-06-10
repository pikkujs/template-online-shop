import { pikkuAIAgent, agent, agentStream } from '#pikku/agent/pikku-agent-types.gen.js'
import { wireHTTP } from '#pikku'
import { listCategories } from '../functions/categories/list-categories.function.js'
import { listItems } from '../functions/items/list-items.function.js'
import { getItem } from '../functions/items/get-item.function.js'
import { getBasket } from '../functions/basket/get-basket.function.js'
import { addToBasket } from '../functions/basket/add-to-basket.function.js'
import { removeFromBasket } from '../functions/basket/remove-from-basket.function.js'
import { listOrders } from '../functions/orders/list-orders.function.js'
import { getOrder } from '../functions/orders/get-order.function.js'
import { cancelOrder } from '../functions/orders/cancel-order.function.js'

// @snippet start aiAgent
export const shopAssistant = pikkuAIAgent({
  name: 'shop-assistant',
  description: 'Helps customers browse the catalogue and manage their basket.',
  goal: 'Help users find products, manage their basket, and answer questions about shop items.',
  model: 'openai/gpt-4o-mini',
  tools: [listCategories, listItems, getItem, getBasket, addToBasket, removeFromBasket],
  memory: { storage: 'aiStorage', lastMessages: 20 },
  maxSteps: 10,
})
// @snippet end aiAgent

// @snippet start aiAgentInvoke
// Wire the agent as a standard HTTP endpoint — non-streaming, returns the full response.
wireHTTP({
  method: 'post',
  route: '/agents/shop',
  func: agent('shop-assistant'),
  auth: true,
})
// @snippet end aiAgentInvoke

// @snippet start aiAgentStream
// Streaming endpoint — sends text-delta, tool-call, and usage events as they arrive.
wireHTTP({
  method: 'post',
  route: '/agents/shop/stream',
  func: agentStream('shop-assistant'),
  auth: true,
})
// @snippet end aiAgentStream

// @snippet start aiAgentDynamic
export const opsAgent = pikkuAIAgent({
  name: 'ops-agent',
  description: 'Manages orders; automates repeat ops tasks.',
  goal: 'Manage orders and automate recurring ops as durable workflows.',
  model: 'openai/gpt-4o-mini',
  tools: [listOrders, getOrder, cancelOrder],
  dynamicWorkflows: 'write',
  maxSteps: 8,
})
// @snippet end aiAgentDynamic

// A focused checkout assistant — delegates browsing to the shop assistant.
export const checkoutAssistant = pikkuAIAgent({
  name: 'checkout-assistant',
  description: 'Guides authenticated users through checkout.',
  goal: 'Help users review their basket and complete their purchase. Delegate product questions to the shop assistant.',
  model: 'openai/gpt-4o-mini',
  tools: [getBasket, getItem],
  agents: [shopAssistant],
  maxSteps: 5,
})
