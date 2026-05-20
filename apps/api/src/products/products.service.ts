import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductCreate, slugify } from "@ecommerce/shared";
import { DatabaseService } from "../database/database.service.js";

type ProductRecord = {
  id: string;
  accountId: string;
  sku: string;
  name: string;
  slug: string;
  price: number;
  inventory: number;
  status: "draft" | "active" | "archived";
  updatedAt: Date;
};

@Injectable()
export class ProductsService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(accountId: string) {
    const prisma = await this.database.prisma;
    const products = await prisma.product.findMany({
      where: { accountId },
      orderBy: { updatedAt: "desc" }
    });

    return products.map(toProductDto);
  }

  async findOne(accountId: string, id: string) {
    const prisma = await this.database.prisma;
    const product = await prisma.product.findFirst({
      where: { accountId, id }
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return toProductDto(product);
  }

  async findPublic() {
    const prisma = await this.database.prisma;
    const products = await prisma.product.findMany({
      where: { status: "active" },
      orderBy: { updatedAt: "desc" }
    });

    return products.map(toProductDto);
  }

  async findPublicBySlug(slug: string) {
    const prisma = await this.database.prisma;
    const product = await prisma.product.findFirst({
      where: { slug, status: "active" }
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return toProductDto(product);
  }

  async create(accountId: string, input: ProductCreate) {
    const prisma = await this.database.prisma;
    await ensureAccount(prisma, accountId);

    const product = await prisma.product.create({
      data: {
        ...input,
        accountId,
        slug: slugify(input.name)
      }
    });

    return toProductDto(product);
  }

  async updateInventory(accountId: string, id: string, inventory: number) {
    const prisma = await this.database.prisma;
    await this.findOne(accountId, id);

    const product = await prisma.product.update({
      where: { id },
      data: { inventory }
    });

    return toProductDto(product);
  }
}

function toProductDto(product: ProductRecord) {
  return {
    id: product.id,
    accountId: product.accountId,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    price: product.price,
    inventory: product.inventory,
    status: product.status,
    updatedAt: product.updatedAt.toISOString()
  };
}

async function ensureAccount(prisma: any, accountId: string) {
  await prisma.account.upsert({
    where: { id: accountId },
    update: {},
    create: {
      id: accountId,
      name: "Demo Account"
    }
  });
}
