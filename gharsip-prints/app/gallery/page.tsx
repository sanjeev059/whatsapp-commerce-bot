"use client";

import { useMemo, useState } from "react";
import { CATEGORY_TABS, DESIGNS, type DesignCategory } from "@/lib/designs";
import { DesignCard } from "@/components/DesignCard";
import { Footer } from "@/components/Footer";

export default function GalleryPage() {
  const [cat, setCat] = useState<DesignCategory>("all");
  const [q, setQ] = useState("");

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
        <h1 className="text-3xl font-extrabold">Design gallery</h1>
        <p className="mt-2 text-zinc-600">Every design opens in the live customizer.</p>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            className="w-full max-w-md rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
            placeholder="Search by name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCat(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                  cat === t.id ? "bg-brand text-white" : "bg-zinc-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((d) => (
            <DesignCard key={d.id} design={d} />
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
