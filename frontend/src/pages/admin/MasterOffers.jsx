import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import AdminOffers from "@/pages/admin/AdminOffers";

/**
 * Master view of offers — vendor-aware. Master picks a vendor from the dropdown,
 * then sees offers scoped to that vendor and can create/edit/delete on their behalf.
 */
export default function MasterOffers() {
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState("");

  useEffect(() => {
    api
      .get("/master/vendors")
      .then(({ data }) => {
        setVendors(data);
        if (data.length && !vendorId) setVendorId(data[0].id);
      })
      .catch((e) => toast.error(apiErrorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!vendorId) {
    return (
      <div className="px-4 md:px-8 pt-6 md:pt-8" data-testid="master-offers-empty">
        <div className="surface p-10 text-center text-sm text-[var(--text-muted)]">
          Loading vendors…
        </div>
      </div>
    );
  }

  const selected = vendors.find((v) => v.id === vendorId);

  return (
    <div data-testid="master-offers-page">
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
            Master · Manage offers for
          </div>
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="input !py-1.5 !px-2 text-sm"
            data-testid="master-offers-vendor-select"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.slug})
              </option>
            ))}
          </select>
        </div>
      </div>
      <AdminOffers
        key={vendorId}
        apiPaths={{
          list: `/master/offers?vendor_id=${vendorId}`,
          create: `/master/vendors/${vendorId}/offers`,
          update: (oid) => `/master/offers/${oid}`,
          remove: (oid) => `/master/offers/${oid}`,
        }}
        scopeTitle={`Master · ${selected?.name || "vendor"}`}
        scopeSubtitle="Create offers on the vendor's behalf. They will see and use these in their storefront."
        testid="master-offers-list"
      />
    </div>
  );
}
