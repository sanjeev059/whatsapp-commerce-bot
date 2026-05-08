import { useRef, useState } from "react";
import { api, resolveUrl } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

/**
 * Vendor image upload field.
 *
 * Props:
 *   value      — current image URL (relative `/api/uploads/...` or absolute)
 *   onChange   — called with new URL after upload (or "" on remove)
 *   testId     — data-testid prefix
 *   aspect     — "square" | "wide" (default square)
 *   placeholder— text below upload area
 */
export default function ImageUpload({
  value,
  onChange,
  testId = "image-upload",
  aspect = "square",
  placeholder = "PNG, JPG, WEBP up to 3MB",
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const resolvedSrc = resolveUrl(value);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image too large (max 3MB)");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/vendor/uploads/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Upload failed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = () => onChange("");

  const sizeClass = aspect === "wide" ? "h-32" : "h-32 w-32";

  return (
    <div className="flex items-center gap-3" data-testid={testId}>
      <div
        className={`${sizeClass} rounded-xl overflow-hidden border border-[var(--border-soft)] bg-[var(--surface-2)] flex items-center justify-center shrink-0 relative`}
      >
        {resolvedSrc ? (
          <img src={resolvedSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          <Upload className="w-6 h-6 text-[var(--text-faint)]" />
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
          data-testid={`${testId}-input`}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-ghost !py-2 !px-3 text-xs"
            disabled={busy}
            data-testid={`${testId}-pick`}
          >
            <Upload className="w-3.5 h-3.5" /> {value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button
              type="button"
              onClick={remove}
              className="btn-ghost !py-2 !px-3 text-xs"
              style={{ color: "#f43f5e" }}
              data-testid={`${testId}-remove`}
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
        <div className="text-[11px] text-[var(--text-faint)] mt-1.5">{placeholder}</div>
      </div>
    </div>
  );
}
