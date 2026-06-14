"use client";

import { useState } from "react";
import Link from "next/link";
import { cycleSuffix, cycleWord } from "@/lib/billing";
import type { SubscriptionPlan } from "@/lib/types";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const CYCLE_TABS: { id: "monthly" | "weekly"; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "weekly", label: "Weekly" },
];

export function PlansGrid({ plans }: { plans: SubscriptionPlan[] }) {
  const [cycle, setCycle] = useState<"monthly" | "weekly">("monthly");
  const visiblePlans = plans.filter((p) => (p.billingCycle ?? "monthly") === cycle);

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {CYCLE_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setCycle(t.id)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              cycle === t.id
                ? "bg-brand text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visiblePlans.length === 0 && (
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
          No {cycle} plans available right now. Message us on WhatsApp to set up a custom subscription.
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePlans.map((plan) => (
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

            <p className="text-xs text-zinc-400">
              {plan.durationDays} meal-days / {cycleWord(plan.billingCycle)}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-brand">
              ₹{plan.priceMonthly.toLocaleString("en-IN")}
              <span className="text-sm font-semibold text-zinc-400"> {cycleSuffix(plan.billingCycle)}</span>
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
    </>
  );
}
