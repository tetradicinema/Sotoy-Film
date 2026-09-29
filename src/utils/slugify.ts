/**
 * Utility to generate URL-safe slugs from strings
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (e.g. ō -> o)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word characters except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // replace spaces, underscores, and consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // remove leading and trailing hyphens
}
