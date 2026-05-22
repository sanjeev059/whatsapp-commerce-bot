"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { TeePreview } from "@/components/TeePreview";
import { CATEGORY_TABS, DESIGNS, type DesignCategory, designById } from "@/lib/designs";
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

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// ── tiny reusable upload slot ───────────────────────────────────────────────
function UploadSlot({
  label,
  url,
  onUpload,
  onClear,
  error,
}: {
  label: string;
  url: string | null;
  onUpload: (dataUrl: string) => void;
  onClear: () => void;
  error: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_BYTES) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpload(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex-1">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      {url ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-muted/40 p-2">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-brand/20 bg-white">
            <Image src={url} alt="" fill className="object-contain p-0.5" unoptimized />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-zinc-700">Uploaded ✓</p>
            <p className="text-[10px] text-zinc-400">Showing on shirt</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition text-[11px] font-bold"
          >✕</button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-3 hover:border-brand hover:bg-brand-muted/30 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" className="text-brand">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="text-[11px] font-bold text-brand">Upload {label}</span>
          <span className="text-[10px] text-zinc-400">JPG · PNG · SVG · Max 5 MB</span>
          <input ref={ref} type="file" className="hidden" accept="image/*" onChange={handleChange} />
        </label>
      )}
      {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

// ── main page ───────────────────────────────────────────────────────────────
function CustomizeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { addLine } = useCart();

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<DesignCategory>("all");
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(
    params.get("design") ?? DESIGNS[0]?.id ?? null
  );

  // separate front / back uploads
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [frontErr, setFrontErr] = useState<string | null>(null);
  const [backErr, setBackErr] = useState<string | null>(null);

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
      setFrontUrl(null);
      setBackUrl(null);
    }
  }, [params]);

  const selectedDesign = (frontUrl || backUrl) ? null : designById(selectedDesignId);
  const hasDesign = Boolean(frontUrl ?? backUrl ?? selectedDesign);
  const color = SHIRT_COLORS.find((c) => c.id === colorId) ?? SHIRT_COLORS[0];

  // What to show on each side
  const effectiveFrontUrl = frontUrl ?? selectedDesign?.imageUrl ?? null;
  const effectiveBackUrl = backUrl ?? null;
  const effectiveName =
    frontUrl || backUrl ? "Custom Design (upload)" : (selectedDesign?.name ?? null);

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

  const handleUpload = (
    setter: (u: string | null) => void,
    setErr: (e: string | null) => void
  ) => (dataUrl: string) => {
    setErr(null);
    setter(dataUrl);
    setSelectedDesignId(null);
  };

  const addToCart = () => {
    addLine({
      designId: (frontUrl || backUrl) ? "custom-upload" : (selectedDesign?.id ?? null),
      designName: effectiveName,
      designUrl: effectiveFrontUrl,
      productType,
      colorId: color.id,
      colorLabel: color.label,
      colorHex: color.hex,
      size,
      qty,
      previewSide: "front",
      unitPrice,
    });
  };

  const buyNow = () => { addToCart(); router.push("/cart"); };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Check out my Gharsip tee — ${effectiveName ?? "Custom"} on ${color.label} (${size})`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const clearAll = () => {
    setFrontUrl(null); setBackUrl(null);
    setFrontErr(null); setBackErr(null);
    setSelectedDesignId(null);
  };

  return (
    <div className="mx-auto max-w-[1600px] px-3 pb-16 pt-4 sm:px-4 lg:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Live customiser</h1>
          <p className="text-sm text-zinc-500">Changes update instantly — no page reload.</p>
        </div>
        <Link href="/cart" className="text-sm font-bold text-brand hover:underline">Go to cart →</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">

        {/* ══ A — Design panel ════════════════════════════════════════════ */}
        <aside className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-3">

          {/* ── UPLOAD SECTION ── */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand">Upload your design</p>
              {(frontUrl || backUrl) && (
                <button type="button" onClick={clearAll}
                  className="text-[10px] font-bold text-red-500 hover:underline">
                  Clear all
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <UploadSlot
                label="Front"
                url={frontUrl}
                onUpload={handleUpload(setFrontUrl, setFrontErr)}
                onClear={() => setFrontUrl(null)}
                error={frontErr}
              />
              <UploadSlot
                label="Back"
                url={backUrl}
                onUpload={handleUpload(setBackUrl, setBackErr)}
                onClear={() => setBackUrl(null)}
                error={backErr}
              />
            </div>
            <p className="mt-2 text-[10px] text-zinc-400">
              Upload one or both sides. Toggle Front/Back on the preview to check placement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">or choose gallery design</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="search" placeholder="Search designs…" value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition" />
          </div>

          {/* Category chips */}
          <div className="scrollbar-thin flex gap-1 overflow-x-auto pb-1 lg:flex-wrap">
            {CATEGORY_TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setCat(t.id)}
                className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${cat === t.id ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>
                <span>{t.emoji}</span>{t.label}
              </button>
            ))}
          </div>

          {/* Design grid */}
          <div className="grid max-h-[min(70vh,720px)] grid-cols-2 gap-2 overflow-y-auto overscroll-contain pb-24 lg:pb-8">
            {filtered.map((d) => (
              <button key={d.id} type="button"
                onClick={() => { setSelectedDesignId(d.id); setFrontUrl(null); setBackUrl(null); }}
                className={`rounded-xl border-2 bg-white p-2 text-left shadow-sm transition ${
                  !frontUrl && !backUrl && selectedDesignId === d.id
                    ? "border-brand ring-2 ring-brand/25"
                    : "border-transparent hover:border-zinc-300"
                }`}>
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
                  className={`relative rounded-full px-4 py-1.5 text-xs font-bold capitalize transition ${side === s ? "bg-brand text-white" : "text-zinc-600 hover:text-brand"}`}>
                  {s}
                  {s === "back" && backUrl && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />
                  )}
                  {s === "front" && frontUrl && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />
                  )}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setZoom((z) => !z)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-bold hover:border-brand hover:text-brand transition">
              {zoom ? "Zoom out" : "Zoom in"}
            </button>
            <button type="button" onClick={clearAll}
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-black transition">
              Plain tee
            </button>
          </div>

          {/* T-shirt */}
          <div className="mt-6">
            <TeePreview
              colorHex={color.hex}
              designUrl={effectiveFrontUrl}
              backDesignUrl={effectiveBackUrl}
              side={side}
              zoom={zoom}
            />
          </div>

          {/* Back upload reminder */}
          {!backUrl && side === "back" && (
            <p className="mt-3 text-center text-xs text-zinc-400">
              No back design uploaded yet. Use the <span className="font-bold text-brand">Back</span> upload slot on the left.
            </p>
          )}

          {/* Size selector */}
          <div className="mx-auto mt-8 max-w-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-zinc-800">Size</h3>
              <button type="button" onClick={() => setShowSizeGuide(true)}
                className="text-xs font-bold text-brand hover:underline underline-offset-4">Size guide</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button key={s.id} type="button" onClick={() => setSize(s.id)}
                  title={`Chest ~${s.chestIn}" · Length ~${s.lengthIn}"`}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    size === s.id ? "border-brand bg-brand-muted text-brand-dark ring-2 ring-brand/30" : "border-zinc-200 hover:border-zinc-300"
                  }`}>{s.label}</button>
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
                    className={`rounded-xl border px-2 py-2.5 text-center text-[11px] font-bold leading-tight transition ${productType === k ? "border-brand bg-brand-muted text-brand-dark" : "border-zinc-200 hover:border-zinc-300"}`}>
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
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 transition ${colorId === c.id ? "ring-brand" : "ring-transparent"}`}
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

            {/* Price */}
            <div className="rounded-xl bg-zinc-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">T-shirt ({PRODUCT_TYPES[productType].label})</span>
                <span className="font-bold">₹{teeBase}</span>
              </div>
              {hasDesign ? (
                <div className="mt-1 flex justify-between">
                  <span className="text-zinc-600">Print</span>
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

      {/* Size guide modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog" aria-modal onClick={(e) => e.target === e.currentTarget && setShowSizeGuide(false)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-extrabold">Size guide (inches)</h2>
              <button type="button" className="rounded-lg bg-zinc-100 px-3 py-1 text-sm font-bold hover:bg-zinc-200"
                onClick={() => setShowSizeGuide(false)}>Close</button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Garment measurements ±1&Prime; tolerance.</p>
            <table className="mt-4 w-full text-xs">
              <thead>
                <tr className="bg-zinc-100 text-left font-bold uppercase text-zinc-600">
                  <th className="p-2">Size</th><th className="p-2">Chest</th><th className="p-2">Length</th>
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
