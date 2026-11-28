import type { ConsentState } from '../lib/analyticsConsent';
import { isExcludedAnalyticsRoute } from '../lib/analytics';
import { isClientBotUserAgent } from './clientBotDetection';

/**
 * Single source of truth for whether the global consent banner may render.
 * Used by App.tsx (also for toast offset) and the banner component.
 */
export function isCookieConsentBannerVisible(
  pathname: string,
  consent: ConsentState,
  cookieSettingsOpen: boolean,
  userAgent?: string | null
): boolean {
  if (pathname === '/onboarding') return false;
  if (isExcludedAnalyticsRoute(pathname)) return false;
  if (isClientBotUserAgent(userAgent)) return false;
  return consent === 'unset' || cookieSettingsOpen;
}
