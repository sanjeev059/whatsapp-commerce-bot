"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CATEGORY_TABS, DESIGNS, type DesignCategory } from "@/lib/designs";
import { DesignCard } from "@/components/DesignCard";
import { Footer } from "@/components/Footer";

function GalleryInner() {
  const params = useSearchParams();
  const initialCat = (params.get("cat") ?? "all") as DesignCategory;

  const [cat, setCat] = useState<DesignCategory>(initialCat);
  const [q, setQ] = useState("");

  useEffect(() => {
    const c = params.get("cat") as DesignCategory | null;
    if (c) setCat(c);
  }, [params]);

  const list = useMemo(() => {
    return DESIGNS.filter((d) => {
      if (cat !== "all" && d.category !== cat) return false;
      if (!q.trim()) return true;
      return d.name.toLowerCase().includes(q.toLowerCase());
    });
  }, [cat, q]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">Browse</p>
          <h1 className="mt-1 text-3xl font-extrabold text-zinc-900">Design gallery</h1>
          <p className="mt-1.5 text-zinc-500">
            {list.length} design{list.length !== 1 ? "s" : ""} — every one opens in the live customiser.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
              placeholder="Search designs…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCat(t.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold capitalize transition ${
                  cat === t.id
                    ? "bg-brand text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {list.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((d) => (
              <DesignCard key={d.id} design={d} />
            ))}
          </div>
        ) : (
          <div className="mt-20 text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-3 text-lg font-bold text-zinc-700">No designs found</p>
            <p className="mt-1 text-sm text-zinc-400">Try a different search or category.</p>
            <button
              type="button"
              onClick={() => { setCat("all"); setQ(""); }}
              className="mt-4 rounded-xl bg-brand px-6 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-zinc-500">Loading gallery…</div>}>
      <GalleryInner />
    </Suspense>
  );
}
