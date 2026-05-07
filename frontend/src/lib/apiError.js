function formatApiErrorDetail(detail) {
  if (detail == null) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function apiErrorMessage(err, fallback = "Something went wrong") {
  return (
    formatApiErrorDetail(err?.response?.data?.detail) ||
    err?.message ||
    fallback
  );
}
