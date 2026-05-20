import { createTheme, MantineColorsTuple } from "@mantine/core";

const brand: MantineColorsTuple = [
  "#eff6ff",
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#1e40af",
  "#172554"
];

export const ecommerceTheme = createTheme({
  primaryColor: "brand",
  colors: { brand },
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  headings: {
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    fontWeight: "700"
  },
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "10px",
    xl: "12px"
  },
  defaultRadius: "md"
});
