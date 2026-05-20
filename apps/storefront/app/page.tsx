import Link from "next/link";
import { formatPrice, getProducts } from "./products";

export default async function HomePage() {
  const products = await getProducts();
  const featured = products[0]!;

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <h1>Everyday Goods</h1>
          <p>
            A public storefront shell connected to the same catalog model used by operations,
            marketplaces, and inventory sync.
          </p>
          <div className="actions">
            <Link href="/products" className="button primary">
              Browse products
            </Link>
            {featured ? (
              <Link href={`/products/${featured.slug}`} className="button secondary">
                View featured
              </Link>
            ) : null}
          </div>
        </div>
        {featured ? (
          <div className="hero-product" aria-label={`${featured.name} product preview`}>
            <div className="product-object">
              <span>{featured.sku}</span>
            </div>
            <h2>{featured.name}</h2>
            <p>{featured.inventory} units available</p>
          </div>
        ) : null}
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Ready for marketplace channels</h2>
          <p>Product pages use stable slugs, metadata hooks, and catalog-shaped data.</p>
        </div>
        <div className="product-grid">
          {products.slice(0, 3).map((product) => (
            <Link href={`/products/${product.slug}`} className="product-card" key={product.id}>
              <div className="product-swatch" />
              <h3>{product.name}</h3>
              <p>{product.sku}</p>
              <strong>{formatPrice(product.price)}</strong>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
