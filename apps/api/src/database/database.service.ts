import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createPrismaClient } from "../prisma/client.js";

type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $transaction<T>(input: (transaction: PrismaClientLike) => Promise<T>): Promise<T>;
  account: any;
  channel: any;
  inventoryLedgerEntry: any;
  listing: any;
  order: any;
  product: any;
  productVariant: any;
  syncJob: any;
  user: any;
};

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private clientPromise: Promise<PrismaClientLike> | null = null;

  get prisma() {
    this.clientPromise ??= createPrismaClient() as Promise<PrismaClientLike>;
    return this.clientPromise;
  }

  async onModuleInit() {
    const prisma = await this.prisma;
    await prisma.$connect();
  }

  async onModuleDestroy() {
    if (!this.clientPromise) {
      return;
    }

    const prisma = await this.clientPromise;
    await prisma.$disconnect();
  }
}
