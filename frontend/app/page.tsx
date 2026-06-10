import Link from "next/link";
import { Footer } from "@/components/Footer";
import { getCombos, getPlans, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const reviews = [
  { name: "Ananya S.", city: "Bangalore", rating: 5, text: "The lunch + dinner subscription has been a lifesaver. Food tastes home-made and the macros help me stay on track." },
  { name: "Rohan K.", city: "Mysuru", rating: 5, text: "Ordered the chicken curry meal on WhatsApp — quick reply, fresh food, delivered hot. Subscribed to the full-day plan now." },
  { name: "Priya M.", city: "Varthur", rating: 5, text: "Love that I can pick individual items and combos on the menu page, add them to my order and send everything on WhatsApp in one go. So convenient!" },
  { name: "Nikita P.", city: "Hubli", rating: 5, text: "The Fitness/High-Protein plan fits perfectly with my gym routine. Portion sizes and protein numbers are spot on." },
];

const stats = [
  { value: "150+", label: "Meals delivered daily" },
  { value: "7",    label: "Subscription plans"   },
  { value: "4.9★", label: "Average rating"        },
  { value: "₹70+", label: "Starting per meal"     },
];

export default async function HomePage() {
  const [combos, plans] = isGharsipApiEnabled()
    ? await Promise.all([getCombos(), getPlans()])
    : [[], []];

  const featuredCombos = combos.slice(0, 3);
  const featuredPlans = plans.slice(0, 3);

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-muted via-white to-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-16 h-72 w-72 rounded-full bg-brand/6 blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-12 sm:grid-cols-2 sm:px-6 lg:gap-20 lg:pt-16">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand/20 bg-brand-muted px-3 py-1 text-xs font-bold text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Home-Style Meals · Made in Bengaluru
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              Fresh Home-Cooked Meals.
              <br />
              <span className="text-brand">Every Single Day.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-zinc-500">
              Order today&apos;s meal on WhatsApp, or subscribe to a monthly plan with daily
              protein, carbs &amp; energy targets — delivered straight to your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={buildWhatsAppLink("Hi Gharsip, I'd like to order a meal for today.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark"
              >
                Order on WhatsApp
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </a>
              <Link
                href="/plans"
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-4 text-base font-semibold text-zinc-700 shadow-sm hover:border-brand hover:text-brand transition"
              >
                View Subscription Plans
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#2E7D32","#1565C0","#B71C1C","#F57F17"].map((c) => (
                  <div key={c} className="h-8 w-8 rounded-full border-2 border-white" style={{ backgroundColor: c }} />
                ))}
              </div>
              <p className="text-sm text-zinc-500">
                <span className="font-bold text-zinc-800">150+ meals</span> delivered every day
              </p>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="relative flex aspect-[9/10] w-full max-w-md flex-col items-center justify-center gap-6 rounded-[2.5rem] bg-gradient-to-br from-zinc-50 to-zinc-100 p-8 shadow-2xl ring-1 ring-black/5">
              <span className="text-7xl">🍱</span>
              <div className="grid w-full grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-lg font-extrabold text-brand">600</p>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">kcal</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-lg font-extrabold text-brand">28g</p>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">protein</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-lg font-extrabold text-brand">60g</p>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">carbs</p>
                </div>
              </div>
            </div>
            <div className="absolute -left-4 top-10 rounded-2xl bg-white px-4 py-2.5 shadow-lg ring-1 ring-black/5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Starting at</p>
              <p className="text-xl font-extrabold text-brand">₹70</p>
            </div>
            <div className="absolute -right-4 bottom-16 rounded-2xl bg-white px-4 py-2.5 shadow-lg ring-1 ring-black/5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Delivery</p>
              <p className="text-xl font-extrabold text-zinc-900">Daily, fresh</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Service cards ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">What we offer</p>
          <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">Two ways to eat well</h2>
        </div>
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {[
            {
              icon: "🍛",
              title: "Daily Meals",
              desc: "Browse today's combo meals and individual items — breakfast, lunch and dinner — with macros for each. Add to your order and checkout on WhatsApp.",
              cta: "View Menu",
              href: "/menu",
              badge: "₹15–₹200 per item",
            },
            {
              icon: "📅",
              title: "Subscription Plans",
              desc: "Monthly plans for breakfast, lunch, dinner or all three — with daily protein, carb and energy targets. Save vs ordering daily.",
              cta: "View Plans",
              href: "/plans",
              badge: "Pause anytime",
              featured: true,
            },
          ].map((s) => (
            <div
              key={s.title}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition hover:shadow-md ${
                s.featured
                  ? "border-brand/30 bg-brand-muted"
                  : "border-zinc-200 bg-white"
              }`}
            >
              {s.featured && (
                <span className="absolute right-4 top-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Best Value
                </span>
              )}
              <span className="text-4xl">{s.icon}</span>
              <h3 className="mt-4 text-lg font-extrabold text-zinc-900">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">{s.desc}</p>
              <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-brand/20 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-brand">
                ✓ {s.badge}
              </span>
              <Link
                href={s.href}
                className={`mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                  s.featured
                    ? "bg-brand text-white hover:bg-brand-dark"
                    : "border border-zinc-200 text-zinc-700 hover:border-brand hover:text-brand"
                }`}
              >
                {s.cta} →
              </Link>
            </div>
          ))}
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

      {/* ── Today's combos ───────────────────────────────────────────────── */}
      {featuredCombos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Order today</p>
              <h2 className="mt-1 text-3xl font-extrabold text-zinc-900">Popular Combo Meals</h2>
              <p className="mt-1 text-sm text-zinc-500">Pick a combo and order on WhatsApp.</p>
            </div>
            <Link href="/menu" className="shrink-0 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 hover:border-brand hover:text-brand transition">
              View full menu →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {featuredCombos.map((combo) => (
              <div key={combo.id} className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-extrabold text-zinc-900">{combo.name}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      combo.dietType === "nonveg" ? "bg-red-50 text-red-600" : "bg-brand-muted text-brand"
                    }`}
                  >
                    {combo.dietType === "nonveg" ? "Non-Veg" : "Veg"}
                  </span>
                </div>
                <p className="mt-2 flex-1 text-sm text-zinc-500">{combo.items.join(", ")}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-extrabold text-brand">₹{combo.price}</span>
                  <a
                    href={buildWhatsAppLink(`Hi Gharsip, I'd like to order *${combo.name}* (₹${combo.price}) for today.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark transition"
                  >
                    Order
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="border-y border-zinc-100 bg-zinc-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Simple process</p>
            <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">How it works</h2>
          </div>
          <div className="mx-auto mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { num: "01", icon: "🍽️", title: "Pick a meal or plan", desc: "Browse today's combos or choose a monthly subscription that fits your macros." },
              { num: "02", icon: "💬", title: "Order on WhatsApp", desc: "Message us your combo or fill the subscription form — we confirm your order and delivery slot." },
              { num: "03", icon: "🚚", title: "Delivered fresh", desc: "Hot, home-style meals delivered daily to your door. Pause or change anytime." },
            ].map((s) => (
              <div key={s.num} className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <span className="absolute right-4 top-4 font-extrabold text-zinc-100 text-5xl leading-none select-none">{s.num}</span>
                <div className="text-4xl">{s.icon}</div>
                <h3 className="mt-4 text-base font-extrabold text-zinc-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular plans ─────────────────────────────────────────────────── */}
      {featuredPlans.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Subscribe &amp; save</p>
              <h2 className="mt-1 text-3xl font-extrabold text-zinc-900">Popular Plans</h2>
              <p className="mt-1 text-sm text-zinc-500">Daily macro targets, billed monthly.</p>
            </div>
            <Link href="/plans" className="shrink-0 text-sm font-bold text-brand hover:underline underline-offset-4">
              View all plans →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPlans.map((plan) => (
              <div key={plan.id} className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                <h3 className="text-base font-extrabold text-zinc-900">{plan.name}</h3>
                <p className="mt-1.5 text-sm text-zinc-500">{plan.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">{plan.dailyMacros.energyKcal} kcal/day</span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">{plan.dailyMacros.proteinG}g protein</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-extrabold text-brand">₹{plan.priceMonthly.toLocaleString("en-IN")}/mo</span>
                  <Link href={`/subscribe/${plan.id}`} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark transition">
                    Subscribe
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Reviews ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Testimonials</p>
          <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">What customers say</h2>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-amber-400 text-lg">★★★★★</span>
            <span className="text-sm font-bold text-zinc-700">4.9 out of 5</span>
          </div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {reviews.map((r) => (
            <figure key={r.name} className="rounded-2xl border border-brand/10 bg-white p-6 shadow-sm">
              <div className="flex text-amber-400">
                {Array.from({ length: r.rating }).map((_, i) => <span key={i} style={{ fontSize: 14 }}>★</span>)}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">&ldquo;{r.text}&rdquo;</p>
              <figcaption className="mt-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">{r.name[0]}</div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">{r.name}</p>
                  <p className="text-xs text-zinc-400">{r.city}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────────── */}
      <section className="bg-brand py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Ready for fresh meals every day?</h2>
          <p className="mt-4 text-lg text-green-100">Order today&apos;s meal on WhatsApp, or subscribe to a monthly plan.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href={buildWhatsAppLink("Hi Gharsip, I'd like to order a meal for today.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-brand shadow-lg hover:bg-green-50 transition"
            >
              Order on WhatsApp →
            </a>
            <Link href="/plans" className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-6 py-4 text-base font-semibold text-white hover:bg-white/10 transition">
              View Subscription Plans
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
