import assert from 'node:assert/strict';

process.env.NODE_ENV = 'production';

const GA_ID = 'G-Z58S6DL8YH';
const DISABLE_KEY = `ga-disable-${GA_ID}`;
const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const BOT_UA = 'Googlebot/2.1 (+http://www.google.com/bot.html)';

interface EnvOptions {
  consent?: string | null;
  path?: string;
  search?: string;
  hostname?: string;
  cookies?: Record<string, string>;
}

interface Env {
  window: any;
  document: any;
  scripts: Array<{ src: string; async: boolean }>;
  cookieWrites: string[];
  cookieJar: Map<string, string>;
  getCookie: (name: string) => string | undefined;
}

function createEnv(options: EnvOptions = {}): Env {
  const hostname = options.hostname ?? 'www.sotoyfilm.my.id';
  const path = options.path ?? '/';
  const search = options.search ?? '';
  const storage = new Map<string, string>();
  if (typeof options.consent === 'string') {
    storage.set('sotoy_cookie_consent', options.consent);
  }

  const localStorage = {
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    setItem: (key: string, value: string) => {
      storage.set(key, String(value));
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
  };

  const scripts: Array<{ src: string; async: boolean }> = [];
  const cookieWrites: string[] = [];
  const cookieJar = new Map<string, string>(Object.entries(options.cookies ?? {}));

  const documentMock: any = {
    title: 'Sotoy Film',
    head: {
      appendChild: (node: any) => {
        scripts.push(node);
        return node;
      },
    },
    createElement: (tagName: string) => {
      assert.equal(tagName.toLowerCase(), 'script');
      return { tagName: 'SCRIPT', src: '', async: false };
    },
    querySelector: (selector: string) => {
      if (!selector.includes(GA_ID)) return null;
      return scripts.find(script => script.src.includes(GA_ID)) ?? null;
    },
    get cookie() {
      return Array.from(cookieJar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
    },
    set cookie(value: string) {
      cookieWrites.push(value);
      const pair = value.split(';')[0] ?? '';
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator).trim();
      if (/expires=Thu, 01 Jan 1970|max-age=0/i.test(value)) {
        cookieJar.delete(name);
      } else {
        cookieJar.set(name, pair.slice(separator + 1).trim());
      }
    },
  };

  const location = {
    hostname,
    pathname: path,
    search,
    origin: `https://${hostname}`,
    href: `https://${hostname}${path}${search}`,
  };
  const windowMock: any = { location, localStorage, document: documentMock };

  (globalThis as any).window = windowMock;
  (globalThis as any).document = documentMock;

  return {
    window: windowMock,
    document: documentMock,
    scripts,
    cookieWrites,
    cookieJar,
    getCookie: (name: string) => cookieJar.get(name),
  };
}

const analytics = await import('../src/lib/analytics');
const consentStore = await import('../src/lib/analyticsConsent');
const visibility = await import('../src/utils/cookieConsentVisibility');

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.error(`✗ ${name}`);
  }
}

function beginCase(options: EnvOptions = {}): Env {
  const env = createEnv(options);
  analytics.resetAnalyticsForTests();
  return env;
}

function pageViews(env: Env): number {
  const entries: any[] = env.window.dataLayer ?? [];
  return entries.filter(entry => entry?.[0] === 'event' && entry?.[1] === 'page_view').length;
}

function scriptLoaded(env: Env): boolean {
  return env.scripts.some(script => script.src.includes(GA_ID));
}

console.log('=== Running Cookie Consent Tests ===\n');

// unset: no stub, no script, no events
{
  const env = beginCase();
  analytics.initAnalytics();
  analytics.trackPageView('/artikel/contoh');
  check('unset: gtag stub is not created', env.window.dataLayer === undefined && env.window.gtag === undefined);
  check('unset: gtag.js is not appended', !scriptLoaded(env));
  check('unset: no page_view is sent', pageViews(env) === 0);
}

// granted: immediate script load and exactly one page_view
{
  const env = beginCase({ consent: 'granted' });
  analytics.initAnalytics();
  analytics.trackPageView('/');
  check('granted: gtag.js is appended immediately', scriptLoaded(env));
  check('granted: exactly one page_view is sent', pageViews(env) === 1);
  check('granted: ga-disable flag is absent', env.window[DISABLE_KEY] === undefined);
  const entries: any[] = env.window.dataLayer ?? [];
  check(
    'granted: js/config are queued with send_page_view disabled',
    entries.some(entry => entry?.[0] === 'js') &&
      entries.some(
        entry => entry?.[0] === 'config' && entry?.[1] === GA_ID && entry?.[2]?.send_page_view === false
      )
  );
}

// denied: no script, no events, GA disabled, analytics cookies removed
{
  const env = beginCase({
    consent: 'denied',
    cookies: {
      _ga: 'GA1.1.1234567890',
      _ga_Z58S6DL8YH: 'GS1.1.1234567890.1.1.1234567890.0',
      _gid: 'GA1.2.9876543210',
    },
  });
  analytics.initAnalytics();
  check('denied: gtag.js is not appended', !scriptLoaded(env));
  check('denied: no page_view is sent', pageViews(env) === 0);
  check('denied: ga-disable flag is true', env.window[DISABLE_KEY] === true);
  check('denied: _ga cookie is removed', env.getCookie('_ga') === undefined);
  check('denied: _ga_* cookie is removed', env.getCookie('_ga_Z58S6DL8YH') === undefined);
  check('denied: unrelated _gid cookie is preserved', env.getCookie('_gid') === 'GA1.2.9876543210');
  check(
    'denied: deletion tries current and parent domain variants at path /',
    env.cookieWrites.some(write => write.includes('Path=/') && write.includes('Domain=www.sotoyfilm.my.id')) &&
      env.cookieWrites.some(write => write.includes('Domain=.www.sotoyfilm.my.id')) &&
      env.cookieWrites.some(write => write.includes('Domain=sotoyfilm.my.id')) &&
      env.cookieWrites.some(write => write.includes('Domain=.sotoyfilm.my.id'))
  );
}

// withdrawal after grant stops all later sends
{
  const env = beginCase({ consent: 'granted' });
  analytics.initAnalytics();
  check('withdrawal: initial grant sent one page_view', pageViews(env) === 1);
  consentStore.setConsentState('denied');
  check('withdrawal: queued dataLayer entries are cleared', pageViews(env) === 0);
  check('withdrawal: ga-disable flag is true', env.window[DISABLE_KEY] === true);
  analytics.trackPageView('/artikel/setelah-menolak');
  check('withdrawal: later trackPageView calls are no-ops', pageViews(env) === 0);
}

// grant after deny in the same session
{
  const env = beginCase({ consent: 'denied' });
  analytics.initAnalytics();
  check('grant-after-deny: started denied with ga-disable true', env.window[DISABLE_KEY] === true);
  consentStore.setConsentState('granted');
  check('grant-after-deny: ga-disable flag is cleared', env.window[DISABLE_KEY] === undefined);
  check('grant-after-deny: gtag.js is appended', scriptLoaded(env));
  check('grant-after-deny: exactly one page_view is sent', pageViews(env) === 1);
}

// excluded routes: hidden banner and no page_view
{
  const env = beginCase({ consent: 'granted', path: '/admin/users' });
  analytics.initAnalytics();
  analytics.trackPageView('/admin/users');
  check('excluded route: no page_view is sent', pageViews(env) === 0);
  check(
    'excluded route: banner is hidden even with unset consent and settings open',
    !visibility.isCookieConsentBannerVisible('/admin/users', 'unset', true, HUMAN_UA)
  );
}

// bots: banner is hidden
{
  beginCase();
  check('bot UA: banner is hidden', !visibility.isCookieConsentBannerVisible('/', 'unset', true, BOT_UA));
  check(
    'human UA: banner is visible with unset consent',
    visibility.isCookieConsentBannerVisible('/', 'unset', true, HUMAN_UA)
  );
}

// corrupted localStorage value is treated as unset
{
  const env = beginCase({ consent: 'totally-not-a-valid-state' });
  check('corrupted value: parsed as unset', consentStore.getConsentState() === 'unset');
  analytics.initAnalytics();
  check('corrupted value: gtag.js is not appended', !scriptLoaded(env));
  check('corrupted value: no page_view is sent', pageViews(env) === 0);
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
