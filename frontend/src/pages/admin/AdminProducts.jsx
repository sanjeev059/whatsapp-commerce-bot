import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/apiClient";
import { resolveUrl } from "@/lib/apiClient";
import { formatINR } from "@/lib/format";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  Search,
  RefreshCw,
  Upload,
  FileText,
  Download,
} from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [editing, setEditing] = useState(null); // null | 'new' | product object
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        api.get("/vendor/products"),
        api.get("/vendor/categories"),
        api.get("/vendor/subgroups"),
      ]);
      setProducts(p.data);
      setCategories(c.data);
      setSubgroups(s.data);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const subgroupName = (sid) => subgroups.find((s) => s.id === sid)?.name || "—";
  const categoryName = (cid) => categories.find((c) => c.id === cid)?.name || "—";

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filterCat && p.category_id !== filterCat) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [products, filterCat, search]);

  const remove = async (pid) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/vendor/products/${pid}`);
      toast.success("Product deleted");
      setProducts((p) => p.filter((x) => x.id !== pid));
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const onSaved = (p, isNew) => {
    setProducts((prev) =>
      isNew ? [p, ...prev] : prev.map((x) => (x.id === p.id ? p : x))
    );
    setEditing(null);
  };

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8" data-testid="admin-products-page">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
            Catalog
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
            Products
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost text-xs" data-testid="products-refresh">
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            className="btn-ghost text-xs"
            data-testid="products-bulk-btn"
          >
            <Upload className="w-3.5 h-3.5" /> Bulk CSV
          </button>
          <button
            onClick={() => setEditing("new")}
            className="btn-primary !py-2 !px-3 text-sm"
            data-testid="products-add-btn"
          >
            <Plus className="w-4 h-4" /> Add product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div
          className="flex items-center gap-2 surface-2 !rounded-xl px-3 flex-1 min-w-[200px]"
          style={{ background: "var(--surface-2)" }}
        >
          <Search className="w-4 h-4 text-[var(--text-faint)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="bg-transparent border-0 outline-none flex-1 py-2 text-sm placeholder:text-[var(--text-faint)]"
            data-testid="products-search"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="input !py-2 max-w-[200px]"
          data-testid="products-filter-cat"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="surface overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[1fr_180px_140px_120px_120px_100px] text-[11px] uppercase tracking-wider text-[var(--text-muted)] px-4 py-3 border-b border-[var(--border-soft)] font-semibold">
          <div>Product</div>
          <div>Category</div>
          <div>Subgroup</div>
          <div className="text-right">Price</div>
          <div className="text-center">Stock</div>
          <div className="text-right">Actions</div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            {loading ? "Loading…" : "No products."}
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_180px_140px_120px_120px_100px] items-center gap-3 px-4 py-3 border-b border-[var(--border-soft)] last:border-0"
              data-testid={`product-row-${p.id}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={resolveUrl(p.image)}
                  alt={p.name}
                  className="w-11 h-11 rounded-lg object-cover shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                    e.currentTarget.src =
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><rect width='80' height='80' fill='%231c2029'/></svg>";
                  }}
                />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{p.name}</div>
                  <div className="text-[11px] text-[var(--text-faint)] truncate">
                    {p.unit}
                    {p.tag ? ` · ${p.tag}` : ""}
                  </div>
                </div>
              </div>
              <div className="hidden md:block text-sm text-[var(--text-muted)]">
                {categoryName(p.category_id)}
              </div>
              <div className="hidden md:block text-sm text-[var(--text-muted)]">
                {subgroupName(p.subgroup_id)}
              </div>
              <div className="hidden md:block text-right text-sm font-semibold">
                {formatINR(p.price)}
              </div>
              <div className="hidden md:flex justify-center">
                {!p.in_stock ? (
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(244,63,94,0.14)", color: "#f43f5e" }}
                  >
                    Hidden
                  </span>
                ) : typeof p.stock_count === "number" && p.stock_count === 0 ? (
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(244,63,94,0.14)", color: "#f43f5e" }}
                    data-testid={`product-out-${p.id}`}
                  >
                    Out of stock
                  </span>
                ) : typeof p.stock_count === "number" && p.stock_count <= 5 ? (
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(255,181,71,0.14)", color: "var(--warm)" }}
                    data-testid={`product-low-${p.id}`}
                    title="Low stock"
                  >
                    Low · {p.stock_count}
                  </span>
                ) : (
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(34,210,122,0.14)", color: "#22d27a" }}
                  >
                    In stock{typeof p.stock_count === "number" ? ` · ${p.stock_count}` : ""}
                  </span>
                )}
              </div>
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setEditing(p)}
                  className="p-2 rounded-md hover:bg-[var(--surface-2)]"
                  data-testid={`product-edit-${p.id}`}
                  aria-label="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="p-2 rounded-md text-[#f43f5e] hover:bg-[rgba(244,63,94,0.10)]"
                  data-testid={`product-delete-${p.id}`}
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : editing}
          categories={categories}
          subgroups={subgroups}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      {bulkOpen && (
        <BulkImportModal
          categories={categories}
          subgroups={subgroups}
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            setBulkOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProductFormModal({ product, categories, subgroups, onClose, onSaved }) {
  const isNew = !product;
  const [form, setForm] = useState(
    product
      ? { ...product }
      : {
          name: "",
          price: "",
          category_id: categories[0]?.id || "",
          subgroup_id: "",
          image: "",
          unit: "",
          tag: "",
          description: "",
          in_stock: true,
          stock_count: "",
        }
  );
  const [submitting, setSubmitting] = useState(false);

  const subsForCat = subgroups.filter(
    (s) => s.category_id === form.category_id
  );

  // If category changes and selected subgroup invalid, reset it
  useEffect(() => {
    if (
      form.subgroup_id &&
      !subsForCat.some((s) => s.id === form.subgroup_id)
    ) {
      setForm((f) => ({ ...f, subgroup_id: subsForCat[0]?.id || "" }));
    } else if (!form.subgroup_id && subsForCat.length) {
      setForm((f) => ({ ...f, subgroup_id: subsForCat[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category_id, subgroups]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category_id || !form.subgroup_id) {
      toast.error("Name, price, category and subgroup are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        stock_count: form.stock_count === "" || form.stock_count == null
          ? null
          : Number(form.stock_count),
      };
      let saved;
      if (isNew) {
        const { data } = await api.post("/vendor/products", payload);
        saved = data;
      } else {
        const { data } = await api.patch(`/vendor/products/${product.id}`, payload);
        saved = data;
      }
      toast.success(isNew ? "Product added" : "Product updated");
      onSaved(saved, isNew);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      data-testid="product-form-modal"
    >
      <form
        onSubmit={submit}
        className="surface w-full md:max-w-lg max-h-[90vh] overflow-y-auto thin-scroll slide-up md:fade-up rounded-t-2xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 px-5 py-4 flex items-center justify-between border-b"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-soft)",
          }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              {isNew ? "Add product" : "Edit product"}
            </div>
            <div className="font-bold">
              {isNew ? "New product" : product.name}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--surface-2)]"
            data-testid="form-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <Field label="Name">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              data-testid="form-name"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (₹)">
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                data-testid="form-price"
              />
            </Field>
            <Field label="Unit">
              <input
                className="input"
                placeholder="e.g. 750ml"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                data-testid="form-unit"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                className="input"
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
                required
                data-testid="form-category"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subgroup">
              <select
                className="input"
                value={form.subgroup_id}
                onChange={(e) =>
                  setForm({ ...form, subgroup_id: e.target.value })
                }
                required
                data-testid="form-subgroup"
              >
                {subsForCat.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Product image">
            <ImageUpload
              value={form.image}
              onChange={(url) => setForm({ ...form, image: url })}
              testId="form-image-upload"
              placeholder="Square photo works best · max 3MB"
            />
          </Field>
          <Field label="Tag (e.g. Full Pack Only)">
            <input
              className="input"
              value={form.tag}
              onChange={(e) => setForm({ ...form, tag: e.target.value })}
              data-testid="form-tag"
            />
          </Field>
          <Field label="Description">
            <textarea
              className="input min-h-[64px] resize-none"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              data-testid="form-description"
            />
          </Field>
          <Field label="Stock count (optional)" hint="Leave blank if you don't track. Customers will see 'Only N left' when ≤ 5.">
            <input
              type="number"
              min={0}
              className="input"
              placeholder="e.g. 12"
              value={form.stock_count ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  stock_count: e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              data-testid="form-stock-count"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm pt-1">
            <input
              type="checkbox"
              checked={form.in_stock}
              onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
              data-testid="form-in-stock"
            />
            In stock
          </label>
        </div>
        <div
          className="sticky bottom-0 px-5 py-3 flex gap-2 border-t"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-soft)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex-1 justify-center text-sm"
            data-testid="form-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-[2] text-sm"
            data-testid="form-submit"
          >
            <Save className="w-4 h-4" />
            {submitting ? "Saving…" : isNew ? "Add product" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

// Minimal CSV parser — handles quoted fields with embedded commas/newlines.
function parseCSV(text) {
  const rows = [];
  let cur = [""];
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur[cur.length - 1] += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur[cur.length - 1] += c;
      }
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") cur.push("");
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        rows.push(cur);
        cur = [""];
      } else cur[cur.length - 1] += c;
    }
  }
  if (cur.length > 1 || cur[0] !== "") rows.push(cur);
  return rows;
}

function BulkImportModal({ categories, subgroups, onClose, onDone }) {
  const [rows, setRows] = useState([]); // parsed { name, price, ... }
  const [errors, setErrors] = useState([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const subById = subgroups.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});

  const handleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const all = parseCSV(text);
    if (all.length < 2) {
      toast.error("CSV looks empty");
      return;
    }
    const header = all[0].map((h) => h.trim().toLowerCase());
    const need = ["name", "price", "category_id", "subgroup_id"];
    const missing = need.filter((h) => !header.includes(h));
    if (missing.length) {
      toast.error("CSV missing columns: " + missing.join(", "));
      return;
    }
    const idx = (k) => header.indexOf(k);
    const out = [];
    const errs = [];
    for (let r = 1; r < all.length; r++) {
      const row = all[r];
      if (row.every((c) => !c.trim())) continue;
      const name = (row[idx("name")] || "").trim();
      const price = parseFloat((row[idx("price")] || "").trim());
      const cat = (row[idx("category_id")] || "").trim();
      const sub = (row[idx("subgroup_id")] || "").trim();
      const unit = idx("unit") >= 0 ? (row[idx("unit")] || "").trim() : "";
      const image = idx("image") >= 0 ? (row[idx("image")] || "").trim() : "";
      const tag = idx("tag") >= 0 ? (row[idx("tag")] || "").trim() : "";
      const desc = idx("description") >= 0 ? (row[idx("description")] || "").trim() : "";
      const item = {
        category_id: cat,
        subgroup_id: sub,
        name,
        price: isNaN(price) ? 0 : price,
        unit,
        image,
        tag,
        description: desc,
        in_stock: true,
      };
      if (!name || isNaN(price) || price <= 0) {
        errs.push({ row: r + 1, name, error: "Name + valid price required" });
      } else if (!subById[sub] || subById[sub].category_id !== cat) {
        errs.push({ row: r + 1, name, error: `Bad category/subgroup (${cat}/${sub})` });
      } else {
        out.push(item);
      }
    }
    setRows(out);
    setErrors(errs);
    if (out.length === 0) toast.error("No valid rows in CSV");
    else toast.success(`Parsed ${out.length} valid rows · ${errs.length} errors`);
  };

  const submit = async () => {
    if (!rows.length) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/vendor/products/bulk", {
        products: rows,
        replace_existing: replaceExisting,
      });
      toast.success(`Imported ${data.created} products`);
      onDone();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Bulk import failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const sub = subgroups[0];
    const cat = sub?.category_id || "snacks";
    const sid = sub?.id || "chips";
    const lines = [
      "name,price,category_id,subgroup_id,unit,tag,description",
      `"Sample Item",99,${cat},${sid},100g,New,"A short description"`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      data-testid="bulk-import-modal"
    >
      <div
        className="surface w-full md:max-w-2xl max-h-[90vh] overflow-y-auto thin-scroll slide-up md:fade-up rounded-t-2xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 px-5 py-4 flex items-center justify-between border-b"
          style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              Bulk import
            </div>
            <div className="font-bold">Upload CSV</div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--surface-2)]"
            data-testid="bulk-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div
            className="rounded-xl p-3 text-xs leading-relaxed"
            style={{ background: "var(--surface-2)" }}
          >
            <div className="font-semibold text-white mb-1.5">CSV format</div>
            <div className="text-[var(--text-muted)]">
              Required columns:{" "}
              <code className="text-[var(--accent)]">name, price, category_id, subgroup_id</code>
              <br />
              Optional: <code>unit, tag, description, image</code>
            </div>
            <button
              onClick={downloadTemplate}
              className="mt-2 text-[var(--accent)] text-xs flex items-center gap-1"
              data-testid="bulk-download-template"
            >
              <Download className="w-3 h-3" /> Download template
            </button>
          </div>

          <label
            className="block cursor-pointer surface-2 !rounded-xl border-2 border-dashed border-[var(--border)] p-6 text-center hover:border-[var(--accent)] transition-colors"
            data-testid="bulk-dropzone"
          >
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
              data-testid="bulk-file-input"
            />
            <FileText className="w-7 h-7 mx-auto text-[var(--text-faint)]" />
            <div className="mt-2 text-sm font-semibold">Choose a CSV file</div>
            <div className="text-[11px] text-[var(--text-faint)] mt-1">
              We'll preview the rows before importing
            </div>
          </label>

          {(rows.length > 0 || errors.length > 0) && (
            <div data-testid="bulk-preview">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Preview · {rows.length} valid · {errors.length} errors
                </div>
                <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    data-testid="bulk-replace-toggle"
                  />
                  Replace all existing products
                </label>
              </div>
              <div className="surface-2 !rounded-xl divide-y divide-[var(--border-soft)] max-h-64 overflow-y-auto">
                {rows.slice(0, 50).map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 text-sm gap-2"
                  >
                    <span className="truncate flex-1 min-w-0">{r.name}</span>
                    <span className="text-[var(--text-faint)] text-xs whitespace-nowrap">
                      {r.subgroup_id}
                    </span>
                    <span className="font-bold text-sm">₹{r.price}</span>
                  </div>
                ))}
                {rows.length > 50 && (
                  <div className="px-3 py-2 text-[11px] text-[var(--text-faint)] text-center">
                    …and {rows.length - 50} more
                  </div>
                )}
                {errors.slice(0, 10).map((e, i) => (
                  <div key={"e" + i} className="px-3 py-2 text-xs text-[#f43f5e]">
                    Row {e.row}: {e.name || "(empty)"} — {e.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className="sticky bottom-0 px-5 py-3 flex gap-2 border-t"
          style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
        >
          <button
            onClick={onClose}
            className="btn-ghost flex-1 justify-center text-sm"
            data-testid="bulk-cancel"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || rows.length === 0}
            className="btn-primary flex-[2] text-sm"
            data-testid="bulk-submit"
          >
            <Upload className="w-4 h-4" />
            {submitting ? "Importing…" : `Import ${rows.length} products`}
          </button>
        </div>
      </div>
    </div>
  );
}
