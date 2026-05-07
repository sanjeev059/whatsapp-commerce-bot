import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "lc_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // item shape: { id, name, price, image, qty, unit, category_id, subgroup_id }
  const add = (product, category_id, subgroup_id) => {
    setItems((prev) => {
      const found = prev.find((p) => p.id === product.id);
      if (found) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [
        ...prev,
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
    });
  };

  const setQty = (id, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((p) => p.id !== id)
        : prev.map((p) => (p.id === id ? { ...p, qty } : p))
    );
  };

  const remove = (id) => setItems((prev) => prev.filter((p) => p.id !== id));
  const clear = () => setItems([]);

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

  const value = { items, add, setQty, remove, clear, getQty, totals };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
