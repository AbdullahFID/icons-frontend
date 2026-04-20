import type { User, Hardware, Loan, LoanDetail, Account } from "../types";
import { mockUsers, mockHardware, mockLoans, mockAccounts } from "./mockData";

const DB_NAME = "icons-dev-db";
const DB_VERSION = 2;
const SEED_VERSION = "3";
const SEED_VERSION_KEY = "icons_seed_version";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains("users")) {
        const s = db.createObjectStore("users", { keyPath: "id" });
        s.createIndex("student_number", "student_number", { unique: true });
        s.createIndex("net_id", "net_id", { unique: true });
      }

      if (!db.objectStoreNames.contains("hardware")) {
        const s = db.createObjectStore("hardware", { keyPath: "id" });
        s.createIndex("serial_number", "serial_number", { unique: true });
        s.createIndex("asset_tag", "asset_tag", { unique: true });
      }

      if (!db.objectStoreNames.contains("loans")) {
        const s = db.createObjectStore("loans", { keyPath: "id" });
        s.createIndex("loan_id", "loan_id", { unique: true });
        s.createIndex("net_id", "net_id");
        s.createIndex("asset_tag", "asset_tag");
      }

      if (!db.objectStoreNames.contains("accounts")) {
        db.createObjectStore("accounts", { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function seedData(): Promise<void> {
  const db = await openDB();
  const currentVersion = localStorage.getItem(SEED_VERSION_KEY);

  if (currentVersion === SEED_VERSION) return;

  const tx = db.transaction(["users", "hardware", "loans", "accounts"], "readwrite");
  tx.objectStore("users").clear();
  tx.objectStore("hardware").clear();
  tx.objectStore("loans").clear();
  tx.objectStore("accounts").clear();

  for (const u of mockUsers) tx.objectStore("users").add({ ...u });
  for (const h of mockHardware) tx.objectStore("hardware").add({ ...h });
  for (const l of mockLoans) tx.objectStore("loans").add({ ...l });
  for (const a of mockAccounts) tx.objectStore("accounts").add({ ...a });
  await txDone(tx);

  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
}

let initialized = false;

export async function initDB(): Promise<void> {
  if (initialized) return;
  try {
    await openDB();
    await seedData();
  } catch {
    dbPromise = null;
  }
  initialized = true;
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return reqResult(db.transaction(store, "readonly").objectStore(store).getAll());
}

async function getByIndex<T>(store: string, index: string, value: string): Promise<T | undefined> {
  const db = await openDB();
  const result = await reqResult(
    db.transaction(store, "readonly").objectStore(store).index(index).get(value)
  );
  return result ?? undefined;
}

async function putItem<T>(store: string, item: T): Promise<T> {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(item);
  await txDone(tx);
  return item;
}

async function addItem<T>(store: string, item: T): Promise<T> {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).add(item);
  await txDone(tx);
  return item;
}

async function deleteByIndex(store: string, index: string, value: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  const s = tx.objectStore(store);
  const key = await reqResult(s.index(index).getKey(value));
  if (key !== undefined) s.delete(key);
  await txDone(tx);
}

async function deleteByKey(store: string, key: IDBValidKey): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(key);
  await txDone(tx);
}

// === Accounts ===

export async function dbGetAllAccounts(): Promise<Account[]> {
  return getAll("accounts");
}

export async function dbAddAccount(name: string, role: "admin" | "manager"): Promise<Account> {
  const account: Account = { id: Date.now(), name, role };
  return addItem("accounts", account);
}

export async function dbUpdateAccount(id: number, name: string, role: "admin" | "manager"): Promise<Account> {
  const updated: Account = { id, name, role };
  return putItem("accounts", updated);
}

export async function dbRemoveAccount(id: number): Promise<{ message: string }> {
  await deleteByKey("accounts", id);
  return { message: "Account removed" };
}

// === Users ===

export async function dbGetAllUsers(): Promise<User[]> {
  return getAll("users");
}

export async function dbGetUser(studentNumber: string): Promise<User | undefined> {
  return getByIndex("users", "student_number", studentNumber);
}

export async function dbAddUser(name: string, netId: string, studentNumber: string): Promise<User> {
  const user: User = { id: Date.now(), name, net_id: netId, student_number: studentNumber };
  return addItem("users", user);
}

export async function dbRemoveUser(studentNumber: string): Promise<{ message: string }> {
  await deleteByIndex("users", "student_number", studentNumber);
  return { message: "User removed" };
}

// === Hardware ===

export async function dbGetAllHardware(availableOnly = false): Promise<Hardware[]> {
  const all = await getAll<Hardware>("hardware");
  return availableOnly ? all.filter((h) => h.available) : all;
}

export async function dbGetHardware(serialNumber: string): Promise<Hardware | undefined> {
  return getByIndex("hardware", "serial_number", serialNumber);
}

export async function dbAddHardware(name: string): Promise<Hardware> {
  const tag = "AT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const serial = "SN-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  const hw: Hardware = { id: Date.now(), name, serial_number: serial, asset_tag: tag, available: true };
  return addItem("hardware", hw);
}

export async function dbRemoveHardware(serialNumber: string): Promise<{ message: string }> {
  await deleteByIndex("hardware", "serial_number", serialNumber);
  return { message: "Hardware removed" };
}

// === Loans ===

export async function dbGetAllLoans(activeOnly = false): Promise<Loan[]> {
  const all = await getAll<Loan>("loans");
  return activeOnly ? all.filter((l) => !l.returned_at) : all;
}

export async function dbGetLoan(loanId: string): Promise<LoanDetail> {
  const loan = await getByIndex<Loan>("loans", "loan_id", loanId);
  if (!loan) throw new Error("Loan not found");

  const user = await getByIndex<User>("users", "net_id", loan.net_id);
  const hw = await getByIndex<Hardware>("hardware", "asset_tag", loan.asset_tag);

  return {
    ...loan,
    user: user ?? { id: 0, name: "Unknown", net_id: loan.net_id, student_number: "" },
    hardware: hw ?? { id: 0, name: "Unknown", serial_number: "", asset_tag: loan.asset_tag, available: false },
  };
}

export async function dbCreateLoan(netId: string, assetTag: string): Promise<Loan> {
  const loan: Loan = {
    id: Date.now(),
    loan_id: `LN-${netId}-${assetTag}-${Date.now()}`,
    net_id: netId,
    asset_tag: assetTag,
    rented_at: new Date().toISOString(),
    returned_at: null,
  };

  const hw = await getByIndex<Hardware>("hardware", "asset_tag", assetTag);
  if (hw) await putItem("hardware", { ...hw, available: false });

  return addItem("loans", loan);
}

export async function dbCompleteLoan(loanId: string): Promise<Loan> {
  const loan = await getByIndex<Loan>("loans", "loan_id", loanId);
  if (!loan) throw new Error("Loan not found");

  const updated = { ...loan, returned_at: new Date().toISOString() };
  await putItem("loans", updated);

  const hw = await getByIndex<Hardware>("hardware", "asset_tag", loan.asset_tag);
  if (hw) await putItem("hardware", { ...hw, available: true });

  return updated;
}
