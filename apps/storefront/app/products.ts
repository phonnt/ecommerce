import type { Product } from "@ecommerce/shared";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const fallbackProducts: Product[] = [
  {
    id: "prod_1",
    accountId: "demo-account",
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
    accountId: "demo-account",
    sku: "BAG-CANVAS-01",
    name: "Canvas Market Tote",
    slug: "canvas-market-tote",
    price: 320000,
    inventory: 32,
    status: "active",
    updatedAt: "2026-05-18T09:30:00.000Z"
  }
];

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${apiUrl}/public/products`, {
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      return fallbackProducts;
    }

    return response.json() as Promise<Product[]>;
  } catch {
    return fallbackProducts;
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  try {
    const response = await fetch(`${apiUrl}/public/products/${slug}`, {
      next: { revalidate: 60 }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return fallbackProducts.find((product) => product.slug === slug) ?? null;
    }

    return response.json() as Promise<Product>;
  } catch {
    return fallbackProducts.find((product) => product.slug === slug) ?? null;
  }
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}
