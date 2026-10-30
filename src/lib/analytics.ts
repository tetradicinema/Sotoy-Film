/// <reference types="vite/client" />
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = 'G-Z58S6DL8YH';

let isInitialized = false;

/**
 * Checks whether analytics should be active:
 * Only in production builds AND on the canonical production hostname www.sotoyfilm.my.id.
 */
export function isAnalyticsAllowed(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const isProd = import.meta.env.PROD === true;
    return isProd && window.location.hostname === 'www.sotoyfilm.my.id';
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

/**
 * Ensures window.dataLayer and window.gtag exist so events can be queued safely
 * even before the remote gtag.js script is fetched and evaluated.
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

/**
 * Initializes Google Analytics 4 (gtag.js):
 * - Verifies production environment and hostname
 * - Sets up window.dataLayer and gtag stub
 * - Configures GA4 with send_page_view: false
 * - Defers loading the remote script until after window 'load' + requestIdleCallback (fallback setTimeout 2000)
 * - Guards against double initialization and wraps everything in try/catch
 */
export function initAnalytics(): void {
  try {
    if (isInitialized) return;
    if (!isAnalyticsAllowed()) return;
    isInitialized = true;

    const gtag = ensureDataLayerAndGtag();
    if (!gtag) return;

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

    const loadScript = () => {
      const schedule = (cb: () => void) => {
        if ('requestIdleCallback' in window && typeof (window as any).requestIdleCallback === 'function') {
          (window as any).requestIdleCallback(cb, { timeout: 2000 });
        } else {
          setTimeout(cb, 2000);
        }
      };

      schedule(() => {
        try {
          if (document.querySelector(`script[src*="${GA_MEASUREMENT_ID}"]`)) return;
          const script = document.createElement('script');
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
          document.head.appendChild(script);
        } catch {
          // Ignore script creation/insertion error
        }
      });
    };

    if (document.readyState === 'complete') {
      loadScript();
    } else {
      window.addEventListener('load', loadScript, { once: true });
    }
  } catch {
    // Fail silently: never break UI
  }
}

/**
 * Tracks a page_view event with GA4.
 * Pre-script calls are queued on window.dataLayer.
 */
export function trackPageView(path: string): void {
  try {
    if (!isAnalyticsAllowed()) return;

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
  } catch {
    // Fail silently: never break UI
  }
}
