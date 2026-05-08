// Shared status mapping for the 7 lifecycle states.
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  XCircle,
  Ban,
  ShieldCheck,
} from "lucide-react";

export const STATUS_META = {
  payment_verification_pending: {
    label: "Verifying payment",
    short: "Verify",
    icon: Clock,
    color: "#ffb547",
    bg: "rgba(255,181,71,0.14)",
  },
  payment_verified: {
    label: "Payment verified",
    short: "Verified",
    icon: ShieldCheck,
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.14)",
  },
  accepted: {
    label: "Accepted",
    short: "Accepted",
    icon: Package,
    color: "#22d27a",
    bg: "rgba(34,210,122,0.14)",
  },
  out_for_delivery: {
    label: "Out for delivery",
    short: "Out",
    icon: Truck,
    color: "#22d27a",
    bg: "rgba(34,210,122,0.18)",
  },
  delivered: {
    label: "Delivered",
    short: "Delivered",
    icon: CheckCircle2,
    color: "#22d27a",
    bg: "rgba(34,210,122,0.22)",
  },
  rejected: {
    label: "Rejected",
    short: "Rejected",
    icon: XCircle,
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.14)",
  },
  cancelled: {
    label: "Cancelled",
    short: "Cancelled",
    icon: Ban,
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.14)",
  },
};

export const STATUS_ORDER = [
  "payment_verification_pending",
  "payment_verified",
  "accepted",
  "out_for_delivery",
  "delivered",
  "rejected",
  "cancelled",
];

export function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.accepted;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}
      data-testid={`status-pill-${status}`}
    >
      {m.short}
    </span>
  );
}
