import { useEffect, useRef, useState } from "react";

/**
 * Plays a short attention-grabbing 2-tone chime via the Web Audio API.
 * No external sound file needed.
 */
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tones = [
      { f: 880, t: 0, d: 0.18 },
      { f: 1320, t: 0.16, d: 0.22 },
      { f: 880, t: 0.42, d: 0.18 },
    ];
    tones.forEach(({ f, t, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + t + d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + d);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // ignore
  }
}

/**
 * Detects new orders from a polled list.
 *
 * orders: array sorted desc by created_at, each must have a stable `id`.
 *
 * On the first call after mount, it just remembers the seen IDs (no alert).
 * On subsequent calls, any new id triggers a chime + browser notification.
 */
export function useNewOrderAlerts(orders, { enabled = true, vendorName = "Order" } = {}) {
  const seenRef = useRef(null);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  useEffect(() => {
    if (!enabled || !Array.isArray(orders)) return;
    const ids = new Set(orders.map((o) => o.id));

    if (seenRef.current === null) {
      // First sync — establish baseline silently.
      seenRef.current = ids;
      return;
    }

    const newOrders = orders.filter((o) => !seenRef.current.has(o.id));
    if (newOrders.length > 0) {
      playChime();
      newOrders.slice(0, 3).forEach((o) => {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            const n = new Notification(`New order · ${o.short_id || ""}`.trim(), {
              body: `${o.customer_name || "Customer"} · ₹${(o.total || 0).toFixed(0)}`,
              tag: o.id,
              icon: "/favicon.ico",
            });
            n.onclick = () => {
              window.focus();
              n.close();
            };
          } catch {
            // ignore
          }
        }
      });
    }
    seenRef.current = ids;
  }, [orders, enabled, vendorName]);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return "unsupported";
    try {
      const r = await Notification.requestPermission();
      setPermission(r);
      return r;
    } catch {
      return "denied";
    }
  };

  return { permission, requestPermission };
}
