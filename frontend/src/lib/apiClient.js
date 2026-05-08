import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

/** Convert a relative `/api/...` URL into an absolute one for <img>/<a> usage. */
export function resolveUrl(url) {
  if (!url) return "";
  if (/^(https?:|data:)/i.test(url)) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
}

// Public storefront fetch — never sends auth header.
export async function fetchStorefront(slug) {
  const { data } = await api.get(`/storefront/${slug}`, {
    headers: { Authorization: "" },
  });
  return data;
}
