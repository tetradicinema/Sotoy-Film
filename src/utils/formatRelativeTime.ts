/**
 * Utility for formatting timestamps into short, Indonesian-localized relative labels
 * matching social media conventions (e.g., "baru saja", "5m", "4j", "3h", "2mg", "12 Jan").
 */

const ID_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const ID_MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Parses any date input safely. Returns null if invalid or missing.
 */
function parseDateSafely(dateInput: string | number | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Converts an ISO string, timestamp, or Date into a concise relative label:
 * - Clock skew / future / under 60 seconds: "baru saja"
 * - Under 60 minutes: "{n}m"
 * - Under 24 hours: "{n}j" (jam)
 * - Under 7 days: "{n}h" (hari)
 * - Under 35 days (~5 weeks): "{n}mg" (minggu)
 * - Beyond that: short absolute date ("12 Jan" or "12 Jan 2023" if different year)
 */
export function formatRelativeTime(dateInput: string | number | Date | null | undefined): string {
  const date = parseDateSafely(dateInput);
  if (!date) {
    return typeof dateInput === 'string' && dateInput.trim() ? dateInput : 'baru saja';
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  // Clock skew (timestamp slightly in the future) or less than 60 seconds
  if (diffSec < 60) {
    return 'baru saja';
  }

  // Under 60 minutes
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m`;
  }

  // Under 24 hours (jam)
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}j`;
  }

  // Under 7 days (hari)
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}h`;
  }

  // Under ~5 weeks (minggu)
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks}mg`;
  }

  // Beyond ~5 weeks: absolute date
  const day = date.getDate();
  const month = ID_MONTHS_SHORT[date.getMonth()] || '';
  const year = date.getFullYear();
  const currentYear = new Date(now).getFullYear();

  if (year === currentYear) {
    return `${day} ${month}`;
  }

  return `${day} ${month} ${year}`;
}

/**
 * Returns a human-friendly full timestamp in Indonesian for hover tooltips (native title attribute).
 * e.g. "18 September 2026, 16:28"
 */
export function formatFullDateTime(dateInput: string | number | Date | null | undefined): string {
  const date = parseDateSafely(dateInput);
  if (!date) {
    return typeof dateInput === 'string' ? dateInput : '';
  }

  const day = date.getDate();
  const month = ID_MONTHS_FULL[date.getMonth()] || ID_MONTHS_SHORT[date.getMonth()] || '';
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
}

/**
 * Formats ISO releaseDate string into short localized date string (e.g. "12 Jul 2024").
 */
export function formatReleaseDate(dateInput: string | null | undefined): string {
  if (!dateInput) return '';
  const date = parseDateSafely(dateInput);
  if (!date) return dateInput;

  const day = date.getDate();
  const month = ID_MONTHS_SHORT[date.getMonth()] || '';
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}
