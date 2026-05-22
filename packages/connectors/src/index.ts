import type { ChannelKind, Order, Product, ProductVariant, SyncJob } from "@ecommerce/shared";

export type ConnectorAuthInput = {
  accountId: string;
  channelId: string;
  credentials: Record<string, string>;
};

export type ConnectorResult = {
  ok: boolean;
  externalId?: string;
  status: Exclude<SyncJob["status"], "queued" | "running">;
  message?: string;
  normalizedError?: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

export interface MarketplaceConnector {
  kind: ChannelKind;
  connect(input: ConnectorAuthInput): Promise<ConnectorResult>;
  pushListing(product: Product): Promise<ConnectorResult>;
  pullOrders(accountId: string, channelId: string): Promise<Order[]>;
  updateInventory(variant: ProductVariant): Promise<ConnectorResult>;
  normalizeError(error: unknown): ConnectorResult["normalizedError"];
  reportSyncStatus(job: SyncJob): Promise<ConnectorResult>;
}

export class MockMarketplaceConnector implements MarketplaceConnector {
  constructor(public readonly kind: ChannelKind) {}

  async connect(input: ConnectorAuthInput): Promise<ConnectorResult> {
    return {
      ok: Boolean(input.credentials.token),
      externalId: `${this.kind}-${input.channelId}`,
      status: input.credentials.token ? "success" : "failed",
      message: input.credentials.token ? "Sandbox channel connected" : "Missing sandbox token"
    };
  }

  async pushListing(product: Product): Promise<ConnectorResult> {
    return {
      ok: true,
      externalId: `${this.kind}-listing-${product.sku}`,
      status: "success",
      message: `${product.name} published to ${this.kind}`
    };
  }

  async pullOrders(accountId: string, channelId: string): Promise<Order[]> {
    return [
      {
        id: `${this.kind}-order-1001`,
        accountId,
        channelId,
        externalId: `${this.kind.toUpperCase()}-1001`,
        customerName: "Mai Tran",
        status: "paid",
        total: 1290000,
        createdAt: new Date().toISOString()
      }
    ];
  }

  async updateInventory(variant: ProductVariant): Promise<ConnectorResult> {
    return {
      ok: true,
      externalId: `${this.kind}-inventory-${variant.sku}`,
      status: "success",
      message: `Inventory set to ${variant.onHand}`
    };
  }

  normalizeError(error: unknown): ConnectorResult["normalizedError"] {
    return {
      code: "MARKETPLACE_SYNC_ERROR",
      message: error instanceof Error ? error.message : "Unknown marketplace error",
      retryable: true
    };
  }

  async reportSyncStatus(job: SyncJob): Promise<ConnectorResult> {
    return {
      ok: job.status !== "failed",
      status: job.status === "failed" ? "failed" : "success",
      message: job.message ?? `Sync job ${job.id} is ${job.status}`
    };
  }
}

export const connectors: Record<ChannelKind, MarketplaceConnector> = {
  shopee: new MockMarketplaceConnector("shopee"),
  tiktok_shop: new MockMarketplaceConnector("tiktok_shop"),
  meta: new MockMarketplaceConnector("meta")
};
