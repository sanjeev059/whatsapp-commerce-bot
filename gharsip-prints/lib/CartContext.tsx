"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartLine } from "./types";
import type { ProductTypeId } from "./pricing";

const STORAGE_KEY = "gharsip_prints_cart";

type CartCtx = {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "lineId">) => void;
  removeLine: (lineId: string) => void;
  setQty: (lineId: string, qty: number) => void;
  clearCart: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

function loadInitial(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(loadInitial());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  const addLine = useCallback((line: Omit<CartLine, "lineId">) => {
    const lineId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `L-${Date.now()}`;
    setLines((prev) => [...prev, { ...line, lineId }]);
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const setQty = useCallback((lineId: string, qty: number) => {
    const q = Math.max(1, Math.floor(qty));
    setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, qty: q } : l)));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, addLine, removeLine, setQty, clearCart }),
    [lines, addLine, removeLine, setQty, clearCart]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be inside CartProvider");
  return v;
}

export function summarizeProductType(pt: ProductTypeId) {
  const labels: Record<ProductTypeId, string> = {
    round: "Round Neck",
    vneck: "V-Neck",
    oversized: "Oversized",
    polo: "Polo",
  };
  return labels[pt];
}
