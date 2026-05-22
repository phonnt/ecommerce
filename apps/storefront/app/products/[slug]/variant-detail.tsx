"use client";

import type { ProductVariant } from "@ecommerce/shared";
import React, { useState } from "react";
import { formatPrice } from "../../products";

export function VariantDetail({
  status,
  variants
}: {
  status: "draft" | "active" | "archived";
  variants: ProductVariant[];
}) {
  const [selectedId, setSelectedId] = useState(
    variants.find((variant) => variant.isDefault)?.id ?? variants[0]?.id
  );
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];

  if (!selected) {
    return <p>This product has no available variants.</p>;
  }

  return (
    <>
      <div className="variant-options" role="group" aria-label="Select variant">
        {variants.map((variant) => (
          <button
            aria-pressed={variant.id === selected.id}
            className={variant.id === selected.id ? "active" : undefined}
            key={variant.id}
            onClick={() => setSelectedId(variant.id)}
            type="button"
          >
            {variant.name}
          </button>
        ))}
      </div>
      <p className="sku">{selected.sku}</p>
      <strong>{formatPrice(selected.price)}</strong>
      <dl>
        <div>
          <dt>Inventory</dt>
          <dd>{selected.onHand}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{selected.onHand > 0 ? status : "out of stock"}</dd>
        </div>
      </dl>
    </>
  );
}
