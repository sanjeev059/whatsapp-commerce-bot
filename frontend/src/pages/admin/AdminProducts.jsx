import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/apiClient";
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
} from "lucide-react";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [editing, setEditing] = useState(null); // null | 'new' | product object

  const load = async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        api.get("/admin/products"),
        api.get("/admin/categories"),
        api.get("/admin/subgroups"),
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
      await api.delete(`/admin/products/${pid}`);
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
                  src={p.image}
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
                <span
                  className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={
                    p.in_stock
                      ? { background: "rgba(34,210,122,0.14)", color: "#22d27a" }
                      : { background: "rgba(244,63,94,0.14)", color: "#f43f5e" }
                  }
                >
                  {p.in_stock ? "In stock" : "Hidden"}
                </span>
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
      const payload = { ...form, price: parseFloat(form.price) };
      let saved;
      if (isNew) {
        const { data } = await api.post("/admin/products", payload);
        saved = data;
      } else {
        const { data } = await api.patch(`/admin/products/${product.id}`, payload);
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
          <Field label="Image URL">
            <input
              className="input"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://…"
              data-testid="form-image"
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
