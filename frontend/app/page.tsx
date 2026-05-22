import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { DesignCard } from "@/components/DesignCard";
import { DESIGNS, CATEGORY_TABS } from "@/lib/designs";

const popular = DESIGNS.filter((d) => d.tag === "Popular").slice(0, 6);

const reviews = [
  { name: "Ananya S.", city: "Bangalore", rating: 5, text: "Loved the live preview — what I ordered is exactly what showed on screen. The cotton quality is excellent!" },
  { name: "Rohan K.", city: "Mysuru", rating: 5, text: "The Kannada graphic popped perfectly on the black tee. Premium feel, fast delivery — will order again." },
  { name: "Nikita P.", city: "Hubli", rating: 5, text: "Quick delivery in under 5 days. Already ordered a second tee for my brother. Highly recommended!" },
];

const stats = [
  { value: "2,000+", label: "Orders delivered" },
  { value: "50+", label: "Unique designs" },
  { value: "4.9★", label: "Average rating" },
  { value: "4–5", label: "Days delivery" },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-muted via-white to-white">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-16 h-72 w-72 rounded-full bg-brand/6 blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-12 sm:grid-cols-2 sm:px-6 lg:gap-20 lg:pt-16">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand/20 bg-brand-muted px-3 py-1 text-xs font-bold text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Wear Your Vibe · Made in Bengaluru
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              Design Your
              <br />
              <span className="text-brand">Perfect Tee</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-zinc-500">
              Pick a design, pick your colour, see it live on the tee — then order. We print and ship across Karnataka &amp; India in 4–5 days.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/customize"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark"
              >
                Start Designing
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M3 8h10M9 4l4 4-4 4"/>
                </svg>
              </Link>
              <Link
                href="/gallery"
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-4 text-base font-semibold text-zinc-700 shadow-sm hover:border-brand hover:text-brand transition"
              >
                Browse Gallery
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#2E7D32","#1565C0","#B71C1C","#F57F17"].map((c) => (
                  <div key={c} className="h-8 w-8 rounded-full border-2 border-white" style={{ backgroundColor: c }} />
                ))}
              </div>
              <p className="text-sm text-zinc-500">
                <span className="font-bold text-zinc-800">2,000+ customers</span> already wearing Gharsip
              </p>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="relative aspect-[9/10] w-full max-w-md rounded-[2.5rem] bg-gradient-to-br from-zinc-50 to-zinc-100 p-6 shadow-2xl ring-1 ring-black/5">
              <Image
                src="/hero-preview.svg"
                alt="Gharsip custom t-shirt preview"
                fill
                className="object-contain p-2"
                priority
              />
            </div>
            {/* Floating badges */}
            <div className="absolute -left-4 top-10 rounded-2xl bg-white px-4 py-2.5 shadow-lg ring-1 ring-black/5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Starting at</p>
              <p className="text-xl font-extrabold text-brand">₹149</p>
            </div>
            <div className="absolute -right-4 bottom-16 rounded-2xl bg-white px-4 py-2.5 shadow-lg ring-1 ring-black/5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Delivery in</p>
              <p className="text-xl font-extrabold text-zinc-900">4–5 days</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="border-y border-zinc-100 bg-zinc-900 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Simple process</p>
          <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">How it works</h2>
        </div>
        <div className="mx-auto mt-12 grid gap-6 sm:grid-cols-3">
          {[
            { num: "01", icon: "🎨", title: "Pick a design", desc: "Browse 50+ graphic designs across fitness, tech, Kannada culture, cricket & more." },
            { num: "02", icon: "👕", title: "Preview live", desc: "Switch t-shirt colours, toggle front/back view — your design updates instantly." },
            { num: "03", icon: "📦", title: "Delivered home", desc: "Secure checkout via UPI or card. We print and ship to your door in 4–5 days." },
          ].map((s) => (
            <div
              key={s.num}
              className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <span className="absolute right-4 top-4 font-extrabold text-zinc-100 text-5xl leading-none select-none">
                {s.num}
              </span>
              <div className="text-4xl">{s.icon}</div>
              <h3 className="mt-4 text-base font-extrabold text-zinc-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Popular designs ───────────────────────────────────────────────── */}
      <section className="border-y border-zinc-100 bg-zinc-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Top picks</p>
              <h2 className="mt-1 text-3xl font-extrabold text-zinc-900">Popular designs</h2>
              <p className="mt-1 text-sm text-zinc-500">Our best-selling prints this season.</p>
            </div>
            <Link href="/gallery" className="shrink-0 text-sm font-bold text-brand hover:underline underline-offset-4">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((d) => (
              <DesignCard key={d.id} design={d} compact />
            ))}
          </div>
        </div>
      </section>

      {/* ── Browse by category ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Collections</p>
          <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">Shop by category</h2>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_TABS.filter((c) => c.id !== "all").map((cat) => (
            <Link
              key={cat.id}
              href={`/gallery?cat=${cat.id}`}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-md"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-sm font-bold text-zinc-700 group-hover:text-brand transition-colors">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Reviews ───────────────────────────────────────────────────────── */}
      <section className="border-y border-zinc-100 bg-zinc-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Testimonials</p>
            <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">What customers say</h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-amber-400 text-lg">★★★★★</span>
              <span className="text-sm font-bold text-zinc-700">4.9 out of 5</span>
              <span className="text-sm text-zinc-400">· 2,000+ reviews</span>
            </div>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {reviews.map((r) => (
              <figure
                key={r.name}
                className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm"
              >
                <div className="flex text-amber-400">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <span key={i} style={{ fontSize: 14 }}>★</span>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">&ldquo;{r.text}&rdquo;</p>
                <figcaption className="mt-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
                    {r.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{r.name}</p>
                    <p className="text-xs text-zinc-400">{r.city}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────────── */}
      <section className="bg-brand py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to wear your vibe?
          </h2>
          <p className="mt-4 text-lg text-green-100">
            Join 2,000+ customers across India. Free shipping above ₹499.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/customize"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-brand shadow-lg hover:bg-green-50 transition"
            >
              Design Your Tee
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 8h10M9 4l4 4-4 4"/>
              </svg>
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-6 py-4 text-base font-semibold text-white hover:bg-white/10 transition"
            >
              Browse Designs
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
