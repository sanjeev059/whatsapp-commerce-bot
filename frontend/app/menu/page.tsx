"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Footer } from "@/components/Footer";
import { getCombos, getMenuItems, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { Combo, MenuItem } from "@/lib/types";

const MEAL_TABS = [
  { id: "all", label: "All Meals" },
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch_dinner", label: "Lunch & Dinner" },
] as const;

const DIET_TABS = [
  { id: "all", label: "All" },
  { id: "veg", label: "Veg" },
  { id: "nonveg", label: "Non-Veg" },
] as const;

const ITEM_CATEGORIES: { id: string; label: string }[] = [
  { id: "breakfast", label: "Breakfast Items" },
  { id: "rice", label: "Rice" },
  { id: "roti", label: "Roti & Breads" },
  { id: "nonveg_curry", label: "Non-Veg Curries" },
  { id: "dairy", label: "Curd & Drinks" },
];

function MenuInner() {
  const sp = useSearchParams();
  const initialMeal = sp.get("meal");
  const [combos, setCombos] = useState<Combo[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [mealType, setMealType] = useState<(typeof MEAL_TABS)[number]["id"]>(
    MEAL_TABS.some((t) => t.id === initialMeal) ? (initialMeal as (typeof MEAL_TABS)[number]["id"]) : "all"
  );
  const [dietType, setDietType] = useState<(typeof DIET_TABS)[number]["id"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([getCombos(), getMenuItems()])
      .then(([c, i]) => {
        if (cancelled) return;
        setCombos(c);
        setItems(i);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "Failed to load menu");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCombos = combos.filter(
    (c) => (mealType === "all" || c.mealType === mealType) && (dietType === "all" || c.dietType === dietType)
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-brand-light py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
            🍱 Home-style meals, made fresh daily
          </span>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">
            Today&apos;s Menu &amp;<br />
            <span className="text-green-200">Combo Meals</span>
          </h1>
          <p className="mt-4 text-lg text-green-100">
            Order any combo for the day on WhatsApp — ₹70–₹200 per meal. Or save more with a
            monthly subscription plan.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href={buildWhatsAppLink("Hi Gharsip, I'd like to order a meal for today.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-brand shadow-lg hover:bg-green-50 transition"
            >
              Order on WhatsApp →
            </a>
            <Link
              href="/plans"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-6 py-4 text-base font-semibold text-white hover:bg-white/10 transition"
            >
              View Subscription Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Combos */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Combo meals</p>
          <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">Pick a Combo for Today</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Each combo lists energy, protein and carbs so you can plan your day.
          </p>
        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {MEAL_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setMealType(t.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                mealType === t.id
                  ? "bg-brand text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand"
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="mx-1 hidden h-6 w-px bg-zinc-200 sm:block" />
          {DIET_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setDietType(t.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                dietType === t.id
                  ? "bg-brand text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* States */}
        {loading && (
          <p className="mt-10 text-center text-sm text-zinc-400">Loading menu…</p>
        )}

        {!loading && !isGharsipApiEnabled() && (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
            Menu is being updated. Message us on WhatsApp for today&apos;s combos and prices.
          </div>
        )}

        {!loading && error && (
          <p className="mt-10 text-center text-sm font-semibold text-red-600">{error}</p>
        )}

        {!loading && !error && isGharsipApiEnabled() && visibleCombos.length === 0 && (
          <p className="mt-10 text-center text-sm text-zinc-400">No combos match these filters.</p>
        )}

        {/* Combo grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCombos.map((combo) => (
            <div
              key={combo.id}
              className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-extrabold text-zinc-900">{combo.name}</h3>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    combo.dietType === "nonveg"
                      ? "bg-red-50 text-red-600"
                      : "bg-brand-muted text-brand"
                  }`}
                >
                  {combo.dietType === "nonveg" ? "Non-Veg" : "Veg"}
                </span>
              </div>
              <ul className="mt-2 flex-1 space-y-1 text-sm text-zinc-600">
                {combo.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
                  {combo.energyKcal} kcal
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
                  {combo.proteinG}g protein
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
                  {combo.carbsG}g carbs
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xl font-extrabold text-brand">₹{combo.price}</span>
                <a
                  href={buildWhatsAppLink(
                    `Hi Gharsip, I'd like to order *${combo.name}* (₹${combo.price}) for today.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark transition"
                >
                  Order on WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Item-level macro reference */}
      {items.length > 0 && (
        <section className="border-t border-zinc-100 bg-zinc-50 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Macro reference</p>
              <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">Item-by-Item Nutrition</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Approximate values per serving — useful if you&apos;re tracking your daily intake.
              </p>
            </div>

            <div className="mt-8 space-y-8">
              {ITEM_CATEGORIES.map((cat) => {
                const catItems = items.filter((i) => i.category === cat.id);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-zinc-700">
                      {cat.label}
                    </h3>
                    <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-100 text-xs font-bold uppercase tracking-wide text-zinc-400">
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Serving</th>
                            <th className="px-4 py-3">Energy</th>
                            <th className="px-4 py-3">Protein</th>
                            <th className="px-4 py-3">Carbs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catItems.map((item) => (
                            <tr key={item.id} className="border-b border-zinc-50 last:border-0">
                              <td className="px-4 py-2.5 font-semibold text-zinc-800">{item.name}</td>
                              <td className="px-4 py-2.5 text-zinc-500">{item.servingDesc}</td>
                              <td className="px-4 py-2.5 text-zinc-600">{item.energyKcal} kcal</td>
                              <td className="px-4 py-2.5 text-zinc-600">{item.proteinG}g</td>
                              <td className="px-4 py-2.5 text-zinc-600">{item.carbsG}g</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-zinc-400">Loading…</div>}>
      <MenuInner />
    </Suspense>
  );
}
