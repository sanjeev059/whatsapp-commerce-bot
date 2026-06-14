import { Footer } from "@/components/Footer";
import { getPlans } from "@/lib/gharsipApi";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { PlansGrid } from "./PlansGrid";

export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-brand-light py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
            📅 Weekly &amp; monthly meal subscriptions
          </span>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">
            Eat Well Every Day —<br />
            <span className="text-green-200">Subscribe &amp; Save</span>
          </h1>
          <p className="mt-4 text-lg text-green-100">
            Pick a plan based on your meals and goals. Fixed daily macros, delivered to your
            door, billed weekly or monthly.
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

        <PlansGrid plans={plans} />

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
