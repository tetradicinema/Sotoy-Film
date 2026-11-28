import { BOT_PATTERNS } from '../lib/botPatterns';

/**
 * Client-side crawler check used to keep interactive UI (currently the cookie
 * consent banner) out of crawler renderers. It mirrors the edge detector's
 * patterns and generic fallback; the edge detector itself remains the source
 * of truth for middleware responses.
 */
export function isClientBotUserAgent(userAgent?: string | null): boolean {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : null);
  if (!ua) return false;

  const value = ua.toLowerCase();
  if (BOT_PATTERNS.some(pattern => value.includes(pattern))) return true;
  return value.includes('bot') || value.includes('crawler') || value.includes('spider');
}

export function isClientBot(): boolean {
  return isClientBotUserAgent();
}
