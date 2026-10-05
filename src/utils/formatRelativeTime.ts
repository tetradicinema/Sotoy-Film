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
 * Converts an ISO string, timestamp, or Date into a descriptive relative label:
 * - Clock skew / future / under 60 seconds: "baru saja diposting"
 * - Under 60 minutes: "{n} menit yang lalu"
 * - Under 24 hours: "{n} jam yang lalu"
 * - Under 7 days: "{n} hari yang lalu"
 * - Under ~4 weeks: "{n} minggu yang lalu"
 * - Under 12 months: "{n} bulan yang lalu"
 * - 1 year or more: "{n} tahun yang lalu"
 */
export function formatRelativeTime(dateInput: string | number | Date | null | undefined): string {
  const date = parseDateSafely(dateInput);
  if (!date) {
    if (typeof dateInput === 'string' && dateInput.trim()) {
      return dateInput;
    }
    return 'baru saja diposting';
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  // Clock skew (timestamp slightly in the future) or less than 60 seconds
  if (diffSec < 60) {
    return 'baru saja diposting';
  }

  // Under 60 minutes
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} menit yang lalu`;
  }

  // Under 24 hours (jam)
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} jam yang lalu`;
  }

  // Under 7 days (hari)
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} hari yang lalu`;
  }

  // Under ~4 weeks (minggu)
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks} minggu yang lalu`;
  }

  // Under 12 months (bulan)
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} bulan yang lalu`;
  }

  // 1 year or more (tahun)
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears >= 1) {
    return `${diffYears} tahun yang lalu`;
  }

  // Fallback: short absolute date
  const day = date.getDate();
  const month = ID_MONTHS_SHORT[date.getMonth()] || '';
  const year = date.getFullYear();

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
