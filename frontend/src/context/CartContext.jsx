import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "lc_cart_v2";

// Cart shape in storage: { slug: string|null, items: [...], appliedOffer: {...}|null }
// If user navigates to a different slug, we reset items + offer so two stores' carts don't mix.

export function CartProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw
        ? { appliedOffer: null, ...JSON.parse(raw) }
        : { slug: null, items: [], appliedOffer: null };
    } catch {
      return { slug: null, items: [], appliedOffer: null };
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
      return { slug, items: [], appliedOffer: null };
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
      // Cart changed → invalidate offer so user re-applies (server re-validates anyway)
      return { ...s, items, appliedOffer: null };
    });
  };

  const setQty = (id, qty) => {
    setState((s) => ({
      ...s,
      items:
        qty <= 0
          ? s.items.filter((p) => p.id !== id)
          : s.items.map((p) => (p.id === id ? { ...p, qty } : p)),
      appliedOffer: null,
    }));
  };

  const remove = (id) =>
    setState((s) => ({
      ...s,
      items: s.items.filter((p) => p.id !== id),
      appliedOffer: null,
    }));
  const clear = () => setState((s) => ({ ...s, items: [], appliedOffer: null }));
  const getQty = (id) => items.find((p) => p.id === id)?.qty || 0;

  const applyOffer = (offer) => setState((s) => ({ ...s, appliedOffer: offer }));
  const clearOffer = () => setState((s) => ({ ...s, appliedOffer: null }));

  const totals = useMemo(() => {
    const byCat = items.reduce((acc, it) => {
      acc[it.category_id] = (acc[it.category_id] || 0) + it.price * it.qty;
      return acc;
    }, {});
    const total = items.reduce((s, it) => s + it.price * it.qty, 0);
    const count = items.reduce((s, it) => s + it.qty, 0);
    const discount = state.appliedOffer?.discount_amount || 0;
    const payable = Math.max(0, Math.round(total - discount));
    // total = subtotal (un-discounted); payable = subtotal - applied coupon discount.
    return { total, payable, discount, count, byCat };
  }, [items, state.appliedOffer]);

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
    appliedOffer: state.appliedOffer,
    applyOffer,
    clearOffer,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
