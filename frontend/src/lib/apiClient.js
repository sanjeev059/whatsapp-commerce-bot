import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// Public storefront fetch — never sends auth header.
export async function fetchStorefront(slug) {
  const { data } = await api.get(`/storefront/${slug}`, {
    headers: { Authorization: "" },
  });
  return data;
}
