# Ecommerce V1 Design

## Architecture

```text
apps/
  app/          React + Vite admin/portal after-login app
  storefront/   Next.js public storefront mock
  api/          NestJS backend API

packages/
  shared/       shared types, schemas, permissions, API helpers
  ui/           Mantine theme package
  connectors/   marketplace adapter contracts and mock connectors
```

## Frontend

`apps/app` combines admin and seller portal routes. The backend remains the security authority. The
frontend stores the V1 JWT in local storage, calls `/auth/me` for the current role, and uses role-aware
navigation and route guards for ergonomics.

Routes:

- `/admin`: catalog, channel health, sync jobs, product creation
- `/portal`: seller order handling view
- `/account`: account and role context
- `/login`: public JWT login route

Mantine is the main component system. Tailwind is configured only for utilities and disables Preflight
to avoid overriding Mantine base styles.

`apps/storefront` uses Next.js App Router and reads public catalog data from
`NEXT_PUBLIC_API_URL`:

- homepage
- `/products`
- `/products/[slug]`
- static params and product metadata hooks backed by API data

## Backend

`apps/api` exposes OpenAPI docs at `/docs`. Internal routes require
`Authorization: Bearer <token>`. JWT claims include `sub`, `accountId`, `email`, and `role`; the
global guard writes the account boundary into the request context so services never trust a client
tenant header by default.

Resource areas:

- auth identity context
- products and inventory
- orders
- channels
- sync jobs
- public product listing/detail at `/public/products`

## Marketplace Connectors

`packages/connectors` defines the adapter contract:

- connect/authenticate channel
- push listing
- pull orders
- update inventory
- normalize errors
- report sync status

V1 includes mock connectors for Shopee, TikTok Shop, and Meta. Sync endpoints create DB sync jobs and
enqueue BullMQ work on `marketplace-sync` when `REDIS_URL` is configured. Jobs use 3 attempts with
exponential backoff, move through `queued` and `running`, then persist final `success` or `failed`
state with normalized `errorCode`, `message`, and `retryable`. Local development without Redis uses
the same processors inline so the UI remains usable.

## Database

The Prisma schema models accounts, users, products, channels, listings, orders, and sync jobs with
account-scoped indexes and uniqueness constraints.

Users store a scrypt password hash for the internal V1 auth flow. Seed data creates the demo account,
owner user, channels, products, orders, and an example sync job.

## Deployment Flow

Railway owns the API, PostgreSQL, and Redis services. Vercel owns the Vite admin app and the Next.js
storefront. The root `railway.json` builds the API workspace dependency graph, applies Prisma
migrations before start, and starts the Nest service. Railway `CORS_ORIGINS` allows the deployed
admin origin to call the API while the storefront bakes public product data during its Vercel build.
Platform integrations can deploy after CI passes; custom domains are not part of V1.
