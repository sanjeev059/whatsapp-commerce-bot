import { ReadyProductCard } from "@/components/ReadyProductCard";
import { Footer } from "@/components/Footer";
import { READY_PRODUCTS } from "@/lib/products";
import Link from "next/link";

export const metadata = {
  title: "Shop — Gharsip Custom Prints",
  description: "Ready-to-order custom printed t-shirts. Pick your size and we print & ship in 4–5 days.",
};

export default function ShopPage() {
  return (
    <>
      {/* Header */}
      <section className="border-b border-zinc-100 bg-gradient-to-br from-brand-muted via-white to-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Ready to wear</p>
          <h1 className="mt-2 text-3xl font-extrabold text-zinc-900 sm:text-4xl">Shop Now</h1>
          <p className="mt-2 max-w-xl text-zinc-500">
            Pre-designed tees — pick your size and order instantly. We print &amp; ship in 4–5 days across India.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600">
              <span>✅</span> Premium 180 GSM cotton
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600">
              <span>🎨</span> Sharp DTF printing
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600">
              <span>📦</span> 4–5 day delivery
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600">
              <span>↩️</span> Easy 7-day returns
            </div>
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {READY_PRODUCTS.map((p) => (
            <ReadyProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* CTA — want something custom? */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-brand/15 bg-brand-muted p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Want something unique?</p>
          <h2 className="mt-2 text-2xl font-extrabold text-zinc-900">Design your own tee</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Choose any design, change the colour, preview it live — then order.
          </p>
          <Link
            href="/customize"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand px-8 py-3.5 text-sm font-extrabold text-white shadow-lg hover:bg-brand-dark transition"
          >
            Open live customiser →
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
