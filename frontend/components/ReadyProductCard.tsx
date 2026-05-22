"use client";

import Link from "next/link";
import { useState } from "react";
import { TeeThumbnail } from "./TeeThumbnail";
import { useCart } from "@/lib/CartContext";
import { designById } from "@/lib/designs";
import type { ReadyProduct } from "@/lib/products";

const SIZES = ["S", "M", "L", "XL", "XXL"];

const BADGE_STYLES: Record<string, string> = {
  "Best Seller": "bg-amber-400 text-amber-900",
  "New Arrival": "bg-sky-500 text-white",
  Trending:      "bg-rose-500 text-white",
  Limited:       "bg-violet-600 text-white",
};

type Props = { product: ReadyProduct };

export function ReadyProductCard({ product }: Props) {
  const [size, setSize] = useState("M");
  const [status, setStatus] = useState<"idle" | "added" | "busy">("idle");
  const { addLine } = useCart();
  const design = designById(product.designId);
  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);

  const handleAdd = () => {
    if (status === "busy") return;
    setStatus("busy");
    addLine({
      designId: design?.id ?? null,
      designName: design?.name ?? product.name,
      designUrl: design?.imageUrl ?? null,
      productType: product.productType,
      colorId: product.colorId,
      colorLabel: product.colorLabel,
      colorHex: product.colorHex,
      size,
      qty: 1,
      previewSide: "front",
      unitPrice: product.price,
    });
    setStatus("added");
    setTimeout(() => setStatus("idle"), 2200);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">

      {/* Discount ribbon */}
      <div className="absolute left-0 top-4 z-10 rounded-r-full bg-brand px-3 py-0.5 text-[11px] font-bold text-white shadow-sm">
        {discount}% OFF
      </div>

      {/* Badge */}
      {product.badge ? (
        <span className={`absolute right-3 top-3 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-sm ${BADGE_STYLES[product.badge]}`}>
          {product.badge}
        </span>
      ) : null}

      {/* T-shirt mockup */}
      <div className="relative bg-zinc-50 px-6 pt-8 pb-2 border-b border-zinc-100">
        <TeeThumbnail colorHex={product.colorHex} designUrl={design?.imageUrl ?? null} />
        {/* Color dot */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <span
            className="h-4 w-4 rounded-full border-2 border-white shadow-sm ring-1 ring-black/10"
            style={{ backgroundColor: product.colorHex }}
          />
          <span className="text-[10px] font-semibold text-zinc-400">{product.colorLabel}</span>
        </div>
      </div>

      {/* Info section */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-extrabold text-zinc-900 leading-tight">{product.name}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{product.tagline}</p>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-brand">₹{product.price}</span>
          <span className="text-sm text-zinc-400 line-through">₹{product.mrp}</span>
          <span className="ml-auto text-[10px] font-bold text-amber-500">★★★★★</span>
        </div>

        {/* Size selector */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select size</p>
          <div className="flex flex-wrap gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                  size === s
                    ? "border-brand bg-brand-muted text-brand-dark ring-1 ring-brand/30"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={status === "busy"}
            className={`w-full rounded-xl py-2.5 text-sm font-extrabold transition ${
              status === "added"
                ? "bg-green-600 text-white"
                : "bg-brand text-white hover:bg-brand-dark"
            } disabled:opacity-60`}
          >
            {status === "added" ? "✓ Added to cart!" : status === "busy" ? "Adding…" : "Add to Cart"}
          </button>
          <Link
            href={`/customize?design=${product.designId}`}
            className="w-full rounded-xl border border-zinc-200 py-2 text-center text-xs font-bold text-zinc-600 hover:border-brand hover:text-brand transition"
          >
            Customise this design
          </Link>
        </div>
      </div>
    </div>
  );
}
