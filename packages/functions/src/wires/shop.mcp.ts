import { pikkuMCPToolFunc } from '#pikku/mcp/pikku-mcp-types.gen.js'

/**
 * The shop, exposed to an AI agent. Every tool goes through `rpc.invoke`, so an
 * agent is subject to exactly the same scopes, permissions and audit as a
 * person — a tool that queried the database directly would be a second way in
 * with none of the checks.
 */
// @snippet start mcpTools
export const listItemsTool = pikkuMCPToolFunc<{
  categorySlug?: string
  search?: string
  limit?: number
}>({
  description: 'Browse the shop catalogue, optionally filtered by category or search',
  func: async (_services, input, { rpc }) => {
    const result = await rpc.invoke('listItems', {
      categorySlug: input?.categorySlug,
      search: input?.search,
      limit: input?.limit ?? 24,
    })
    return [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
  },
})

export const cancelOrderTool = pikkuMCPToolFunc<{ orderId: string }>({
  description: 'Cancel a pending or paid order and restore its stock',
  func: async (_services, input, { rpc }) => {
    const result = await rpc.invoke('cancelOrder', input)
    return [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
  },
})
// @snippet end mcpTools
