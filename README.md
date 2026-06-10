# Online Shop — Pikku Template

A production-ready online shop template built with Pikku. Covers every major Pikku feature and serves as the reference implementation for all code examples on the Pikku website.

## What's inside

| Feature | Where |
|---------|-------|
| HTTP REST API | `wirings/shop.http.ts` |
| SSO / credentials auth | `wirings/auth.wiring.ts` |
| Queue workers | `wirings/shop.queue.ts` |
| Cron jobs | `wirings/shop.cron.ts` |
| WebSocket channel | `wirings/shop.channel.ts` |
| MCP tools | `wirings/shop.mcp.ts` |
| Workflow (checkout) | `wirings/checkout.workflow.ts` |
| Trigger (low stock) | `wirings/shop.trigger.ts` |
| Variables & Secrets | `wirings/shop.variable.ts`, `shop.secret.ts` |

## Domain

A minimal online shop: categories → items → basket → checkout → orders.

- **Auth**: email/password via `@pikku/auth-js`
- **Payment**: fake provider (always succeeds unless card token ends in `0000`)
- **DB**: SQLite locally (via `pikku dev`), Postgres or libsql in production

## Local dev

```bash
yarn install
yarn dev          # pikku dev — starts HTTP server with hot reload + SQLite
```

The dev server runs at `http://localhost:3000` by default.

Seed data includes two users (password: `password`):
- `admin@shop.dev` — admin role
- `alice@example.com` — customer role

## Build

```bash
yarn build        # runs pikku all + tsc
```

## Test

```bash
yarn test
```
