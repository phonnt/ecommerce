import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { connectors } from "@ecommerce/connectors";
import type { ChannelKind, SyncOperation } from "@ecommerce/shared";
import { DatabaseService } from "../database/database.service.js";
import { ProductsService } from "../products/products.service.js";

const queueName = "marketplace-sync";

type ChannelRecord = {
  id: string;
  accountId: string;
  kind: ChannelKind;
  name: string;
  connected: boolean;
  lastSyncAt: Date | null;
};

type SyncJobRecord = {
  id: string;
  accountId: string;
  channelId: string;
  operation: SyncOperation;
  status: "queued" | "running" | "success" | "failed";
  errorCode: string | null;
  message: string | null;
  retryable: boolean;
  createdAt: Date;
};

type MarketplaceSyncData = {
  syncJobId: string;
  accountId: string;
  channelId: string;
  productId?: string;
  operation: SyncOperation;
};

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue<MarketplaceSyncData> | null = null;
  private worker: Worker<MarketplaceSyncData> | null = null;
  private connection: Redis | null = null;

  constructor(
    private readonly database: DatabaseService,
    private readonly products: ProductsService
  ) {}

  onModuleInit() {
    if (!process.env.REDIS_URL) {
      return;
    }

    this.connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    this.queue = new Queue<MarketplaceSyncData>(queueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000
        },
        removeOnComplete: 100,
        removeOnFail: 250
      }
    });
    this.worker = new Worker<MarketplaceSyncData>(
      queueName,
      async (job) => {
        await this.processQueuedJob(job.data, job.attemptsMade + 1, Number(job.opts.attempts ?? 1));
      },
      { connection: this.connection }
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }

  async listChannels(accountId: string) {
    const prisma = await this.database.prisma;
    const channels = await prisma.channel.findMany({
      where: { accountId },
      orderBy: { createdAt: "asc" }
    });

    return channels.map(toChannelDto);
  }

  async listJobs(accountId: string) {
    const prisma = await this.database.prisma;
    const jobs = await prisma.syncJob.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" }
    });

    return jobs.map(toSyncJobDto);
  }

  async pushListing(accountId: string, productId: string, channelId: string) {
    return this.createAndEnqueueJob({ accountId, channelId, productId, operation: "push_listing" });
  }

  async pullOrders(accountId: string, channelId: string) {
    return this.createAndEnqueueJob({ accountId, channelId, operation: "pull_orders" });
  }

  async updateInventory(accountId: string, productId: string, channelId: string) {
    return this.createAndEnqueueJob({ accountId, channelId, productId, operation: "update_inventory" });
  }

  private async createAndEnqueueJob(input: Omit<MarketplaceSyncData, "syncJobId">) {
    const prisma = await this.database.prisma;
    const channel = await prisma.channel.findFirst({
      where: { accountId: input.accountId, id: input.channelId }
    });

    if (!channel) {
      throw new NotFoundException("Channel not found");
    }

    if ((input.operation === "push_listing" || input.operation === "update_inventory") && !input.productId) {
      throw new NotFoundException("Product not found");
    }

    const syncJob = await prisma.syncJob.create({
      data: {
        accountId: input.accountId,
        channelId: input.channelId,
        operation: input.operation,
        status: "queued",
        retryable: false
      }
    });

    const data = { ...input, syncJobId: syncJob.id };

    if (this.queue) {
      await this.queue.add(input.operation, data);
      return toSyncJobDto(syncJob);
    }

    await this.processQueuedJob(data, 1, 1);
    const completed = await prisma.syncJob.findUniqueOrThrow({ where: { id: syncJob.id } });
    return toSyncJobDto(completed);
  }

  private async processQueuedJob(data: MarketplaceSyncData, attempt: number, maxAttempts: number) {
    const prisma = await this.database.prisma;
    const running = await prisma.syncJob.update({
      where: { id: data.syncJobId },
      data: {
        status: "running",
        message: `Running ${data.operation}, attempt ${attempt} of ${maxAttempts}`,
        retryable: false
      }
    });

    const channel = (await prisma.channel.findFirst({
      where: { accountId: data.accountId, id: data.channelId }
    })) as ChannelRecord | null;

    if (!channel) {
      throw new NotFoundException("Channel not found");
    }

    try {
      if (data.operation === "push_listing") {
        await this.processPushListing(data, channel);
      }
      if (data.operation === "pull_orders") {
        await this.processPullOrders(data, channel);
      }
      if (data.operation === "update_inventory") {
        await this.processUpdateInventory(data, channel);
      }
    } catch (error) {
      const failed = await this.failJob(running.id, channel.kind, error, attempt < maxAttempts);
      if (failed.retryable && attempt < maxAttempts) {
        throw error instanceof Error ? error : new Error(failed.message ?? "Sync failed");
      }
    }
  }

  private async processPushListing(data: MarketplaceSyncData, channel: ChannelRecord) {
    if (!data.productId) {
      throw new NotFoundException("Product not found");
    }

    const prisma = await this.database.prisma;
    const product = await this.products.findOne(data.accountId, data.productId);
    const result = await connectors[channel.kind].pushListing(product);

    await prisma.listing.upsert({
      where: {
        productId_channelId: {
          productId: data.productId,
          channelId: data.channelId
        }
      },
      update: {
        externalId: result.externalId ?? null,
        status: result.status
      },
      create: {
        productId: data.productId,
        channelId: data.channelId,
        externalId: result.externalId ?? null,
        status: result.status
      }
    });
    await this.completeJob(data.syncJobId, data.channelId, result.status, result.message ?? null);
  }

  private async processPullOrders(data: MarketplaceSyncData, channel: ChannelRecord) {
    const prisma = await this.database.prisma;
    const orders = await connectors[channel.kind].pullOrders(data.accountId, data.channelId);
    for (const order of orders) {
      await prisma.order.upsert({
        where: { channelId_externalId: { channelId: data.channelId, externalId: order.externalId } },
        update: {
          accountId: data.accountId,
          customerName: order.customerName,
          status: order.status,
          total: order.total
        },
        create: {
          accountId: data.accountId,
          channelId: data.channelId,
          externalId: order.externalId,
          customerName: order.customerName,
          status: order.status,
          total: order.total
        }
      });
    }
    await this.completeJob(data.syncJobId, data.channelId, "success", `Imported ${orders.length} orders`);
  }

  private async processUpdateInventory(data: MarketplaceSyncData, channel: ChannelRecord) {
    if (!data.productId) {
      throw new NotFoundException("Product not found");
    }

    const product = await this.products.findOne(data.accountId, data.productId);
    const result = await connectors[channel.kind].updateInventory(product);
    await this.completeJob(data.syncJobId, data.channelId, result.status, result.message ?? null);
  }

  private async completeJob(syncJobId: string, channelId: string, status: "success" | "failed", message: string | null) {
    const prisma = await this.database.prisma;
    await prisma.channel.update({ where: { id: channelId }, data: { lastSyncAt: new Date() } });
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status,
        errorCode: null,
        message,
        retryable: false
      }
    });
  }

  private async failJob(jobId: string, channelKind: ChannelKind, error: unknown, retryable: boolean) {
    const prisma = await this.database.prisma;
    const normalized = connectors[channelKind].normalizeError(error);
    return prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorCode: normalized?.code ?? "SYNC_ERROR",
        message: normalized?.message ?? "Sync failed",
        retryable: retryable && (normalized?.retryable ?? true)
      }
    });
  }
}

function toChannelDto(channel: ChannelRecord) {
  return {
    id: channel.id,
    accountId: channel.accountId,
    kind: channel.kind,
    name: channel.name,
    connected: channel.connected,
    lastSyncAt: channel.lastSyncAt?.toISOString() ?? null
  };
}

function toSyncJobDto(job: SyncJobRecord) {
  return {
    id: job.id,
    accountId: job.accountId,
    channelId: job.channelId,
    operation: job.operation,
    status: job.status,
    errorCode: job.errorCode,
    message: job.message,
    retryable: job.retryable,
    createdAt: job.createdAt.toISOString()
  };
}
