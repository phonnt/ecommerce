import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";

type OrderRecord = {
  id: string;
  accountId: string;
  channelId: string;
  externalId: string;
  customerName: string;
  status: "pending" | "paid" | "packed" | "shipped" | "cancelled";
  total: number;
  createdAt: Date;
};

@Injectable()
export class OrdersService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(accountId: string) {
    const prisma = await this.database.prisma;
    const orders = await prisma.order.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" }
    });

    return orders.map(toOrderDto);
  }
}

function toOrderDto(order: OrderRecord) {
  return {
    id: order.id,
    accountId: order.accountId,
    channelId: order.channelId,
    externalId: order.externalId,
    customerName: order.customerName,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt.toISOString()
  };
}
