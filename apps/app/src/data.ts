import type { Channel, Order, Product, Role, SyncJob } from "@ecommerce/shared";

export const accountId = "demo-account";
export const roles: Role[] = ["owner", "admin", "staff", "seller", "customer"];

export const productsSeed: Product[] = [
  {
    id: "prod_1",
    accountId,
    sku: "LINEN-TEE-WHT",
    name: "Linen Everyday Tee",
    slug: "linen-everyday-tee",
    price: 490000,
    inventory: 84,
    status: "active",
    updatedAt: "2026-05-18T09:00:00.000Z"
  },
  {
    id: "prod_2",
    accountId,
    sku: "BAG-CANVAS-01",
    name: "Canvas Market Tote",
    slug: "canvas-market-tote",
    price: 320000,
    inventory: 32,
    status: "active",
    updatedAt: "2026-05-18T09:30:00.000Z"
  },
  {
    id: "prod_3",
    accountId,
    sku: "MUG-STONE-BLK",
    name: "Stoneware Coffee Mug",
    slug: "stoneware-coffee-mug",
    price: 210000,
    inventory: 12,
    status: "draft",
    updatedAt: "2026-05-19T07:15:00.000Z"
  }
];

export const channelsSeed: Channel[] = [
  {
    id: "channel_1",
    accountId,
    kind: "shopee",
    name: "Shopee Vietnam",
    connected: true,
    lastSyncAt: "2026-05-20T02:30:00.000Z"
  },
  {
    id: "channel_2",
    accountId,
    kind: "tiktok_shop",
    name: "TikTok Shop",
    connected: true,
    lastSyncAt: "2026-05-20T01:45:00.000Z"
  },
  {
    id: "channel_3",
    accountId,
    kind: "meta",
    name: "Meta Catalog",
    connected: false,
    lastSyncAt: null
  }
];

export const ordersSeed: Order[] = [
  {
    id: "order_1",
    accountId,
    channelId: "channel_1",
    externalId: "SP-100923",
    customerName: "Nguyen Linh",
    status: "paid",
    total: 810000,
    createdAt: "2026-05-20T04:10:00.000Z"
  },
  {
    id: "order_2",
    accountId,
    channelId: "channel_2",
    externalId: "TT-84321",
    customerName: "Tran Minh",
    status: "packed",
    total: 490000,
    createdAt: "2026-05-20T03:32:00.000Z"
  }
];

export const syncJobsSeed: SyncJob[] = [
  {
    id: "sync_1",
    accountId,
    channelId: "channel_1",
    operation: "pull_orders",
    status: "success",
    errorCode: null,
    message: "Imported 14 new orders",
    retryable: false,
    createdAt: "2026-05-20T02:30:00.000Z"
  },
  {
    id: "sync_2",
    accountId,
    channelId: "channel_3",
    operation: "push_listing",
    status: "failed",
    errorCode: "META_TOKEN_EXPIRED",
    message: "Meta sandbox token expired",
    retryable: true,
    createdAt: "2026-05-20T02:05:00.000Z"
  }
];
