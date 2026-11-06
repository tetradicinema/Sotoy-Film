/**
 * Edge-safe ISO 8601 date helpers.
 *
 * Search engines require a full datetime with an explicit timezone for
 * VideoObject.uploadDate and article date fields. These helpers only accept
 * machine-readable ISO strings — never free-text dates such as "6 Nov 2026".
 */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?([Zz]|[+-]\d{2}:\d{2})?$/;

const DEFAULT_TIMEZONE = '+07:00';

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day <= daysInMonth[month - 1];
}

function isValidTime(hour: number, minute: number, second?: number): boolean {
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second !== undefined && (second < 0 || second > 59)) return false;
  return true;
}

function isValidTimezoneOffset(timezone: string): boolean {
  if (timezone === 'Z' || timezone === 'z') return true;

  const match = timezone.match(/^[+-](\d{2}):(\d{2})$/);
  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59;
}

/**
 * Normalizes a machine-readable date string into a full ISO 8601 datetime with
 * an explicit timezone.
 *
 * - "YYYY-MM-DD" -> "YYYY-MM-DDT00:00:00+07:00"
 * - ISO datetime with a timezone (Z / +hh:mm / -hh:mm) -> returned unchanged
 * - ISO datetime without a timezone -> appended with "+07:00"
 * - Anything else (free text, empty, non-string, impossible dates) -> undefined
 */
export function toIsoWithTimezone(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();

  const dateOnly = trimmed.match(DATE_ONLY_RE);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    if (!isValidDateParts(year, month, day)) return undefined;
    return `${trimmed}T00:00:00${DEFAULT_TIMEZONE}`;
  }

  const dateTime = trimmed.match(DATE_TIME_RE);
  if (dateTime) {
    const year = Number(dateTime[1]);
    const month = Number(dateTime[2]);
    const day = Number(dateTime[3]);
    const hour = Number(dateTime[4]);
    const minute = Number(dateTime[5]);
    const second = dateTime[6] !== undefined ? Number(dateTime[6]) : undefined;
    const timezone = dateTime[8];

    if (!isValidDateParts(year, month, day)) return undefined;
    if (!isValidTime(hour, minute, second)) return undefined;
    if (timezone && !isValidTimezoneOffset(timezone)) return undefined;

    return timezone ? trimmed : `${trimmed}${DEFAULT_TIMEZONE}`;
  }

  return undefined;
}

/**
 * Picks the best valid ISO datetime for an article.
 *
 * - published: publishedAtTimestamp, then publishedAt
 * - modified: updatedAt, then the published result
 */
export function pickArticleIsoDate(
  article:
    | {
        publishedAtTimestamp?: string;
        publishedAt?: string;
        updatedAt?: string;
      }
    | null
    | undefined,
  kind: 'published' | 'modified'
): string | undefined {
  if (!article) return undefined;

  if (kind === 'modified') {
    const updatedAt = toIsoWithTimezone(article.updatedAt);
    if (updatedAt) return updatedAt;
  }

  return (
    toIsoWithTimezone(article.publishedAtTimestamp) ||
    toIsoWithTimezone(article.publishedAt)
  );
}
