import { z } from "zod";
export const roles = ["owner", "admin", "staff", "seller", "customer"];
export const channelKinds = ["shopee", "tiktok_shop", "meta"];
export const orderStatuses = ["pending", "paid", "packed", "shipped", "cancelled"];
export const syncStatuses = ["queued", "running", "success", "failed"];
export const syncOperations = ["push_listing", "pull_orders", "update_inventory"];
export const RoleSchema = z.enum(roles);
export const ChannelKindSchema = z.enum(channelKinds);
export const OrderStatusSchema = z.enum(orderStatuses);
export const SyncStatusSchema = z.enum(syncStatuses);
export const SyncOperationSchema = z.enum(syncOperations);
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
export const ProductSchema = z.object({
    id: z.string(),
    accountId: z.string(),
    sku: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    price: z.number().nonnegative(),
    inventory: z.number().int().nonnegative(),
    status: z.enum(["draft", "active", "archived"]),
    updatedAt: z.string()
});
export const ProductCreateSchema = ProductSchema.omit({
    id: true,
    accountId: true,
    slug: true,
    updatedAt: true
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
export const permissionsByRole = {
    owner: ["admin:read", "admin:write", "portal:read", "portal:write", "billing:write"],
    admin: ["admin:read", "admin:write", "portal:read", "portal:write"],
    staff: ["admin:read", "portal:read", "portal:write"],
    seller: ["portal:read", "portal:write"],
    customer: ["portal:read"]
};
export function can(role, permission) {
    return permissionsByRole[role].includes(permission);
}
export function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}
export async function apiRequest(baseUrl, path, options = {}) {
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
    return response.json();
}
export async function apiGet(baseUrl, path, token) {
    return apiRequest(baseUrl, path, { token });
}
