"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { TeePreview } from "@/components/TeePreview";
import {
  CATEGORY_TABS,
  DESIGNS,
  type DesignCategory,
  designById,
} from "@/lib/designs";
import {
  computeLineTotal,
  DESIGN_DISPLAY_FEE,
  PRODUCT_TYPES,
  SHIRT_COLORS,
  SIZES,
  type ProductTypeId,
} from "@/lib/pricing";
import { useCart } from "@/lib/CartContext";
import type { PreviewSide } from "@/lib/types";

function CustomizeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initialDesign = params.get("design");

  const { addLine } = useCart();

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<DesignCategory>("all");
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(
    initialDesign ?? DESIGNS[0]?.id ?? null
  );
  const [productType, setProductType] = useState<ProductTypeId>("round");
  const [colorId, setColorId] = useState(SHIRT_COLORS[0]?.id ?? "white");
  const [size, setSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [side, setSide] = useState<PreviewSide>("front");
  const [zoom, setZoom] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  useEffect(() => {
    const d = params.get("design");
    if (d && designById(d)) setSelectedDesignId(d);
  }, [params]);

  const selectedDesign = designById(selectedDesignId);
  const hasDesign = Boolean(selectedDesign);

  const color = SHIRT_COLORS.find((c) => c.id === colorId) ?? SHIRT_COLORS[0];

  const filtered = useMemo(() => {
    return DESIGNS.filter((d) => {
      if (cat !== "all" && d.category !== cat) return false;
      if (!query.trim()) return true;
      return d.name.toLowerCase().includes(query.toLowerCase());
    });
  }, [cat, query]);

  const unitPrice = computeLineTotal(productType, hasDesign, 1);
  const teeBase = hasDesign
    ? PRODUCT_TYPES[productType].withDesignPrice - DESIGN_DISPLAY_FEE
    : PRODUCT_TYPES[productType].plainPrice;
  const designFee = hasDesign ? DESIGN_DISPLAY_FEE : 0;
  const total = unitPrice * qty;

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Check out my Gharsip tee preview — ${selectedDesign?.name ?? "Custom"} on ${color.label} (${size})`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const addToCart = () => {
    addLine({
      designId: selectedDesign?.id ?? null,
      designName: selectedDesign?.name ?? null,
      designUrl: selectedDesign?.imageUrl ?? null,
      productType,
      colorId: color.id,
      colorLabel: color.label,
      colorHex: color.hex,
      size,
      qty,
      previewSide: side,
      unitPrice,
    });
  };

  const buyNow = () => {
    addToCart();
    router.push("/cart");
  };

  return (
    <div className="mx-auto max-w-[1600px] px-3 pb-16 pt-4 sm:px-4 lg:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Live customizer</h1>
          <p className="text-sm text-zinc-600">Preview updates instantly — no page reload.</p>
        </div>
        <Link href="/cart" className="text-sm font-bold text-brand hover:underline">
          Go to cart →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* A — gallery */}
        <aside className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-3">
          <input
            type="search"
            placeholder="Search designs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none ring-brand focus:ring-2"
          />
          <div className="scrollbar-thin flex gap-1 overflow-x-auto pb-1 lg:flex-wrap">
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCat(t.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
                  cat === t.id
                    ? "bg-brand text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid max-h-[min(70vh,720px)] grid-cols-2 gap-2 overflow-y-auto overscroll-contain pb-24 lg:pb-8">
            {filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDesignId(d.id)}
                className={`rounded-xl border-2 bg-white p-2 text-left shadow-sm transition ${
                  selectedDesignId === d.id ? "border-brand ring-2 ring-brand/25" : "border-transparent hover:border-zinc-300"
                }`}
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
                  <Image src={d.imageUrl} alt="" fill className="object-cover" unoptimized sizes="120px" />
                </div>
                <p className="mt-1 truncate text-[11px] font-bold">{d.name}</p>
                <p className="text-[10px] text-brand">₹{d.price}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* B — preview */}
        <section className="order-1 lg:order-2 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setSide("front")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold ${side === "front" ? "bg-brand text-white" : ""}`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setSide("back")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold ${side === "back" ? "bg-brand text-white" : ""}`}
              >
                Back
              </button>
            </div>
            <button
              type="button"
              onClick={() => setZoom((z) => !z)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-bold"
            >
              {zoom ? "Zoom out" : "Zoom"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedDesignId(null)}
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white"
            >
              Plain tee (no graphic)
            </button>
          </div>
          <div className="mt-6">
            <TeePreview
              colorHex={color.hex}
              designUrl={side === "front" && selectedDesign ? selectedDesign.imageUrl : null}
              side={side}
              zoom={zoom}
            />
          </div>

          {/* size row under preview (mobile friendly) */}
          <div className="mx-auto mt-8 max-w-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-zinc-800">Size</h3>
              <button
                type="button"
                className="text-xs font-bold text-brand underline-offset-4 hover:underline"
                onClick={() => setShowSizeGuide(true)}
              >
                Size guide
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  title={`Chest ~${s.chestIn}\" · Length ~${s.lengthIn}\"`}
                  type="button"
                  onClick={() => setSize(s.id)}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold ${
                    size === s.id ? "border-brand bg-brand-muted text-brand-dark ring-2 ring-brand/30" : "border-zinc-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* C — options */}
        <aside className="order-3 lg:col-span-3">
          <div className="sticky top-20 space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-500">T-Shirt type</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(PRODUCT_TYPES) as ProductTypeId[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setProductType(k)}
                    className={`rounded-xl border px-2 py-2.5 text-center text-[11px] font-bold leading-tight ${
                      productType === k ? "border-brand bg-brand-muted text-brand-dark" : "border-zinc-200"
                    }`}
                  >
                    {PRODUCT_TYPES[k].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-500">Colour</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {SHIRT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    aria-label={c.label}
                    onClick={() => setColorId(c.id)}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ${
                      colorId === c.id ? "ring-brand" : "ring-transparent"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    <span className="sr-only">{c.label}</span>
                    {colorId === c.id ? (
                      <svg className={`h-4 w-4 ${c.id === "white" || c.id === "yellow" ? "text-zinc-900" : "text-white"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    ) : null}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">Selected: {color.label}</p>
            </div>

            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-500">Quantity</h3>
              <div className="mt-2 inline-flex items-center rounded-xl border border-zinc-200">
                <button
                  type="button"
                  className="px-4 py-2 text-lg font-bold"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span className="w-10 text-center font-bold">{qty}</span>
                <button
                  type="button"
                  className="px-4 py-2 text-lg font-bold"
                  onClick={() => setQty((q) => q + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">T-shirt ({PRODUCT_TYPES[productType].label})</span>
                <span className="font-bold">₹{teeBase}</span>
              </div>
              {hasDesign ? (
                <div className="mt-1 flex justify-between">
                  <span className="text-zinc-600">Design</span>
                  <span className="font-bold">₹{designFee}</span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-zinc-500">Add a design to unlock print pricing.</p>
              )}
              <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-base font-extrabold">
                <span>Total</span>
                <span className="text-brand">₹{total}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={addToCart}
                className="w-full rounded-2xl bg-brand py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-brand-dark"
              >
                Add to cart
              </button>
              <button
                type="button"
                onClick={buyNow}
                className="w-full rounded-2xl bg-zinc-900 py-3.5 text-center text-sm font-extrabold text-white hover:bg-black"
              >
                Buy now
              </button>
              <button
                type="button"
                onClick={shareWhatsApp}
                className="w-full rounded-2xl border border-brand py-3 text-sm font-bold text-brand hover:bg-brand-muted"
              >
                Share preview (WhatsApp)
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showSizeGuide ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-extrabold">Size guide (inches)</h2>
              <button type="button" className="text-sm font-bold text-zinc-500" onClick={() => setShowSizeGuide(false)}>
                Close
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Garment measurements ±1&amp;Prime; tolerance — oversized fits broader at shoulder.
            </p>
            <table className="mt-4 w-full text-xs">
              <thead>
                <tr className="bg-zinc-100 text-left font-bold uppercase text-zinc-600">
                  <th className="p-2">Size</th>
                  <th className="p-2">Chest</th>
                  <th className="p-2">Length</th>
                </tr>
              </thead>
              <tbody>
                {SIZES.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100">
                    <td className="p-2 font-bold">{s.id}</td>
                    <td className="p-2">{s.chestIn}&Prime;</td>
                    <td className="p-2">{s.lengthIn}&Prime;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CustomizePage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-zinc-500">Loading designer…</div>}>
      <CustomizeInner />
    </Suspense>
  );
}
