import type { StoredOrder, OrderTimelineStep } from "./types";

const ORDER_KEY_PREFIX = "gharsip_print_order:";
const ADMIN_ORDERS = "gharsip_print_orders_index";

/** Demo timeline — swap with Firestore-backed status later */
export function defaultTimeline(now = new Date()): OrderTimelineStep[] {
  const iso = now.toISOString();
  return [
    { key: "placed", label: "Order placed", done: true, at: iso },
    { key: "printer", label: "Design sent to printer", done: true, at: iso },
    { key: "printing", label: "Printing in progress", done: false, current: true },
    { key: "qc", label: "Quality check", done: false },
    { key: "shipped", label: "Shipped", done: false, detail: "Tracking will appear here" },
    { key: "ofd", label: "Out for delivery", done: false },
    { key: "delivered", label: "Delivered", done: false },
  ];
}

function randomOrderId() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `GH${n}`;
}

export function persistOrderDraft(
  o: Omit<StoredOrder, "id" | "createdAt"> & { id?: string }
): StoredOrder {
  const id = o.id ?? randomOrderId();
  const createdAt = new Date().toISOString();
  const full: StoredOrder = {
    ...o,
    id,
    createdAt,
    timeline: o.timeline?.length ? o.timeline : defaultTimeline(),
  };
  if (typeof localStorage === "undefined") return full;
  try {
    localStorage.setItem(ORDER_KEY_PREFIX + id, JSON.stringify(full));
    const idx = JSON.parse(localStorage.getItem(ADMIN_ORDERS) || "[]") as string[];
    const set = new Set([id, ...(Array.isArray(idx) ? idx : [])]);
    localStorage.setItem(ADMIN_ORDERS, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
  return full;
}

export function loadOrder(id: string): StoredOrder | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ORDER_KEY_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as StoredOrder;
  } catch {
    return null;
  }
}

export function listOrderIds(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ADMIN_ORDERS) || "[]") as string[];
  } catch {
    return [];
  }
}

export function saveOrder(updated: StoredOrder) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ORDER_KEY_PREFIX + updated.id, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}
