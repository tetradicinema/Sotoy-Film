/**
 * Article taxonomy normalization.
 *
 * The public taxonomy used to expose "anime" (and, briefly, "animasi") as a
 * main category. Both legacy values are now read as "animation" so old
 * Firestore documents, saved homepage configs, and cached data keep working
 * before `scripts/migrate-article-categories.ts` is applied.
 *
 * Any other value is returned trimmed and unchanged.
 */
export function normalizeArticleCategory(
  raw?: string | null
): string | null | undefined {
  if (typeof raw !== 'string') return raw;

  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'anime' || lower === 'animasi') return 'animation';

  return trimmed;
}

/**
 * Normalizes a saved interest/genre label for display.
 * Legacy "Anime"/"Animasi" selections become "Animation".
 */
export function normalizeInterestLabel(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'anime' || lower === 'animasi') return 'Animation';

  return trimmed;
}

/**
 * Normalizes an interest-profile map key (stored lowercased) so the
 * recommendation engine keeps matching after the taxonomy rename.
 */
export function normalizeInterestKey(raw: string): string {
  const lower = raw.trim().toLowerCase();

  if (lower === 'anime' || lower === 'animasi') return 'animation';

  return raw;
}

/**
 * Rewrites legacy "anime"/"animasi" keys in a saved interest profile.
 */
export function normalizeInterestProfile(
  profile: Record<string, number>
): Record<string, number> {
  if (!profile || typeof profile !== 'object') return profile;

  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(profile)) {
    const nextKey = normalizeInterestKey(key);
    normalized[nextKey] = (normalized[nextKey] || 0) + (Number(value) || 0);
  }
  return normalized;
}
