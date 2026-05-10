import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Store + delivery pins on OpenStreetMap (no API key).
 * `store` = green, `drop` = amber.
 */
export default function OrderRouteMap({
  storeLat,
  storeLng,
  dropLat,
  dropLng,
  height = 220,
  className = "",
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const sn = storeLat != null ? Number(storeLat) : NaN;
    const se = storeLng != null ? Number(storeLng) : NaN;
    const dn = dropLat != null ? Number(dropLat) : NaN;
    const de = dropLng != null ? Number(dropLng) : NaN;
    const hasStore = !Number.isNaN(sn) && !Number.isNaN(se);
    const hasDrop = !Number.isNaN(dn) && !Number.isNaN(de);
    if (!hasStore && !hasDrop) return undefined;
    if (!elRef.current) return undefined;

    const map = L.map(elRef.current, { scrollWheelZoom: false });
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const pin = (lat, lng, color, label) =>
      L.circleMarker([lat, lng], {
        radius: 8,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      })
        .addTo(map)
        .bindPopup(label);

    const bounds = [];
    if (hasStore) {
      pin(sn, se, "#22d27a", "Store");
      bounds.push([sn, se]);
    }
    if (hasDrop) {
      pin(dn, de, "#ffb547", "Delivery");
      bounds.push([dn, de]);
    }
    if (bounds.length === 1) map.setView(bounds[0], 15);
    else map.fitBounds(bounds, { padding: [28, 28] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [storeLat, storeLng, dropLat, dropLng]);

  const hasStore =
    storeLat != null &&
    storeLng != null &&
    !Number.isNaN(Number(storeLat)) &&
    !Number.isNaN(Number(storeLng));
  const hasDrop =
    dropLat != null &&
    dropLng != null &&
    !Number.isNaN(Number(dropLat)) &&
    !Number.isNaN(Number(dropLng));
  if (!hasStore && !hasDrop) return null;

  return (
    <div
      ref={elRef}
      className={`w-full overflow-hidden border border-[var(--border-soft)] ${className}`}
      style={{ height, borderRadius: 12, zIndex: 0 }}
      data-testid="order-route-map"
    />
  );
}
