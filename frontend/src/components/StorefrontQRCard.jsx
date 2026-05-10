import { useState } from "react";
import { resolveUrl } from "@/lib/apiClient";
import { Download, Printer, QrCode, Share2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_NAME } from "@/config";

/**
 * Vendor storefront QR card.
 * Renders a server-generated QR code that points at /store/<slug>.
 * Provides Download / Print / Share buttons.
 */
export default function StorefrontQRCard({ slug, vendorName }) {
  const [bust, setBust] = useState(0);
  const qrUrl = resolveUrl(`/api/storefront/${slug}/qr.png?size=512&v=${bust}`);
  const storefrontUrl = `${window.location.origin}/store/${slug}`;

  const download = async () => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slug}-storefront-qr.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("QR downloaded");
    } catch {
      toast.error("Could not download QR");
    }
  };

  const printIt = () => {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) {
      toast.error("Pop-up blocked — please allow pop-ups");
      return;
    }
    w.document.write(`
      <html><head><title>${vendorName || slug} — Storefront QR</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#0f172a}
        h1{font-size:24px;margin:0 0 4px}
        h2{font-size:14px;font-weight:500;color:#64748b;margin:0 0 28px;letter-spacing:.05em;text-transform:uppercase}
        img{max-width:380px;width:100%;border:8px solid #fff;box-shadow:0 6px 30px rgba(0,0,0,.15);border-radius:12px}
        .url{margin-top:18px;font-family:ui-monospace,monospace;font-size:13px;color:#0f172a;word-break:break-all}
        .tag{margin-top:8px;font-size:12px;color:#64748b}
        @media print{body{padding:20px}}
      </style></head>
      <body>
        <h1>${vendorName || slug}</h1>
        <h2>Scan to order · 30-min delivery</h2>
        <img src="${qrUrl}" alt="QR code" />
        <div class="url">${storefrontUrl}</div>
        <div class="tag">Powered by ${PLATFORM_NAME}</div>
        <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
      </body></html>
    `);
    w.document.close();
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: vendorName || "Order online",
          text: "Order from us — fast hyperlocal delivery",
          url: storefrontUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(storefrontUrl);
        toast.success("Storefront link copied");
      } catch {
        toast.error("Copy failed");
      }
    }
  };

  return (
    <div className="mt-6 surface p-4 md:p-5" data-testid="storefront-qr-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-[var(--accent)]" />
          <div className="text-base font-bold">Storefront QR</div>
        </div>
        <button
          onClick={() => setBust((x) => x + 1)}
          className="text-[var(--text-faint)] hover:text-white p-1.5 rounded"
          title="Refresh"
          data-testid="qr-refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
        Print this and stick it on your shop window. Customers scan with their phone camera and your store opens instantly. They can save it to their home screen as an app.
      </p>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
        <div
          className="rounded-2xl p-3 shrink-0"
          style={{ background: "white", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
        >
          <img
            src={qrUrl}
            alt="Storefront QR"
            className="w-44 h-44 md:w-40 md:h-40 object-contain"
            data-testid="qr-image"
          />
        </div>

        <div className="flex-1 w-full space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Customer URL
          </div>
          <div
            className="font-mono text-xs break-all p-2 rounded-lg"
            style={{ background: "var(--surface-2)" }}
            data-testid="qr-url"
          >
            {storefrontUrl}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={download}
              className="btn-ghost !py-2 text-xs justify-center"
              data-testid="qr-download-btn"
            >
              <Download className="w-3.5 h-3.5" /> PNG
            </button>
            <button
              onClick={printIt}
              className="btn-ghost !py-2 text-xs justify-center"
              data-testid="qr-print-btn"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={share}
              className="btn-ghost !py-2 text-xs justify-center"
              data-testid="qr-share-btn"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
