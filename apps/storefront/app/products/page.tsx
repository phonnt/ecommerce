import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice, getProducts } from "../products";

export const metadata: Metadata = {
  title: "Products",
  description: "Catalog listing mock for the V1 storefront."
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="section">
      <div className="section-heading">
        <h1>Products</h1>
        <p>SEO-friendly public listing backed by the shared product contract.</p>
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <Link href={`/products/${product.slug}`} className="product-card" key={product.id}>
            <div className="product-swatch" />
            <h2>{product.name}</h2>
            <p>{product.sku}</p>
            <strong>{formatPrice(product.price)}</strong>
          </Link>
        ))}
      </div>
    </main>
  );
}
