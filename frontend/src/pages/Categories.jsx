import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchStorefront } from "@/lib/apiClient";
import { ArrowRight, MapPin, Search } from "lucide-react";
import StickyCartBar from "@/components/StickyCartBar";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";

export default function Categories() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { totals, bindSlug } = useCart();

  useEffect(() => {
    bindSlug(slug);
    fetchStorefront(slug)
      .then((d) => {
        setData(d);
        if (!d.available) navigate(`/store/${slug}/closed`, { replace: true });
      })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Flat list of products for search
  const allProducts = (data?.categories || []).flatMap((c) =>
    c.subgroups.flatMap((s) =>
      s.products.map((p) => ({
        ...p,
        category_id: c.id,
        category_name: c.name,
        category_icon: c.icon,
      }))
    )
  );
  const q = query.trim().toLowerCase();
  const matched = q
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.unit || "").toLowerCase().includes(q) ||
          (p.category_name || "").toLowerCase().includes(q)
      )
    : [];

  return (
    <div className="min-h-[100dvh] pb-32" data-testid="categories-page">
      {/* Top bar */}
      <div
        className="sticky top-0 z-30 px-5 pt-5 pb-4"
        style={{
          background: "rgba(7,8,11,0.85)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
              Delivery in 30 min
            </div>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4 text-[var(--accent)]" />
              <div
                className="font-semibold text-[15px] truncate max-w-[220px]"
                data-testid="store-location"
              >
                {data?.vendor?.name || "Loading…"}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/store/${slug}/cart`)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]"
            data-testid="header-cart-link"
          >
            Cart · {totals.count}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 px-3 surface-2 !rounded-xl">
          <Search className="w-4 h-4 text-[var(--text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for beer, snacks, food…"
            className="bg-transparent border-0 outline-none flex-1 py-2.5 text-sm placeholder:text-[var(--text-faint)]"
            data-testid="search-input"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider hover:text-white"
              data-testid="search-clear"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-6">
        {q ? (
          <SearchResults
            slug={slug}
            results={matched}
            query={q}
            onClickProduct={(p) => navigate(`/store/${slug}/c/${p.category_id}`)}
          />
        ) : (
          <>
            <h2
              className="text-[26px] font-extrabold tracking-tight"
              data-testid="categories-heading"
            >
              What are you craving?
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Tap a category to explore the menu.
            </p>

            {error && (
              <div
                className="mt-6 surface p-4 text-sm text-[var(--danger)]"
                data-testid="catalog-error"
              >
                {error}
              </div>
            )}

            {!data ? (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="surface aspect-[4/5] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3" data-testid="categories-grid">
                {data.categories
                  .filter((cat) => cat.subgroups.some((s) => s.products.length > 0))
                  .map((cat, i) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      onClick={() => navigate(`/store/${slug}/c/${cat.id}`)}
                      delay={i * 60}
                    />
                  ))}
              </div>
            )}

            {/* Promo banner */}
            <div className="mt-6 surface p-4 flex items-center gap-3 fade-up">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: "rgba(255,181,71,0.12)" }}
              >
                🎉
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">Free delivery tonight</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Min liquor order {formatINR(1000)} · No coupon needed
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <StickyCartBar />
    </div>
  );
}

function SearchResults({ results, query, onClickProduct }) {
  if (results.length === 0) {
    return (
      <div className="surface p-8 text-center mt-4" data-testid="search-empty">
        <div className="text-3xl">🔍</div>
        <div className="font-semibold mt-3">No products match "{query}"</div>
        <div className="text-xs text-[var(--text-muted)] mt-1">
          Try a different word or clear the search to browse categories.
        </div>
      </div>
    );
  }
  return (
    <div data-testid="search-results">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-semibold mb-3">
        {results.length} match{results.length === 1 ? "" : "es"}
      </div>
      <div className="space-y-2">
        {results.slice(0, 30).map((p) => (
          <button
            key={p.id}
            onClick={() => onClickProduct(p)}
            className="w-full surface p-3 flex items-center gap-3 text-left hover:border-[var(--border)]"
            data-testid={`search-result-${p.id}`}
          >
            {p.image ? (
              <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg surface-2 flex items-center justify-center text-xl">
                {p.category_icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{p.name}</div>
              <div className="text-[11px] text-[var(--text-faint)] truncate">
                {p.category_name}
                {p.unit && ` · ${p.unit}`}
              </div>
            </div>
            <div className="text-sm font-extrabold">{formatINR(p.price)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ category, onClick, delay = 0 }) {
  return (
    <button
      onClick={onClick}
      className="surface relative overflow-hidden text-left fade-up active:scale-[0.98] transition-transform"
      style={{ animationDelay: `${delay}ms`, paddingBottom: 0 }}
      data-testid={`category-card-${category.id}`}
    >
      <div className="relative h-32 w-full overflow-hidden">
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,8,11,0.05) 0%, rgba(7,8,11,0.85) 100%)",
          }}
        />
        <div className="absolute top-2 right-2 text-2xl drop-shadow-md">
          {category.icon}
        </div>
      </div>
      <div className="p-3 pb-4">
        <div className="font-bold text-[15px] flex items-center justify-between">
          {category.name}
          <ArrowRight className="w-4 h-4 text-[var(--accent)]" />
        </div>
        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
          {category.tagline}
        </div>
      </div>
    </button>
  );
}
