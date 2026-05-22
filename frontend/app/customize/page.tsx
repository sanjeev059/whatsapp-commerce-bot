"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

function CustomizeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { addLine } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<DesignCategory>("all");
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(
    params.get("design") ?? DESIGNS[0]?.id ?? null
  );
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [productType, setProductType] = useState<ProductTypeId>("round");
  const [colorId, setColorId] = useState(SHIRT_COLORS[0]?.id ?? "white");
  const [size, setSize] = useState("M");
  const [qty, setQty] = useState(1);
  const [side, setSide] = useState<PreviewSide>("front");
  const [zoom, setZoom] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  useEffect(() => {
    const d = params.get("design");
    if (d && designById(d)) {
      setSelectedDesignId(d);
      setUploadedUrl(null);
    }
  }, [params]);

  const selectedDesign = uploadedUrl ? null : designById(selectedDesignId);
  const hasDesign = Boolean(uploadedUrl ?? selectedDesign);
  const color = SHIRT_COLORS.find((c) => c.id === colorId) ?? SHIRT_COLORS[0];

  // The URL that goes on the shirt — uploaded image takes priority
  const effectiveDesignUrl = uploadedUrl ?? (selectedDesign?.imageUrl ?? null);
  const effectiveName = uploadedUrl ? "My Custom Design" : (selectedDesign?.name ?? null);

  const filtered = useMemo(
    () =>
      DESIGNS.filter((d) => {
        if (cat !== "all" && d.category !== cat) return false;
        if (!query.trim()) return true;
        return d.name.toLowerCase().includes(query.toLowerCase());
      }),
    [cat, query]
  );

  const unitPrice = computeLineTotal(productType, hasDesign, 1);
  const teeBase = hasDesign
    ? PRODUCT_TYPES[productType].withDesignPrice - DESIGN_DISPLAY_FEE
    : PRODUCT_TYPES[productType].plainPrice;
  const designFee = hasDesign ? DESIGN_DISPLAY_FEE : 0;
  const total = unitPrice * qty;

  // ── Upload handler ─────────────────────────────────────────────────────
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (JPG, PNG, SVG, WebP).");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("File too large — max 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedUrl(ev.target?.result as string);
      setSelectedDesignId(null);
    };
    reader.readAsDataURL(file);
    // reset the input so the same file can be re-selected after clearing
    e.target.value = "";
  };

  const clearUpload = () => {
    setUploadedUrl(null);
    setUploadError(null);
  };

  // ── Cart helpers ───────────────────────────────────────────────────────
  const addToCart = () => {
    addLine({
      designId: uploadedUrl ? "custom-upload" : (selectedDesign?.id ?? null),
      designName: effectiveName,
      designUrl: effectiveDesignUrl,
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

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Check out my Gharsip tee — ${effectiveName ?? "Custom"} on ${color.label} (${size})`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-[1600px] px-3 pb-16 pt-4 sm:px-4 lg:px-6">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Live customiser</h1>
          <p className="text-sm text-zinc-500">Changes update instantly on the shirt — no page reload.</p>
        </div>
        <Link href="/cart" className="text-sm font-bold text-brand hover:underline">Go to cart →</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">

        {/* ══ A — Design gallery ══════════════════════════════════════════ */}
        <aside className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-3">

          {/* ── UPLOAD YOUR OWN DESIGN ── */}
          <div className="rounded-2xl border-2 border-dashed border-brand/30 bg-brand-muted/40 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-brand">Upload your design</p>
            {uploadedUrl ? (
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-brand bg-white">
                  <Image src={uploadedUrl} alt="Uploaded design" fill className="object-contain p-1" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-zinc-800">Custom design applied ✓</p>
                  <p className="text-[10px] text-zinc-500">Showing on your shirt</p>
                </div>
                <button
                  type="button"
                  onClick={clearUpload}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition text-xs font-bold"
                  title="Remove upload"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-brand-muted/60 transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <span className="text-xs font-extrabold text-brand">Upload your design</span>
                <span className="text-[10px] text-zinc-500">JPG · PNG · SVG · WebP · Max 5 MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleUpload}
                />
              </label>
            )}
            {uploadError && (
              <p className="mt-1.5 rounded-lg bg-red-50 px-2 py-1 text-[10px] text-red-600">{uploadError}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">or choose from gallery</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              type="search"
              placeholder="Search designs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
            />
          </div>

          {/* Category chips */}
          <div className="scrollbar-thin flex gap-1 overflow-x-auto pb-1 lg:flex-wrap">
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCat(t.id)}
                className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
                  cat === t.id ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Design grid */}
          <div className="grid max-h-[min(70vh,720px)] grid-cols-2 gap-2 overflow-y-auto overscroll-contain pb-24 lg:pb-8">
            {filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => { setSelectedDesignId(d.id); setUploadedUrl(null); }}
                className={`rounded-xl border-2 bg-white p-2 text-left shadow-sm transition ${
                  !uploadedUrl && selectedDesignId === d.id
                    ? "border-brand ring-2 ring-brand/25"
                    : "border-transparent hover:border-zinc-300"
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

        {/* ══ B — Live preview ════════════════════════════════════════════ */}
        <section className="order-1 lg:order-2 lg:col-span-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1">
              {(["front", "back"] as PreviewSide[]).map((s) => (
                <button key={s} type="button" onClick={() => setSide(s)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition ${side === s ? "bg-brand text-white" : "text-zinc-600 hover:text-brand"}`}>
                  {s}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setZoom((z) => !z)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-bold hover:border-brand hover:text-brand transition">
              {zoom ? "Zoom out" : "Zoom in"}
            </button>
            <button type="button" onClick={() => { setSelectedDesignId(null); setUploadedUrl(null); }}
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-black transition">
              Plain tee
            </button>
          </div>

          {/* T-shirt preview */}
          <div className="mt-6">
            <TeePreview
              colorHex={color.hex}
              designUrl={side === "front" ? effectiveDesignUrl : null}
              side={side}
              zoom={zoom}
            />
          </div>

          {/* Size selector */}
          <div className="mx-auto mt-8 max-w-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-zinc-800">Size</h3>
              <button type="button" onClick={() => setShowSizeGuide(true)}
                className="text-xs font-bold text-brand hover:underline underline-offset-4">
                Size guide
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button key={s.id} type="button" onClick={() => setSize(s.id)}
                  title={`Chest ~${s.chestIn}" · Length ~${s.lengthIn}"`}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    size === s.id
                      ? "border-brand bg-brand-muted text-brand-dark ring-2 ring-brand/30"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ══ C — Options & buy ═══════════════════════════════════════════ */}
        <aside className="order-3 lg:col-span-3">
          <div className="sticky top-20 space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg">

            {/* Product type */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-500">T-Shirt type</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(PRODUCT_TYPES) as ProductTypeId[]).map((k) => (
                  <button key={k} type="button" onClick={() => setProductType(k)}
                    className={`rounded-xl border px-2 py-2.5 text-center text-[11px] font-bold leading-tight transition ${
                      productType === k ? "border-brand bg-brand-muted text-brand-dark" : "border-zinc-200 hover:border-zinc-300"
                    }`}>
                    {PRODUCT_TYPES[k].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Colour */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-500">Colour</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {SHIRT_COLORS.map((c) => (
                  <button key={c.id} type="button" title={c.label} aria-label={c.label}
                    onClick={() => setColorId(c.id)}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 transition ${
                      colorId === c.id ? "ring-brand" : "ring-transparent"
                    }`}
                    style={{ backgroundColor: c.hex, border: c.hex === "#f5f5f5" ? "1px solid #d4d4d8" : "none" }}>
                    <span className="sr-only">{c.label}</span>
                    {colorId === c.id && (
                      <svg className={`h-4 w-4 ${c.id === "white" || c.id === "yellow" ? "text-zinc-900" : "text-white"}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">Selected: <span className="font-semibold">{color.label}</span></p>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-500">Quantity</h3>
              <div className="mt-2 inline-flex items-center rounded-xl border border-zinc-200">
                <button type="button" className="px-4 py-2 text-lg font-bold hover:text-brand transition"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <span className="w-10 text-center font-bold">{qty}</span>
                <button type="button" className="px-4 py-2 text-lg font-bold hover:text-brand transition"
                  onClick={() => setQty((q) => q + 1)}>+</button>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="rounded-xl bg-zinc-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">T-shirt ({PRODUCT_TYPES[productType].label})</span>
                <span className="font-bold">₹{teeBase}</span>
              </div>
              {hasDesign ? (
                <div className="mt-1 flex justify-between">
                  <span className="text-zinc-600">Design print</span>
                  <span className="font-bold">₹{designFee}</span>
                </div>
              ) : (
                <p className="mt-1 text-xs text-zinc-500">Add a design to unlock print pricing.</p>
              )}
              {qty > 1 && (
                <div className="mt-1 flex justify-between text-zinc-500">
                  <span>× {qty} units</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-base font-extrabold">
                <span>Total</span>
                <span className="text-brand">₹{total}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2">
              <button type="button" onClick={addToCart}
                className="w-full rounded-2xl bg-brand py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-brand-dark transition">
                Add to cart
              </button>
              <button type="button" onClick={buyNow}
                className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-extrabold text-white hover:bg-black transition">
                Buy now
              </button>
              <button type="button" onClick={shareWhatsApp}
                className="w-full rounded-2xl border border-brand py-3 text-sm font-bold text-brand hover:bg-brand-muted transition">
                Share via WhatsApp
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Size guide modal ── */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog" aria-modal onClick={(e) => e.target === e.currentTarget && setShowSizeGuide(false)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-extrabold">Size guide (inches)</h2>
              <button type="button" className="rounded-lg bg-zinc-100 px-3 py-1 text-sm font-bold text-zinc-600 hover:bg-zinc-200"
                onClick={() => setShowSizeGuide(false)}>Close</button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Garment measurements ±1&Prime; tolerance — oversized fits broader at shoulder.</p>
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
      )}
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
