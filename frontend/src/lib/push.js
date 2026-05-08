import { api } from "@/lib/apiClient";

const SW_PATH = "/service-worker.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    }
    if (reg.installing) {
      await new Promise((r) => {
        reg.installing.addEventListener("statechange", () => r());
      });
    }
    return reg;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("SW registration failed", e);
    return null;
  }
}

/**
 * Idempotently subscribe the current vendor admin to web push.
 * Returns the subscription object (or null on failure / not granted).
 */
export async function subscribeVendorPush() {
  if (!isPushSupported()) return null;
  if (Notification.permission !== "granted") return null;

  const reg = await ensureServiceWorker();
  if (!reg) return null;

  let { data: vapid } = await api.get("/push/vapid-public-key", {
    headers: { Authorization: "" },
  });
  if (!vapid?.public_key || !vapid?.enabled) return null;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.public_key),
    });
  }

  await api.post("/vendor/push/subscribe", {
    subscription: sub.toJSON(),
    user_agent: navigator.userAgent || "",
  });
  return sub;
}

export async function unsubscribeVendorPush() {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    await api.post("/vendor/push/unsubscribe", {
      subscription: sub.toJSON(),
      user_agent: navigator.userAgent || "",
    });
  } catch {}
  try {
    await sub.unsubscribe();
  } catch {}
}

export async function sendTestPush() {
  await api.post("/vendor/push/test");
}
