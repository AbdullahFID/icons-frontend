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
import {
  initDB,
  dbGetAllUsers, dbGetUser, dbAddUser, dbRemoveUser,
  dbGetAllHardware, dbGetHardware, dbAddHardware, dbRemoveHardware,
  dbGetAllLoans, dbGetLoan, dbCreateLoan, dbCompleteLoan,
} from "./indexedDB";

const BASE =
  import.meta.env.VITE_API_URL ??
  "https://synthetic-before-zones-firewire.trycloudflare.com";

async function request(path: string, options?: RequestInit) {
  if (isDevMode()) {
    return handleIndexedDBRequest(path, options);
  }

  if (!checkRateLimit(path)) {
    const resetIn = getRateLimitReset(path);
    throw new Error(`Too many requests. Please wait ${resetIn}s before trying again.`);
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `Error ${res.status}`);
  }

  return res.json();
}

async function handleIndexedDBRequest(path: string, options?: RequestInit) {
  try {
    await initDB();
  } catch {
    if (path.includes("get_all")) return [];
    return { detail: "Database initializing" };
  }
  await new Promise((r) => setTimeout(r, 150));

  try {
    return await routeIndexedDBRequest(path, options);
  } catch {
    if (path.includes("get_all")) return [];
    return { detail: "Operation failed" };
  }
}

async function routeIndexedDBRequest(path: string, options?: RequestInit) {

  if (path === "/users/get_all_users") {
    return dbGetAllUsers();
  } else if (path.startsWith("/users/retrieve_user/")) {
    const sn = path.split("/").pop()!;
    const user = await dbGetUser(sn);
    return user ?? { detail: "User not found" };
  } else if (path === "/users/add_user" && options?.method === "POST") {
    const body = JSON.parse(options.body as string);
    return dbAddUser(body.name, body.net_id, body.student_number);
  } else if (path.startsWith("/users/remove_user/")) {
    const sn = path.split("/").pop()!;
    return dbRemoveUser(sn);

  } else if (path.startsWith("/hardware/get_all_hardware")) {
    const availableOnly = path.includes("available_only=true");
    return dbGetAllHardware(availableOnly);
  } else if (path.startsWith("/hardware/get_hardware/")) {
    const sn = path.split("/").pop()!;
    const hw = await dbGetHardware(sn);
    return hw ?? { detail: "Not found" };
  } else if (path === "/hardware/create_hardware" && options?.method === "POST") {
    const body = JSON.parse(options.body as string);
    return dbAddHardware(body.name);
  } else if (path.startsWith("/hardware/delete_hardware/")) {
    const sn = path.split("/").pop()!;
    return dbRemoveHardware(sn);

  } else if (path.startsWith("/loans/get_all_loans")) {
    const activeOnly = path.includes("active_only=true");
    return dbGetAllLoans(activeOnly);
  } else if (path.startsWith("/loans/get_loan/")) {
    const loanId = path.split("/").pop()!;
    return dbGetLoan(loanId);
  } else if (path === "/loans/create_loan" && options?.method === "POST") {
    const body = JSON.parse(options.body as string);
    return dbCreateLoan(body.net_id, body.asset_tag);
  } else if (path.startsWith("/loans/complete_loan/")) {
    const loanId = path.split("/").pop()!;
    return dbCompleteLoan(loanId);
  }

  return { detail: "Endpoint not found" };
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
