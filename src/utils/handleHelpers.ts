/**
 * Normalizes a user handle:
 * - Strips leading/trailing whitespace
 * - Ensures exactly one leading '@'
 * - Converts to lowercase for case-insensitive uniqueness comparisons
 */
export function normalizeHandle(handle: string): string {
  if (!handle) return '';
  const trimmed = handle.trim();
  // Strip all leading @ symbols, trim, and lowercase
  const cleaned = trimmed.replace(/^@+/, '').trim().toLowerCase();
  return cleaned ? `@${cleaned}` : '';
}

/**
 * Reserved handles for the platform (stored WITHOUT '@', lowercase).
 * Used by onboarding handle suggestions and new-account checks.
 * NOTE: intentionally NOT wired into validateHandle — existing users must
 * keep validating exactly as before.
 */
export const RESERVED_HANDLES: readonly string[] = [
  'admin',
  'administrator',
  'sotoy',
  'sotoyfilm',
  'official',
  'support',
  'help',
  'moderator',
  'mod',
  'staff',
  'team',
  'system',
  'root',
  'api',
  'www',
  'login',
  'signup',
  'null',
  'undefined',
];

/**
 * Legacy reserved handles (stored WITH '@') that validateHandle has always
 * rejected. Kept unchanged so existing users are not affected.
 */
const LEGACY_RESERVED_HANDLES = new Set([
  '@tamu',
  '@guest',
  '@system',
  '@anonymous',
  '@undefined',
  '@null',
]);

/**
 * True when the handle is reserved by the platform.
 * Accepts the handle with or without a leading '@' and is case-insensitive.
 * Covers both the exported RESERVED_HANDLES list and the legacy system set.
 */
export function isReservedHandle(handle: string): boolean {
  const normalized = normalizeHandle(handle);
  if (!normalized) return false;
  if (LEGACY_RESERVED_HANDLES.has(normalized)) return true;
  return RESERVED_HANDLES.includes(normalized.slice(1));
}

/**
 * Validates handle format:
 * - Must start with '@'
 * - Length between 3 and 30 characters (excluding '@')
 * - Only alphanumeric characters and underscore (_)
 * - Not a system-reserved handle
 */
export function validateHandle(handle: string): { isValid: boolean; error?: string } {
  const normalized = normalizeHandle(handle);
  if (!normalized || normalized === '@') {
    return { isValid: false, error: 'Username / handle (@) wajib diisi.' };
  }

  const handleBody = normalized.slice(1);

  if (handleBody.length < 3) {
    return { isValid: false, error: 'Handle minimal 3 karakter (setelah @).' };
  }

  if (handleBody.length > 30) {
    return { isValid: false, error: 'Handle maksimal 30 karakter.' };
  }

  const validRegex = /^[a-z0-9_]+$/;
  if (!validRegex.test(handleBody)) {
    return { isValid: false, error: 'Handle hanya boleh berisi huruf, angka, dan underscore (_).' };
  }

  // Legacy check only — validateHandle must behave exactly as before, so
  // handles like '@admin' that existing users may already own stay valid here.
  if (LEGACY_RESERVED_HANDLES.has(normalized)) {
    return { isValid: false, error: 'Handle ini dicadangkan oleh sistem. Silakan pilih handle yang berbeda.' };
  }

  return { isValid: true };
}
