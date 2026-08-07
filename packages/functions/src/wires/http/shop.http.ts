import { wireHTTP } from '#pikku'
import { listItems } from '../../functions/list-items.function.js'
import { addToBasket } from '../../functions/add-to-basket.function.js'
import { cancelOrder } from '../../functions/cancel-order.function.js'

/**
 * The shop's HTTP surface. Authorization lives on the functions, so a wiring
 * only maps a route to one — which is why the same function is reachable
 * identically over RPC, the CLI and MCP without a second set of checks.
 */
// @snippet start wireHttp
wireHTTP({
  method: 'get',
  route: '/items',
  func: listItems,
  auth: true,
})

wireHTTP({
  method: 'post',
  route: '/basket/items',
  func: addToBasket,
  auth: true,
})

wireHTTP({
  method: 'post',
  route: '/orders/:orderId/cancel',
  func: cancelOrder,
  auth: true,
})
// @snippet end wireHttp
