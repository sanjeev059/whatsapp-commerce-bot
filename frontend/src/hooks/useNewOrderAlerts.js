import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Shared context — primed after a user gesture so chimes are not blocked by autoplay policy. */
let sharedAudioCtx = null;

/**
 * Call once after a tap/click (e.g. "Enable alerts" or first interaction in admin).
 * Unlocks audio on Chrome/Safari/Desktop.
 */
export function primeOrderAlertAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new Ctx();
    }
    const p = sharedAudioCtx.resume();
    if (p && typeof p.then === "function") p.catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Plays a short attention-grabbing 2-tone chime via the Web Audio API.
 */
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new Ctx();
    }
    const ctx = sharedAudioCtx;
    const tones = [
      { f: 880, t: 0, d: 0.18 },
      { f: 1320, t: 0.16, d: 0.22 },
      { f: 880, t: 0.42, d: 0.18 },
    ];
    const schedule = () => {
      try {
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
      } catch {
        // ignore
      }
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(schedule).catch(schedule);
    } else {
      schedule();
    }
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
 * On subsequent calls, any new id triggers chime + toast + browser notification (if granted).
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
        const total = Number(o.total) || 0;
        const title = `New order · ${o.short_id || ""}`.trim();
        const body = `${o.customer_name || "Customer"} · ₹${total.toLocaleString("en-IN")}`;

        toast.success(title, {
          description: body,
          duration: 8000,
          id: `new-order-${o.id}`,
        });

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            const n = new Notification(title, {
              body,
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
    primeOrderAlertAudio();
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
