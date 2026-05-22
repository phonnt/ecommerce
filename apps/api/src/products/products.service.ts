import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { ProductCreate, ProductVariantCreate, ProductVariantUpdate } from "@ecommerce/shared";
import { slugify } from "@ecommerce/shared";
import { DatabaseService } from "../database/database.service.js";

type ProductStatus = "draft" | "active" | "archived";

export type ProductVariantRecord = {
  id: string;
  accountId: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  onHand: number;
  status: ProductStatus;
  isDefault: boolean;
  updatedAt: Date;
  createdAt?: Date;
};

type ProductRecord = {
  id: string;
  accountId: string;
  sku: string;
  name: string;
  slug: string;
  price: number;
  inventory: number;
  status: ProductStatus;
  updatedAt: Date;
  variants?: ProductVariantRecord[];
};

@Injectable()
export class ProductsService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(accountId: string) {
    const prisma = await this.database.prisma;
    const products = await prisma.product.findMany({
      where: { accountId },
      include: { variants: variantInclude },
      orderBy: { updatedAt: "desc" }
    });

    return products.map(toProductDto);
  }

  async findOne(accountId: string, id: string) {
    const prisma = await this.database.prisma;
    const product = await prisma.product.findFirst({
      where: { accountId, id },
      include: { variants: variantInclude }
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
      include: {
        variants: {
          where: { status: "active" },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return products.filter((product: ProductRecord) => product.variants?.length).map(toPublicProductDto);
  }

  async findPublicBySlug(slug: string) {
    const prisma = await this.database.prisma;
    const product = await prisma.product.findFirst({
      where: { slug, status: "active" },
      include: {
        variants: {
          where: { status: "active" },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
        }
      }
    });

    if (!product || !product.variants.length) {
      throw new NotFoundException("Product not found");
    }

    return toPublicProductDto(product);
  }

  async create(accountId: string, input: ProductCreate) {
    const prisma = await this.database.prisma;
    await ensureAccount(prisma, accountId);

    const product = await prisma.product.create({
      data: {
        ...input,
        accountId,
        slug: slugify(input.name),
        variants: {
          create: {
            accountId,
            sku: input.sku,
            name: "Default",
            price: input.price,
            onHand: input.inventory,
            status: input.status,
            isDefault: true
          }
        }
      },
      include: { variants: variantInclude }
    });

    return toProductDto(product);
  }

  async findVariants(accountId: string, productId: string) {
    const prisma = await this.database.prisma;
    await this.assertProduct(accountId, productId);
    const variants = await prisma.productVariant.findMany({
      where: { accountId, productId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
    });

    return variants.map(toVariantDto);
  }

  async createVariant(accountId: string, productId: string, input: ProductVariantCreate) {
    const prisma = await this.database.prisma;
    await this.assertProduct(accountId, productId);
    await assertVariantSkuAvailable(prisma, accountId, input.sku);

    const variant = await prisma.productVariant.create({
      data: {
        ...input,
        accountId,
        productId,
        isDefault: false
      }
    });

    return toVariantDto(variant);
  }

  async updateVariant(accountId: string, productId: string, variantId: string, input: ProductVariantUpdate) {
    const prisma = await this.database.prisma;
    const variant = await prisma.productVariant.findFirst({
      where: { accountId, productId, id: variantId }
    });

    if (!variant) {
      throw new NotFoundException("Variant not found");
    }

    if (input.sku && input.sku !== variant.sku) {
      await assertVariantSkuAvailable(prisma, accountId, input.sku, variantId);
    }

    const updated = await prisma.$transaction(async (transaction: any) => {
      const nextVariant = await transaction.productVariant.update({
        where: { id: variantId },
        data: input
      });

      if (variant.isDefault) {
        await transaction.product.update({
          where: { id: productId },
          data: {
            ...(input.sku ? { sku: input.sku } : {}),
            ...(input.price === undefined ? {} : { price: input.price })
          }
        });
      }

      return nextVariant;
    });

    return toVariantDto(updated);
  }

  async findInventoryTarget(accountId: string, productId?: string, variantId?: string) {
    const prisma = await this.database.prisma;
    const variant = variantId
      ? await prisma.productVariant.findFirst({
          where: {
            accountId,
            id: variantId,
            ...(productId ? { productId } : {})
          }
        })
      : productId
        ? await prisma.productVariant.findFirst({
            where: { accountId, productId, isDefault: true }
          })
        : null;

    if (!variant) {
      throw new NotFoundException("Variant not found");
    }

    return toVariantDto(variant);
  }

  private async assertProduct(accountId: string, id: string) {
    const prisma = await this.database.prisma;
    const product = await prisma.product.findFirst({
      where: { accountId, id },
      select: { id: true }
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }
  }
}

const variantInclude = {
  orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
};

export function toVariantDto(variant: ProductVariantRecord) {
  return {
    id: variant.id,
    accountId: variant.accountId,
    productId: variant.productId,
    sku: variant.sku,
    name: variant.name,
    price: variant.price,
    onHand: variant.onHand,
    status: variant.status,
    isDefault: variant.isDefault,
    updatedAt: variant.updatedAt.toISOString()
  };
}

function toPublicProductDto(product: ProductRecord) {
  return toProductDto(product, product.variants?.find((variant) => variant.isDefault) ?? product.variants?.[0]);
}

function toProductDto(product: ProductRecord, summaryVariant = product.variants?.find((variant) => variant.isDefault)) {
  return {
    id: product.id,
    accountId: product.accountId,
    sku: summaryVariant?.sku ?? product.sku,
    name: product.name,
    slug: product.slug,
    price: summaryVariant?.price ?? product.price,
    inventory: summaryVariant?.onHand ?? product.inventory,
    status: product.status,
    updatedAt: product.updatedAt.toISOString(),
    variants: product.variants?.map(toVariantDto) ?? []
  };
}

async function assertVariantSkuAvailable(prisma: any, accountId: string, sku: string, variantId?: string) {
  const existing = await prisma.productVariant.findFirst({
    where: {
      accountId,
      sku,
      ...(variantId ? { id: { not: variantId } } : {})
    },
    select: { id: true }
  });

  if (existing) {
    throw new ConflictException("Variant SKU already exists in this account");
  }
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
