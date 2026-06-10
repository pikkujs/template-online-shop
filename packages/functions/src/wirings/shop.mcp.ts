import { wireMCPResource, wireMCPPrompt, pikkuMCPResourceFunc, pikkuMCPPromptFunc, pikkuMCPToolFunc } from '#pikku/mcp/pikku-mcp-types.gen.js'

// @snippet start mcpTools
// Wrap existing Pikku functions as MCP tools via RPC — same implementation, no duplication.
export const listCategoriesTool = pikkuMCPToolFunc({
  description: 'List all product categories in the shop',
  func: async (_services, _input, { rpc }) => {
    const result = await rpc.invoke('listCategories')
    return [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
  },
})

export const listItemsTool = pikkuMCPToolFunc<{ categorySlug?: string; search?: string; limit?: number; offset?: number }>({
  description: 'List shop items, optionally filtered by category or search query',
  func: async (_services, { categorySlug, search, limit = 20, offset = 0 }, { rpc }) => {
    const result = await rpc.invoke('listItems', { categorySlug, search, limit, offset })
    return [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
  },
})

export const getItemTool = pikkuMCPToolFunc<{ itemId: string }>({
  description: 'Get full details for a specific shop item by ID',
  func: async (_services, { itemId }, { rpc }) => {
    const result = await rpc.invoke('getItem', { itemId })
    return [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
  },
})
// @snippet end mcpTools

// @snippet start mcpSingleTool
// Any Pikku function becomes an MCP tool — the same implementation already wired to HTTP.
export const getItemForAI = pikkuMCPToolFunc<{ itemId: string }>({
  description: 'Retrieve a shop item by its ID',
  func: async (_services, { itemId }, { rpc }) => {
    const result = await rpc.invoke('getItem', { itemId })
    return [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
  },
})
// @snippet end mcpSingleTool

// @snippet start mcpResource
// MCP resources let AI agents read data by URI template.
const itemResource = pikkuMCPResourceFunc<{ itemId: string }>(
  async ({ kysely }, { itemId }, { mcp }) => {
    const item = await kysely
      .selectFrom('item')
      .selectAll()
      .where('itemId', '=', itemId)
      .executeTakeFirstOrThrow()
    return [{ uri: mcp.uri!, text: JSON.stringify(item) }]
  }
)

wireMCPResource({
  uri: 'shop://items/{itemId}',
  title: 'Shop Item',
  description: 'Retrieve a single shop item by ID',
  func: itemResource,
})
// @snippet end mcpResource

// @snippet start mcpPrompt
// MCP prompts give AI agents reusable conversation starters.
const productRecommendation = pikkuMCPPromptFunc<{ category: string; budget: number }>(
  async ({}, { category, budget }) => {
    return [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Recommend products in "${category}" under £${budget}. List top 3 with prices.`,
      },
    }]
  }
)

wireMCPPrompt({
  name: 'product_recommendation',
  description: 'Generate a product recommendation prompt for a given category and budget',
  func: productRecommendation,
})
// @snippet end mcpPrompt

// @snippet start mcpWireObject
// Inside an MCP tool function, use the mcp wire object for dynamic control.
export const updateStockTool = pikkuMCPToolFunc<{ itemId: string; stock: number }>({
  name: 'update_stock',
  description: 'Update stock level for a shop item',
  func: async ({ kysely }, { itemId, stock }, { mcp }) => {
    await kysely
      .updateTable('item')
      .set({ stock })
      .where('itemId', '=', itemId)
      .execute()

    mcp.sendResourceUpdated(`shop://items/${itemId}`)
    await mcp.enableTools({ add_to_basket: stock > 0 } as any)

    return [{ type: 'text', text: `Stock updated to ${stock} for item ${itemId}` }]
  },
})
// @snippet end mcpWireObject
