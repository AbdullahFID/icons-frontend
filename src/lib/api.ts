// ---------------------------------------------------------------------------
// api.ts — thin wrapper around `fetch` for every backend call.
//
// The real backend is Kyle's FastAPI + Supabase service. In production it's
// reached through a Cloudflare tunnel; for local dev Vite proxies /users,
// /hardware, and /loans to http://localhost:8000 (see vite.config.ts).
//
// You swap the URL at build time by setting VITE_API_URL in a .env file,
// or by leaving it unset to use the hardcoded fallback below. For the
// Raspberry Pi demo, set VITE_API_URL="" so requests go to the same
// origin (whatever server hosts the dist/ folder).
// ---------------------------------------------------------------------------

import { checkRateLimit, getRateLimitReset } from "./rateLimiter";
import { isDevMode } from "./devMode";
import { mockUsers, mockHardware, mockLoans, mockLoanDetail } from "./mockData";

// BASE is empty when hosted on the same origin as the backend (Pi/Flask demo),
// otherwise it points at Kyle's tunneled FastAPI instance. `import.meta.env`
// lets Vite inject a build-time value without rebuilding code.
const BASE =
  import.meta.env.VITE_API_URL ??
  "https://synthetic-before-zones-firewire.trycloudflare.com";

async function request(path: string, options?: RequestInit) {
  // Dev mode short-circuits the network so we can demo without a backend.
  if (isDevMode()) {
    return handleMockRequest(path, options);
  }

  // Client-side throttle so a runaway loop can't hammer the backend.
  if (!checkRateLimit(path)) {
    const resetIn = getRateLimitReset(path);
    throw new Error(`Too many requests. Please wait ${resetIn}s before trying again.`);
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    // FastAPI returns { detail: "..." } on errors; fall back to a generic message.
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `Error ${res.status}`);
  }

  return res.json();
}

// Mock-request handler: mirrors the real backend's response shape so the UI
// doesn't know the difference. Mutates mockUsers/mockHardware/mockLoans in
// place so the preview feels "live" within a single page session.
function handleMockRequest(path: string, options?: RequestInit) {
  return new Promise((resolve) => {
    // 300ms fake latency — makes loading states show up so we can demo them.
    setTimeout(() => {
      // --- users ---
      if (path === "/users/get_all_users") {
        resolve([...mockUsers]);
      } else if (path.startsWith("/users/retrieve_user/")) {
        const sn = path.split("/").pop();
        const user = mockUsers.find((u) => u.student_number === sn);
        resolve(user || { detail: "User not found" });
      } else if (path === "/users/add_user" && options?.method === "POST") {
        const body = JSON.parse(options.body as string);
        const newUser = { id: Date.now(), name: body.name, net_id: body.net_id, student_number: body.student_number };
        mockUsers.push(newUser);
        resolve(newUser);
      } else if (path.startsWith("/users/remove_user/")) {
        resolve({ message: "User removed" });

      // --- hardware ---
      } else if (path.startsWith("/hardware/get_all_hardware")) {
        const availableOnly = path.includes("available_only=true");
        const items = availableOnly ? mockHardware.filter((h) => h.available) : [...mockHardware];
        resolve(items);
      } else if (path.startsWith("/hardware/get_hardware/")) {
        const sn = path.split("/").pop();
        resolve(mockHardware.find((h) => h.serial_number === sn) || { detail: "Not found" });
      } else if (path === "/hardware/create_hardware" && options?.method === "POST") {
        const body = JSON.parse(options.body as string);
        const tag = "AT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const serial = "SN-20260317-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        const newItem = { id: Date.now(), name: body.name, serial_number: serial, asset_tag: tag, available: true };
        mockHardware.push(newItem);
        resolve(newItem);
      } else if (path.startsWith("/hardware/delete_hardware/")) {
        resolve({ message: "Hardware removed" });

      // --- loans ---
      } else if (path.startsWith("/loans/get_all_loans")) {
        const activeOnly = path.includes("active_only=true");
        const loans = activeOnly ? mockLoans.filter((l) => !l.returned_at) : [...mockLoans];
        resolve(loans);
      } else if (path.startsWith("/loans/get_loan/")) {
        resolve(mockLoanDetail);
      } else if (path === "/loans/create_loan" && options?.method === "POST") {
        const body = JSON.parse(options.body as string);
        const newLoan = {
          id: Date.now(),
          loan_id: `LN-${body.net_id}-${body.asset_tag}-${Date.now()}`,
          net_id: body.net_id,
          asset_tag: body.asset_tag,
          rented_at: new Date().toISOString(),
          returned_at: null,
        };
        mockLoans.unshift(newLoan);
        resolve(newLoan);
      } else if (path.startsWith("/loans/complete_loan/")) {
        const loanId = path.split("/").pop();
        const loan = mockLoans.find((l) => l.loan_id === loanId);
        if (loan) loan.returned_at = new Date().toISOString();
        resolve(loan || { message: "Loan completed" });

      } else {
        resolve({ detail: "Mock endpoint not found" });
      }
    }, 300);
  });
}

// ---------------------------------------------------------------------------
// Public API. Each function maps 1:1 to a FastAPI route.
// We keep these thin on purpose — all business logic lives on the backend.
// ---------------------------------------------------------------------------

// --- users ---

export function getAllUsers() {
  return request("/users/get_all_users");
}

export function getUser(studentNumber: string) {
  return request(`/users/retrieve_user/${encodeURIComponent(studentNumber)}`);
}

export function addUser(name: string, netId: string, studentNumber: string) {
  return request("/users/add_user", {
    method: "POST",
    body: JSON.stringify({ name, net_id: netId, student_number: studentNumber }),
  });
}

export function removeUser(studentNumber: string) {
  return request(`/users/remove_user/${encodeURIComponent(studentNumber)}`, { method: "DELETE" });
}

// --- hardware ---

export function getAllHardware(availableOnly = false) {
  const query = availableOnly ? "?available_only=true" : "";
  return request(`/hardware/get_all_hardware${query}`);
}

export function getHardware(serialNumber: string) {
  return request(`/hardware/get_hardware/${encodeURIComponent(serialNumber)}`);
}

export function addHardware(name: string) {
  return request("/hardware/create_hardware", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function removeHardware(serialNumber: string) {
  return request(`/hardware/delete_hardware/${encodeURIComponent(serialNumber)}`, { method: "DELETE" });
}

// --- loans ---

export function getAllLoans(activeOnly = false) {
  const query = activeOnly ? "?active_only=true" : "";
  return request(`/loans/get_all_loans${query}`);
}

export function getLoan(loanId: string) {
  return request(`/loans/get_loan/${encodeURIComponent(loanId)}`);
}

export function createLoan(netId: string, assetTag: string) {
  return request("/loans/create_loan", {
    method: "POST",
    body: JSON.stringify({ net_id: netId, asset_tag: assetTag }),
  });
}

export function completeLoan(loanId: string) {
  return request(`/loans/complete_loan/${encodeURIComponent(loanId)}`, { method: "POST" });
}
