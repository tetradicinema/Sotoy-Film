// Pure helpers for the professional onboarding flow (Stage A).
// No UI, no Firestore calls — availability checks are the caller's job.

import { ProfileLink } from '../types';
import { sanitizeStoredLinks } from './profileLinks';
import { isReservedHandle } from './handleHelpers';

/** Version stamp written to User.termsVersion when the terms are accepted. */
export const TERMS_VERSION = '2026-10';

export const ONBOARDING_BIO_MAX_LENGTH = 160;
export const ONBOARDING_GENRES_MAX = 10;

/**
 * Normalize a display name: trim and collapse all internal whitespace
 * runs into a single space. Non-strings normalize to ''.
 */
export function normalizeName(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/\s+/g, ' ');
}

// Markers of a URL inside a name: scheme (http/https), www., or a dot-TLD ("budi.com").
const NAME_URL_PATTERNS: RegExp[] = [/https?:/i, /\bwww\./i, /\b[a-z0-9-]+\.[a-z]{2,}\b/i];
// A (possible) email: '@' with a dot somewhere after it.
const NAME_EMAIL_PATTERN = /@\S*\.\S/;

/**
 * Validate a display name (2-50 chars after normalization, no URL, no email).
 * Error messages are in Bahasa Indonesia.
 */
export function validateName(input: unknown): {
  isValid: boolean;
  error?: string;
  normalized: string;
} {
  const normalized = normalizeName(input);

  if (!normalized) {
    return { isValid: false, error: 'Nama wajib diisi.', normalized };
  }
  if (normalized.length < 2) {
    return { isValid: false, error: 'Nama minimal 2 karakter.', normalized };
  }
  if (normalized.length > 50) {
    return { isValid: false, error: 'Nama maksimal 50 karakter.', normalized };
  }
  // Email check first: 'budi@film.id' also contains a dot-TLD, but the
  // specific email error is the clearer message.
  if (NAME_EMAIL_PATTERN.test(normalized)) {
    return { isValid: false, error: 'Nama tidak boleh mengandung alamat email.', normalized };
  }
  if (NAME_URL_PATTERNS.some(p => p.test(normalized))) {
    return { isValid: false, error: 'Nama tidak boleh mengandung tautan (URL).', normalized };
  }

  return { isValid: true, normalized };
}

/**
 * Reduce a base string to a handle-safe slug: lowercase, only [a-z0-9_],
 * accents stripped, separator runs collapsed to a single underscore.
 */
function slugifyBase(base: unknown): string {
  if (typeof base !== 'string') return '';
  return base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Suggest candidate handles (with '@') from a base name — pure function,
 * no availability checks: the caller is responsible for Firestore lookups.
 * Returns up to `count` candidates built from the slug plus numeric suffix
 * variants, skipping reserved handles and enforcing 3-30 chars of [a-z0-9_].
 */
export function suggestHandles(base: string, count: number = 3): string[] {
  const max = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 3;
  if (max === 0) return [];

  const slug = slugifyBase(base);
  if (!slug) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  const consider = (body: string) => {
    if (out.length >= max) return;
    if (body.length < 3 || body.length > 30) return;
    if (!/^[a-z0-9_]+$/.test(body)) return;
    if (isReservedHandle(body)) return;
    const handle = `@${body}`;
    if (seen.has(handle)) return;
    seen.add(handle);
    out.push(handle);
  };

  // Base slug first (truncated so the handle body never exceeds 30 chars),
  // then numeric suffix variants: _2, _3, _4, ...
  consider(slug.slice(0, 30));
  for (let n = 2; out.length < max && n < 1000; n++) {
    const suffix = `_${n}`;
    const body =
      slug.length + suffix.length <= 30
        ? slug + suffix
        : slug.slice(0, 30 - suffix.length) + suffix;
    consider(body);
  }

  return out;
}

export interface OnboardingDraft {
  step: 1 | 2 | 3 | 4;
  name: string;
  handle: string;
  bio: string;
  avatar?: string;
  links: ProfileLink[];
  favoriteGenres: string[];
  acceptedTerms: boolean;
}

function toPlainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Coerce any input into a well-formed OnboardingDraft:
 * step clamped to 1-4, bio to 160 chars, links through sanitizeStoredLinks,
 * favoriteGenres to an array of strings (max 10).
 */
function sanitizeDraft(input: unknown): OnboardingDraft {
  const obj = toPlainObject(input);

  const rawStep = typeof obj.step === 'number' ? obj.step : Number(obj.step);
  const step = (
    Number.isFinite(rawStep) ? Math.min(4, Math.max(1, Math.trunc(rawStep))) : 1
  ) as 1 | 2 | 3 | 4;

  const name = typeof obj.name === 'string' ? obj.name : '';
  const handle = typeof obj.handle === 'string' ? obj.handle : '';
  const bio =
    typeof obj.bio === 'string' ? obj.bio.slice(0, ONBOARDING_BIO_MAX_LENGTH) : '';
  const avatar =
    typeof obj.avatar === 'string' && obj.avatar.trim() ? obj.avatar.trim() : undefined;
  const links = sanitizeStoredLinks(obj.links);
  const favoriteGenres = Array.isArray(obj.favoriteGenres)
    ? obj.favoriteGenres
        .filter((g): g is string => typeof g === 'string')
        .slice(0, ONBOARDING_GENRES_MAX)
    : [];
  const acceptedTerms = obj.acceptedTerms === true;

  return {
    step,
    name,
    handle,
    bio,
    ...(avatar ? { avatar } : {}),
    links,
    favoriteGenres,
    acceptedTerms,
  };
}

/** Serialize a draft into a clamped, JSON-safe string. */
export function serializeDraft(draft: OnboardingDraft): string {
  return JSON.stringify(sanitizeDraft(draft));
}

/**
 * Parse a previously serialized draft. Never throws: returns null for
 * garbage (null/empty/non-JSON/non-object JSON), otherwise a sanitized
 * draft with step/bio/links/genres clamped.
 */
export function parseDraft(raw: string | null): OnboardingDraft | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return sanitizeDraft(parsed);
}

/** localStorage key for a user's onboarding draft. */
export function draftStorageKey(uid: string): string {
  return 'sotoy_onboarding_draft_' + (typeof uid === 'string' ? uid : '');
}
