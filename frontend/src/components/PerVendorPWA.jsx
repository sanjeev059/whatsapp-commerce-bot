import { useEffect } from "react";

/**
 * Inject a per-vendor PWA manifest + iOS meta tags so that when the customer
 * does "Add to Home Screen" on their phone while on /store/<slug>, the icon
 * launches back to that vendor's storefront — not the platform root.
 *
 * Usage: just render <PerVendorPWA vendor={vendor} /> on the storefront page.
 */
export default function PerVendorPWA({ vendor }) {
  useEffect(() => {
    if (!vendor?.slug) return;

    const startUrl = `/store/${vendor.slug}`;
    const manifest = {
      name: vendor.name || "Local Store",
      short_name: (vendor.name || "Store").slice(0, 12),
      description: `Order from ${vendor.name} — fast delivery.`,
      start_url: startUrl,
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      theme_color: "#22d27a",
      background_color: "#07080b",
      icons: [{ src: "/favicon.ico", sizes: "64x64 32x32 24x24 16x16", type: "image/x-icon" }],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const url = URL.createObjectURL(blob);

    // Replace any existing manifest tag for the duration of this page
    const prev = document.querySelector('link[rel="manifest"]');
    const prevHref = prev?.getAttribute("href") || null;
    if (prev) prev.setAttribute("href", url);
    else {
      const tag = document.createElement("link");
      tag.rel = "manifest";
      tag.href = url;
      tag.id = "lc-vendor-manifest";
      document.head.appendChild(tag);
    }

    // iOS Safari hints — lets the customer "Add to Home Screen" with a clean app feel
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
      URL.revokeObjectURL(url);
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
