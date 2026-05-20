import { z } from "zod";
export declare const roles: readonly ["owner", "admin", "staff", "seller", "customer"];
export declare const channelKinds: readonly ["shopee", "tiktok_shop", "meta"];
export declare const orderStatuses: readonly ["pending", "paid", "packed", "shipped", "cancelled"];
export declare const syncStatuses: readonly ["queued", "running", "success", "failed"];
export declare const syncOperations: readonly ["push_listing", "pull_orders", "update_inventory"];
export declare const RoleSchema: z.ZodEnum<["owner", "admin", "staff", "seller", "customer"]>;
export declare const ChannelKindSchema: z.ZodEnum<["shopee", "tiktok_shop", "meta"]>;
export declare const OrderStatusSchema: z.ZodEnum<["pending", "paid", "packed", "shipped", "cancelled"]>;
export declare const SyncStatusSchema: z.ZodEnum<["queued", "running", "success", "failed"]>;
export declare const SyncOperationSchema: z.ZodEnum<["push_listing", "pull_orders", "update_inventory"]>;
export declare const AuthUserSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["owner", "admin", "staff", "seller", "customer"]>;
    permissions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    accountId: string;
    email: string;
    role: "owner" | "admin" | "staff" | "seller" | "customer";
    permissions: string[];
}, {
    id: string;
    accountId: string;
    email: string;
    role: "owner" | "admin" | "staff" | "seller" | "customer";
    permissions: string[];
}>;
export declare const LoginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const RegisterRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
} & {
    accountName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    accountName?: string | undefined;
}, {
    email: string;
    password: string;
    accountName?: string | undefined;
}>;
export declare const LoginResponseSchema: z.ZodObject<{
    token: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        accountId: z.ZodString;
        email: z.ZodString;
        role: z.ZodEnum<["owner", "admin", "staff", "seller", "customer"]>;
        permissions: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        accountId: string;
        email: string;
        role: "owner" | "admin" | "staff" | "seller" | "customer";
        permissions: string[];
    }, {
        id: string;
        accountId: string;
        email: string;
        role: "owner" | "admin" | "staff" | "seller" | "customer";
        permissions: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    token: string;
    user: {
        id: string;
        accountId: string;
        email: string;
        role: "owner" | "admin" | "staff" | "seller" | "customer";
        permissions: string[];
    };
}, {
    token: string;
    user: {
        id: string;
        accountId: string;
        email: string;
        role: "owner" | "admin" | "staff" | "seller" | "customer";
        permissions: string[];
    };
}>;
export declare const ProductSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    sku: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    price: z.ZodNumber;
    inventory: z.ZodNumber;
    status: z.ZodEnum<["draft", "active", "archived"]>;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    accountId: string;
    sku: string;
    name: string;
    slug: string;
    price: number;
    inventory: number;
    status: "draft" | "active" | "archived";
    updatedAt: string;
}, {
    id: string;
    accountId: string;
    sku: string;
    name: string;
    slug: string;
    price: number;
    inventory: number;
    status: "draft" | "active" | "archived";
    updatedAt: string;
}>;
export declare const ProductCreateSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    accountId: z.ZodString;
    sku: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    price: z.ZodNumber;
    inventory: z.ZodNumber;
    status: z.ZodEnum<["draft", "active", "archived"]>;
    updatedAt: z.ZodString;
}, "id" | "accountId" | "slug" | "updatedAt">, "strip", z.ZodTypeAny, {
    sku: string;
    name: string;
    price: number;
    inventory: number;
    status: "draft" | "active" | "archived";
}, {
    sku: string;
    name: string;
    price: number;
    inventory: number;
    status: "draft" | "active" | "archived";
}>;
export declare const ChannelSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    kind: z.ZodEnum<["shopee", "tiktok_shop", "meta"]>;
    name: z.ZodString;
    connected: z.ZodBoolean;
    lastSyncAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    accountId: string;
    name: string;
    kind: "shopee" | "tiktok_shop" | "meta";
    connected: boolean;
    lastSyncAt: string | null;
}, {
    id: string;
    accountId: string;
    name: string;
    kind: "shopee" | "tiktok_shop" | "meta";
    connected: boolean;
    lastSyncAt: string | null;
}>;
export declare const OrderSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    channelId: z.ZodString;
    externalId: z.ZodString;
    customerName: z.ZodString;
    status: z.ZodEnum<["pending", "paid", "packed", "shipped", "cancelled"]>;
    total: z.ZodNumber;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    accountId: string;
    status: "pending" | "paid" | "packed" | "shipped" | "cancelled";
    channelId: string;
    externalId: string;
    customerName: string;
    total: number;
    createdAt: string;
}, {
    id: string;
    accountId: string;
    status: "pending" | "paid" | "packed" | "shipped" | "cancelled";
    channelId: string;
    externalId: string;
    customerName: string;
    total: number;
    createdAt: string;
}>;
export declare const SyncJobSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    channelId: z.ZodString;
    operation: z.ZodEnum<["push_listing", "pull_orders", "update_inventory"]>;
    status: z.ZodEnum<["queued", "running", "success", "failed"]>;
    errorCode: z.ZodNullable<z.ZodString>;
    message: z.ZodNullable<z.ZodString>;
    retryable: z.ZodBoolean;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    accountId: string;
    status: "queued" | "running" | "success" | "failed";
    message: string | null;
    channelId: string;
    createdAt: string;
    operation: "push_listing" | "pull_orders" | "update_inventory";
    errorCode: string | null;
    retryable: boolean;
}, {
    id: string;
    accountId: string;
    status: "queued" | "running" | "success" | "failed";
    message: string | null;
    channelId: string;
    createdAt: string;
    operation: "push_listing" | "pull_orders" | "update_inventory";
    errorCode: string | null;
    retryable: boolean;
}>;
export declare const SyncErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    retryable: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    retryable: boolean;
}, {
    code: string;
    message: string;
    retryable: boolean;
}>;
export type Role = z.infer<typeof RoleSchema>;
export type ChannelKind = z.infer<typeof ChannelKindSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type Channel = z.infer<typeof ChannelSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type SyncJob = z.infer<typeof SyncJobSchema>;
export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type SyncError = z.infer<typeof SyncErrorSchema>;
export declare const permissionsByRole: Record<Role, string[]>;
export declare function can(role: Role, permission: string): boolean;
export declare function slugify(value: string): string;
export declare function apiRequest<T>(baseUrl: string, path: string, options?: RequestInit & {
    token?: string;
}): Promise<T>;
export declare function apiGet<T>(baseUrl: string, path: string, token?: string): Promise<T>;
