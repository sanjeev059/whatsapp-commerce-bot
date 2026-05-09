import { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { api } from "@/lib/apiClient";
import AgeGate from "@/components/AgeGate";

/**
 * Wraps every /store/:slug/* route with the 21+ age gate (one-time per slug, 30-day TTL).
 * Also fetches vendor name once so the gate can personalize.
 */
export default function StorefrontShell() {
  const { slug } = useParams();
  const [vendorName, setVendorName] = useState("");

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/storefront/${slug}`, { headers: { Authorization: "" } })
      .then((r) => setVendorName(r.data?.vendor?.name || ""))
      .catch(() => {});
  }, [slug]);

  return (
    <AgeGate slug={slug} vendorName={vendorName}>
      <div className="app-shell">
        <Outlet />
      </div>
    </AgeGate>
  );
}
