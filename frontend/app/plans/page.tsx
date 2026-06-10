import Link from "next/link";
import { Footer } from "@/components/Footer";
import { getPlans, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export default async function PlansPage() {
  const plans = isGharsipApiEnabled() ? await getPlans() : [];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-brand-light py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
            📅 Monthly meal subscriptions
          </span>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">
            Eat Well Every Day —<br />
            <span className="text-green-200">Subscribe &amp; Save</span>
          </h1>
          <p className="mt-4 text-lg text-green-100">
            Pick a plan based on your meals and goals. Fixed daily macros, delivered to your
            door, billed monthly.
          </p>
        </div>
      </section>

      {/* Plans grid */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Subscription plans</p>
          <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">Choose Your Plan</h2>
          <p className="mt-1 text-sm text-zinc-500">
            All plans include free home delivery. Pause or cancel anytime.
          </p>
        </div>

        {plans.length === 0 && (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
            Plans are being updated. Message us on WhatsApp to set up a custom subscription.
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"
            >
              <span
                className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  plan.dietType === "nonveg" ? "bg-red-50 text-red-600" : "bg-brand-muted text-brand"
                }`}
              >
                {plan.dietType === "nonveg" ? "Non-Veg" : "Veg"}
              </span>
              <h3 className="mt-3 text-lg font-extrabold text-zinc-900">{plan.name}</h3>
              <p className="mt-1.5 text-sm text-zinc-500">{plan.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {plan.mealTypes.map((m) => (
                  <span key={m} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-600">
                    {MEAL_LABELS[m] ?? m}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-zinc-50 py-2">
                  <p className="text-sm font-extrabold text-zinc-900">{plan.dailyMacros.energyKcal}</p>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">kcal/day</p>
                </div>
                <div className="rounded-xl bg-zinc-50 py-2">
                  <p className="text-sm font-extrabold text-zinc-900">{plan.dailyMacros.proteinG}g</p>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">protein</p>
                </div>
                <div className="rounded-xl bg-zinc-50 py-2">
                  <p className="text-sm font-extrabold text-zinc-900">{plan.dailyMacros.carbsG}g</p>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">carbs</p>
                </div>
              </div>

              <div className="mt-5 flex-1" />

              <p className="text-xs text-zinc-400">{plan.durationDays} meal-days / month</p>
              <p className="mt-1 text-2xl font-extrabold text-brand">
                ₹{plan.priceMonthly.toLocaleString("en-IN")}
                <span className="text-sm font-semibold text-zinc-400"> /month</span>
              </p>

              <Link
                href={`/subscribe/${plan.id}`}
                className="mt-4 block rounded-xl bg-brand px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-dark transition"
              >
                Subscribe Now
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-zinc-500">Not sure which plan fits you?</p>
          <a
            href={buildWhatsAppLink("Hi Gharsip, I'd like help choosing a meal subscription plan.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-2xl border-2 border-brand px-6 py-3 text-sm font-bold text-brand hover:bg-brand-muted transition"
          >
            Ask us on WhatsApp
          </a>
        </div>
      </section>

      <Footer />
    </>
  );
}
