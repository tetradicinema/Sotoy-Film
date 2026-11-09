import { slugify } from './slugify';
import type { TmdbPersonCredit, TmdbPersonExternalIds } from './tmdbPersonTrim';

/**
 * Pure helpers for the TMDB-style person page.
 *
 * No React, no network and no DOM access: everything here is deterministic so
 * it can be unit-tested from `scripts/test-person-helpers.ts`.
 */

export interface PersonCredits {
  cast?: TmdbPersonCredit[] | null;
  crew?: TmdbPersonCredit[] | null;
}

export type PersonCreditsInput = PersonCredits | TmdbPersonCredit[] | null | undefined;

export interface PersonCreditSection {
  /** Release year, or null for credits without a usable date. */
  year: number | null;
  items: TmdbPersonCredit[];
}

export interface PersonDepartment {
  department: string;
  count: number;
}

export type PersonSocialKey =
  | 'instagram'
  | 'x'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'imdb'
  | 'website';

export interface PersonSocialLink {
  key: PersonSocialKey;
  label: string;
  url: string;
}

const ACTING = 'Acting';
const CREW = 'Crew';

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const asList = <T>(value: T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : [];

/** Infers a department for a credit that does not carry one explicitly. */
const creditDepartment = (credit: TmdbPersonCredit): string => {
  const department = normalizeText(credit?.department);
  if (department) return department;
  if (normalizeText(credit?.job)) return CREW;
  if (normalizeText(credit?.character)) return ACTING;
  return CREW;
};

const releaseYear = (credit: TmdbPersonCredit): number | null => {
  const raw = normalizeText(credit?.release_date);
  const match = /^(\d{4})/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  return year >= 1800 && year <= 2200 ? year : null;
};

const popularityScore = (credit: TmdbPersonCredit): number => {
  const value = Number(credit?.popularity);
  return Number.isFinite(value) ? value : 0;
};

const voteCount = (credit: TmdbPersonCredit): number => {
  const value = Number(credit?.vote_count);
  return Number.isFinite(value) ? value : 0;
};

const compareByPopularity = (a: TmdbPersonCredit, b: TmdbPersonCredit): number =>
  popularityScore(b) - popularityScore(a) ||
  voteCount(b) - voteCount(a) ||
  normalizeText(a?.title).localeCompare(normalizeText(b?.title));

const creditKey = (credit: TmdbPersonCredit): string =>
  `${normalizeText(credit?.media_type) || 'movie'}:${Number(credit?.id) || 0}`;

/**
 * Reads the leading numeric TMDB id from `/person/:idSlug`.
 * Accepts `287`, `287-brad-pitt` and rejects anything without leading digits.
 */
export const parsePersonRouteParam = (param?: string | null): number | null => {
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

/** Builds the canonical candidate path `/person/<id>-<slug>`. */
export const buildPersonPath = (id: number, name?: string | null): string => {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) return '/person';

  const slug = name ? slugify(String(name)) : '';
  return slug ? `/person/${numericId}-${slug}` : `/person/${numericId}`;
};

interface DateParts {
  year: number;
  month: number;
  day: number;
}

const parseDateParts = (value?: string | null): DateParts | null => {
  const raw = normalizeText(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

const resolveNow = (now?: Date | string | number | null): Date => {
  if (now instanceof Date) return now;
  if (now === undefined || now === null) return new Date();
  const parsed = new Date(now);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * Full-year age at `deathday` when provided, otherwise at `now`.
 * Returns null for missing/invalid dates or dates in the future.
 */
export const calcAge = (
  birthday?: string | null,
  deathday?: string | null,
  now?: Date | string | number | null
): number | null => {
  const birth = parseDateParts(birthday);
  if (!birth) return null;

  const death = parseDateParts(deathday);
  const reference = death
    ? { year: death.year, month: death.month, day: death.day }
    : (() => {
        const date = resolveNow(now);
        return {
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          day: date.getUTCDate(),
        };
      })();

  let age = reference.year - birth.year;
  if (
    reference.month < birth.month ||
    (reference.month === birth.month && reference.day < birth.day)
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

/**
 * Top "known for" credits, preferring the person's own department
 * (cast for Acting, crew for every other department) and filling the
 * remaining slots from the other list. Deduped by `media_type:id`.
 */
export const pickKnownFor = (
  credits: PersonCredits | null | undefined,
  knownForDepartment?: string | null,
  max: number = 8
): TmdbPersonCredit[] => {
  const limit =
    typeof max === 'number' && Number.isFinite(max) && max > 0
      ? Math.floor(max)
      : 0;
  if (limit === 0) return [];

  const cast = asList(credits?.cast);
  const crew = asList(credits?.crew);
  const preferredList =
    normalizeText(knownForDepartment).toLowerCase() === 'acting'.toLowerCase()
      ? cast
      : crew;
  const secondaryList = preferredList === cast ? crew : cast;

  const seen = new Set<string>();
  const picked: TmdbPersonCredit[] = [];

  for (const list of [preferredList, secondaryList]) {
    const sorted = [...list].sort(compareByPopularity);
    for (const credit of sorted) {
      if (!credit || typeof credit !== 'object') continue;
      const key = creditKey(credit);
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(credit);
      if (picked.length >= limit) return picked;
    }
  }

  return picked;
};

const collectCredits = (
  credits: PersonCreditsInput,
  department?: string | null
): TmdbPersonCredit[] => {
  const wanted = normalizeText(department);

  if (Array.isArray(credits)) {
    return credits.filter(
      credit => !wanted || creditDepartment(credit) === wanted
    );
  }

  if (!credits || typeof credits !== 'object') return [];

  const cast = asList(credits.cast);
  const crew = asList(credits.crew);

  if (!wanted) return [...cast, ...crew];
  if (wanted === ACTING) return [...cast];
  return crew.filter(credit => creditDepartment(credit) === wanted);
};

/**
 * Groups credits into year sections, newest year first. Credits without a
 * usable release date get their own section at the very top (`year: null`).
 */
export const groupCreditsByYear = (
  credits: PersonCreditsInput,
  options: { department?: string | null; mediaType?: string | null } = {}
): PersonCreditSection[] => {
  const mediaType = normalizeText(options.mediaType).toLowerCase();
  const items = collectCredits(credits, options.department).filter(credit => {
    if (!credit || typeof credit !== 'object') return false;
    if (!mediaType || mediaType === 'all') return true;
    return normalizeText(credit.media_type).toLowerCase() === mediaType;
  });

  const dated = new Map<number, TmdbPersonCredit[]>();
  const undated: TmdbPersonCredit[] = [];

  for (const credit of items) {
    const year = releaseYear(credit);
    if (year === null) {
      undated.push(credit);
      continue;
    }
    const bucket = dated.get(year);
    if (bucket) {
      bucket.push(credit);
    } else {
      dated.set(year, [credit]);
    }
  }

  const sections: PersonCreditSection[] = [];

  if (undated.length > 0) {
    sections.push({ year: null, items: [...undated].sort(compareByPopularity) });
  }

  for (const year of [...dated.keys()].sort((a, b) => b - a)) {
    sections.push({
      year,
      items: [...(dated.get(year) || [])].sort(compareByPopularity),
    });
  }

  return sections;
};

/** Distinct departments with credit counts, Acting always first. */
export const getDepartments = (
  credits: PersonCreditsInput
): PersonDepartment[] => {
  const counts = new Map<string, number>();
  const add = (department: string) => {
    counts.set(department, (counts.get(department) || 0) + 1);
  };

  if (Array.isArray(credits)) {
    for (const credit of credits) {
      if (!credit || typeof credit !== 'object') continue;
      add(creditDepartment(credit));
    }
  } else if (credits && typeof credits === 'object') {
    for (const credit of asList(credits.cast)) {
      if (credit && typeof credit === 'object') add(ACTING);
    }
    for (const credit of asList(credits.crew)) {
      if (credit && typeof credit === 'object') add(creditDepartment(credit));
    }
  }

  return [...counts.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => {
      if (a.department === ACTING && b.department !== ACTING) return -1;
      if (b.department === ACTING && a.department !== ACTING) return 1;
      return a.department.localeCompare(b.department);
    });
};

const safeHttpUrl = (value: string): string | null => {
  const raw = normalizeText(value);
  if (!raw) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
};

const handleUrl = (value: string, base: string): string | null => {
  const raw = normalizeText(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return safeHttpUrl(raw);
  return safeHttpUrl(`${base}${raw.replace(/^@+/, '')}`);
};

const youtubeUrl = (value: string): string | null => {
  const raw = normalizeText(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return safeHttpUrl(raw);

  const handle = raw.replace(/^@+/, '');
  const url = /^UC[\w-]{20,}$/.test(handle)
    ? `https://www.youtube.com/channel/${handle}`
    : `https://www.youtube.com/@${handle}`;
  return safeHttpUrl(url);
};

const imdbUrl = (value: string): string | null => {
  const raw = normalizeText(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return safeHttpUrl(raw);
  return safeHttpUrl(`https://www.imdb.com/name/${raw}`);
};

/**
 * Builds the external/social link row. Order is stable and empty or unsafe
 * values are dropped.
 */
export const socialLinks = (
  externalIds?: TmdbPersonExternalIds | null,
  homepage?: string | null,
  imdbId?: string | null
): PersonSocialLink[] => {
  const ids: Partial<TmdbPersonExternalIds> = externalIds || {};
  const candidates: Array<{
    key: PersonSocialKey;
    label: string;
    url: string | null;
  }> = [
    {
      key: 'instagram',
      label: 'Instagram',
      url: handleUrl(normalizeText(ids.instagram_id), 'https://www.instagram.com/'),
    },
    {
      key: 'x',
      label: 'X',
      url: handleUrl(normalizeText(ids.twitter_id), 'https://x.com/'),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      url: handleUrl(normalizeText(ids.facebook_id), 'https://www.facebook.com/'),
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      url: handleUrl(normalizeText(ids.tiktok_id), 'https://www.tiktok.com/@'),
    },
    {
      key: 'youtube',
      label: 'YouTube',
      url: youtubeUrl(normalizeText(ids.youtube_id)),
    },
    {
      key: 'imdb',
      label: 'IMDb',
      url: imdbUrl(normalizeText(ids.imdb_id) || normalizeText(imdbId)),
    },
    {
      key: 'website',
      label: 'Website',
      url: safeHttpUrl(normalizeText(homepage)),
    },
  ];

  const seen = new Set<string>();
  const links: PersonSocialLink[] = [];

  for (const candidate of candidates) {
    if (!candidate.url) continue;
    const dedupeKey = candidate.url.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    links.push({
      key: candidate.key,
      label: candidate.label,
      url: candidate.url,
    });
  }

  return links;
};
