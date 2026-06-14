"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/Footer";
import { cycleSuffix } from "@/lib/billing";
import { createSubscription, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { MEAL_TIME_SLOTS, MEAL_TYPE_LABELS } from "@/lib/timeSlots";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { SubscriptionPlan } from "@/lib/types";

const MEAL_LABELS = MEAL_TYPE_LABELS;

type FormState = {
  name: string;
  phone: string;
  email: string;
  apartment: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
  startDate: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  phone: "",
  email: "",
  apartment: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  pincode: "",
  startDate: "",
  notes: "",
};

export function SubscribeForm({
  planId,
  plan,
  apartment,
}: {
  planId: string;
  plan: SubscriptionPlan | null;
  apartment?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_FORM,
    apartment: apartment?.trim() || "",
  }));
  const [mealTimeSlots, setMealTimeSlots] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setSlot = (mealType: string, slot: string) =>
    setMealTimeSlots((s) => ({ ...s, [mealType]: slot }));

  const today = new Date().toISOString().split("T")[0];

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setError("Please fill in your name, phone and email");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    if (!form.apartment.trim()) {
      setError("Please tell us your apartment / society name");
      return;
    }
    if (!form.address1.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      setError("Please fill in your delivery address");
      return;
    }
    if (!form.startDate) {
      setError("Please choose a start date");
      return;
    }
    if (plan && plan.mealTypes.some((m) => !mealTimeSlots[m])) {
      setError("Please choose a delivery time slot for each meal");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await createSubscription({
        planId,
        customer: {
          name: form.name,
          phone: form.phone,
          email: form.email,
          apartment: form.apartment,
          address1: form.address1,
          address2: form.address2 || undefined,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
        startDate: form.startDate,
        notes: form.notes || undefined,
        mealTimeSlots,
      });
      router.push(
        `/subscription-confirmed?id=${encodeURIComponent(res.id)}&phone=${encodeURIComponent(form.phone)}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong, please try again");
    } finally {
      setLoading(false);
    }
  };

  if (!plan) {
    return (
      <>
        <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-2xl font-extrabold text-zinc-900">Subscriptions are being set up</h1>
          <p className="mt-3 text-sm text-zinc-500">
            Message us on WhatsApp and we&apos;ll set up your meal subscription manually.
          </p>
          <a
            href={buildWhatsAppLink("Hi Gharsip, I'd like to subscribe to a meal plan.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-brand-dark transition"
          >
            Order on WhatsApp →
          </a>
        </section>
        <Footer />
      </>
    );
  }

  if (!isGharsipApiEnabled()) {
    return (
      <>
        <section className="bg-gradient-to-br from-brand-dark via-brand to-brand-light py-12 text-white">
          <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-green-100">Subscribe</p>
            <h1 className="mt-2 text-3xl font-extrabold">{plan.name}</h1>
            <p className="mt-2 text-sm text-green-100">{plan.description}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {plan.mealTypes.map((m) => (
                <span key={m} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
                  {MEAL_LABELS[m] ?? m}
                </span>
              ))}
            </div>
            <p className="mt-4 text-2xl font-extrabold">
              ₹{plan.priceMonthly.toLocaleString("en-IN")}
              <span className="text-sm font-semibold text-green-100"> {cycleSuffix(plan.billingCycle)}</span>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-xl px-4 py-12 text-center sm:px-6">
          <p className="text-sm text-zinc-500">
            Message us on WhatsApp with your details and we&apos;ll set up this subscription for you.
          </p>
          <a
            href={buildWhatsAppLink(
              `Hi Gharsip, I'd like to subscribe to the *${plan.name}* plan (₹${plan.priceMonthly.toLocaleString("en-IN")}${cycleSuffix(plan.billingCycle)}).`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-brand-dark transition"
          >
            Subscribe via WhatsApp →
          </a>
          <Link href="/plans" className="mt-4 block text-center text-xs text-brand underline underline-offset-2">
            ← Back to plans
          </Link>
        </section>

        <Footer />
      </>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-br from-brand-dark via-brand to-brand-light py-12 text-white">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-green-100">Subscribe</p>
          <h1 className="mt-2 text-3xl font-extrabold">{plan.name}</h1>
          <p className="mt-2 text-sm text-green-100">{plan.description}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {plan.mealTypes.map((m) => (
              <span key={m} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
                {MEAL_LABELS[m] ?? m}
              </span>
            ))}
          </div>
          <p className="mt-4 text-2xl font-extrabold">
            ₹{plan.priceMonthly.toLocaleString("en-IN")}
            <span className="text-sm font-semibold text-green-100"> {cycleSuffix(plan.billingCycle)}</span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-md sm:p-8">
          <h2 className="text-base font-bold text-zinc-900">Your Details</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Full Name *</label>
              <input
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Phone Number *</label>
                <input
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Email *</label>
                <input
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Apartment / Society Name *</label>
              <input
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                value={form.apartment}
                onChange={(e) => set("apartment", e.target.value)}
                placeholder="e.g. Purva Westend"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Helps our delivery rider group drops to your building.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Address Line 1 *</label>
              <input
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                value={form.address1}
                onChange={(e) => set("address1", e.target.value)}
                placeholder="Flat no., building, street"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Address Line 2</label>
              <input
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                value={form.address2}
                onChange={(e) => set("address2", e.target.value)}
                placeholder="Landmark, area (optional)"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">City *</label>
                <input
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">State *</label>
                <input
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Pincode *</label>
                <input
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                  value={form.pincode}
                  onChange={(e) => set("pincode", e.target.value)}
                  placeholder="560000"
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
            </div>

            {plan.mealTypes.map((mealType) => {
              const options = MEAL_TIME_SLOTS[mealType as keyof typeof MEAL_TIME_SLOTS] ?? [];
              if (options.length === 0) return null;
              return (
                <div key={mealType}>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">
                    {MEAL_LABELS[mealType] ?? mealType} delivery time *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {options.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSlot(mealType, slot)}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                          mealTimeSlots[mealType] === slot
                            ? "border-brand bg-brand text-white"
                            : "border-zinc-300 text-zinc-700 hover:border-brand hover:text-brand"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Start Date *</label>
              <input
                type="date"
                min={today}
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Notes (optional)</label>
              <textarea
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Allergies, spice preference, gate code, etc."
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>
            )}

            <button
              onClick={() => void submit()}
              disabled={loading}
              className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-brand-dark transition"
            >
              {loading ? "Submitting…" : "Confirm Subscription"}
            </button>
            <p className="text-center text-xs text-zinc-400">
              Payment is collected on delivery / via UPI — our team will confirm with you on WhatsApp.
            </p>
            <Link href="/plans" className="block text-center text-xs text-brand underline underline-offset-2">
              ← Back to plans
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
