import { z } from "zod";

export const roles = ["owner", "admin", "staff", "seller", "customer"] as const;
export const channelKinds = ["shopee", "tiktok_shop", "meta"] as const;
export const orderStatuses = ["pending", "paid", "packed", "shipped", "cancelled"] as const;
export const syncStatuses = ["queued", "running", "success", "failed"] as const;
export const syncOperations = ["push_listing", "pull_orders", "update_inventory"] as const;
export const inventoryLedgerTypes = ["manual_adjustment", "marketplace_sync"] as const;

export const RoleSchema = z.enum(roles);
export const ChannelKindSchema = z.enum(channelKinds);
export const OrderStatusSchema = z.enum(orderStatuses);
export const SyncStatusSchema = z.enum(syncStatuses);
export const SyncOperationSchema = z.enum(syncOperations);
export const InventoryLedgerTypeSchema = z.enum(inventoryLedgerTypes);

export const AuthUserSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  permissions: z.array(z.string())
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const RegisterRequestSchema = LoginRequestSchema.extend({
  accountName: z.string().min(1).optional()
});

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema
});

export const ProductVariantSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  productId: z.string(),
  sku: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  onHand: z.number().int().nonnegative(),
  status: z.enum(["draft", "active", "archived"]),
  isDefault: z.boolean(),
  updatedAt: z.string()
});

export const ProductVariantCreateSchema = ProductVariantSchema.omit({
  id: true,
  accountId: true,
  productId: true,
  isDefault: true,
  updatedAt: true
});

export const ProductVariantUpdateSchema = ProductVariantCreateSchema.omit({
  onHand: true
}).partial();

export const InventoryAdjustmentRequestSchema = z.object({
  delta: z.number().int(),
  note: z.string().trim().min(1).max(500).optional()
});

export const InventoryLedgerEntrySchema = z.object({
  id: z.string(),
  accountId: z.string(),
  productId: z.string(),
  variantId: z.string(),
  type: InventoryLedgerTypeSchema,
  delta: z.number().int(),
  quantityBefore: z.number().int().nonnegative(),
  quantityAfter: z.number().int().nonnegative(),
  note: z.string().nullable(),
  actorUserId: z.string().nullable(),
  syncJobId: z.string().nullable(),
  createdAt: z.string()
});

export const ProductSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  sku: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  price: z.number().nonnegative(),
  inventory: z.number().int().nonnegative(),
  status: z.enum(["draft", "active", "archived"]),
  updatedAt: z.string(),
  variants: z.array(ProductVariantSchema)
});

export const ProductCreateSchema = ProductSchema.omit({
  id: true,
  accountId: true,
  slug: true,
  updatedAt: true,
  variants: true
});

export const SyncInventoryRequestSchema = z
  .object({
    channelId: z.string().min(1),
    variantId: z.string().min(1).optional(),
    productId: z.string().min(1).optional(),
    inventory: z.number().int().nonnegative().optional()
  })
  .refine((input) => input.variantId || input.productId, {
    message: "variantId or productId is required"
  });

export const ChannelSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  kind: ChannelKindSchema,
  name: z.string(),
  connected: z.boolean(),
  lastSyncAt: z.string().nullable()
});

export const OrderSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  channelId: z.string(),
  externalId: z.string(),
  customerName: z.string(),
  status: OrderStatusSchema,
  total: z.number().nonnegative(),
  createdAt: z.string()
});

export const SyncJobSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  channelId: z.string(),
  operation: SyncOperationSchema,
  status: SyncStatusSchema,
  errorCode: z.string().nullable(),
  message: z.string().nullable(),
  retryable: z.boolean(),
  createdAt: z.string()
});

export const SyncErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean()
});

export type Role = z.infer<typeof RoleSchema>;
export type ChannelKind = z.infer<typeof ChannelKindSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type ProductVariantCreate = z.infer<typeof ProductVariantCreateSchema>;
export type ProductVariantUpdate = z.infer<typeof ProductVariantUpdateSchema>;
export type InventoryAdjustmentRequest = z.infer<typeof InventoryAdjustmentRequestSchema>;
export type InventoryLedgerEntry = z.infer<typeof InventoryLedgerEntrySchema>;
export type Channel = z.infer<typeof ChannelSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type SyncJob = z.infer<typeof SyncJobSchema>;
export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type SyncInventoryRequest = z.infer<typeof SyncInventoryRequestSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type SyncError = z.infer<typeof SyncErrorSchema>;

export const permissionsByRole: Record<Role, string[]> = {
  owner: ["admin:read", "admin:write", "portal:read", "portal:write", "billing:write"],
  admin: ["admin:read", "admin:write", "portal:read", "portal:write"],
  staff: ["admin:read", "portal:read", "portal:write"],
  seller: ["portal:read", "portal:write"],
  customer: ["portal:read"]
};

export function can(role: Role, permission: string) {
  return permissionsByRole[role].includes(permission);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function apiRequest<T>(
  baseUrl: string,
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    ...requestOptions,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T>(baseUrl: string, path: string, token?: string): Promise<T> {
  return apiRequest<T>(baseUrl, path, { token });
}
