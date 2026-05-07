import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchCatalog } from "@/lib/apiClient";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import StickyCartBar from "@/components/StickyCartBar";

export default function Products() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [activeSub, setActiveSub] = useState(null);

  useEffect(() => {
    fetchCatalog().then((d) => {
      setCatalog(d);
      const cat = d.categories.find((c) => c.id === categoryId);
      if (cat?.subgroups?.length) setActiveSub(cat.subgroups[0].id);
    });
  }, [categoryId]);

  const category = useMemo(
    () => catalog?.categories.find((c) => c.id === categoryId),
    [catalog, categoryId]
  );

  if (!catalog) {
    return (
      <div className="min-h-[100dvh]" data-testid="products-loading">
        <Header title="Loading…" />
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="surface h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-[100dvh]">
        <Header title="Not found" />
        <div className="p-6 text-center text-[var(--text-muted)]">
          Category not found.{" "}
          <button onClick={() => navigate("/store")} className="underline">
            Back
          </button>
        </div>
      </div>
    );
  }

  const sub = category.subgroups.find((s) => s.id === activeSub);

  return (
    <div className="min-h-[100dvh] pb-36" data-testid={`products-page-${categoryId}`}>
      <Header
        title={`${category.icon} ${category.name}`}
        subtitle={category.tagline}
      />

      {/* Subgroup chips */}
      {category.subgroups.length > 1 && (
        <div
          className="sticky top-[57px] z-20 px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar"
          style={{
            background: "rgba(7,8,11,0.85)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--border-soft)",
          }}
          data-testid="subgroup-chips"
        >
          {category.subgroups.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSub(s.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
                activeSub === s.id
                  ? "border-transparent"
                  : "border-[var(--border)] text-[var(--text-muted)]"
              }`}
              style={
                activeSub === s.id
                  ? {
                      background:
                        "linear-gradient(135deg, var(--accent), var(--accent-2))",
                      color: "#06150d",
                    }
                  : { background: "var(--surface-2)" }
              }
              data-testid={`subgroup-chip-${s.id}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {category.id === "cigarettes" && (
        <div className="mx-4 mt-4 surface p-3 flex items-start gap-3" data-testid="cigarettes-notice">
          <div className="text-xl">⚠️</div>
          <div>
            <div className="font-semibold text-sm">Full Pack Only</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              Loose cigarettes are not available. We comply with local rules.
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-4 space-y-3" data-testid="product-list">
        {sub?.products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            categoryId={category.id}
            subgroupId={sub.id}
          />
        ))}
      </div>

      <StickyCartBar />
    </div>
  );
}
