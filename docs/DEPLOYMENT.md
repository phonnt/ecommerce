# Hướng Dẫn Deploy Ecommerce V1

Tài liệu này mô tả luồng deploy production cho monorepo V1:

- API NestJS, PostgreSQL và Redis trên Railway
- Admin React/Vite trên một Vercel project riêng
- Storefront Next.js static export trên một Vercel project riêng
- GitHub Actions dùng để kiểm tra install, Prisma generate, typecheck, test và build

Custom domain, checkout và marketplace production credentials nằm ngoài scope V1. Mock connectors
Shopee, TikTok Shop và Meta vẫn được dùng sau khi deploy.

## 1. Sơ Đồ Deploy

```text
GitHub main
  -> GitHub Actions CI

Railway project
  -> api service
       -> Postgres service
       -> Redis service

Vercel project ecommerce-app
  -> apps/app
  -> VITE_API_URL -> Railway API URL

Vercel project ecommerce-storefront
  -> apps/storefront
  -> NEXT_PUBLIC_API_URL -> Railway API URL
```

Những file deploy quan trọng trong repo:

| File | Vai trò |
| --- | --- |
| `railway.json` | Build API bằng Railpack, chạy Prisma migration trước start |
| `apps/app/vercel.json` | Build admin từ root monorepo và rewrite SPA |
| `apps/storefront/vercel.json` | Build storefront static export từ root monorepo |
| `.github/workflows/ci.yml` | CI trên push `main` và pull request |
| `apps/api/prisma/migrations/` | Migration production cho PostgreSQL |

## 2. Yêu Cầu Trước Khi Deploy

Cần có:

1. GitHub repo chứa code đã push lên branch cần deploy.
2. Node dùng version từ `.node-version`. Repo hiện dùng Node `22.12.0`.
3. `pnpm` dùng version từ root `package.json`. Repo hiện dùng `pnpm@9.15.0`.
4. Railway account và Railway CLI đã login.
5. Vercel account và Vercel CLI đã login.

Kiểm tra local trước khi tạo deployment:

```bash
pnpm install --frozen-lockfile
pnpm --filter @ecommerce/api db:generate
pnpm typecheck
pnpm test
pnpm build
```

Ý nghĩa từng lệnh:

| Lệnh | Ý nghĩa |
| --- | --- |
| `pnpm install --frozen-lockfile` | Cài đúng dependency versions đã khóa trong `pnpm-lock.yaml`; lệnh sẽ fail nếu lockfile lệch `package.json`. |
| `pnpm --filter @ecommerce/api db:generate` | Chạy Prisma Client generation cho API để TypeScript và runtime có generated client tương ứng schema hiện tại. |
| `pnpm typecheck` | Chạy typecheck toàn workspace qua Turbo trước khi deploy. |
| `pnpm test` | Chạy test suite toàn workspace. |
| `pnpm build` | Build API, admin, storefront và workspace packages theo dependency graph hiện tại. |

Không commit `.env`, JWT secret, database URL hay Redis URL. File `.env.example` chỉ giữ giá trị mẫu.

## 3. Ma Trận Biến Môi Trường

### Railway API service

| Biến | Bắt buộc | Giá trị |
| --- | --- | --- |
| `NODE_ENV` | Có | `production` |
| `DATABASE_URL` | Có | Reference tới `Postgres.DATABASE_URL` |
| `REDIS_URL` | Có | Reference tới `Redis.REDIS_URL` |
| `JWT_SECRET` | Có | Secret random dài, không commit |
| `CORS_ORIGINS` | Có cho admin web | Danh sách origin admin, tách bằng dấu phẩy |
| `ALLOW_DEV_TENANT_HEADER` | Nên set | `false` trong production |

Ví dụ nếu Railway database services có tên `Postgres` và `Redis`:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

Nếu đổi tên service, namespace trong reference variable cũng phải đổi theo.

### Vercel admin project

| Biến | Môi trường | Giá trị |
| --- | --- | --- |
| `VITE_API_URL` | Production | Public URL của Railway API |

`VITE_` là biến public trong bundle Vite. Giá trị này chỉ nên là API base URL, không được là secret.

### Vercel storefront project

| Biến | Môi trường | Giá trị |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Production | Public URL của Railway API |

Storefront đang dùng `output: "export"` trong `apps/storefront/next.config.ts`. Product pages được
lấy từ API khi build và được export thành static files. Sau khi đổi API URL hoặc muốn bake lại catalog
vào static export, cần redeploy storefront.

## 4. CI Trên GitHub

Workflow `CI` chạy trên push vào `main` và pull request. Workflow hiện tại:

1. Checkout source.
2. Cài `pnpm@9.15.0`.
3. Setup Node `22.12.0`.
4. Install workspace dependencies.
5. Chạy `pnpm --filter @ecommerce/api db:generate`.
6. Chạy `pnpm typecheck`, `pnpm test`, `pnpm build`.

CI không tự deploy Railway hay Vercel. Platform deploy được thực hiện qua CLI hoặc integration riêng
sau khi CI pass.

Prisma V1 lưu datasource URL trong `apps/api/prisma.config.ts`. `prisma generate` trong CI không cần
kết nối database; migrate production vẫn cần `DATABASE_URL` thật trên Railway.

## 5. Deploy API Trên Railway

### 5.1 Tạo project và services

Từ root repo:

```bash
railway login
railway init
railway add --service api
railway add --database postgres
railway add --database redis
```

Ý nghĩa từng lệnh:

| Lệnh | Ý nghĩa |
| --- | --- |
| `railway login` | Xác thực Railway CLI với Railway account đang deploy. |
| `railway init` | Tạo Railway project mới và link root repo local vào project đó. |
| `railway add --service api` | Tạo empty service tên `api`; source code từ repo sẽ được upload vào service này khi chạy `railway up`. |
| `railway add --database postgres` | Provision PostgreSQL service trong Railway project và tạo các database variables như `DATABASE_URL`. |
| `railway add --database redis` | Provision Redis service để BullMQ queue dùng `REDIS_URL`. |

Nếu đã có Railway project, dùng `railway link` thay cho `railway init`.

Sau bước này cần có ba services trong cùng production environment:

- `api`
- `Postgres`
- `Redis`

Tên database services có thể khác. Ghi lại tên thực tế để dùng trong reference variables.

### 5.2 Gán biến cho API

Tạo JWT secret bằng password manager hoặc một secret generator. Sau đó set biến trên service `api`
trong Railway dashboard hoặc CLI.

Ví dụ CLI:

```bash
railway variable set NODE_ENV=production --service api --skip-deploys
railway variable set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' --service api --skip-deploys
railway variable set 'REDIS_URL=${{Redis.REDIS_URL}}' --service api --skip-deploys
railway variable set JWT_SECRET='<random-secret>' --service api --skip-deploys
railway variable set CORS_ORIGINS='https://<admin-vercel-domain>' --service api --skip-deploys
railway variable set ALLOW_DEV_TENANT_HEADER=false --service api --skip-deploys
```

Ý nghĩa từng lệnh:

| Lệnh | Ý nghĩa |
| --- | --- |
| `railway variable set NODE_ENV=production ...` | Bật production behavior của API, gồm yêu cầu có `JWT_SECRET`. |
| `railway variable set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' ...` | Tạo reference variable từ API service sang connection string private của Postgres service. |
| `railway variable set 'REDIS_URL=${{Redis.REDIS_URL}}' ...` | Tạo reference variable từ API service sang Redis service để queue chạy qua BullMQ. |
| `railway variable set JWT_SECRET='<random-secret>' ...` | Set secret dùng để ký và verify JWT nội bộ. |
| `railway variable set CORS_ORIGINS='https://<admin-vercel-domain>' ...` | Cho phép browser từ admin origin gọi API Railway. |
| `railway variable set ALLOW_DEV_TENANT_HEADER=false ...` | Tắt dev tenant header path trong production. |

`--service api` đảm bảo biến được set vào API service, không phải Postgres hay Redis. `--skip-deploys`
gom nhiều lần cập nhật biến lại trước khi chủ động deploy service.

Nếu admin cần localhost trong một test environment, thêm localhost origin vào `CORS_ORIGINS` của
environment đó thay vì mở rộng production không cần thiết.

### 5.3 Deploy API

Deploy từ root repo:

```bash
railway up --service api
```

Ý nghĩa lệnh:

| Lệnh | Ý nghĩa |
| --- | --- |
| `railway up --service api` | Upload root repo lên Railway, build deployment cho `api` service, chạy `preDeployCommand`, rồi start API theo `railway.json`. |

`railway.json` đã khai báo:

```json
{
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "pnpm turbo build --filter=@ecommerce/api"
  },
  "deploy": {
    "preDeployCommand": ["pnpm --filter @ecommerce/api db:migrate"],
    "startCommand": "pnpm --filter @ecommerce/api start:prod"
  }
}
```

Build command phải đi qua Turbo để build `@ecommerce/shared` và `@ecommerce/connectors` trước API.
Pre-deploy command dùng `prisma migrate deploy`, vì vậy mỗi schema change production phải có
migration được commit trong `apps/api/prisma/migrations/`.

### 5.4 Tạo public API domain

Tạo Railway public domain cho service `api` trong Railway dashboard hoặc qua CLI nếu CLI version đang
dùng expose domain command. Dùng public URL đó cho Vercel env vars.

Ví dụ dạng default URL:

```text
https://<api-service>.up.railway.app
```

### 5.5 Seed demo data nếu cần

Seed V1 tạo demo account, owner user, channels, products, order và một sync job. Chạy seed một lần nếu
deployment cần demo catalog và demo login.

`DATABASE_URL` của API service trên Railway thường trỏ tới private host `*.railway.internal`; máy
local không nên dùng host đó. Chạy local seed bằng public Postgres URL của service Postgres:

```bash
railway run --service Postgres -- sh -lc \
  'DATABASE_URL="$DATABASE_PUBLIC_URL" pnpm --filter @ecommerce/api db:seed'
```

Ý nghĩa lệnh:

| Phần lệnh | Ý nghĩa |
| --- | --- |
| `railway run --service Postgres -- ...` | Chạy command local nhưng inject variables của Postgres service vào process đó. |
| `sh -lc '...'` | Chạy một shell command để gán `DATABASE_URL` ngay trước seed command. |
| `DATABASE_URL="$DATABASE_PUBLIC_URL"` | Đổi Prisma sang public Postgres URL mà máy local có thể kết nối. |
| `pnpm --filter @ecommerce/api db:seed` | Chạy seed script của API để tạo demo data. |

Nếu Postgres service không expose `DATABASE_PUBLIC_URL`, seed từ một environment có thể kết nối
Postgres hoặc enable TCP proxy có kiểm soát trong Railway trước khi chạy lệnh trên.

Demo credentials sau seed:

```text
email: owner@example.com
password: owner12345
```

Không dùng demo password cho một tài khoản production thật.

### 5.6 Verify API

```bash
curl -i https://<railway-api-url>/docs
curl -i https://<railway-api-url>/public/products
curl -i https://<railway-api-url>/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"owner@example.com","password":"owner12345"}'
```

Ý nghĩa từng lệnh:

| Lệnh | Ý nghĩa |
| --- | --- |
| `curl -i https://<railway-api-url>/docs` | Kiểm tra API public domain tới được Swagger/OpenAPI docs và in cả response headers. |
| `curl -i https://<railway-api-url>/public/products` | Kiểm tra public catalog endpoint đọc được active products từ database. |
| `curl -i ... /auth/login ...` | Gửi JSON login request để kiểm tra auth endpoint và demo owner user sau seed. |

Kết quả mong đợi:

- `/docs` trả `200`.
- `/public/products` trả danh sách active products sau seed.
- `/auth/login` trả token khi demo user tồn tại.

## 6. Deploy Frontend Trên Vercel

Cần tạo hai Vercel projects riêng cùng trỏ tới root monorepo:

1. `ecommerce-app` cho `apps/app`
2. `ecommerce-storefront` cho `apps/storefront`

Trong CLI flow bên dưới, root repo được link lại mỗi khi đổi project. `.vercel/` là local state và
không được commit.

### 6.1 Deploy admin app

Link root repo tới Vercel admin project:

```bash
vercel link --yes --project ecommerce-app --scope <vercel-team>
```

Ý nghĩa lệnh:

| Lệnh | Ý nghĩa |
| --- | --- |
| `vercel link --yes --project ecommerce-app --scope <vercel-team>` | Link root repo local tới Vercel admin project trong team đã chọn; `.vercel/` giữ local link state. |

Set API URL production:

```bash
vercel env add VITE_API_URL production \
  --value https://<railway-api-url> \
  --force --yes --scope <vercel-team>
```

Ý nghĩa lệnh:

| Lệnh | Ý nghĩa |
| --- | --- |
| `vercel env add VITE_API_URL production ...` | Set hoặc overwrite production env var mà Vite bake vào admin build để gọi Railway API. |

Deploy production bằng config của admin:

```bash
vercel deploy --prod --yes \
  --local-config apps/app/vercel.json \
  --scope <vercel-team>
```

Ý nghĩa từng phần lệnh:

| Phần lệnh | Ý nghĩa |
| --- | --- |
| `vercel deploy --prod` | Tạo production deployment và promote vào production aliases của project đã link. |
| `--yes` | Bỏ qua interactive prompts trong CLI flow. |
| `--local-config apps/app/vercel.json` | Dùng config build/output/rewrite của admin app thay vì config mặc định ở root. |
| `--scope <vercel-team>` | Chạy lệnh trong đúng Vercel team. |

`apps/app/vercel.json` output ra `apps/app/dist` và có rewrite SPA về `index.html`, nên route như
`/login`, `/admin` và `/portal` vẫn load được khi refresh.

Sau khi Vercel cấp production domain cho admin, cập nhật `CORS_ORIGINS` trên Railway API service nếu
origin đó chưa có trong danh sách. Redeploy API nếu Railway chưa tự trigger deploy sau khi đổi biến.

### 6.2 Deploy storefront

Link root repo tới Vercel storefront project:

```bash
vercel link --yes --project ecommerce-storefront --scope <vercel-team>
```

Ý nghĩa lệnh:

| Lệnh | Ý nghĩa |
| --- | --- |
| `vercel link --yes --project ecommerce-storefront --scope <vercel-team>` | Chuyển root repo local sang Vercel storefront project trước khi set env và deploy storefront. |

Set API URL production:

```bash
vercel env add NEXT_PUBLIC_API_URL production \
  --value https://<railway-api-url> \
  --force --yes --scope <vercel-team>
```

Ý nghĩa lệnh:

| Lệnh | Ý nghĩa |
| --- | --- |
| `vercel env add NEXT_PUBLIC_API_URL production ...` | Set hoặc overwrite public API URL dùng khi Next.js storefront build static export. |

Deploy production bằng config của storefront:

```bash
vercel deploy --prod --yes \
  --local-config apps/storefront/vercel.json \
  --scope <vercel-team>
```

Ý nghĩa từng phần lệnh:

| Phần lệnh | Ý nghĩa |
| --- | --- |
| `vercel deploy --prod` | Tạo production deployment cho storefront project đã link. |
| `--yes` | Bỏ qua interactive prompts trong CLI flow. |
| `--local-config apps/storefront/vercel.json` | Dùng build command và output directory của storefront static export. |
| `--scope <vercel-team>` | Chạy lệnh trong đúng Vercel team. |

`apps/storefront/vercel.json` output ra `apps/storefront/out`. Khi build thành công, log Next.js nên
liệt kê `/products` và các active slug lấy từ public API.

### 6.3 Verify frontend

Mở:

```text
https://<admin-vercel-domain>/login
https://<storefront-vercel-domain>/
https://<storefront-vercel-domain>/products/
https://<storefront-vercel-domain>/products/<active-product-slug>/
```

Kiểm tra:

1. Admin login được bằng demo owner nếu đã seed.
2. Sau login admin đọc được products, orders, channels và sync jobs từ Railway API.
3. Storefront home, listing và product detail render sản phẩm active.
4. Browser console không có CORS error hay network error liên quan API URL.

## 7. Thứ Tự Deploy Khuyến Nghị

Cho một environment mới:

1. Push code và để GitHub Actions CI pass.
2. Tạo Railway project với `api`, Postgres và Redis.
3. Set Railway variables cho API.
4. Deploy Railway API; kiểm tra migration log và tạo public API domain.
5. Seed demo data nếu environment cần demo catalog/login.
6. Tạo và deploy Vercel admin project với `VITE_API_URL`.
7. Thêm admin origin vào `CORS_ORIGINS` của Railway API.
8. Tạo và deploy Vercel storefront project với `NEXT_PUBLIC_API_URL`.
9. Chạy verification API và browser.

Cho một code release tiếp theo:

1. Commit migration nếu schema Prisma đổi.
2. Để CI pass trên commit sẽ deploy.
3. Deploy Railway API trước nếu frontend cần API contract mới.
4. Deploy lại admin và storefront nếu frontend hoặc storefront static data đổi.

## 8. Troubleshooting

### Prisma generate fail trong CI

Kiểm tra `apps/api/prisma.config.ts`. Lệnh `prisma generate` load Prisma config ngay cả khi không cần
kết nối database. Nếu config bắt buộc `env("DATABASE_URL")` trong CI mà workflow không set DB URL,
generate sẽ fail.

### Railway build API không tìm thấy workspace package

Không đổi build command thành chỉ:

```bash
pnpm --filter @ecommerce/api build
```

API import `@ecommerce/shared` và `@ecommerce/connectors`. Deploy production hiện dùng:

```bash
pnpm turbo build --filter=@ecommerce/api
```

### Railway migrate không tạo bảng

Kiểm tra:

1. `DATABASE_URL` trên API service reference đúng Postgres service.
2. Migration mới đã commit trong `apps/api/prisma/migrations/`.
3. Deploy log của pre-deploy command có `prisma migrate deploy`.

### Local seed timeout với Railway Postgres

Nếu URL là host `postgres.railway.internal`, command đang dùng private network URL từ máy local. Dùng
`DATABASE_PUBLIC_URL` của Postgres service cho one-time local seed hoặc chạy seed trong network có thể
kết nối Railway private host.

### Admin có CORS error

Thêm đúng origin của admin production vào `CORS_ORIGINS` trên Railway API:

```text
https://<admin-vercel-domain>
```

Origin phải gồm protocol và domain, không gồm path.

### Storefront vẫn render catalog cũ

Storefront là static export. Sau khi đổi `NEXT_PUBLIC_API_URL`, active product slugs hoặc data cần
bake vào static HTML, redeploy Vercel storefront.

## 9. Checklist Release

- [ ] CI pass trên commit cần deploy.
- [ ] JWT secret production không dùng giá trị mẫu.
- [ ] API service có Postgres và Redis references đúng.
- [ ] Prisma migrations đã chạy thành công trên Railway.
- [ ] Railway API `/docs`, `/auth/login`, `/public/products` reachable.
- [ ] Admin Vercel origin nằm trong `CORS_ORIGINS`.
- [ ] Admin login gọi đúng Railway API.
- [ ] Storefront build từ public API và render product detail.
- [ ] Không commit `.env`, secret, Vercel local state hay Railway secret output.

## 10. Tài Liệu Provider

- Railway Config as Code: <https://docs.railway.com/reference/config-as-code>
- Railway CLI add service/database: <https://docs.railway.com/cli/add>
- Railway reference variables: <https://docs.railway.com/develop/variables>
- Railway pre-deploy commands: <https://docs.railway.com/guides/pre-deploy-command>
- Vercel CLI deploy: <https://vercel.com/docs/projects/deploy-from-cli>
- Vercel monorepos: <https://vercel.com/docs/monorepos>
- Vercel environment variables: <https://vercel.com/docs/environment-variables>
- Prisma production migrations: <https://docs.prisma.io/docs/cli/migrate/deploy>
- GitHub Actions workflow jobs: <https://docs.github.com/rest/actions/workflow-jobs>
