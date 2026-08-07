import { z } from 'zod'
import { staticRoutes, sweepAllPages, type ActorSession } from '@pikku/playwright'
import { pikkuScenarioStep } from '#pikku/workflow/pikku-workflow-types.gen.js'

/**
 * The generic browser vocabulary, the scenario equivalent of what
 * `registerBrowserSteps` from `@pikku/cucumber/browser` used to supply. Keep
 * this file generic — per-domain steps belong in their own `*.steps.ts`
 * alongside the feature that uses them.
 *
 * The runner opens one BrowserContext per actor and signs it in at
 * `signInPath` BEFORE the first step runs, so there is no "log in" step and no
 * signed-out state to drive. A scenario that must start signed out clears the
 * context itself (`browser.context.clearCookies()`), which only makes sense in
 * one that creates an identity.
 *
 * Do NOT set `XBROWSER_CDP_URL` in a sandbox. `@pikku/playwright` connects over
 * CDP whenever that variable is present and launches the in-image chromium
 * (`PLAYWRIGHT_CHROMIUM_PATH`) otherwise — setting it routes the whole sweep to
 * an off-box browser that cannot reach this app, which reads as every page
 * failing at once.
 */

/** `wire.browser` is the driver's session; the sweep needs its issue collector. */
const session = (browser: unknown) => browser as ActorSession

export const OpensPageInput = z.object({
  /** App-relative path, e.g. `/app`. */
  path: z.string(),
})

export const OpensPageOutput = z.object({
  /** Where the browser actually came to rest — a guard redirect shows up here. */
  pathname: z.string(),
  status: z.number().nullable(),
})

/**
 * Open one app page as the step's actor and report where it landed.
 *
 * Returns rather than asserts: a scenario that expects a redirect and one that
 * forbids it both read the same value, and the landed path appears in the run
 * record either way.
 */
export const opensPage = pikkuScenarioStep({
  name: 'opensPage',
  description: 'opens an app page as the signed-in actor',
  template: 'opens {path}',
  input: OpensPageInput,
  output: OpensPageOutput,
  browser: async (_services, { path }, { browser }) => {
    const actor = session(browser)
    const status = await actor.gotoApp(path)
    let pathname = path
    try {
      pathname = new URL(actor.page.url()).pathname
    } catch {
      // A page that never navigated keeps the requested path — the assertion in
      // the scenario is what reports that, not a thrown URL parse error.
    }
    return { pathname, status }
  },
})

export const SeesTextInput = z.object({
  text: z.string(),
})

export const SeesTextOutput = z.object({
  text: z.string(),
})

/** Wait for a string to appear on the page, failing with the driver's own timeout. */
export const seesText = pikkuScenarioStep({
  name: 'seesText',
  description: 'waits for text to appear on the current page',
  template: 'sees {text}',
  input: SeesTextInput,
  output: SeesTextOutput,
  browser: async (_services, { text }, { browser }) => {
    await session(browser).expectText(text)
    return { text }
  },
})

export const RestsOnPathInput = z.object({
  /** App-relative path the actor should have come to rest on, e.g. `/app`. */
  path: z.string(),
})

export const RestsOnPathOutput = z.object({
  pathname: z.string(),
})

/** `/app/` and `/app` are the same route; compare them as such. */
const normalisePath = (path: string) => path.replace(/\/+$/, '') || '/'

/**
 * Assert the browser came to rest on exactly a path, naming where it went if not.
 *
 * This is the assertion half of `opensPage`, which deliberately only reports
 * where it landed. Keeping it a step rather than an `if`/`throw` in the scenario
 * body is what makes it count toward witness coverage — an assertion-free ladder
 * proves only that nothing threw, and the inspector fails the build over it
 * (PKU680).
 *
 * It asserts on the URL rather than page copy because every scaffolded app
 * rewrites its own copy; the route guard's behaviour is what the template can
 * still speak for. The match is exact rather than a prefix on purpose — the
 * redirect this exists to catch is `/app` → `/app/login`, which any prefix test
 * would happily accept.
 */
export const restsOnPath = pikkuScenarioStep({
  name: 'restsOnPath',
  description: 'asserts the browser came to rest on an app path',
  template: 'is on {path}',
  input: RestsOnPathInput,
  output: RestsOnPathOutput,
  browser: async (_services, { path }, { browser }) => {
    const actor = session(browser)
    const pathname = new URL(actor.page.url()).pathname
    if (normalisePath(pathname) !== normalisePath(path)) {
      throw new Error(
        `Expected to be on ${path}, but the browser rests on ${pathname}. ` +
          `A bounce to a login route means the session cookie did not carry, or the route guard rejected it.`,
      )
    }
    return { pathname }
  },
})

export const SweepsAllPagesInput = z.object({
  /**
   * Where each app's generated `src/routeTree.gen.ts` is read from, relative to
   * the directory `pikku scenario run` was invoked in — the repo root, hence `.`.
   */
  repoRoot: z.string().default('.'),
})

export const SweepsAllPagesOutput = z.object({
  routes: z.array(z.string()),
})

/**
 * Visit every static route and fail on the first page that is not clean.
 *
 * "Clean" means: no HTTP error, no failed or 5xx app API call, no uncaught
 * exception, no console error, and no bounce to `/app/login`. Routes come from the
 * generated TanStack route tree, so a new page is swept the moment it exists —
 * nothing here lists them. Parameterised routes and the auth pages are skipped
 * by `staticRoutes`.
 *
 * `sweepAllPages` retries a page whose only problems are transient (an aborted
 * request, a 502/503/504, a login bounce during a dev-server restart), so a
 * failure reported here is a failure that survived three attempts.
 */
export const sweepsAllPages = pikkuScenarioStep({
  name: 'sweepsAllPages',
  description: 'visits every static route and fails on any runtime error',
  template: 'every page loads without errors',
  input: SweepsAllPagesInput,
  output: SweepsAllPagesOutput,
  browser: async (_services, { repoRoot }, { browser }) => {
    const actor = session(browser)
    await actor.waitForServerReady()
    await sweepAllPages(actor, repoRoot)
    return { routes: staticRoutes(repoRoot) }
  },
})
