const AUTH_KEY = "icons_authenticated";
const AUTH_EVENT = "icons_auth_change";

const CREDENTIALS = { username: "admin", password: "password123" };

export function isAuthenticated(): boolean {
  try {
    return localStorage.getItem(AUTH_KEY) === "true";
  } catch {
    return false;
  }
}

export function login(username: string, password: string): boolean {
  if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
    try { localStorage.setItem(AUTH_KEY, "true"); } catch {}
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: true }));
    return true;
  }
  return false;
}

export function logout(): void {
  try { localStorage.removeItem(AUTH_KEY); } catch {}
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: false }));
}

export function onAuthChange(callback: (authenticated: boolean) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent).detail);
  window.addEventListener(AUTH_EVENT, handler);
  return () => window.removeEventListener(AUTH_EVENT, handler);
}
