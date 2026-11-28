/// <reference types="vite/client" />
import { getConsentState, subscribeToConsent, type ConsentState } from './analyticsConsent';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export const GA_MEASUREMENT_ID = 'G-Z58S6DL8YH';

const GA_DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}` as const;

let isInitialized = false;
let analyticsStarted = false;
let lastTrackedPath: string | null = null;
let unsubscribeConsent: (() => void) | null = null;

/**
 * Checks whether analytics should be active:
 * Only in production builds AND on the canonical production hostname www.sotoyfilm.my.id.
 *
 * `import.meta.env.PROD` covers the browser bundle; the NODE_ENV fallback lets
 * the Node-based test scripts exercise the same gate.
 */
export function isAnalyticsAllowed(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const viteProd = import.meta.env?.PROD === true;
    const nodeProd =
      typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
    return (viteProd || nodeProd) && window.location.hostname === 'www.sotoyfilm.my.id';
  } catch {
    return false;
  }
}

/**
 * Routes that must NOT be tracked by Google Analytics.
 * Excludes /admin*, /dashboard*, /onboarding, and article authoring/editing workspaces.
 */
export function isExcludedAnalyticsRoute(pathname: string): boolean {
  try {
    const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
    if (clean === '/admin' || clean.startsWith('/admin/')) return true;
    if (clean === '/dashboard' || clean.startsWith('/dashboard/')) return true;
    if (clean === '/onboarding' || clean.startsWith('/onboarding/')) return true;
    if (
      clean === '/tulis-artikel' ||
      clean.startsWith('/tulis-artikel/') ||
      clean === '/write-article' ||
      clean.startsWith('/write-article/') ||
      clean === '/cms' ||
      clean.startsWith('/cms/') ||
      clean === '/workspace' ||
      clean.startsWith('/workspace/') ||
      clean === '/writer' ||
      clean.startsWith('/writer/') ||
      clean === '/penulis' ||
      clean.startsWith('/penulis/')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function pathnameOf(path: string): string {
  try {
    if (typeof window === 'undefined') return path.split(/[?#]/)[0] || '/';
    return new URL(path, window.location.origin).pathname;
  } catch {
    return path.split(/[?#]/)[0] || '/';
  }
}

/**
 * Ensures window.dataLayer and window.gtag exist so events can be queued safely.
 * Never called unless consent is granted.
 */
function ensureDataLayerAndGtag(): ((...args: any[]) => void) | null {
  try {
    if (typeof window === 'undefined') return null;
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () {
        window.dataLayer!.push(arguments);
      };
    }
    return window.gtag;
  } catch {
    return null;
  }
}

function clearQueuedDataLayer(): void {
  try {
    if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
      window.dataLayer.length = 0;
    }
  } catch {
    // Ignore disabled/storage-restricted environments.
  }
}

function gaCookieNames(): string[] {
  const names = new Set<string>(['_ga']);
  try {
    if (typeof document === 'undefined') return Array.from(names);
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (const entry of cookies) {
      const name = entry.split('=')[0]?.trim();
      if (name && /^_ga(?:_|$)/.test(name)) names.add(name);
    }
  } catch {
    // Ignore cookie access errors.
  }
  return Array.from(names);
}

function gaCookieDomains(): Array<string | null> {
  const domains: string[] = [];
  try {
    if (typeof window === 'undefined') return [null];
    const host = window.location.hostname;
    if (host) {
      domains.push(host, `.${host}`);
      const parts = host.split('.');
      if (parts.length > 2) {
        const parent = parts.slice(1).join('.');
        domains.push(parent, `.${parent}`);
      }
    }
  } catch {
    // Ignore unavailable location.
  }
  return domains.length > 0 ? domains : [null];
}

function deleteGaCookies(): void {
  if (typeof document === 'undefined') return;
  for (const name of gaCookieNames()) {
    for (const domain of gaCookieDomains()) {
      const domainPart = domain ? `; Domain=${domain}` : '';
      try {
        document.cookie =
          `${name}=; Path=/${domainPart}; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax`;
      } catch {
        // Ignore cookie write errors.
      }
    }
  }
}

function disableAnalytics(): void {
  try {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>)[GA_DISABLE_KEY] = true;
    }
  } catch {
    // Ignore unavailable window.
  }
  clearQueuedDataLayer();
  deleteGaCookies();
  lastTrackedPath = null;
}

function clearGaDisableFlag(): void {
  try {
    if (typeof window !== 'undefined') {
      delete (window as unknown as Record<string, unknown>)[GA_DISABLE_KEY];
    }
  } catch {
    // Ignore unavailable window.
  }
}

function appendGtagScript(): void {
  try {
    if (typeof document === 'undefined') return;
    if (document.querySelector(`script[src*="${GA_MEASUREMENT_ID}"]`)) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  } catch {
    // Never break the UI because analytics failed to load.
  }
}

/** Start GA4 immediately once consent has been granted. */
function startAnalytics(): void {
  if (!isAnalyticsAllowed() || getConsentState() !== 'granted') return;
  clearGaDisableFlag();
  if (analyticsStarted) return;

  const gtag = ensureDataLayerAndGtag();
  if (!gtag) return;

  analyticsStarted = true;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
  appendGtagScript();
}

function sendCurrentPageView(): void {
  try {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname + window.location.search;
    if (isExcludedAnalyticsRoute(pathnameOf(path))) return;
    trackPageView(path);
  } catch {
    // Ignore unavailable location.
  }
}

function applyConsentState(state: ConsentState): void {
  if (state === 'granted') {
    startAnalytics();
    sendCurrentPageView();
    return;
  }

  // denial, withdrawal, or externally cleared consent must stop all sends.
  disableAnalytics();
}

/**
 * Wires the consent subscription. Safe to call once on client mount; further
 * calls are no-ops. Consent changes take effect immediately via the listener.
 */
export function initAnalytics(): void {
  if (isInitialized) return;
  isInitialized = true;

  applyConsentState(getConsentState());
  unsubscribeConsent = subscribeToConsent(state => applyConsentState(state));
}

/**
 * Tracks a page_view event with GA4. Consent-gated and deduped per path so a
 * grant-triggered page_view and the router effect cannot double-count.
 */
export function trackPageView(path: string): void {
  try {
    if (!isAnalyticsAllowed()) return;
    if (getConsentState() !== 'granted') return;
    if (isExcludedAnalyticsRoute(pathnameOf(path))) return;
    if (lastTrackedPath === path) return;

    const payload = {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    };

    const gtag = ensureDataLayerAndGtag();
    if (gtag) {
      gtag('event', 'page_view', payload);
    } else if (window.dataLayer) {
      window.dataLayer.push(['event', 'page_view', payload]);
    }
    lastTrackedPath = path;
  } catch {
    // Fail silently: never break UI.
  }
}

/** Test-only reset for isolated Node test cases. */
export function resetAnalyticsForTests(): void {
  try {
    unsubscribeConsent?.();
  } catch {
    // Ignore broken unsubscribe.
  }
  unsubscribeConsent = null;
  isInitialized = false;
  analyticsStarted = false;
  lastTrackedPath = null;
  try {
    if (typeof window !== 'undefined') {
      delete window.dataLayer;
      delete window.gtag;
      delete (window as unknown as Record<string, unknown>)[GA_DISABLE_KEY];
    }
  } catch {
    // Ignore unavailable window.
  }
}
