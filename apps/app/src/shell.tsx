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
  IconPackage,
  IconPlugConnected,
  IconRefresh,
  IconShoppingBag,
  IconUserCircle
} from "@tabler/icons-react";
import { apiGet, apiRequest, can, LoginRequestSchema, ProductCreateSchema } from "@ecommerce/shared";
import type { AuthUser, Channel, LoginResponse, Order, Product, Role, SyncJob } from "@ecommerce/shared";
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

  const runSync = async (operation: "push-listing" | "pull-orders" | "update-inventory") => {
    if (!firstChannel || (operation !== "pull-orders" && !firstProduct)) {
      return;
    }
    await apiRequest<SyncJob>(apiUrl, `/sync-jobs/${operation}`, {
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
          <ProductTable products={visibleProducts} onSyncInventory={() => runSync("update-inventory")} />
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

function ProductTable({ onSyncInventory, products }: { onSyncInventory: () => void; products: Product[] }) {
  return (
    <Table.ScrollContainer minWidth={640}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Product</Table.Th>
            <Table.Th>SKU</Table.Th>
            <Table.Th>Inventory</Table.Th>
            <Table.Th>Price</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Sync</Table.Th>
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
                <ActionIcon aria-label={`Sync inventory for ${product.name}`} variant="light" onClick={onSyncInventory}>
                  <IconRefresh size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
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
