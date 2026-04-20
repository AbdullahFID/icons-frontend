import type { Account } from "../types";

const AUTH_KEY = "icons_authenticated";
const AUTH_USER_KEY = "icons_current_user";
const AUTH_EVENT = "icons_auth_change";

export function isAuthenticated(): boolean {
  try {
    return localStorage.getItem(AUTH_KEY) === "true";
  } catch {
    return false;
  }
}

export function getCurrentUser(): Account | null {
  try {
    const stored = localStorage.getItem(AUTH_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function loginAs(account: Account): void {
  try {
    localStorage.setItem(AUTH_KEY, "true");
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(account));
  } catch {}
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: true }));
}

export function login(username: string, password: string): boolean {
  if (username === "admin" && password === "password123") {
    loginAs({ id: 0, name: "Admin", role: "admin" });
    return true;
  }
  return false;
}

export function logout(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: false }));
}

export function onAuthChange(callback: (authenticated: boolean) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent).detail);
  window.addEventListener(AUTH_EVENT, handler);
  return () => window.removeEventListener(AUTH_EVENT, handler);
}
