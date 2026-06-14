"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Footer } from "@/components/Footer";
import { createOrder, getCombos, getMenuItems, isGharsipApiEnabled } from "@/lib/gharsipApi";
import { getCurrentLocationUrl } from "@/lib/geolocation";
import { MEAL_TIME_SLOTS, MEAL_TYPE_LABELS } from "@/lib/timeSlots";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { Combo, MenuItem } from "@/lib/types";

type MealSlotType = keyof typeof MEAL_TIME_SLOTS;

const MEAL_SLOT_TYPES = Object.keys(MEAL_TIME_SLOTS) as MealSlotType[];

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

type CartKind = "combo" | "item";

type CartLine = {
  kind: CartKind;
  id: string;
  name: string;
  price: number;
  qty: number;
};

type CartState = Record<string, CartLine>;

function cartKey(kind: CartKind, id: string): string {
  return `${kind}:${id}`;
}

function QtyStepper({
  qty,
  onDecrease,
  onIncrease,
  size = "md",
}: {
  qty: number;
  onDecrease: () => void;
  onIncrease: () => void;
  size?: "sm" | "md";
}) {
  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={onIncrease}
        className={`rounded-xl border-2 border-brand font-extrabold text-brand transition hover:bg-brand-muted ${
          size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
        }`}
      >
        ADD +
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-brand bg-brand text-white">
      <button
        type="button"
        onClick={onDecrease}
        aria-label="Decrease quantity"
        className={`flex items-center justify-center font-extrabold ${size === "sm" ? "h-7 w-7 text-base" : "h-9 w-9 text-lg"}`}
      >
        −
      </button>
      <span className={`font-extrabold ${size === "sm" ? "text-xs" : "text-sm"}`}>{qty}</span>
      <button
        type="button"
        onClick={onIncrease}
        aria-label="Increase quantity"
        className={`flex items-center justify-center font-extrabold ${size === "sm" ? "h-7 w-7 text-base" : "h-9 w-9 text-lg"}`}
      >
        +
      </button>
    </div>
  );
}

function MenuInner() {
  const sp = useSearchParams();
  const initialMeal = sp.get("meal");
  const initialApartment = sp.get("apartment")?.trim() ?? "";
  const [combos, setCombos] = useState<Combo[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [mealType, setMealType] = useState<(typeof MEAL_TABS)[number]["id"]>(
    MEAL_TABS.some((t) => t.id === initialMeal) ? (initialMeal as (typeof MEAL_TABS)[number]["id"]) : "all"
  );
  const [dietType, setDietType] = useState<(typeof DIET_TABS)[number]["id"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartState>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    phone: "",
    apartment: initialApartment,
    address1: "",
    city: "",
  });
  const [deliveryMealType, setDeliveryMealType] = useState<MealSlotType>("lunch");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [locationUrl, setLocationUrl] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [locationError, setLocationError] = useState("");

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

  const getQty = (kind: CartKind, id: string): number => cart[cartKey(kind, id)]?.qty ?? 0;

  const setQty = (kind: CartKind, id: string, name: string, price: number, qty: number) => {
    setCart((prev) => {
      const key = cartKey(kind, id);
      if (qty <= 0) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { kind, id, name, price, qty } };
    });
  };

  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const cartCount = cartLines.reduce((sum, l) => sum + l.qty, 0);
  const cartTotal = cartLines.reduce((sum, l) => sum + l.qty * l.price, 0);

  const orderMessage = useMemo(() => {
    if (cartLines.length === 0) return "";
    const combosLines = cartLines.filter((l) => l.kind === "combo");
    const itemLines = cartLines.filter((l) => l.kind === "item");
    const sections: string[] = [];
    if (combosLines.length > 0) {
      sections.push(
        "*Combos:*\n" + combosLines.map((l) => `• ${l.name} x${l.qty} — ₹${l.price * l.qty}`).join("\n")
      );
    }
    if (itemLines.length > 0) {
      sections.push(
        "*Items:*\n" + itemLines.map((l) => `• ${l.name} x${l.qty} — ₹${l.price * l.qty}`).join("\n")
      );
    }
    return (
      `Hi Gharsip, I'd like to place an order:\n\n` +
      sections.join("\n\n") +
      `\n\n*Total: ₹${cartTotal}*\n\nPlease confirm availability and delivery time. Thank you!`
    );
  }, [cartLines, cartTotal]);

  const setCheckoutField = (k: keyof typeof checkoutForm, v: string) =>
    setCheckoutForm((f) => ({ ...f, [k]: v }));

  const shareLocation = async () => {
    setLocationStatus("loading");
    setLocationError("");
    try {
      const url = await getCurrentLocationUrl();
      setLocationUrl(url);
      setLocationStatus("done");
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : "Couldn't get your location.");
      setLocationStatus("error");
    }
  };

  const placeOrder = async () => {
    if (!checkoutForm.name.trim() || !checkoutForm.phone.trim()) {
      setCheckoutError("Please enter your name and phone number");
      return;
    }
    if (checkoutForm.phone.replace(/\D/g, "").length < 10) {
      setCheckoutError("Enter a valid 10-digit phone number");
      return;
    }
    if (!checkoutForm.apartment.trim() || !checkoutForm.address1.trim() || !checkoutForm.city.trim()) {
      setCheckoutError("Please fill in your apartment/society and address");
      return;
    }
    if (!deliveryTimeSlot) {
      setCheckoutError("Please choose a delivery time slot");
      return;
    }

    setCheckoutError("");
    setPlacingOrder(true);
    try {
      const customer = { ...checkoutForm, locationUrl: locationUrl || undefined };
      let orderId: string | undefined;
      if (isGharsipApiEnabled()) {
        const res = await createOrder({
          customer,
          items: cartLines,
          mealType: deliveryMealType,
          timeSlot: deliveryTimeSlot,
        });
        orderId = res.id;
      }

      const detailLines = [
        orderId ? `Order ref: ${orderId}` : null,
        `Name: ${checkoutForm.name}`,
        `Phone: ${checkoutForm.phone}`,
        `Apartment/Society: ${checkoutForm.apartment}`,
        `Address: ${checkoutForm.address1}, ${checkoutForm.city}`,
        `${MEAL_TYPE_LABELS[deliveryMealType]} delivery slot: ${deliveryTimeSlot}`,
        locationUrl ? `Location: ${locationUrl}` : null,
      ].filter((l): l is string => Boolean(l));

      const message = `${orderMessage}\n\n*Delivery details:*\n${detailLines.join("\n")}`;
      window.open(buildWhatsAppLink(message), "_blank", "noopener,noreferrer");
      setCheckoutOpen(false);
      setCart({});
      setLocationUrl("");
      setLocationStatus("idle");
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Something went wrong, please try again");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-brand-light py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
            🍱 Home-style meals, made fresh daily
          </span>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">
            Build Your Order —<br />
            <span className="text-green-200">Combos &amp; À La Carte</span>
          </h1>
          <p className="mt-4 text-lg text-green-100">
            Add combos or individual items with the + button, then checkout — your order
            opens on WhatsApp ready to send.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href={buildWhatsAppLink("Hi Gharsip, I'd like to order a meal for today.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-brand shadow-lg hover:bg-green-50 transition"
            >
              Chat on WhatsApp →
            </a>
            <Link
              href="/plans"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-6 py-4 text-base font-semibold text-white hover:bg-white/10 transition"
            >
              Lunch &amp; Dinner Subscription Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Combos */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Box meals</p>
          <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">Pick Your Gharsip Box</h2>
          <p className="mt-1 text-sm text-zinc-500">
            One box, fully packed — rice/roti, curry &amp; sides together, just like your
            favourite Box8 / NH1 meal boxes. Energy, protein and carbs listed so you can plan your day.
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

        {!loading && error && (
          <p className="mt-10 text-center text-sm font-semibold text-red-600">{error}</p>
        )}

        {!loading && !error && visibleCombos.length === 0 && (
          <p className="mt-10 text-center text-sm text-zinc-400">No combos match these filters.</p>
        )}

        {/* Combo grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCombos.map((combo) => {
            const qty = getQty("combo", combo.id);
            return (
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
                <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                  🍱 Gharsip Box
                </span>
                <div className="mt-2.5 flex-1 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 p-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {combo.items.map((item, i) => {
                      const isLastOdd = i === combo.items.length - 1 && combo.items.length % 2 === 1;
                      return (
                        <div
                          key={item}
                          className={`flex items-center justify-center rounded-lg border border-zinc-100 bg-white px-2 py-2 text-center text-xs font-semibold leading-tight text-zinc-700 ${
                            isLastOdd ? "col-span-2" : ""
                          }`}
                        >
                          {item}
                        </div>
                      );
                    })}
                  </div>
                </div>
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
                  <QtyStepper
                    qty={qty}
                    onIncrease={() => setQty("combo", combo.id, combo.name, combo.price, qty + 1)}
                    onDecrease={() => setQty("combo", combo.id, combo.name, combo.price, qty - 1)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Individual items */}
      {items.length > 0 && (
        <section className="border-t border-zinc-100 bg-zinc-50 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">À la carte</p>
              <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">Order Items Individually</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Mix and match — add exactly what you want with the + button.
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
                    <div className="mt-3 divide-y divide-zinc-50 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                      {catItems.map((item) => {
                        const qty = getQty("item", item.id);
                        return (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-800">{item.name}</p>
                              <p className="mt-0.5 text-xs text-zinc-400">
                                {item.servingDesc} · {item.energyKcal} kcal · {item.proteinG}g protein ·{" "}
                                {item.carbsG}g carbs
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-extrabold text-brand">₹{item.price}</span>
                              <QtyStepper
                                size="sm"
                                qty={qty}
                                onIncrease={() => setQty("item", item.id, item.name, item.price, qty + 1)}
                                onDecrease={() => setQty("item", item.id, item.name, item.price, qty - 1)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-zinc-900">
                {cartCount} item{cartCount > 1 ? "s" : ""} · ₹{cartTotal}
              </p>
              <button
                type="button"
                onClick={() => setCart({})}
                className="text-xs font-semibold text-zinc-400 hover:text-red-500"
              >
                Clear cart
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-brand-dark transition"
            >
              Checkout →
            </button>
          </div>
        </div>
      )}

      {/* Bottom padding so cart bar doesn't overlap content */}
      {cartCount > 0 && <div className="h-20" />}

      {/* Delivery details modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 py-6 sm:items-center">
          <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-extrabold text-zinc-900">Delivery details</h2>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                aria-label="Close"
                className="text-2xl leading-none text-zinc-400 hover:text-zinc-600"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {cartCount} item{cartCount > 1 ? "s" : ""} · ₹{cartTotal}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Full Name *</label>
                <input
                  className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
                  value={checkoutForm.name}
                  onChange={(e) => setCheckoutField("name", e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Phone Number *</label>
                <input
                  className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
                  value={checkoutForm.phone}
                  onChange={(e) => setCheckoutField("phone", e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Apartment / Society *</label>
                <input
                  className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
                  value={checkoutForm.apartment}
                  onChange={(e) => setCheckoutField("apartment", e.target.value)}
                  placeholder="e.g. Purva Westend"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Flat / Block *</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
                    value={checkoutForm.address1}
                    onChange={(e) => setCheckoutField("address1", e.target.value)}
                    placeholder="Flat no., block, tower"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Area / City *</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
                    value={checkoutForm.city}
                    onChange={(e) => setCheckoutField("city", e.target.value)}
                    placeholder="Area, city"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">When should we deliver? *</label>
                <div className="flex gap-2">
                  {MEAL_SLOT_TYPES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setDeliveryMealType(m);
                        setDeliveryTimeSlot("");
                      }}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        deliveryMealType === m
                          ? "border-brand bg-brand text-white"
                          : "border-zinc-300 text-zinc-700 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {MEAL_TYPE_LABELS[m] ?? m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Time slot *</label>
                <div className="flex flex-wrap gap-2">
                  {MEAL_TIME_SLOTS[deliveryMealType].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setDeliveryTimeSlot(slot)}
                      className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        deliveryTimeSlot === slot
                          ? "border-brand bg-brand text-white"
                          : "border-zinc-300 text-zinc-700 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">
                  Share your location (optional)
                </label>
                {locationStatus === "done" ? (
                  <p className="rounded-xl bg-brand-muted px-4 py-2.5 text-xs font-semibold text-brand">
                    📍 Location shared — this helps our delivery partner find you faster.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void shareLocation()}
                    disabled={locationStatus === "loading"}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:border-brand hover:text-brand disabled:opacity-50"
                  >
                    {locationStatus === "loading" ? "Getting location…" : "📍 Share my current location"}
                  </button>
                )}
                {locationStatus === "error" && (
                  <p className="mt-1.5 text-xs text-amber-700">{locationError}</p>
                )}
              </div>

              {checkoutError && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                  {checkoutError}
                </p>
              )}

              <button
                type="button"
                onClick={() => void placeOrder()}
                disabled={placingOrder}
                className="w-full rounded-xl bg-brand py-3 text-sm font-extrabold text-white disabled:opacity-50 hover:bg-brand-dark transition"
              >
                {placingOrder ? "Placing order…" : "Checkout on WhatsApp →"}
              </button>
            </div>
          </div>
        </div>
      )}
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
