import { createPrismaClient } from "../src/prisma/client.js";
import { hashPassword } from "../src/auth/auth.service.js";

const prisma = await createPrismaClient();

const accountId = "demo-account";

await prisma.account.upsert({
  where: { id: accountId },
  update: { name: "Demo Account" },
  create: {
    id: accountId,
    name: "Demo Account"
  }
});

await prisma.user.upsert({
  where: { email: "owner@example.com" },
  update: { role: "owner", accountId, passwordHash: hashPassword("owner12345") },
  create: {
    accountId,
    email: "owner@example.com",
    passwordHash: hashPassword("owner12345"),
    role: "owner"
  }
});

const shopee = await prisma.channel.upsert({
  where: { id: "channel_1" },
  update: {
    accountId,
    kind: "shopee",
    name: "Shopee Vietnam",
    connected: true,
    lastSyncAt: new Date("2026-05-20T02:30:00.000Z")
  },
  create: {
    id: "channel_1",
    accountId,
    kind: "shopee",
    name: "Shopee Vietnam",
    connected: true,
    lastSyncAt: new Date("2026-05-20T02:30:00.000Z")
  }
});

await prisma.channel.upsert({
  where: { id: "channel_2" },
  update: {
    accountId,
    kind: "tiktok_shop",
    name: "TikTok Shop",
    connected: true,
    lastSyncAt: new Date("2026-05-20T01:45:00.000Z")
  },
  create: {
    id: "channel_2",
    accountId,
    kind: "tiktok_shop",
    name: "TikTok Shop",
    connected: true,
    lastSyncAt: new Date("2026-05-20T01:45:00.000Z")
  }
});

await prisma.channel.upsert({
  where: { id: "channel_3" },
  update: {
    accountId,
    kind: "meta",
    name: "Meta Catalog",
    connected: false,
    lastSyncAt: null
  },
  create: {
    id: "channel_3",
    accountId,
    kind: "meta",
    name: "Meta Catalog",
    connected: false,
    lastSyncAt: null
  }
});

const linenTee = await prisma.product.upsert({
  where: {
    accountId_sku: {
      accountId,
      sku: "LINEN-TEE-WHT"
    }
  },
  update: {
    name: "Linen Everyday Tee",
    slug: "linen-everyday-tee",
    price: 490000,
    inventory: 84,
    status: "active"
  },
  create: {
    accountId,
    sku: "LINEN-TEE-WHT",
    name: "Linen Everyday Tee",
    slug: "linen-everyday-tee",
    price: 490000,
    inventory: 84,
    status: "active"
  }
});

const mug = await prisma.product.upsert({
  where: {
    accountId_sku: {
      accountId,
      sku: "MUG-STONE-BLK"
    }
  },
  update: {
    name: "Stoneware Coffee Mug",
    slug: "stoneware-coffee-mug",
    price: 210000,
    inventory: 12,
    status: "draft"
  },
  create: {
    accountId,
    sku: "MUG-STONE-BLK",
    name: "Stoneware Coffee Mug",
    slug: "stoneware-coffee-mug",
    price: 210000,
    inventory: 12,
    status: "draft"
  }
});

const tote = await prisma.product.upsert({
  where: {
    accountId_sku: {
      accountId,
      sku: "BAG-CANVAS-01"
    }
  },
  update: {
    name: "Canvas Market Tote",
    slug: "canvas-market-tote",
    price: 320000,
    inventory: 32,
    status: "active"
  },
  create: {
    accountId,
    sku: "BAG-CANVAS-01",
    name: "Canvas Market Tote",
    slug: "canvas-market-tote",
    price: 320000,
    inventory: 32,
    status: "active"
  }
});

for (const product of [linenTee, mug, tote]) {
  await prisma.productVariant.upsert({
    where: {
      accountId_sku: {
        accountId,
        sku: product.sku
      }
    },
    update: {
      productId: product.id,
      name: "Default",
      price: product.price,
      onHand: product.inventory,
      status: product.status,
      isDefault: true
    },
    create: {
      accountId,
      productId: product.id,
      sku: product.sku,
      name: "Default",
      price: product.price,
      onHand: product.inventory,
      status: product.status,
      isDefault: true
    }
  });
}

await prisma.order.upsert({
  where: {
    channelId_externalId: {
      channelId: shopee.id,
      externalId: "SP-100923"
    }
  },
  update: {
    accountId,
    customerName: "Nguyen Linh",
    status: "paid",
    total: 810000
  },
  create: {
    accountId,
    channelId: shopee.id,
    externalId: "SP-100923",
    customerName: "Nguyen Linh",
    status: "paid",
    total: 810000
  }
});

await prisma.syncJob.create({
  data: {
    accountId,
    channelId: shopee.id,
    operation: "pull_orders",
    status: "success",
    message: "Imported 1 seeded order",
    retryable: false
  }
});

await prisma.$disconnect();
