// operation queue for tracking backend requests with optimistic updates
// logs all operations and tracks failures for the bell notification

export type OpStatus = "queued" | "success" | "failed";

export interface Operation {
  id: string;
  action: string;       // e.g. "Remove Equipment", "Return Loan"
  detail: string;       // e.g. "Oscilloscope (AT-A1B2C3)"
  performedBy: string;  // staff member or "System"
  status: OpStatus;
  timestamp: string;
  errorMessage?: string;
  undoFn?: () => void;  // optional undo callback
}

// in-memory log of operations (persists for session)
let operations: Operation[] = [];
let listeners: Array<() => void> = [];

// how many unread failures
let unreadFailures = 0;
let failureListeners: Array<(count: number) => void> = [];

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function notifyFailureListeners() {
  failureListeners.forEach((fn) => fn(unreadFailures));
}

export function getOperations(): Operation[] {
  return [...operations];
}

export function getUnreadFailureCount(): number {
  return unreadFailures;
}

export function clearUnreadFailures() {
  unreadFailures = 0;
  notifyFailureListeners();
}

export function addOperation(action: string, detail: string, performedBy = "Staff", undoFn?: () => void): string {
  const id = `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const op: Operation = {
    id,
    action,
    detail,
    performedBy,
    status: "queued",
    timestamp: new Date().toISOString(),
    undoFn,
  };
  operations.unshift(op);
  notifyListeners();
  return id;
}

export function resolveOperation(id: string, status: "success" | "failed", errorMessage?: string) {
  const op = operations.find((o) => o.id === id);
  if (!op) return;
  op.status = status;
  if (errorMessage) op.errorMessage = errorMessage;
  if (status === "failed") {
    unreadFailures++;
    notifyFailureListeners();
  }
  notifyListeners();
}

export function undoOperation(id: string) {
  const op = operations.find((o) => o.id === id);
  if (!op || !op.undoFn) return;
  op.undoFn();
  operations = operations.filter((o) => o.id !== id);
  notifyListeners();
}

export function onOperationsChange(callback: () => void): () => void {
  listeners.push(callback);
  return () => { listeners = listeners.filter((fn) => fn !== callback); };
}

export function onFailureCountChange(callback: (count: number) => void): () => void {
  failureListeners.push(callback);
  return () => { failureListeners = failureListeners.filter((fn) => fn !== callback); };
}
