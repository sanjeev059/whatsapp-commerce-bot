import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { DesignCard } from "@/components/DesignCard";
import { DESIGNS } from "@/lib/designs";

const popular = [...DESIGNS].slice(0, 6);

const reviews = [
  {
    name: "Ananya · Bangalore",
    text: "Loved the live preview — what I ordered is exactly what showed on screen.",
  },
  {
    name: "Rohan · Mysuru",
    text: "Cotton feels premium and the Kannada graphic popped perfectly.",
  },
  {
    name: "Nikita · Hubli",
    text: "Quick delivery under 5 days. Already ordered a second tee.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-muted to-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-10 sm:grid-cols-2 sm:px-6 lg:gap-16 lg:pt-14">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand">
              Wear Your Vibe
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              Design Your Perfect Tee
            </h1>
            <p className="mt-4 max-w-xl text-lg text-zinc-600">
              Pick a design. Pick a colour. See it live. Order your size — we print and ship across
              Karnataka &amp; India.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/customize"
                className="inline-flex rounded-2xl bg-brand px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
              >
                Start Designing
              </Link>
              <Link
                href="/gallery"
                className="inline-flex rounded-2xl border border-zinc-300 bg-white px-6 py-4 text-base font-semibold text-zinc-800 hover:border-brand hover:text-brand"
              >
                Browse gallery
              </Link>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="relative aspect-square w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-black/5">
              <Image
                src="/hero-preview.svg"
                alt="T-shirt preview mock"
                fill
                className="object-contain p-4"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold text-zinc-900">How it works</h2>
        <div className="mx-auto mt-10 grid gap-8 sm:grid-cols-3">
          {[
            { icon: "\u{1F3A8}", t: "Pick design", d: "Search categories or scroll the gallery." },
            { icon: "\u{1F455}", t: "Preview live", d: "Switch colours instantly on the tee mockup." },
            { icon: "\u{1F4E6}", t: "Delivered home", d: "Secure pay — print dispatched in days." },
          ].map((s) => (
            <div
              key={s.t}
              className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm"
            >
              <div className="text-4xl">{s.icon}</div>
              <h3 className="mt-3 font-bold">{s.t}</h3>
              <p className="mt-2 text-sm text-zinc-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-zinc-900">Popular designs</h2>
              <p className="text-sm text-zinc-600">Trending picks this week.</p>
            </div>
            <Link href="/gallery" className="text-sm font-bold text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((d) => (
              <DesignCard key={d.id} design={d} compact />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold">Customer reviews</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <figure
              key={r.name}
              className="rounded-2xl border border-brand/15 bg-brand-muted/60 p-6 text-sm shadow-sm"
            >
              <p className="text-zinc-700">&ldquo;{r.text}&rdquo;</p>
              <figcaption className="mt-4 font-bold text-brand-dark">{r.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
