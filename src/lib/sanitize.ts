// basic input sanitization to prevent xss and injection attacks
// strips html tags and trims whitespace

// remove any html tags from a string
export function sanitizeInput(value: string): string {
  return value
    .replace(/[<>]/g, "") // strip angle brackets
    .replace(/&/g, "&amp;") // encode ampersands
    .replace(/"/g, "&quot;") // encode double quotes in attributes
    .trim();
}

// validate that a string only has safe characters for net ids / student numbers
export function isValidNetId(value: string): boolean {
  // net ids are alphanumeric, max 20 chars
  return /^[a-zA-Z0-9]{1,20}$/.test(value);
}

export function isValidStudentNumber(value: string): boolean {
  // student numbers are numeric, typically 8-10 digits
  return /^[0-9]{6,12}$/.test(value);
}

export function isValidName(value: string): boolean {
  // names can have letters, spaces, hyphens, apostrophes
  return /^[a-zA-Z\s'-]{1,100}$/.test(value);
}

export function isValidAssetTag(value: string): boolean {
  // asset tags like "AT-A1B2C3" - alphanumeric with hyphens
  return /^[a-zA-Z0-9-]{1,30}$/.test(value);
}
