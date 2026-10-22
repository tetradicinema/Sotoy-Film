/**
 * Pure helpers for finding and replacing inline base64 image data URIs.
 *
 * These helpers are intentionally Node-safe (no DOM) because they are shared
 * by the one-off article image migration script and its tests. Data URIs are
 * treated as opaque strings: a base64 payload never contains quotes, spaces or
 * parentheses, so exact-substring replacement is safe inside markdown, HTML
 * and JSON strings.
 */

export type ArticleImageField = 'coverImage' | 'ogImage' | 'content' | 'contentJson';

export interface ParsedDataImageUri {
  mimeType: string;
  buffer: Buffer;
  extension: 'webp' | 'jpeg' | 'png' | 'gif';
}

export interface ArticleImageMigrationPlan {
  /** Fields containing at least one inline image. */
  affectedFields: ArticleImageField[];
  /** Unique data URIs per affected field, in field order. */
  fieldUris: Partial<Record<ArticleImageField, string[]>>;
  /** All distinct data URIs across the article, in first-seen order. */
  distinctUris: string[];
  distinctImageCount: number;
  /** Approximate decoded size of the distinct images, in bytes. */
  totalBase64Bytes: number;
}

export const ARTICLE_IMAGE_FIELDS: ArticleImageField[] = [
  'coverImage',
  'ogImage',
  'content',
  'contentJson',
];

const MIME_EXTENSIONS: Record<string, ParsedDataImageUri['extension']> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
};

const DATA_IMAGE_URI_PATTERN =
  /data:image\/[a-zA-Z0-9.+-]+(?:;[a-zA-Z0-9=.+-]+)*;base64,[a-zA-Z0-9+/=]+/g;

const FULL_DATA_IMAGE_URI_PATTERN =
  /^data:image\/([a-zA-Z0-9.+-]+)((?:;[a-zA-Z0-9=.+-]+)*);base64,([a-zA-Z0-9+/=]+)$/i;

/**
 * Returns every inline base64 image data URI found in a string, including
 * duplicate occurrences. Non-string and empty values return an empty array.
 */
export function extractDataImageUris(text: unknown): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  return text.match(DATA_IMAGE_URI_PATTERN) ?? [];
}

/**
 * Estimates decoded bytes from the base64 payload of a data URI. Useful for
 * reporting even when the MIME type is unsupported.
 */
export function estimateDataImageBytes(uri: string): number {
  const commaIndex = uri.indexOf(',');
  if (commaIndex === -1) return 0;
  const payload = uri.slice(commaIndex + 1);
  if (!payload) return 0;
  const padding = (payload.match(/=+$/) ?? [''])[0].length;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

const isValidBase64Payload = (payload: string): boolean => {
  if (!payload) return false;
  if (!/^[a-zA-Z0-9+/]*={0,2}$/.test(payload)) return false;
  if (payload.length % 4 === 1) return false;
  if (payload.includes('=') && payload.length % 4 !== 0) return false;
  return true;
};

/**
 * Parses a supported image data URI into its MIME type, decoded bytes and file
 * extension. Returns null for malformed payloads and unsupported MIME types.
 */
export function parseDataImageUri(uri: string): ParsedDataImageUri | null {
  if (typeof uri !== 'string' || !uri) return null;

  const match = uri.match(FULL_DATA_IMAGE_URI_PATTERN);
  if (!match) return null;

  const mimeType = `image/${match[1].toLowerCase()}`;
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension) return null;

  const payload = match[3];
  if (!isValidBase64Payload(payload)) return null;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(payload, 'base64');
  } catch {
    return null;
  }

  if (!buffer.length) return null;
  return { mimeType, buffer, extension };
}

/**
 * Replaces every data URI present in `text` using the provided lookup map.
 * Unknown, non-image and https URLs are left exactly as they are.
 */
export function replaceDataImageUris(
  text: unknown,
  replacements: ReadonlyMap<string, string> | Record<string, string>
): string {
  if (typeof text !== 'string' || text.length === 0) return '';

  const lookup =
    replacements instanceof Map
      ? replacements
      : new Map(Object.entries(replacements ?? {}));

  return text.replace(DATA_IMAGE_URI_PATTERN, match => lookup.get(match) ?? match);
}

/**
 * Builds a migration plan for an article document: which fields contain inline
 * images and the distinct data URIs that need to be uploaded.
 */
export function planArticleImageMigration(article: unknown): ArticleImageMigrationPlan {
  const source =
    article && typeof article === 'object' ? (article as Record<string, unknown>) : {};

  const affectedFields: ArticleImageField[] = [];
  const fieldUris: Partial<Record<ArticleImageField, string[]>> = {};
  const distinctUris: string[] = [];
  const seen = new Set<string>();
  let totalBase64Bytes = 0;

  for (const field of ARTICLE_IMAGE_FIELDS) {
    const occurrences = extractDataImageUris(source[field]);
    if (occurrences.length === 0) continue;

    const uniqueForField = Array.from(new Set(occurrences));
    affectedFields.push(field);
    fieldUris[field] = uniqueForField;

    for (const uri of uniqueForField) {
      if (seen.has(uri)) continue;
      seen.add(uri);
      distinctUris.push(uri);
      totalBase64Bytes += estimateDataImageBytes(uri);
    }
  }

  return {
    affectedFields,
    fieldUris,
    distinctUris,
    distinctImageCount: distinctUris.length,
    totalBase64Bytes,
  };
}
