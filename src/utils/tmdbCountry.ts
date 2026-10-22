/**
 * Country-code helpers for TMDB data.
 *
 * This module intentionally has no imports: it is used by the Vercel Node ESM
 * function (`api/tmdb.ts`) through `tmdbServerFetch.ts`, where every runtime
 * import needs an explicit `.js` extension.
 */

/**
 * Normalizes a list of country codes: trims, upper-cases, removes empty
 * values, de-duplicates and sorts alphabetically.
 */
export function normalizeCountryCodes(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map(value => String(value ?? '').trim().toUpperCase())
        .filter(Boolean)
    )
  ).sort();
}

/**
 * Maps TMDB's `origin_country` (falling back to `production_countries`'
 * `iso_3166_1`) into normalized country codes. Returns an empty array when
 * TMDB has no usable country data.
 */
export function mapTmdbOriginCountry(data: any): string[] {
  const fromOrigin = normalizeCountryCodes(data?.origin_country);
  if (fromOrigin.length > 0) return fromOrigin;

  const productionCodes = Array.isArray(data?.production_countries)
    ? data.production_countries.map((country: any) => country?.iso_3166_1)
    : [];

  return normalizeCountryCodes(productionCodes);
}

/**
 * True when both country lists contain the same codes, ignoring order,
 * duplicates and letter case.
 */
export function originCountryEqual(a?: string[], b?: string[]): boolean {
  const left = normalizeCountryCodes(a);
  const right = normalizeCountryCodes(b);
  if (left.length !== right.length) return false;
  return left.every((code, index) => code === right[index]);
}
