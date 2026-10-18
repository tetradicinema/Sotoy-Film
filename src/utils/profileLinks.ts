// Utilities for user profile links (Stage A).
// Reuses safeUrl.sanitizeExternalUrl for scheme/credential/blocklist hardening.

import { sanitizeExternalUrl, getHost, BLOCKED_LINK_DOMAINS } from './safeUrl';
import { ProfileLink, ProfileLinkPlatform } from '../types';

export const PROFILE_LINK_MAX_LINKS = 5;
export const PROFILE_LINK_MAX_URL_LENGTH = 200;
export const PROFILE_LINK_MAX_LABEL_LENGTH = 30;

export const PROFILE_LINK_MESSAGES = {
  urlRequired: 'URL wajib diisi.',
  urlInvalid: 'URL tidak valid.',
  urlTooLong: `URL maksimal ${PROFILE_LINK_MAX_URL_LENGTH} karakter.`,
  domainBlocked: 'Domain ini tidak diizinkan.',
  labelTooLong: `Label maksimal ${PROFILE_LINK_MAX_LABEL_LENGTH} karakter.`,
  duplicate: 'URL duplikat, gunakan tautan lain.',
  maxLinks: (max: number) => `Maksimal ${max} tautan.`,
} as const;

/**
 * Detect the platform from a URL or host-ish string typed by the user.
 * Accepts full URLs, scheme-less input ("instagram.com/user") or bare hosts.
 * Returns 'website' when the host cannot be matched.
 */
export function detectPlatform(url: string): ProfileLinkPlatform {
  if (!url || typeof url !== 'string') return 'website';
  let candidate = url.trim();
  if (!candidate) return 'website';
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    candidate = 'https://' + candidate;
  }
  const host = getHost(candidate);
  if (!host) return 'website';
  return detectPlatformFromHost(host);
}

function detectPlatformFromHost(host: string): ProfileLinkPlatform {
  const h = host.replace(/^(www|m|mobile|touch)\./, '');
  if (h === 'instagram.com' || h.endsWith('.instagram.com')) return 'instagram';
  if (h === 'tiktok.com' || h.endsWith('.tiktok.com')) return 'tiktok';
  if (h === 'youtube.com' || h.endsWith('.youtube.com') || h === 'youtu.be' || h.endsWith('.youtu.be')) return 'youtube';
  if (h === 'x.com' || h.endsWith('.x.com') || h === 'twitter.com' || h.endsWith('.twitter.com')) return 'x';
  if (h === 'facebook.com' || h.endsWith('.facebook.com') || h === 'fb.com' || h.endsWith('.fb.com')) return 'facebook';
  if (h === 'threads.net' || h.endsWith('.threads.net') || h === 'threads.com' || h.endsWith('.threads.com')) return 'threads';
  if (h === 'linkedin.com' || h.endsWith('.linkedin.com')) return 'linkedin';
  if (h === 'github.com' || h.endsWith('.github.com')) return 'github';
  if (h === 'open.spotify.com' || h === 'spotify.com' || h.endsWith('.spotify.com')) return 'spotify';
  return 'website';
}

export function createProfileLinkId(): string {
  return `link-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** True when the host (or any of its parts) matches a blocked domain from safeUrl. */
function isBlockedHost(host: string): boolean {
  if (!host) return false;
  const parts = host.split('.');
  return BLOCKED_LINK_DOMAINS.some(
    blocked =>
      parts.includes(blocked) ||
      host === blocked ||
      host.startsWith(blocked + '.') ||
      host.endsWith('.' + blocked)
  );
}

/**
 * Best-effort classification of an invalid URL so we can return a clear
 * Indonesian error message (blocked domain vs generic invalid URL).
 */
function classifyInvalidUrl(rawUrl: string): string {
  let candidate = rawUrl.trim();
  if (/^http:\/\//i.test(candidate)) {
    candidate = 'https://' + candidate.slice('http://'.length);
  } else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    candidate = 'https://' + candidate;
  }
  const host = getHost(candidate);
  if (isBlockedHost(host)) return PROFILE_LINK_MESSAGES.domainBlocked;
  return PROFILE_LINK_MESSAGES.urlInvalid;
}

/**
 * Normalize a single profile-link input into a valid ProfileLink.
 * - Upgrades http:// to https:// and prepends https:// to bare domains.
 * - Rejects blocked domains, credentials, non-http(s) schemes, oversized
 *   URL (> 200 chars) and oversized label (> 30 chars).
 * Returns null when the input cannot be normalized into a valid link.
 */
export function normalizeProfileLink(input: unknown): ProfileLink | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;

  if (typeof raw.url !== 'string') return null;
  const trimmedUrl = raw.url.trim();
  if (!trimmedUrl) return null;
  if (trimmedUrl.length > PROFILE_LINK_MAX_URL_LENGTH) return null;

  let candidate = trimmedUrl;
  if (/^http:\/\//i.test(candidate)) {
    candidate = 'https://' + candidate.slice('http://'.length);
  }
  const sanitized = sanitizeExternalUrl(candidate);
  if (!sanitized) return null;
  if (sanitized.length > PROFILE_LINK_MAX_URL_LENGTH) return null;

  let label: string | undefined;
  if (raw.label !== undefined && raw.label !== null) {
    if (typeof raw.label !== 'string') return null;
    const trimmedLabel = raw.label.trim();
    if (trimmedLabel.length > PROFILE_LINK_MAX_LABEL_LENGTH) return null;
    if (trimmedLabel) label = trimmedLabel;
  }

  const id =
    typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createProfileLinkId();

  return {
    id,
    url: sanitized,
    ...(label ? { label } : {}),
    platform: detectPlatform(sanitized),
  };
}

/**
 * Validate a list of profile links, keeping only the ones that pass every rule
 * (max 5 links, valid https URL, label <= 30 chars, no duplicates by normalized
 * URL, no blocked domains). Errors are keyed by link id, in Bahasa Indonesia.
 */
export function validateProfileLinks(
  list: unknown,
  maxLinks: number = PROFILE_LINK_MAX_LINKS
): { valid: ProfileLink[]; errors: Record<string, string> } {
  const valid: ProfileLink[] = [];
  const errors: Record<string, string> = {};
  if (!Array.isArray(list)) return { valid, errors };

  const seenIds = new Set<string>();

  list.forEach((entry, index) => {
    const obj =
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? (entry as Record<string, unknown>)
        : null;

    let id = `link-${index + 1}`;
    if (obj && typeof obj.id === 'string' && obj.id.trim()) {
      id = obj.id.trim();
    }
    // Guarantee unique error keys even when ids collide in hand-crafted input.
    while (seenIds.has(id)) {
      id = `${id}-${index + 1}`;
    }
    seenIds.add(id);

    if (valid.length >= maxLinks) {
      errors[id] = PROFILE_LINK_MESSAGES.maxLinks(maxLinks);
      return;
    }

    if (!obj) {
      errors[id] = PROFILE_LINK_MESSAGES.urlRequired;
      return;
    }

    if (typeof obj.url !== 'string' || !obj.url.trim()) {
      errors[id] = PROFILE_LINK_MESSAGES.urlRequired;
      return;
    }

    if (obj.url.trim().length > PROFILE_LINK_MAX_URL_LENGTH) {
      errors[id] = PROFILE_LINK_MESSAGES.urlTooLong;
      return;
    }

    const normalized = normalizeProfileLink({ ...obj, id });
    if (!normalized) {
      const label = obj.label;
      if (
        typeof label === 'string' &&
        label.trim().length > PROFILE_LINK_MAX_LABEL_LENGTH
      ) {
        errors[id] = PROFILE_LINK_MESSAGES.labelTooLong;
      } else {
        errors[id] = classifyInvalidUrl(obj.url);
      }
      return;
    }

    if (valid.some(l => l.url === normalized.url)) {
      errors[id] = PROFILE_LINK_MESSAGES.duplicate;
      return;
    }

    valid.push(normalized);
  });

  return { valid, errors };
}

/**
 * Sanitize an untrusted (possibly hand-crafted) stored value into a clean
 * ProfileLink[]. Drop anything invalid; dedupe by normalized URL; cap at the max.
 * Intended for render-time defense in depth.
 */
export function sanitizeStoredLinks(raw: unknown): ProfileLink[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ProfileLink[] = [];
  for (const entry of raw) {
    if (out.length >= PROFILE_LINK_MAX_LINKS) break;
    const normalized = normalizeProfileLink(entry);
    if (!normalized) continue;
    if (seen.has(normalized.url)) continue;
    seen.add(normalized.url);
    out.push(normalized);
  }
  return out;
}
