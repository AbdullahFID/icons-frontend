// ---------------------------------------------------------------------------
// sanitize.ts — input hygiene helpers.
//
// We do NOT try to HTML-escape here, because:
//   • React auto-escapes any string it renders in JSX (text content is safe).
//   • Kyle's backend uses Supabase, which runs parameterised queries
//     (safe against SQL injection by construction).
// So "sanitisation" on the frontend really means two things:
//   1. `sanitizeInput` — normalise whitespace before sending to the backend.
//   2. `isValid*` — reject obviously malformed values BEFORE we POST, so the
//      user gets an instant error instead of a round-trip.
// ---------------------------------------------------------------------------

// Strip leading/trailing whitespace. Deliberately does nothing else —
// HTML-encoding a JSON payload would corrupt names like "Alex & Sam".
export function sanitizeInput(value: string): string {
  return value.trim();
}

// --- format validators ----------------------------------------------------
// Each returns true iff the value matches the expected shape for that field.

// Queen's NetIDs are alphanumeric, usually 5–8 chars. Cap at 20 for safety.
export function isValidNetId(value: string): boolean {
  return /^[a-zA-Z0-9]{1,20}$/.test(value);
}

// Queen's student numbers are numeric (typically 8 digits). 6–12 leaves room.
export function isValidStudentNumber(value: string): boolean {
  return /^[0-9]{6,12}$/.test(value);
}

// Allow any Unicode letter so international students (José, Müller, François)
// aren't rejected. Plus spaces, apostrophes, hyphens for "O'Brien-Smith".
// The `u` flag activates Unicode mode so `\p{L}` works.
export function isValidName(value: string): boolean {
  return /^[\p{L}\s'-]{1,100}$/u.test(value);
}

// Asset tags look like "AT-A1B2C3" — alphanumeric with hyphens.
export function isValidAssetTag(value: string): boolean {
  return /^[a-zA-Z0-9-]{1,30}$/.test(value);
}
