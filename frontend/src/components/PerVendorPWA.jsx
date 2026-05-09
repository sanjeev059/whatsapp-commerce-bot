import { useEffect } from "react";
import { resolveUrl } from "@/lib/apiClient";

/**
 * Inject a per-vendor PWA manifest + iOS meta tags so that when the customer
 * does "Add to Home Screen" on their phone while on /store/<slug>, the icon
 * launches back to that vendor's storefront — not the platform root.
 *
 * Uses the server-rendered /api/storefront/{slug}/manifest.json so the manifest
 * is parsed before paint (no blob FOUC).
 */
export default function PerVendorPWA({ vendor }) {
  useEffect(() => {
    if (!vendor?.slug) return;

    const manifestHref = resolveUrl(`/api/storefront/${vendor.slug}/manifest.json`);

    const prev = document.querySelector('link[rel="manifest"]');
    const prevHref = prev?.getAttribute("href") || null;
    if (prev) prev.setAttribute("href", manifestHref);
    else {
      const tag = document.createElement("link");
      tag.rel = "manifest";
      tag.href = manifestHref;
      tag.id = "lc-vendor-manifest";
      document.head.appendChild(tag);
    }

    const metas = [
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: (vendor.name || "Store").slice(0, 12) },
      { name: "theme-color", content: "#22d27a" },
    ];
    const created = [];
    metas.forEach((m) => {
      let el = document.head.querySelector(`meta[name="${m.name}"]`);
      const isExisting = !!el;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", m.name);
        document.head.appendChild(el);
      }
      created.push({ el, prev: el.getAttribute("content"), isExisting });
      el.setAttribute("content", m.content);
    });

    document.title = `${vendor.name} · Order online`;

    return () => {
      const cur = document.querySelector('link[rel="manifest"]');
      if (cur) {
        if (prevHref) cur.setAttribute("href", prevHref);
        else cur.remove();
      }
      created.forEach(({ el, prev, isExisting }) => {
        if (isExisting) el.setAttribute("content", prev || "");
        else el.remove();
      });
    };
  }, [vendor?.slug, vendor?.name]);

  return null;
}
