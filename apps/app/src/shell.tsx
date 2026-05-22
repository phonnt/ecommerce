import {
  ActionIcon,
  Alert,
  AppShell,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  NavLink as MantineNavLink,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBuildingStore,
  IconChartBar,
  IconListDetails,
  IconPackage,
  IconPencil,
  IconPlus,
  IconPlugConnected,
  IconRefresh,
  IconShoppingBag,
  IconUserCircle
} from "@tabler/icons-react";
import {
  apiGet,
  apiRequest,
  can,
  InventoryAdjustmentRequestSchema,
  LoginRequestSchema,
  ProductCreateSchema,
  ProductVariantCreateSchema,
  ProductVariantUpdateSchema
} from "@ecommerce/shared";
import type {
  AuthUser,
  Channel,
  InventoryLedgerEntry,
  LoginResponse,
  Order,
  Product,
  ProductVariant,
  Role,
  SyncJob
} from "@ecommerce/shared";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";

type ProductForm = {
  name: string;
  sku: string;
  price: number;
  inventory: number;
  status: "draft" | "active" | "archived";
};

type VariantForm = {
  name: string;
  sku: string;
  price: number;
  onHand: number;
  status: "draft" | "active" | "archived";
};

type VariantEditForm = Omit<VariantForm, "onHand">;

type ApiState = {
  products: Product[];
  channels: Channel[];
  orders: Order[];
  syncJobs: SyncJob[];
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const tokenStorageKey = "ecommerce.jwt";
const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenStorageKey));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const location = useLocation();
  const isPortal = location.pathname.startsWith("/portal");

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    apiGet<AuthUser>(apiUrl, "/auth/me", token)
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

  const login = (response: LoginResponse) => {
    localStorage.setItem(tokenStorageKey, response.token);
    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
  };

  return (
    <AppShell header={{ height: 64 }} navbar={{ width: 248, breakpoint: "sm" }} padding="lg">
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            <IconBuildingStore size={28} />
            <div>
              <Text fw={700}>Ecommerce Ops</Text>
              <Text size="xs" c="dimmed">
                OMS, channels, inventory
              </Text>
            </div>
          </Group>
          {user ? (
            <Group gap="sm">
              <Badge variant="light">{user.role}</Badge>
              <Text size="sm">{user.email}</Text>
              <Button variant="subtle" onClick={logout}>
                Logout
              </Button>
            </Group>
          ) : (
            <Button component={NavLink} to="/login" leftSection={<IconUserCircle size={16} />}>
              Login
            </Button>
          )}
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Stack gap={4}>
          <MantineNavLink
            component={NavLink}
            to="/admin"
            label="Admin"
            leftSection={<IconChartBar size={18} />}
            disabled={!user || !can(user.role, "admin:read")}
          />
          <MantineNavLink
            component={NavLink}
            to="/portal"
            label="Portal"
            leftSection={<IconShoppingBag size={18} />}
            disabled={!user || !can(user.role, "portal:read")}
          />
          <MantineNavLink
            component={NavLink}
            to="/account"
            label="Account"
            leftSection={<IconUserCircle size={18} />}
            disabled={!user}
          />
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main className={isPortal ? "portal-surface" : undefined}>
        {authError ? (
          <Alert color="red" icon={<IconAlertCircle size={16} />} mb="md">
            {authError}
          </Alert>
        ) : null}
        <Routes>
          <Route
            path="/admin"
            element={
              <Protected user={user} permission="admin:read">
                <AdminDashboard token={token!} role={user?.role ?? "customer"} />
              </Protected>
            }
          />
          <Route
            path="/portal"
            element={
              <Protected user={user} permission="portal:read">
                <Portal token={token!} />
              </Protected>
            }
          />
          <Route path="/account" element={<Protected user={user}><Account user={user!} /></Protected>} />
          <Route path="/login" element={<Login onLogin={login} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

function Protected({
  children,
  permission,
  user
}: {
  children: React.ReactNode;
  permission?: string;
  user: AuthUser | null;
}) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !can(user.role, permission)) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <Title order={2}>Access restricted</Title>
        <Text c="dimmed" mt="sm">
          This role cannot open the requested workspace.
        </Text>
      </Paper>
    );
  }

  return children;
}

function AdminDashboard({ role, token }: { role: Role; token: string }) {
  const [state, setState] = useState<ApiState>({ products: [], channels: [], orders: [], syncJobs: [] });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [products, channels, orders, syncJobs] = await Promise.all([
        apiGet<Product[]>(apiUrl, "/products", token),
        apiGet<Channel[]>(apiUrl, "/channels", token),
        apiGet<Order[]>(apiUrl, "/orders", token),
        apiGet<SyncJob[]>(apiUrl, "/sync-jobs", token)
      ]);
      setState({ products, channels, orders, syncJobs });
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load API data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [token]);

  const visibleProducts = useMemo(
    () => state.products.filter((product) => filter === "all" || product.status === filter),
    [filter, state.products]
  );
  const firstProduct = state.products[0];
  const firstChannel = state.channels.find((channel) => channel.connected) ?? state.channels[0];

  const runSync = async (
    operation: "push-listing" | "pull-orders" | "update-inventory",
    target?: { productId: string; variantId?: string }
  ) => {
    if (!firstChannel || (operation === "push-listing" && !firstProduct)) {
      return;
    }
    await apiRequest<SyncJob>(apiUrl, `/sync-jobs/${operation}`, {
      method: "POST",
      token,
      body: JSON.stringify({
        channelId: firstChannel.id,
        productId: target?.productId ?? firstProduct?.id,
        ...(target?.variantId ? { variantId: target.variantId } : {})
      })
    });
    await refresh();
  };

  if (loading) {
    return <Loader aria-label="Loading dashboard" />;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="end">
        <div>
          <Title order={1}>Admin workspace</Title>
          <Text c="dimmed">Manage catalog, marketplace sync, orders, and channel health.</Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => runSync("pull-orders")}>
            Pull orders
          </Button>
          <Button leftSection={<IconRefresh size={16} />} onClick={() => runSync("push-listing")} disabled={!can(role, "admin:write")}>
            Push listing
          </Button>
        </Group>
      </Group>

      {error ? (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Metric label="Products" value={String(state.products.length)} />
        <Metric label="Open orders" value={String(state.orders.length)} />
        <Metric label="Connected channels" value={String(state.channels.filter((channel) => channel.connected).length)} tone="green" />
        <Metric label="Failed syncs" value={String(state.syncJobs.filter((job) => job.status === "failed").length)} tone="red" />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card withBorder radius="md">
          <Group justify="space-between" mb="md">
            <Title order={2}>Products</Title>
            <Select
              aria-label="Filter products"
              value={filter}
              onChange={(value) => setFilter(value ?? "all")}
              data={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "draft", label: "Draft" },
                { value: "archived", label: "Archived" }
              ]}
              w={140}
            />
          </Group>
          <ProductTable
            products={visibleProducts}
            token={token}
            onRefresh={refresh}
            onSyncInventory={(productId, variantId) =>
              runSync("update-inventory", { productId, variantId })
            }
          />
        </Card>

        <Card withBorder radius="md">
          <Title order={2} mb="md">
            Create product
          </Title>
          <ProductEditor token={token} onCreate={refresh} />
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Channels channels={state.channels} />
        <SyncJobs syncJobs={state.syncJobs} />
      </SimpleGrid>
    </Stack>
  );
}

function Channels({ channels }: { channels: Channel[] }) {
  return (
    <Card withBorder radius="md">
      <Title order={2} mb="md">
        Channels
      </Title>
      <Stack>
        {channels.map((channel) => (
          <Group key={channel.id} justify="space-between">
            <Group>
              <IconPlugConnected size={18} />
              <div>
                <Text fw={600}>{channel.name}</Text>
                <Text size="sm" c="dimmed">
                  {channel.lastSyncAt ?? "Not synced"}
                </Text>
              </div>
            </Group>
            <Badge color={channel.connected ? "green" : "gray"}>
              {channel.connected ? "Connected" : "Disconnected"}
            </Badge>
          </Group>
        ))}
        {!channels.length ? <Text c="dimmed">No channels configured.</Text> : null}
      </Stack>
    </Card>
  );
}

function SyncJobs({ syncJobs }: { syncJobs: SyncJob[] }) {
  return (
    <Card withBorder radius="md">
      <Title order={2} mb="md">
        Sync jobs
      </Title>
      <Stack>
        {syncJobs.map((job) => (
          <Paper key={job.id} p="sm" radius="md" withBorder>
            <Group justify="space-between">
              <Text fw={600}>{job.operation.replace("_", " ")}</Text>
              <Badge color={job.status === "failed" ? "red" : job.status === "success" ? "green" : "blue"}>
                {job.status}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {job.message ?? (job.retryable ? "Retryable sync error" : "Waiting for worker")}
            </Text>
          </Paper>
        ))}
        {!syncJobs.length ? <Text c="dimmed">No sync jobs yet.</Text> : null}
      </Stack>
    </Card>
  );
}

function Portal({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Order[]>(apiUrl, "/orders", token)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <Loader aria-label="Loading orders" />;
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Seller portal</Title>
        <Text c="dimmed">Daily operating view for order handling and stock updates.</Text>
      </div>
      <Card withBorder radius="md">
        <Title order={2} mb="md">
          Orders
        </Title>
        <Table.ScrollContainer minWidth={680}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {orders.map((order) => (
                <Table.Tr key={order.id}>
                  <Table.Td>{order.externalId}</Table.Td>
                  <Table.Td>{order.customerName}</Table.Td>
                  <Table.Td>
                    <Badge>{order.status}</Badge>
                  </Table.Td>
                  <Table.Td>{currency.format(order.total)}</Table.Td>
                  <Table.Td>
                    <ActionIcon aria-label={`Pack ${order.externalId}`} variant="light">
                      <IconPackage size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}

function ProductEditor({ onCreate, token }: { onCreate: () => void; token: string }) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError
  } = useForm<ProductForm>({
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

    await apiRequest<Product>(apiUrl, "/products", {
      method: "POST",
      token,
      body: JSON.stringify(parsed.data)
    });
    reset();
    onCreate();
  });

  return (
    <form onSubmit={submit}>
      <Stack>
        <TextInput label="Name" error={errors.name?.message} {...register("name", { required: true })} />
        <TextInput label="SKU" error={errors.sku?.message} {...register("sku", { required: true })} />
        <Controller name="price" control={control} render={({ field }) => <NumberInput label="Price" min={0} {...field} />} />
        <Controller
          name="inventory"
          control={control}
          render={({ field }) => <NumberInput label="Inventory" min={0} {...field} />}
        />
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              label="Status"
              data={[
                { value: "draft", label: "Draft" },
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived" }
              ]}
              {...field}
            />
          )}
        />
        <Button type="submit" loading={isSubmitting}>
          Create product
        </Button>
      </Stack>
    </form>
  );
}

function ProductTable({
  onRefresh,
  onSyncInventory,
  products,
  token
}: {
  onRefresh: () => Promise<void>;
  onSyncInventory: (productId: string, variantId: string) => Promise<void>;
  products: Product[];
  token: string;
}) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(products[0]?.id ?? null);
  const selectedProduct = products.find((product) => product.id === selectedProductId);

  useEffect(() => {
    if (!selectedProduct && products[0]) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProduct]);

  return (
    <Stack gap="md">
      <Table.ScrollContainer minWidth={640}>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>SKU</Table.Th>
              <Table.Th>Inventory</Table.Th>
              <Table.Th>Price</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Variants</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {products.map((product) => (
              <Table.Tr key={product.id}>
                <Table.Td>{product.name}</Table.Td>
                <Table.Td>{product.sku}</Table.Td>
                <Table.Td>{product.inventory}</Table.Td>
                <Table.Td>{currency.format(product.price)}</Table.Td>
                <Table.Td>
                  <Badge color={product.status === "active" ? "green" : "gray"}>{product.status}</Badge>
                </Table.Td>
                <Table.Td>
                  <Button
                    aria-label={`Manage variants for ${product.name}`}
                    leftSection={<IconListDetails size={16} />}
                    onClick={() => setSelectedProductId(product.id)}
                    size="compact-xs"
                    variant={product.id === selectedProductId ? "filled" : "light"}
                  >
                    {product.variants.length}
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {!products.length ? <Text c="dimmed">No products match this filter.</Text> : null}
      {selectedProduct ? (
        <VariantManager
          onRefresh={onRefresh}
          onSyncInventory={onSyncInventory}
          product={selectedProduct}
          token={token}
        />
      ) : null}
    </Stack>
  );
}

function VariantManager({
  onRefresh,
  onSyncInventory,
  product,
  token
}: {
  onRefresh: () => Promise<void>;
  onSyncInventory: (productId: string, variantId: string) => Promise<void>;
  product: Product;
  token: string;
}) {
  const [ledgerVariantId, setLedgerVariantId] = useState(product.variants[0]?.id ?? null);
  const ledgerVariant = product.variants.find((variant) => variant.id === ledgerVariantId) ?? null;

  useEffect(() => {
    if (!product.variants.some((variant) => variant.id === ledgerVariantId)) {
      setLedgerVariantId(product.variants[0]?.id ?? null);
    }
  }, [ledgerVariantId, product.variants]);

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>{product.name} variants</Title>
          <Badge variant="light">{product.variants.length} variants</Badge>
        </Group>
        <Table.ScrollContainer minWidth={920}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Variant</Table.Th>
                <Table.Th>SKU</Table.Th>
                <Table.Th>Price</Table.Th>
                <Table.Th>On hand</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {product.variants.map((variant) => (
                <VariantRow
                  key={variant.id}
                  onLedger={() => setLedgerVariantId(variant.id)}
                  onRefresh={onRefresh}
                  onSyncInventory={onSyncInventory}
                  productId={product.id}
                  token={token}
                  variant={variant}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {!product.variants.length ? <Text c="dimmed">No variants have been created.</Text> : null}
        <VariantCreator onCreate={onRefresh} productId={product.id} token={token} />
        <InventoryLedger productId={product.id} token={token} variant={ledgerVariant} />
      </Stack>
    </Paper>
  );
}

function VariantRow({
  onLedger,
  onRefresh,
  onSyncInventory,
  productId,
  token,
  variant
}: {
  onLedger: () => void;
  onRefresh: () => Promise<void>;
  onSyncInventory: (productId: string, variantId: string) => Promise<void>;
  productId: string;
  token: string;
  variant: ProductVariant;
}) {
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [delta, setDelta] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VariantEditForm>(variantToEditForm(variant));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setEditForm(variantToEditForm(variant));
  }, [variant]);

  const adjust = async () => {
    const parsed = InventoryAdjustmentRequestSchema.safeParse({
      delta,
      ...(note.trim() ? { note: note.trim() } : {})
    });
    if (!parsed.success) {
      setAdjustError("Enter an integer inventory delta.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<ProductVariant>(
        apiUrl,
        `/products/${productId}/variants/${variant.id}/inventory-adjustments`,
        {
          method: "POST",
          token,
          body: JSON.stringify(parsed.data)
        }
      );
      setAdjustError(null);
      setDelta(0);
      setNote("");
      await onRefresh();
    } catch (error) {
      setAdjustError(error instanceof Error ? error.message : "Inventory adjustment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const save = async () => {
    const parsed = ProductVariantUpdateSchema.safeParse(editForm);
    if (!parsed.success) {
      setEditError("Variant fields are invalid.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<ProductVariant>(apiUrl, `/products/${productId}/variants/${variant.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(parsed.data)
      });
      setEditError(null);
      setEditing(false);
      await onRefresh();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Variant update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Table.Tr>
      <Table.Td>
        {editing ? (
          <TextInput
            aria-label={`Name for ${variant.sku}`}
            onChange={(event) => setEditForm((value) => ({ ...value, name: event.target.value }))}
            value={editForm.name}
          />
        ) : (
          <Group gap="xs">
            <Text>{variant.name}</Text>
            {variant.isDefault ? <Badge variant="light">Default</Badge> : null}
          </Group>
        )}
      </Table.Td>
      <Table.Td>
        {editing ? (
          <TextInput
            aria-label={`SKU for ${variant.name}`}
            onChange={(event) => setEditForm((value) => ({ ...value, sku: event.target.value }))}
            value={editForm.sku}
          />
        ) : (
          variant.sku
        )}
      </Table.Td>
      <Table.Td>
        {editing ? (
          <NumberInput
            aria-label={`Price for ${variant.name}`}
            min={0}
            onChange={(value) => setEditForm((form) => ({ ...form, price: toNumber(value) }))}
            value={editForm.price}
          />
        ) : (
          currency.format(variant.price)
        )}
      </Table.Td>
      <Table.Td>
        <Stack gap={6}>
          <Text fw={600}>{variant.onHand}</Text>
          <Group gap={6} wrap="nowrap">
            <NumberInput
              aria-label={`Inventory delta for ${variant.name}`}
              allowDecimal={false}
              onChange={(value) => setDelta(toNumber(value))}
              size="xs"
              value={delta}
              w={88}
            />
            <TextInput
              aria-label={`Inventory note for ${variant.name}`}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Note"
              size="xs"
              value={note}
              w={132}
            />
            <Button disabled={!delta} loading={submitting} onClick={adjust} size="compact-xs" variant="light">
              Adjust
            </Button>
          </Group>
          {adjustError ? <Text c="red" size="xs">{adjustError}</Text> : null}
        </Stack>
      </Table.Td>
      <Table.Td>
        {editing ? (
          <Select
            aria-label={`Status for ${variant.name}`}
            data={statusOptions}
            onChange={(value) =>
              setEditForm((form) => ({ ...form, status: (value ?? "draft") as VariantEditForm["status"] }))
            }
            value={editForm.status}
          />
        ) : (
          <Badge color={variant.status === "active" ? "green" : "gray"}>{variant.status}</Badge>
        )}
        {editError ? <Text c="red" size="xs">{editError}</Text> : null}
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          {editing ? (
            <>
              <Button loading={submitting} onClick={save} size="compact-xs">
                Save
              </Button>
              <Button onClick={() => setEditing(false)} size="compact-xs" variant="subtle">
                Cancel
              </Button>
            </>
          ) : (
            <ActionIcon aria-label={`Edit ${variant.name}`} onClick={() => setEditing(true)} variant="light">
              <IconPencil size={16} />
            </ActionIcon>
          )}
          <ActionIcon aria-label={`Open ledger for ${variant.name}`} onClick={onLedger} variant="light">
            <IconListDetails size={16} />
          </ActionIcon>
          <ActionIcon
            aria-label={`Sync inventory for ${variant.name}`}
            onClick={() => onSyncInventory(productId, variant.id)}
            variant="light"
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

function VariantCreator({
  onCreate,
  productId,
  token
}: {
  onCreate: () => Promise<void>;
  productId: string;
  token: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    formState: { isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<VariantForm>({
    defaultValues: {
      name: "",
      sku: "",
      price: 100000,
      onHand: 0,
      status: "draft"
    }
  });

  const submit = handleSubmit(async (values) => {
    const parsed = ProductVariantCreateSchema.safeParse(values);
    if (!parsed.success) {
      setError("Variant data is invalid.");
      return;
    }

    try {
      await apiRequest<ProductVariant>(apiUrl, `/products/${productId}/variants`, {
        method: "POST",
        token,
        body: JSON.stringify(parsed.data)
      });
      setError(null);
      reset();
      await onCreate();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Variant create failed");
    }
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Title order={4}>Create variant</Title>
          <Button leftSection={<IconPlus size={16} />} loading={isSubmitting} size="compact-sm" type="submit">
            Add
          </Button>
        </Group>
        {error ? <Alert color="red">{error}</Alert> : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Variant name" {...register("name", { required: true })} />
          <TextInput label="Variant SKU" {...register("sku", { required: true })} />
          <Controller
            control={control}
            name="price"
            render={({ field }) => <NumberInput label="Price" min={0} {...field} />}
          />
          <Controller
            control={control}
            name="onHand"
            render={({ field }) => <NumberInput label="Opening inventory" min={0} {...field} />}
          />
          <Controller
            control={control}
            name="status"
            render={({ field }) => <Select data={statusOptions} label="Status" {...field} />}
          />
        </SimpleGrid>
      </Stack>
    </form>
  );
}

function InventoryLedger({
  productId,
  token,
  variant
}: {
  productId: string;
  token: string;
  variant: ProductVariant | null;
}) {
  const [entries, setEntries] = useState<InventoryLedgerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!variant) {
      setEntries([]);
      return;
    }

    setLoading(true);
    apiGet<InventoryLedgerEntry[]>(
      apiUrl,
      `/products/${productId}/variants/${variant.id}/inventory-ledger`,
      token
    )
      .then((nextEntries) => {
        setEntries(nextEntries);
        setError(null);
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Failed to load inventory ledger");
      })
      .finally(() => setLoading(false));
  }, [productId, token, variant]);

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Title order={4}>Inventory ledger</Title>
        {variant ? <Text size="sm">{variant.sku}</Text> : null}
      </Group>
      {loading ? <Loader aria-label="Loading inventory ledger" size="sm" /> : null}
      {error ? <Alert color="red">{error}</Alert> : null}
      {!loading && !error && !entries.length ? <Text c="dimmed">No ledger entries yet.</Text> : null}
      {entries.length ? (
        <Table.ScrollContainer minWidth={560}>
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Change</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Note</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entries.map((entry) => (
                <Table.Tr key={entry.id}>
                  <Table.Td>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</Table.Td>
                  <Table.Td>
                    {entry.quantityBefore} to {entry.quantityAfter}
                  </Table.Td>
                  <Table.Td>{entry.type.replace("_", " ")}</Table.Td>
                  <Table.Td>{entry.note ?? "-"}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      ) : null}
    </Stack>
  );
}

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" }
];

function variantToEditForm(variant: ProductVariant): VariantEditForm {
  return {
    name: variant.name,
    sku: variant.sku,
    price: variant.price,
    status: variant.status
  };
}

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value) || 0;
}

function Metric({ label, value, tone = "blue" }: { label: string; value: string; tone?: string }) {
  return (
    <Card withBorder radius="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={800} size="xl" c={tone}>
        {value}
      </Text>
    </Card>
  );
}

function Account({ user }: { user: AuthUser }) {
  return (
    <Card withBorder radius="md">
      <Title order={1}>Account</Title>
      <Text c="dimmed" mt="sm">
        Account {user.accountId} is scoped by the JWT tenant boundary. Current role: {user.role}.
      </Text>
    </Card>
  );
}

function Login({ onLogin }: { onLogin: (response: LoginResponse) => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    formState: { isSubmitting },
    handleSubmit,
    register
  } = useForm({ defaultValues: { email: "owner@example.com", password: "owner12345" } });

  const submit = handleSubmit(async (values) => {
    const parsed = LoginRequestSchema.safeParse(values);
    if (!parsed.success) {
      setError("Enter a valid email and password.");
      return;
    }

    try {
      const response = await apiRequest<LoginResponse>(apiUrl, "/auth/login", {
        method: "POST",
        body: JSON.stringify(parsed.data)
      });
      onLogin(response);
      navigate("/admin");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Login failed");
    }
  });

  return (
    <Card withBorder radius="md" maw={480}>
      <form onSubmit={submit}>
        <Stack>
          <Title order={1}>Login</Title>
          {error ? <Alert color="red">{error}</Alert> : null}
          <TextInput label="Email" autoComplete="email" {...register("email")} />
          <PasswordInput label="Password" autoComplete="current-password" {...register("password")} />
          <Button type="submit" loading={isSubmitting}>
            Login
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
