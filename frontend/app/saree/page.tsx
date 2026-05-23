"use client";

import { useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";

// ─── Service data ─────────────────────────────────────────────────────────────

const SERVICE_TABS = [
  { id: "pico",    label: "Pico Work",      emoji: "🪡" },
  { id: "fall",    label: "Fall Work",       emoji: "🧵" },
  { id: "designs", label: "Saree Designs",  emoji: "🎨" },
  { id: "blouse",  label: "Blouse Services", emoji: "✂️" },
] as const;
type TabId = (typeof SERVICE_TABS)[number]["id"];

const SERVICES: Record<TabId, { name: string; price: string }[]> = {
  pico: [
    { name: "Simple pico (1 saree)",    price: "₹1,000" },
    { name: "Simple pico (3 sarees)",   price: "₹2,500" },
    { name: "Designer pico (1 saree)",  price: "₹1,500" },
    { name: "Designer pico (3 sarees)", price: "₹4,000" },
    { name: "Double pico (1 saree)",    price: "₹2,000" },
    { name: "Double pico (3 sarees)",   price: "₹5,500" },
    { name: "Pico on dupatta",          price: "₹1,000" },
    { name: "Pico on blouse",           price: "₹1,000" },
  ],
  fall: [
    { name: "Plain fall (1 saree)",    price: "₹1,000" },
    { name: "Plain fall (3 sarees)",   price: "₹2,500" },
    { name: "Colour matched fall",     price: "₹1,500" },
    { name: "Designer fall",           price: "₹2,000" },
    { name: "Running fall",            price: "₹1,000" },
  ],
  designs: [
    { name: "Block print border",       price: "₹1,000–2,000" },
    { name: "Digital print full saree", price: "₹2,000–4,000" },
    { name: "Stone / sequin border",    price: "₹2,000–5,000" },
    { name: "Embroidery border",        price: "₹3,000–7,000" },
    { name: "Zari border work",         price: "₹4,000–9,000" },
    { name: "Mirror work full saree",   price: "₹5,000–12,000" },
    { name: "Bridal saree full work",   price: "₹8,000–12,000" },
  ],
  blouse: [
    { name: "Plain blouse stitch",      price: "₹1,000" },
    { name: "Designer blouse",          price: "₹1,500–2,000" },
    { name: "Bridal blouse",            price: "₹2,500–3,000" },
    { name: "Readymade alteration",     price: "₹1,000" },
    { name: "Back neck design",         price: "₹1,000–1,500" },
    { name: "Sleeveless conversion",    price: "₹1,000" },
    { name: "Mirror work on blouse",    price: "₹1,000–1,500" },
    { name: "Stone / sequin work",      price: "₹1,000–2,000" },
    { name: "Embroidery on blouse",     price: "₹1,500–2,500" },
    { name: "Lace attachment",          price: "₹1,000" },
    { name: "Full designer work",       price: "₹2,000–3,000" },
    { name: "Size alteration",          price: "₹1,000–1,500" },
  ],
};

const PACKAGES = [
  {
    id: "everyday",
    name: "Everyday Package",
    price: "₹2,000",
    amount: 2000,
    badge: "Best for daily wear",
    color: "border-zinc-200 bg-white",
    items: ["1 saree pico + fall", "1 plain blouse stitch"],
    turnaround: "4–5 days",
  },
  {
    id: "festival",
    name: "Festival Package",
    price: "₹4,500",
    amount: 4500,
    badge: "Most popular",
    color: "border-brand/30 bg-brand-muted",
    featured: true,
    items: ["3 sarees pico + fall", "1 designer blouse stitch"],
    turnaround: "7–10 days",
  },
  {
    id: "wedding",
    name: "Wedding Package",
    price: "₹10,000–12,000",
    amount: 10000,
    badge: "Complete bridal",
    color: "border-amber-200 bg-amber-50",
    items: [
      "Bridal blouse full design",
      "Full saree pico + fall",
      "Embroidery on blouse",
      "Stone work on pallu",
      "Zari border finish",
      "Priority delivery in 7 days",
    ],
    turnaround: "12–15 days",
  },
];

// ─── Booking form types ───────────────────────────────────────────────────────

type FormStep = "contact" | "services" | "schedule" | "success";

type FormState = {
  name: string;
  phone: string;
  email: string;
  otp: string;
  otpSent: boolean;
  phoneVerified: boolean;
  selectedPackage: string;
  customServices: string[];
  address: string;
  pickupDate: string;
  instructions: string;
  paymentMethod: "cod" | "advance";
};

const INITIAL_FORM: FormState = {
  name: "", phone: "", email: "", otp: "",
  otpSent: false, phoneVerified: false,
  selectedPackage: "", customServices: [],
  address: "", pickupDate: "", instructions: "",
  paymentMethod: "cod",
};

// ─── Page component ───────────────────────────────────────────────────────────

export default function SareePage() {
  const [activeTab, setActiveTab] = useState<TabId>("pico");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [step, setStep] = useState<FormStep>("contact");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");

  const set = (k: keyof FormState, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── OTP flow ────────────────────────────────────────────────────────────────

  const sendOtp = async () => {
    if (!form.phone.replace(/\D/g, "").slice(-10).length) {
      setError("Enter a valid phone number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) { setError(d.error ?? "Failed to send OTP"); return; }
      set("otpSent", true);
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, otp: form.otp }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) { setError(d.error ?? "Invalid OTP"); return; }
      set("phoneVerified", true);
      setStep("services");
    } finally { setLoading(false); }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const submit = async () => {
    if (!form.address.trim() || !form.pickupDate) {
      setError("Please fill in pickup address and date");
      return;
    }

    const pkg = PACKAGES.find((p) => p.id === form.selectedPackage);
    const serviceText = pkg
      ? pkg.name
      : form.customServices.length
      ? form.customServices.join(", ")
      : "Custom service inquiry";
    const amount = pkg?.amount ?? 1000;

    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/saree/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name,
          customerPhone: form.phone,
          email: form.email || undefined,
          address: form.address,
          service: serviceText,
          pickupDate: form.pickupDate,
          amount,
          notes: form.instructions || undefined,
          paymentMethod: form.paymentMethod,
        }),
      });
      const d = (await r.json()) as { bookingId?: string; error?: string };
      if (!r.ok) { setError(d.error ?? "Booking failed, please try again"); return; }
      setBookingId(d.bookingId ?? "GB000");
      setStep("success");
    } finally { setLoading(false); }
  };

  const toggleService = (name: string) => {
    set(
      "customServices",
      form.customServices.includes(name)
        ? form.customServices.filter((s) => s !== name)
        : [...form.customServices, name]
    );
    if (form.selectedPackage) set("selectedPackage", "");
  };

  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-brand-light py-16 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2260%22 height%3D%2260%22%3E%3Cpath d%3D%22M0 0h60v60H0z%22 fill%3D%22none%22%2F%3E%3Ccircle cx%3D%2230%22 cy%3D%2230%22 r%3D%221%22 fill%3D%22rgba(255%2C255%2C255%2C0.06)%22%2F%3E%3C%2Fsvg%3E')] opacity-60" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
            ✂️ Bengaluru's Favourite Saree Service
          </span>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">
            Professional Saree &amp; Blouse<br />
            <span className="text-green-200">Services at Your Doorstep</span>
          </h1>
          <p className="mt-4 text-lg text-green-100">
            Pico, fall, blouse stitching, embroidery &amp; bridal packages — home pickup included.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-semibold text-green-100">
            {["Varthur", "Balagere", "Whitefield", "Marathahalli"].map((a) => (
              <span key={a} className="rounded-full border border-white/20 px-3 py-1">{a}</span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href="#booking" className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-brand shadow-lg hover:bg-green-50 transition">
              Book Home Pickup →
            </a>
            <a href="#packages" className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-6 py-4 text-base font-semibold text-white hover:bg-white/10 transition">
              View Packages
            </a>
          </div>
        </div>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────────────────── */}
      <section className="border-y border-zinc-100 bg-zinc-50 py-5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-zinc-600">
            {[
              { icon: "🏠", text: "Free pickup above ₹3,000" },
              { icon: "✅", text: "Verified tailors, 5+ years" },
              { icon: "🚚", text: "Free home delivery" },
              { icon: "📅", text: "Mon–Sat service" },
              { icon: "💰", text: "Pay on delivery" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-1.5">
                <span>{b.icon}</span> {b.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service menu ──────────────────────────────────────────────────── */}
      <section id="pico" className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Complete menu</p>
          <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">All Services &amp; Pricing</h2>
          <p className="mt-1 text-sm text-zinc-500">Transparent pricing, no hidden charges.</p>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {SERVICE_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                activeTab === t.id
                  ? "bg-brand text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Service grid */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {SERVICES[activeTab].map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3.5 shadow-sm"
            >
              <span className="text-sm font-semibold text-zinc-800">{s.name}</span>
              <span className="shrink-0 rounded-full bg-brand-muted px-3 py-1 text-xs font-bold text-brand">
                {s.price}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          * Pickup charge ₹100 for orders below ₹3,000. Free above ₹3,000. Free delivery on all orders.
        </p>
      </section>

      {/* ── Packages ──────────────────────────────────────────────────────── */}
      <section id="packages" className="border-y border-zinc-100 bg-zinc-50 py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Save more</p>
            <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">Service Packages</h2>
            <p className="mt-1 text-sm text-zinc-500">Bundled services at unbeatable value.</p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${pkg.color}`}
              >
                {pkg.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-4 py-1 text-[11px] font-bold text-white shadow-sm">
                    ★ Most Popular
                  </span>
                )}
                <span className="inline-flex w-fit rounded-full border border-current/20 bg-white/60 px-2.5 py-0.5 text-[10px] font-bold text-brand">
                  {pkg.badge}
                </span>
                <h3 className="mt-3 text-lg font-extrabold text-zinc-900">{pkg.name}</h3>
                <p className="mt-1 text-2xl font-extrabold text-brand">{pkg.price}</p>
                <p className="text-xs text-zinc-400">Ready in {pkg.turnaround}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {pkg.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="mt-0.5 text-brand">✓</span> {item}
                    </li>
                  ))}
                </ul>
                <a
                  href="#booking"
                  onClick={() => { set("selectedPackage", pkg.id); set("customServices", []); }}
                  className="mt-5 block rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-brand-dark transition"
                >
                  Book This Package
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Turnaround times ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-xl font-extrabold text-zinc-900">Ready-by timelines</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { service: "Pico / Fall",     days: "2–3 days"   },
            { service: "Plain blouse",    days: "4–5 days"   },
            { service: "Designer blouse", days: "7–10 days"  },
            { service: "Bridal package",  days: "12–15 days" },
            { service: "Full saree work", days: "10–15 days" },
          ].map((t) => (
            <div key={t.service} className="rounded-2xl border border-zinc-100 bg-white p-4 text-center shadow-sm">
              <p className="text-xs font-semibold text-zinc-500">{t.service}</p>
              <p className="mt-1.5 text-lg font-extrabold text-brand">{t.days}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Booking form ──────────────────────────────────────────────────── */}
      <section id="booking" className="border-t border-zinc-100 bg-gradient-to-b from-brand-muted to-white py-14">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Free home pickup</p>
            <h2 className="mt-2 text-3xl font-extrabold text-zinc-900">Book a Pickup</h2>
            <p className="mt-1 text-sm text-zinc-500">Mon–Sat · 10AM–6PM · Varthur &amp; surrounds</p>
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-md sm:p-8">

            {/* ── Success ── */}
            {step === "success" && (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-muted text-3xl">✅</div>
                <h3 className="mt-4 text-xl font-extrabold text-zinc-900">Booking Confirmed!</h3>
                <p className="mt-2 text-sm text-zinc-500">Booking ID: <span className="font-bold text-brand">{bookingId}</span></p>
                <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-left text-sm text-zinc-700 space-y-1.5">
                  <p><span className="font-semibold">Name:</span> {form.name}</p>
                  <p><span className="font-semibold">Phone:</span> {form.phone}</p>
                  <p><span className="font-semibold">Pickup:</span> {form.pickupDate}, 10AM–6PM</p>
                  <p><span className="font-semibold">Address:</span> {form.address}</p>
                  <p><span className="font-semibold">Payment:</span> {form.paymentMethod === "cod" ? "Cash on delivery" : "Advance via UPI"}</p>
                </div>
                <p className="mt-4 text-xs text-zinc-400">
                  Confirmation SMS sent to {form.phone}. Our team will WhatsApp you before pickup.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={() => { setForm(INITIAL_FORM); setStep("contact"); setBookingId(""); }}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 hover:border-brand hover:text-brand transition"
                  >
                    Book Another Service
                  </button>
                  <Link href="/" className="block w-full rounded-xl bg-brand px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-dark transition">
                    Back to Home
                  </Link>
                </div>
              </div>
            )}

            {/* ── Step: Contact + OTP ── */}
            {step === "contact" && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-zinc-900">Step 1 of 3 — Contact Details</h3>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Full Name *</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Phone Number *</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none disabled:bg-zinc-50"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="10-digit mobile number"
                      disabled={form.phoneVerified}
                      maxLength={10}
                      inputMode="numeric"
                    />
                    {!form.phoneVerified && (
                      <button
                        onClick={() => void sendOtp()}
                        disabled={loading || form.otpSent}
                        className="shrink-0 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50 hover:bg-brand-dark transition"
                      >
                        {form.otpSent ? "Sent ✓" : loading ? "…" : "Get OTP"}
                      </button>
                    )}
                    {form.phoneVerified && (
                      <span className="flex items-center rounded-xl bg-brand-muted px-3 text-sm font-bold text-brand">✓ Verified</span>
                    )}
                  </div>
                </div>

                {form.otpSent && !form.phoneVerified && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5">Enter OTP *</label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm text-center tracking-[0.3em] focus:border-brand focus:outline-none"
                        value={form.otp}
                        onChange={(e) => set("otp", e.target.value)}
                        placeholder="——————"
                        maxLength={6}
                        inputMode="numeric"
                      />
                      <button
                        onClick={() => void verifyOtp()}
                        disabled={loading || form.otp.length < 4}
                        className="shrink-0 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50 hover:bg-brand-dark transition"
                      >
                        {loading ? "…" : "Verify"}
                      </button>
                    </div>
                    <button onClick={() => void sendOtp()} className="mt-1 text-xs text-brand underline underline-offset-2">
                      Resend OTP
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Email (optional — for confirmation)</label>
                  <input
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="email@example.com"
                    type="email"
                  />
                </div>

                {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}

                <button
                  onClick={() => {
                    if (!form.name.trim()) { setError("Enter your name"); return; }
                    if (!form.phoneVerified) { setError("Please verify your phone number"); return; }
                    setError("");
                    setStep("services");
                  }}
                  disabled={!form.phoneVerified}
                  className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white disabled:opacity-40 hover:bg-brand-dark transition"
                >
                  Next: Choose Services →
                </button>
              </div>
            )}

            {/* ── Step: Services ── */}
            {step === "services" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-zinc-900">Step 2 of 3 — Select Services</h3>
                  <button onClick={() => setStep("contact")} className="text-xs text-zinc-400 hover:text-brand">← Back</button>
                </div>

                <p className="text-xs text-zinc-500">Choose a package OR select individual services below.</p>

                {/* Package quick-select */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Packages</p>
                  {PACKAGES.map((pkg) => (
                    <label
                      key={pkg.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${
                        form.selectedPackage === pkg.id
                          ? "border-brand bg-brand-muted"
                          : "border-zinc-200 bg-white hover:border-brand/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="package"
                        className="accent-brand"
                        checked={form.selectedPackage === pkg.id}
                        onChange={() => { set("selectedPackage", pkg.id); set("customServices", []); }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-900">{pkg.name}</p>
                        <p className="text-xs text-zinc-500">{pkg.items.slice(0, 2).join(" + ")}</p>
                      </div>
                      <span className="shrink-0 text-sm font-extrabold text-brand">{pkg.price}</span>
                    </label>
                  ))}
                </div>

                {/* Individual services */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Or pick individual services</p>
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-zinc-200 p-3 space-y-1.5">
                    {Object.entries(SERVICES).flatMap(([, items]) => items).slice(0, 16).map((s) => (
                      <label
                        key={s.name}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 transition ${
                          form.customServices.includes(s.name)
                            ? "bg-brand-muted"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            className="accent-brand shrink-0"
                            checked={form.customServices.includes(s.name)}
                            onChange={() => toggleService(s.name)}
                          />
                          <span className="text-sm text-zinc-800 truncate">{s.name}</span>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-brand">{s.price}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}

                <button
                  onClick={() => {
                    if (!form.selectedPackage && form.customServices.length === 0) {
                      setError("Please select at least one service or package");
                      return;
                    }
                    setError("");
                    setStep("schedule");
                  }}
                  className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-dark transition"
                >
                  Next: Schedule Pickup →
                </button>
              </div>
            )}

            {/* ── Step: Schedule ── */}
            {step === "schedule" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-zinc-900">Step 3 of 3 — Schedule &amp; Address</h3>
                  <button onClick={() => setStep("services")} className="text-xs text-zinc-400 hover:text-brand">← Back</button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Pickup Date *</label>
                  <input
                    type="date"
                    min={today}
                    max={maxDate}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                    value={form.pickupDate}
                    onChange={(e) => set("pickupDate", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-zinc-400">Mon–Sat only. Team arrives between 10AM–6PM.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Pickup Address *</label>
                  <textarea
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                    rows={3}
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Flat no., building, street, landmark, area — Varthur / Balagere / Whitefield / Marathahalli"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Special Instructions (optional)</label>
                  <textarea
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
                    rows={2}
                    value={form.instructions}
                    onChange={(e) => set("instructions", e.target.value)}
                    placeholder="e.g. Match fall colour to border, bridal design reference, etc."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-2">Payment Preference</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: "cod" as const, label: "Cash on Delivery", sub: "Pay when work is done" },
                      { val: "advance" as const, label: "Pay Advance", sub: "UPI: gharsip@ybl" },
                    ].map((p) => (
                      <label
                        key={p.val}
                        className={`cursor-pointer rounded-xl border p-3 transition ${
                          form.paymentMethod === p.val
                            ? "border-brand bg-brand-muted"
                            : "border-zinc-200 bg-white hover:border-brand/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          className="sr-only"
                          checked={form.paymentMethod === p.val}
                          onChange={() => set("paymentMethod", p.val)}
                        />
                        <p className="text-sm font-bold text-zinc-900">{p.label}</p>
                        <p className="text-xs text-zinc-500">{p.sub}</p>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl bg-zinc-50 p-4 text-sm">
                  <p className="font-bold text-zinc-900 mb-2">Booking summary</p>
                  <p className="text-zinc-600">
                    {form.selectedPackage
                      ? PACKAGES.find((p) => p.id === form.selectedPackage)?.name
                      : form.customServices.join(", ")}
                  </p>
                  {form.selectedPackage && (
                    <p className="mt-1 font-extrabold text-brand">
                      {PACKAGES.find((p) => p.id === form.selectedPackage)?.price}
                    </p>
                  )}
                </div>

                {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}

                <button
                  onClick={() => void submit()}
                  disabled={loading}
                  className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-brand-dark transition"
                >
                  {loading ? "Confirming booking…" : "Confirm Booking ✓"}
                </button>
                <p className="text-center text-xs text-zinc-400">
                  Confirmation SMS will be sent to {form.phone}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Reviews ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Testimonials</p>
          <h2 className="mt-2 text-2xl font-extrabold text-zinc-900">What customers say</h2>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            { name: "Priya M.", area: "Varthur",   stars: 5, text: "Got pico + fall on 3 sarees. Home pickup was so convenient and the finish is beautiful. Will definitely come back for blouse stitching!" },
            { name: "Lakshmi R.", area: "Balagere", stars: 5, text: "Bridal blouse stitching was perfect. The embroidery detail matched exactly what I wanted. Completed on time for the wedding. Highly recommend!" },
            { name: "Sunitha K.", area: "Whitefield", stars: 5, text: "Festival package is great value — 3 sarees done beautifully. The designer fall colour-matching was spot on. Our go-to for saree work!" },
          ].map((r) => (
            <figure key={r.name} className="rounded-2xl border border-brand/10 bg-white p-5 shadow-sm">
              <div className="flex text-amber-400 text-sm">{"★".repeat(r.stars)}</div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">&ldquo;{r.text}&rdquo;</p>
              <figcaption className="mt-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
                  {r.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">{r.name}</p>
                  <p className="text-xs text-zinc-400">{r.area}, Bengaluru</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="border-t border-zinc-100 bg-zinc-50 py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-zinc-900">Frequently Asked Questions</h2>
          <div className="mt-8 space-y-4">
            {[
              { q: "Which areas do you cover?", a: "We currently serve Varthur, Balagere, Whitefield, Marathahalli, and surrounding areas in east Bengaluru." },
              { q: "How does home pickup work?", a: "Choose your date and we send a trained representative to collect your sarees. Pickup is free above ₹3,000. ₹100 below that. Delivery back to your home is always free." },
              { q: "How long does the work take?", a: "Pico and fall: 2–3 days. Plain blouse: 4–5 days. Designer blouse: 7–10 days. Bridal package: 12–15 days. We'll confirm the exact timeline when we pick up." },
              { q: "What payment options are available?", a: "Cash on delivery (when we return your sarees) or UPI advance to gharsip@ybl. No online payment required at booking." },
              { q: "Who does the work?", a: "All our tailors are verified with 5+ years of experience in Bengaluru bridal and saree work. We inspect every piece before delivery." },
            ].map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-zinc-200 bg-white px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-bold text-zinc-900 flex items-center justify-between gap-3">
                  {faq.q}
                  <span className="text-brand shrink-0 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
