import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatPrice, getProduct, getProducts } from "../../products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product not found" };
  }

  return {
    title: product.name,
    description: `${product.name} with live catalog inventory and marketplace-ready product data.`,
    alternates: {
      canonical: `/products/${product.slug}`
    },
    openGraph: {
      title: product.name,
      description: `${product.inventory} units available.`,
      type: "website"
    }
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="product-detail">
      <div className="detail-art">
        <div className="product-object large">
          <span>{product.sku}</span>
        </div>
      </div>
      <section className="detail-copy">
        <p className="sku">{product.sku}</p>
        <h1>{product.name}</h1>
        <p>
          Product detail mock for SEO routes, canonical metadata, marketplace listings, and future
          checkout expansion.
        </p>
        <strong>{formatPrice(product.price)}</strong>
        <button type="button">Add to cart</button>
        <dl>
          <div>
            <dt>Inventory</dt>
            <dd>{product.inventory}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{product.status}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
