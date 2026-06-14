"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { GHARSIP_UPI_ID, buildUpiUri } from "@/lib/payment";

export function UpiPayment({
  amount,
  note,
  confirmed,
  onConfirmedChange,
}: {
  amount: number;
  note?: string;
  confirmed: boolean;
  onConfirmedChange: (v: boolean) => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const uri = buildUpiUri({ amount, note });

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(uri, { width: 200, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(GHARSIP_UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available — ignore
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-extrabold text-zinc-900">Pay ₹{amount.toLocaleString("en-IN")} via UPI</p>
      <p className="mt-1 text-xs text-zinc-500">
        Scan the QR with any UPI app (GPay, PhonePe, Paytm) or pay to the UPI ID below.
      </p>
      <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="UPI payment QR code"
            className="h-40 w-40 rounded-lg border border-zinc-200 bg-white p-1"
          />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs text-zinc-400">
            Generating QR…
          </div>
        )}
        <div className="w-full flex-1 space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2">
            <span className="flex-1 truncate font-mono text-sm text-zinc-800">{GHARSIP_UPI_ID}</span>
            <button type="button" onClick={() => void copyUpiId()} className="shrink-0 text-xs font-bold text-brand">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <a
            href={uri}
            className="block w-full rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-brand-dark"
          >
            Pay ₹{amount.toLocaleString("en-IN")} with UPI app
          </a>
        </div>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs font-semibold text-zinc-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-brand focus:ring-brand"
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
        />
        I&apos;ve completed the UPI payment of ₹{amount.toLocaleString("en-IN")}
      </label>
    </div>
  );
}
