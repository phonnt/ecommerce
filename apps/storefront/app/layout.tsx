import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://yourdomain.com"),
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23111827'/%3E%3Ccircle cx='16' cy='14' r='6' fill='white'/%3E%3Cpath d='M8 23h16' stroke='white' stroke-width='3'/%3E%3C/svg%3E"
      }
    ]
  },
  title: {
    default: "Everyday Goods",
    template: "%s | Everyday Goods"
  },
  description: "SEO-ready storefront shell for catalog, marketplace, and product discovery.",
  openGraph: {
    title: "Everyday Goods",
    description: "Curated essentials with reliable inventory and fast fulfillment.",
    url: "https://yourdomain.com",
    siteName: "Everyday Goods",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="brand">
            Everyday Goods
          </a>
          <nav aria-label="Primary navigation">
            <a href="/products">Products</a>
            <a href="/products/linen-everyday-tee">Featured</a>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <span>Everyday Goods</span>
          <span>Mock storefront for V1 catalog and SEO routing.</span>
        </footer>
      </body>
    </html>
  );
}
