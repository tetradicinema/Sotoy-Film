import { slugify } from './slugify';

/**
 * Pure helpers for the TMDB collection ("franchise") page.
 *
 * No React, no network and no DOM access: everything here is deterministic so
 * it can be unit-tested from `scripts/test-franchise.ts`. Mirrors the route
 * helpers of `src/utils/personHelpers.ts`.
 */

/**
 * Reads the leading numeric TMDB collection id from `/franchise/:idSlug`.
 * Accepts `119`, `119-the-lord-of-the-rings` and rejects anything without
 * leading digits.
 */
export const parseFranchiseRouteParam = (param?: string | null): number | null => {
  if (typeof param !== 'string') return null;

  let value = param.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep the raw value when it contains malformed escapes
  }

  const match = /^(\d+)/.exec(value);
  if (!match) return null;

  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** Builds the canonical candidate path `/franchise/<id>-<slug>`. */
export const buildFranchisePath = (id: number, name?: string | null): string => {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) return '/franchise';

  const slug = name ? slugify(String(name)) : '';
  return slug ? `/franchise/${numericId}-${slug}` : `/franchise/${numericId}`;
};
