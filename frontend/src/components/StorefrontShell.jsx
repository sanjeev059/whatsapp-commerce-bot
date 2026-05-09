import { useEffect, useRef, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { api } from "@/lib/apiClient";
import AgeGate from "@/components/AgeGate";
import OutOfRange from "@/components/OutOfRange";
import ForceInstallModal from "@/components/ForceInstallModal";

const GEO_KEY = (slug) => `gharsip:geo-ok:${slug}`;
const TTL_MS = 24 * 60 * 60 * 1000; // re-check distance once a day

function haversineKm(lat1, lng1, lat2, lng2) {
  const r = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dp = toRad(lat2 - lat1);
  const dl = toRad(lng2 - lng1);
  const a =
    Math.sin(dp / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/**
 * Wraps every /store/:slug/* route with:
 *  1. AgeGate (21+, per-slug, 30-day memory)
 *  2. Delivery-radius gate — if vendor pinned location, block customers >radius_km away
 *  3. Force-install modal (one-time per slug, fired right after age gate)
 */
export default function StorefrontShell() {
  const { slug } = useParams();
  const [vendor, setVendor] = useState(null);
  const [geoState, setGeoState] = useState({ status: "idle" });
  // status: idle | checking | ok | denied | out_of_range
  const ranOnce = useRef(false);

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/storefront/${slug}`, { headers: { Authorization: "" } })
      .then((r) => setVendor(r.data?.vendor || null))
      .catch(() => setVendor(null));
  }, [slug]);

  const checkDistance = () => {
    if (!vendor || vendor.lat == null || vendor.lng == null) {
      setGeoState({ status: "ok" });
      return;
    }
    setGeoState({ status: "checking" });

    if (!navigator.geolocation) {
      setGeoState({ status: "denied" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineKm(
          vendor.lat,
          vendor.lng,
          pos.coords.latitude,
          pos.coords.longitude
        );
        const radius = Number(vendor.delivery_radius_km || 5);
        if (dist > radius) {
          setGeoState({ status: "out_of_range", distance: dist, radius });
        } else {
          setGeoState({ status: "ok", distance: dist });
          try {
            sessionStorage.setItem(
              GEO_KEY(slug),
              JSON.stringify({ ok: true, at: Date.now(), dist })
            );
          } catch {}
        }
      },
      () => {
        // If denied, don't block browsing — server will enforce at checkout.
        setGeoState({ status: "denied" });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  // Run distance check once after age-gate is accepted AND vendor info loaded
  const onAgeAccept = () => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    // If we already passed the check today, skip re-asking
    try {
      const cached = sessionStorage.getItem(GEO_KEY(slug));
      if (cached) {
        const { ok, at } = JSON.parse(cached);
        if (ok && Date.now() - at < TTL_MS) {
          setGeoState({ status: "ok" });
          return;
        }
      }
    } catch {}
    checkDistance();
  };

  return (
    <AgeGate slug={slug} vendorName={vendor?.name || ""} onAccept={onAgeAccept}>
      {geoState.status === "out_of_range" ? (
        <OutOfRange
          vendorName={vendor?.name || ""}
          distance={geoState.distance}
          radius={geoState.radius}
          onRetry={() => {
            ranOnce.current = false;
            try {
              sessionStorage.removeItem(GEO_KEY(slug));
            } catch {}
            checkDistance();
          }}
          onBack={() => (window.location.href = "https://www.google.com")}
        />
      ) : (
        <>
          <ForceInstallModal slug={slug} vendorName={vendor?.name || ""} />
          <div className="app-shell">
            <Outlet />
          </div>
        </>
      )}
    </AgeGate>
  );
}
