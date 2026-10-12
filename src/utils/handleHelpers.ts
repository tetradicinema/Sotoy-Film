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

const RESERVED_HANDLES = new Set([
  '@tamu',
  '@guest',
  '@system',
  '@anonymous',
  '@undefined',
  '@null',
]);

export function isReservedHandle(handle: string): boolean {
  const normalized = normalizeHandle(handle);
  return RESERVED_HANDLES.has(normalized);
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

  if (isReservedHandle(normalized)) {
    return { isValid: false, error: 'Handle ini dicadangkan oleh sistem. Silakan pilih handle yang berbeda.' };
  }

  return { isValid: true };
}
