import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ActionIcon, Alert, AppShell, Badge, Button, Card, Group, Loader, NavLink as MantineNavLink, NumberInput, Paper, PasswordInput, Select, SimpleGrid, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { IconAlertCircle, IconBuildingStore, IconChartBar, IconPackage, IconPlugConnected, IconRefresh, IconShoppingBag, IconUserCircle } from "@tabler/icons-react";
import { apiGet, apiRequest, can, LoginRequestSchema, ProductCreateSchema } from "@ecommerce/shared";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const tokenStorageKey = "ecommerce.jwt";
const currency = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
});
export function App() {
    const [token, setToken] = useState(() => localStorage.getItem(tokenStorageKey));
    const [user, setUser] = useState(null);
    const [authError, setAuthError] = useState(null);
    const location = useLocation();
    const isPortal = location.pathname.startsWith("/portal");
    useEffect(() => {
        if (!token) {
            setUser(null);
            return;
        }
        apiGet(apiUrl, "/auth/me", token)
            .then((nextUser) => {
            setUser(nextUser);
            setAuthError(null);
        })
            .catch((error) => {
            setAuthError(error instanceof Error ? error.message : "Session expired");
            localStorage.removeItem(tokenStorageKey);
            setToken(null);
            setUser(null);
        });
    }, [token]);
    const login = (response) => {
        localStorage.setItem(tokenStorageKey, response.token);
        setToken(response.token);
        setUser(response.user);
    };
    const logout = () => {
        localStorage.removeItem(tokenStorageKey);
        setToken(null);
        setUser(null);
    };
    return (_jsxs(AppShell, { header: { height: 64 }, navbar: { width: 248, breakpoint: "sm" }, padding: "lg", children: [_jsx(AppShell.Header, { children: _jsxs(Group, { h: "100%", px: "lg", justify: "space-between", children: [_jsxs(Group, { gap: "sm", children: [_jsx(IconBuildingStore, { size: 28 }), _jsxs("div", { children: [_jsx(Text, { fw: 700, children: "Ecommerce Ops" }), _jsx(Text, { size: "xs", c: "dimmed", children: "OMS, channels, inventory" })] })] }), user ? (_jsxs(Group, { gap: "sm", children: [_jsx(Badge, { variant: "light", children: user.role }), _jsx(Text, { size: "sm", children: user.email }), _jsx(Button, { variant: "subtle", onClick: logout, children: "Logout" })] })) : (_jsx(Button, { component: NavLink, to: "/login", leftSection: _jsx(IconUserCircle, { size: 16 }), children: "Login" }))] }) }), _jsx(AppShell.Navbar, { p: "md", children: _jsxs(Stack, { gap: 4, children: [_jsx(MantineNavLink, { component: NavLink, to: "/admin", label: "Admin", leftSection: _jsx(IconChartBar, { size: 18 }), disabled: !user || !can(user.role, "admin:read") }), _jsx(MantineNavLink, { component: NavLink, to: "/portal", label: "Portal", leftSection: _jsx(IconShoppingBag, { size: 18 }), disabled: !user || !can(user.role, "portal:read") }), _jsx(MantineNavLink, { component: NavLink, to: "/account", label: "Account", leftSection: _jsx(IconUserCircle, { size: 18 }), disabled: !user })] }) }), _jsxs(AppShell.Main, { className: isPortal ? "portal-surface" : undefined, children: [authError ? (_jsx(Alert, { color: "red", icon: _jsx(IconAlertCircle, { size: 16 }), mb: "md", children: authError })) : null, _jsxs(Routes, { children: [_jsx(Route, { path: "/admin", element: _jsx(Protected, { user: user, permission: "admin:read", children: _jsx(AdminDashboard, { token: token, role: user?.role ?? "customer" }) }) }), _jsx(Route, { path: "/portal", element: _jsx(Protected, { user: user, permission: "portal:read", children: _jsx(Portal, { token: token }) }) }), _jsx(Route, { path: "/account", element: _jsx(Protected, { user: user, children: _jsx(Account, { user: user }) }) }), _jsx(Route, { path: "/login", element: _jsx(Login, { onLogin: login }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/admin", replace: true }) })] })] })] }));
}
function Protected({ children, permission, user }) {
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (permission && !can(user.role, permission)) {
        return (_jsxs(Paper, { p: "xl", radius: "md", withBorder: true, children: [_jsx(Title, { order: 2, children: "Access restricted" }), _jsx(Text, { c: "dimmed", mt: "sm", children: "This role cannot open the requested workspace." })] }));
    }
    return children;
}
function AdminDashboard({ role, token }) {
    const [state, setState] = useState({ products: [], channels: [], orders: [], syncJobs: [] });
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = async () => {
        setLoading(true);
        try {
            const [products, channels, orders, syncJobs] = await Promise.all([
                apiGet(apiUrl, "/products", token),
                apiGet(apiUrl, "/channels", token),
                apiGet(apiUrl, "/orders", token),
                apiGet(apiUrl, "/sync-jobs", token)
            ]);
            setState({ products, channels, orders, syncJobs });
            setError(null);
        }
        catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "Failed to load API data");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void refresh();
    }, [token]);
    const visibleProducts = useMemo(() => state.products.filter((product) => filter === "all" || product.status === filter), [filter, state.products]);
    const firstProduct = state.products[0];
    const firstChannel = state.channels.find((channel) => channel.connected) ?? state.channels[0];
    const runSync = async (operation) => {
        if (!firstChannel || (operation !== "pull-orders" && !firstProduct)) {
            return;
        }
        await apiRequest(apiUrl, `/sync-jobs/${operation}`, {
            method: "POST",
            token,
            body: JSON.stringify({
                channelId: firstChannel.id,
                productId: firstProduct?.id
            })
        });
        await refresh();
    };
    if (loading) {
        return _jsx(Loader, { "aria-label": "Loading dashboard" });
    }
    return (_jsxs(Stack, { gap: "lg", children: [_jsxs(Group, { justify: "space-between", align: "end", children: [_jsxs("div", { children: [_jsx(Title, { order: 1, children: "Admin workspace" }), _jsx(Text, { c: "dimmed", children: "Manage catalog, marketplace sync, orders, and channel health." })] }), _jsxs(Group, { children: [_jsx(Button, { variant: "light", leftSection: _jsx(IconRefresh, { size: 16 }), onClick: () => runSync("pull-orders"), children: "Pull orders" }), _jsx(Button, { leftSection: _jsx(IconRefresh, { size: 16 }), onClick: () => runSync("push-listing"), disabled: !can(role, "admin:write"), children: "Push listing" })] })] }), error ? (_jsx(Alert, { color: "red", icon: _jsx(IconAlertCircle, { size: 16 }), children: error })) : null, _jsxs(SimpleGrid, { cols: { base: 1, sm: 2, lg: 4 }, children: [_jsx(Metric, { label: "Products", value: String(state.products.length) }), _jsx(Metric, { label: "Open orders", value: String(state.orders.length) }), _jsx(Metric, { label: "Connected channels", value: String(state.channels.filter((channel) => channel.connected).length), tone: "green" }), _jsx(Metric, { label: "Failed syncs", value: String(state.syncJobs.filter((job) => job.status === "failed").length), tone: "red" })] }), _jsxs(SimpleGrid, { cols: { base: 1, lg: 2 }, spacing: "lg", children: [_jsxs(Card, { withBorder: true, radius: "md", children: [_jsxs(Group, { justify: "space-between", mb: "md", children: [_jsx(Title, { order: 2, children: "Products" }), _jsx(Select, { "aria-label": "Filter products", value: filter, onChange: (value) => setFilter(value ?? "all"), data: [
                                            { value: "all", label: "All" },
                                            { value: "active", label: "Active" },
                                            { value: "draft", label: "Draft" },
                                            { value: "archived", label: "Archived" }
                                        ], w: 140 })] }), _jsx(ProductTable, { products: visibleProducts, onSyncInventory: () => runSync("update-inventory") })] }), _jsxs(Card, { withBorder: true, radius: "md", children: [_jsx(Title, { order: 2, mb: "md", children: "Create product" }), _jsx(ProductEditor, { token: token, onCreate: refresh })] })] }), _jsxs(SimpleGrid, { cols: { base: 1, lg: 2 }, spacing: "lg", children: [_jsx(Channels, { channels: state.channels }), _jsx(SyncJobs, { syncJobs: state.syncJobs })] })] }));
}
function Channels({ channels }) {
    return (_jsxs(Card, { withBorder: true, radius: "md", children: [_jsx(Title, { order: 2, mb: "md", children: "Channels" }), _jsxs(Stack, { children: [channels.map((channel) => (_jsxs(Group, { justify: "space-between", children: [_jsxs(Group, { children: [_jsx(IconPlugConnected, { size: 18 }), _jsxs("div", { children: [_jsx(Text, { fw: 600, children: channel.name }), _jsx(Text, { size: "sm", c: "dimmed", children: channel.lastSyncAt ?? "Not synced" })] })] }), _jsx(Badge, { color: channel.connected ? "green" : "gray", children: channel.connected ? "Connected" : "Disconnected" })] }, channel.id))), !channels.length ? _jsx(Text, { c: "dimmed", children: "No channels configured." }) : null] })] }));
}
function SyncJobs({ syncJobs }) {
    return (_jsxs(Card, { withBorder: true, radius: "md", children: [_jsx(Title, { order: 2, mb: "md", children: "Sync jobs" }), _jsxs(Stack, { children: [syncJobs.map((job) => (_jsxs(Paper, { p: "sm", radius: "md", withBorder: true, children: [_jsxs(Group, { justify: "space-between", children: [_jsx(Text, { fw: 600, children: job.operation.replace("_", " ") }), _jsx(Badge, { color: job.status === "failed" ? "red" : job.status === "success" ? "green" : "blue", children: job.status })] }), _jsx(Text, { size: "sm", c: "dimmed", children: job.message ?? (job.retryable ? "Retryable sync error" : "Waiting for worker") })] }, job.id))), !syncJobs.length ? _jsx(Text, { c: "dimmed", children: "No sync jobs yet." }) : null] })] }));
}
function Portal({ token }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        apiGet(apiUrl, "/orders", token)
            .then(setOrders)
            .finally(() => setLoading(false));
    }, [token]);
    if (loading) {
        return _jsx(Loader, { "aria-label": "Loading orders" });
    }
    return (_jsxs(Stack, { gap: "lg", children: [_jsxs("div", { children: [_jsx(Title, { order: 1, children: "Seller portal" }), _jsx(Text, { c: "dimmed", children: "Daily operating view for order handling and stock updates." })] }), _jsxs(Card, { withBorder: true, radius: "md", children: [_jsx(Title, { order: 2, mb: "md", children: "Orders" }), _jsx(Table.ScrollContainer, { minWidth: 680, children: _jsxs(Table, { verticalSpacing: "sm", children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Order" }), _jsx(Table.Th, { children: "Customer" }), _jsx(Table.Th, { children: "Status" }), _jsx(Table.Th, { children: "Total" }), _jsx(Table.Th, { children: "Action" })] }) }), _jsx(Table.Tbody, { children: orders.map((order) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: order.externalId }), _jsx(Table.Td, { children: order.customerName }), _jsx(Table.Td, { children: _jsx(Badge, { children: order.status }) }), _jsx(Table.Td, { children: currency.format(order.total) }), _jsx(Table.Td, { children: _jsx(ActionIcon, { "aria-label": `Pack ${order.externalId}`, variant: "light", children: _jsx(IconPackage, { size: 16 }) }) })] }, order.id))) })] }) })] })] }));
}
function ProductEditor({ onCreate, token }) {
    const { control, formState: { errors, isSubmitting }, handleSubmit, register, reset, setError } = useForm({
        defaultValues: {
            name: "",
            sku: "",
            price: 100000,
            inventory: 1,
            status: "draft"
        }
    });
    const submit = handleSubmit(async (values) => {
        const parsed = ProductCreateSchema.safeParse(values);
        if (!parsed.success) {
            setError("name", { message: "Product data is invalid" });
            return;
        }
        await apiRequest(apiUrl, "/products", {
            method: "POST",
            token,
            body: JSON.stringify(parsed.data)
        });
        reset();
        onCreate();
    });
    return (_jsx("form", { onSubmit: submit, children: _jsxs(Stack, { children: [_jsx(TextInput, { label: "Name", error: errors.name?.message, ...register("name", { required: true }) }), _jsx(TextInput, { label: "SKU", error: errors.sku?.message, ...register("sku", { required: true }) }), _jsx(Controller, { name: "price", control: control, render: ({ field }) => _jsx(NumberInput, { label: "Price", min: 0, ...field }) }), _jsx(Controller, { name: "inventory", control: control, render: ({ field }) => _jsx(NumberInput, { label: "Inventory", min: 0, ...field }) }), _jsx(Controller, { name: "status", control: control, render: ({ field }) => (_jsx(Select, { label: "Status", data: [
                            { value: "draft", label: "Draft" },
                            { value: "active", label: "Active" },
                            { value: "archived", label: "Archived" }
                        ], ...field })) }), _jsx(Button, { type: "submit", loading: isSubmitting, children: "Create product" })] }) }));
}
function ProductTable({ onSyncInventory, products }) {
    return (_jsx(Table.ScrollContainer, { minWidth: 640, children: _jsxs(Table, { verticalSpacing: "sm", children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Product" }), _jsx(Table.Th, { children: "SKU" }), _jsx(Table.Th, { children: "Inventory" }), _jsx(Table.Th, { children: "Price" }), _jsx(Table.Th, { children: "Status" }), _jsx(Table.Th, { children: "Sync" })] }) }), _jsx(Table.Tbody, { children: products.map((product) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: product.name }), _jsx(Table.Td, { children: product.sku }), _jsx(Table.Td, { children: product.inventory }), _jsx(Table.Td, { children: currency.format(product.price) }), _jsx(Table.Td, { children: _jsx(Badge, { color: product.status === "active" ? "green" : "gray", children: product.status }) }), _jsx(Table.Td, { children: _jsx(ActionIcon, { "aria-label": `Sync inventory for ${product.name}`, variant: "light", onClick: onSyncInventory, children: _jsx(IconRefresh, { size: 16 }) }) })] }, product.id))) })] }) }));
}
function Metric({ label, value, tone = "blue" }) {
    return (_jsxs(Card, { withBorder: true, radius: "md", children: [_jsx(Text, { size: "sm", c: "dimmed", children: label }), _jsx(Text, { fw: 800, size: "xl", c: tone, children: value })] }));
}
function Account({ user }) {
    return (_jsxs(Card, { withBorder: true, radius: "md", children: [_jsx(Title, { order: 1, children: "Account" }), _jsxs(Text, { c: "dimmed", mt: "sm", children: ["Account ", user.accountId, " is scoped by the JWT tenant boundary. Current role: ", user.role, "."] })] }));
}
function Login({ onLogin }) {
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const { formState: { isSubmitting }, handleSubmit, register } = useForm({ defaultValues: { email: "owner@example.com", password: "owner12345" } });
    const submit = handleSubmit(async (values) => {
        const parsed = LoginRequestSchema.safeParse(values);
        if (!parsed.success) {
            setError("Enter a valid email and password.");
            return;
        }
        try {
            const response = await apiRequest(apiUrl, "/auth/login", {
                method: "POST",
                body: JSON.stringify(parsed.data)
            });
            onLogin(response);
            navigate("/admin");
        }
        catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "Login failed");
        }
    });
    return (_jsx(Card, { withBorder: true, radius: "md", maw: 480, children: _jsx("form", { onSubmit: submit, children: _jsxs(Stack, { children: [_jsx(Title, { order: 1, children: "Login" }), error ? _jsx(Alert, { color: "red", children: error }) : null, _jsx(TextInput, { label: "Email", autoComplete: "email", ...register("email") }), _jsx(PasswordInput, { label: "Password", autoComplete: "current-password", ...register("password") }), _jsx(Button, { type: "submit", loading: isSubmitting, children: "Login" })] }) }) }));
}
