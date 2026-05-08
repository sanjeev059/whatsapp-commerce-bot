import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "lc_cart_v2";

// Cart shape in storage: { slug: string|null, items: [...] }
// If user navigates to a different slug, we reset items so two stores' carts don't mix.

export function CartProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { slug: null, items: [] };
    } catch {
      return { slug: null, items: [] };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Bind cart to a vendor slug. If a different slug is bound, reset items.
  const bindSlug = (slug) => {
    setState((s) => {
      if (s.slug === slug) return s;
      return { slug, items: [] };
    });
  };

  const items = state.items;

  const add = (product, category_id, subgroup_id) => {
    setState((s) => {
      const found = s.items.find((p) => p.id === product.id);
      const items = found
        ? s.items.map((p) => (p.id === product.id ? { ...p, qty: p.qty + 1 } : p))
        : [
            ...s.items,
            {
              id: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
              unit: product.unit,
              category_id,
              subgroup_id,
              qty: 1,
            },
          ];
      return { ...s, items };
    });
  };

  const setQty = (id, qty) => {
    setState((s) => ({
      ...s,
      items:
        qty <= 0
          ? s.items.filter((p) => p.id !== id)
          : s.items.map((p) => (p.id === id ? { ...p, qty } : p)),
    }));
  };

  const remove = (id) =>
    setState((s) => ({ ...s, items: s.items.filter((p) => p.id !== id) }));
  const clear = () => setState((s) => ({ ...s, items: [] }));
  const getQty = (id) => items.find((p) => p.id === id)?.qty || 0;

  const totals = useMemo(() => {
    const byCat = items.reduce((acc, it) => {
      acc[it.category_id] = (acc[it.category_id] || 0) + it.price * it.qty;
      return acc;
    }, {});
    const total = items.reduce((s, it) => s + it.price * it.qty, 0);
    const count = items.reduce((s, it) => s + it.qty, 0);
    return { total, count, byCat };
  }, [items]);

  const value = {
    slug: state.slug,
    items,
    add,
    setQty,
    remove,
    clear,
    getQty,
    totals,
    bindSlug,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
