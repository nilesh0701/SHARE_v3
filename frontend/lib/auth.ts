import { setToken, clearToken } from "./axios";

export interface AuthState {
  user_id: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
}

let currentUser: AuthState | null = null;
let hydrated = false;
const AUTH_STORAGE_KEY = "share.auth";

if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { user?: AuthState; token?: string };
      if (parsed?.user && parsed?.token) {
        currentUser = parsed.user;
        setToken(parsed.token);
        hydrated = true;
      }
    }
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export const setUser = (user: AuthState, token: string) => {
  currentUser = user;
  setToken(token);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));
  }
  hydrated = true;
};

export const initAuth = (): AuthState | null => {
  if (hydrated) return currentUser;
  hydrated = true;

  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { user?: AuthState; token?: string };
    if (!parsed?.user || !parsed?.token) return null;
    currentUser = parsed.user;
    setToken(parsed.token);
    return currentUser;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const getUser = () => {
  if (!hydrated) initAuth();
  return currentUser;
};

export const logout = () => {
  currentUser = null;
  hydrated = true;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  clearToken();
  window.location.href = "/login";
};

export const isLoggedIn = () => currentUser !== null;

export const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed?.token ?? null;
  } catch {
    return null;
  }
};