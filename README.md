# Ecommerce V1 Monorepo

V1 scaffold for an e-commerce operations platform with:

- `apps/app`: React + Vite admin/portal app with internal JWT login
- `apps/storefront`: Next.js public storefront with SEO-ready product routes backed by the API
- `apps/api`: NestJS API for auth, products, orders, channels, BullMQ sync jobs, RBAC, and tenant boundaries
- `packages/shared`: shared TypeScript types, Zod schemas, permissions, and API helpers
- `packages/ui`: Mantine theme shared by frontend apps
- `packages/connectors`: adapter-first marketplace connector contracts with sandbox mocks

## Quickstart

Prisma 7 requires Node `20.19+`, `22.12+`, or `24+`. Node `23.x` is not supported by
Prisma's installer.

```bash
pnpm install
pnpm --filter @ecommerce/api db:generate
pnpm --filter @ecommerce/api db:push
pnpm --filter @ecommerce/api db:seed
pnpm dev
```

Local services:

- Admin/portal app: `http://localhost:5173`
- Storefront: `http://localhost:3000`
- API: `http://localhost:3001`
- OpenAPI docs: `http://localhost:3001/docs`

Seeded demo credentials:

- Email: `owner@example.com`
- Password: `owner12345`

API requests require a bearer token. Login first, then pass `Authorization: Bearer <token>`:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"owner@example.com","password":"owner12345"}'
```

## Environment

Copy `.env.example` into the relevant app environment files as needed. The API also includes
`apps/api/.env.example`; Prisma reads `DATABASE_URL` from the API env file when validating or
generating the schema locally.

- `apps/app`: `VITE_API_URL`
- `apps/storefront`: `NEXT_PUBLIC_API_URL`
- `apps/api`: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, marketplace credentials

`ALLOW_DEV_TENANT_HEADER=true` re-enables the old `x-account-id` / `x-role` path for local debugging
only. Leave it unset in production.

When `REDIS_URL` is set, sync endpoints enqueue jobs on BullMQ queue `marketplace-sync` with 3
attempts and exponential backoff. Without `REDIS_URL`, the API runs the same mock sync processors
inline as a local-development fallback.

## Deployment

Vercel projects:

- `apps/app`: framework `Vite`, build `pnpm build`, output `dist`
- `apps/storefront`: framework `Next.js`, build `pnpm build`, output `.next`

Railway services:

- `apps/api`: build `pnpm --filter @ecommerce/api build`
- Start command: `pnpm --filter @ecommerce/api start:prod`
- Migration command before start: `pnpm --filter @ecommerce/api db:migrate`
- PostgreSQL: set `DATABASE_URL`
- Redis: set `REDIS_URL` for BullMQ queue `marketplace-sync`

Vercel environment:

- Admin app: `VITE_API_URL=<Railway API URL>`
- Storefront: `NEXT_PUBLIC_API_URL=<Railway API URL>`

## V1 Scope

The storefront is intentionally public without checkout. Marketplace integrations use mock connectors
for Shopee, TikTok Shop, and Meta so the API contract can stabilize before production API credentials
are introduced. Custom domains are out of scope for this phase; use the default Railway and Vercel
URLs.
