import { wireCLI, pikkuCLICommand } from '#pikku/cli/pikku-cli-types.gen.js'
import { listItems } from '../functions/list-items.function.js'
import { dailySalesReport } from '../functions/daily-sales-report.function.js'

/**
 * The same functions the HTTP routes and MCP tools call, so an operator running
 * `shop report` by hand gets the identical code path — and the identical scope
 * check — as the 06:00 schedule.
 */
// @snippet start wireCli
wireCLI({
  program: 'shop',
  commands: {
    items: pikkuCLICommand({
      description: 'List the catalogue',
      func: listItems,
    }),
    report: pikkuCLICommand({
      description: "Compute yesterday's sales",
      func: dailySalesReport,
    }),
  },
})
// @snippet end wireCli
