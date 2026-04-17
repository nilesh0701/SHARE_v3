import axios from "axios";

let accessToken: string | null = null;
const AUTH_STORAGE_KEY = "share.auth";

export const setToken = (token: string) => { accessToken = token; };
export const clearToken = () => { accessToken = null; };
export const getToken = () => accessToken;

export const hydrateTokenFromStorage = () => {
  if (accessToken || typeof window === "undefined") return accessToken;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { token?: string };
    accessToken = parsed?.token ?? null;
    return accessToken;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

api.interceptors.request.use((config) => {
  if (!accessToken) hydrateTokenFromStorage();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Do not force logout here; pages handle unauthorized routing.
    // This prevents accidental session loss on transient/auth-race responses.
    return Promise.reject(err);
  }
);

export default api;