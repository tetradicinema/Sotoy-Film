import {
  GA_MEASUREMENT_ID,
  isExcludedAnalyticsRoute,
} from '../src/lib/analytics';
import {
  CONSENT_STORAGE_KEY,
  isConsentState,
  parseConsentState,
} from '../src/lib/analyticsConsent';
import { isCookieConsentBannerVisible } from '../src/utils/cookieConsentVisibility';
import { isClientBotUserAgent } from '../src/utils/clientBotDetection';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ ${message}`);
  }
}

console.log('=== Running Analytics Tests ===\n');

// 1. Measurement ID verification
assert(GA_MEASUREMENT_ID === 'G-Z58S6DL8YH', 'Measurement ID is G-Z58S6DL8YH');

// 2. Excluded routes tests
assert(isExcludedAnalyticsRoute('/admin'), '/admin is excluded');
assert(isExcludedAnalyticsRoute('/admin/'), '/admin/ is excluded');
assert(isExcludedAnalyticsRoute('/admin/analytics'), '/admin/analytics is excluded');
assert(isExcludedAnalyticsRoute('/admin/users'), '/admin/users is excluded');
assert(isExcludedAnalyticsRoute('/admin/catalog'), '/admin/catalog is excluded');
assert(isExcludedAnalyticsRoute('/admin/homepage'), '/admin/homepage is excluded');
assert(isExcludedAnalyticsRoute('/admin/submissions'), '/admin/submissions is excluded');

assert(isExcludedAnalyticsRoute('/dashboard'), '/dashboard is excluded');
assert(isExcludedAnalyticsRoute('/dashboard/stats'), '/dashboard/stats is excluded');

assert(isExcludedAnalyticsRoute('/onboarding'), '/onboarding is excluded');
assert(isExcludedAnalyticsRoute('/onboarding/step-1'), '/onboarding/step-1 is excluded');

assert(isExcludedAnalyticsRoute('/tulis-artikel'), '/tulis-artikel is excluded');
assert(isExcludedAnalyticsRoute('/write-article'), '/write-article is excluded');
assert(isExcludedAnalyticsRoute('/cms'), '/cms is excluded');
assert(isExcludedAnalyticsRoute('/workspace'), '/workspace is excluded');
assert(isExcludedAnalyticsRoute('/writer'), '/writer is excluded');
assert(isExcludedAnalyticsRoute('/penulis'), '/penulis is excluded');

// 3. Normal public routes MUST NOT be excluded
assert(!isExcludedAnalyticsRoute('/'), '/ is tracked');
assert(!isExcludedAnalyticsRoute('/film-database'), '/film-database is tracked');
assert(!isExcludedAnalyticsRoute('/film/dune-part-two'), '/film/dune-part-two is tracked');
assert(!isExcludedAnalyticsRoute('/rekomendasi-film'), '/rekomendasi-film is tracked');
assert(!isExcludedAnalyticsRoute('/artikel/review-film-bagus'), '/artikel/review-film-bagus is tracked');
assert(!isExcludedAnalyticsRoute('/kategori/movies'), '/kategori/movies is tracked');
assert(!isExcludedAnalyticsRoute('/komunitas'), '/komunitas is tracked');
assert(!isExcludedAnalyticsRoute('/buzz/123'), '/buzz/123 is tracked');
assert(!isExcludedAnalyticsRoute('/user/johndoe'), '/user/johndoe is tracked');
assert(!isExcludedAnalyticsRoute('/tentang-kami'), '/tentang-kami is tracked');
assert(!isExcludedAnalyticsRoute('/kebijakan-privasi'), '/kebijakan-privasi is tracked');

// 4. Pure consent helpers
const humanUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

assert(CONSENT_STORAGE_KEY === 'sotoy_cookie_consent', 'Consent key is sotoy_cookie_consent');
assert(isConsentState('unset') && isConsentState('granted') && isConsentState('denied'), 'Known consent states are valid');
assert(!isConsentState('yes') && !isConsentState(''), 'Invalid consent states are rejected');
assert(parseConsentState('granted') === 'granted', 'parseConsentState keeps granted');
assert(parseConsentState('denied') === 'denied', 'parseConsentState keeps denied');
assert(parseConsentState('unset') === 'unset', 'parseConsentState keeps unset');
assert(parseConsentState('corrupted') === 'unset', 'parseConsentState falls back to unset');
assert(parseConsentState(null) === 'unset', 'parseConsentState handles null');

// 5. Pure banner-visibility and client bot helpers
assert(isClientBotUserAgent('Googlebot/2.1'), 'Googlebot UA is detected on the client');
assert(!isClientBotUserAgent(humanUserAgent), 'Human UA is not detected as a bot');
assert(
  isCookieConsentBannerVisible('/', 'unset', false, humanUserAgent),
  'Banner is visible on a public route with unset consent'
);
assert(
  isCookieConsentBannerVisible('/', 'granted', true, humanUserAgent),
  'Banner is visible on a public route when settings are reopened'
);
assert(
  !isCookieConsentBannerVisible('/', 'granted', false, humanUserAgent),
  'Banner is hidden after a stored choice'
);
assert(
  !isCookieConsentBannerVisible('/admin/users', 'unset', true, humanUserAgent),
  'Banner is hidden on admin routes'
);
assert(
  !isCookieConsentBannerVisible('/onboarding', 'unset', true, humanUserAgent),
  'Banner is hidden on onboarding'
);
assert(
  !isCookieConsentBannerVisible('/', 'unset', true, 'Googlebot/2.1'),
  'Banner is hidden for crawlers'
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
