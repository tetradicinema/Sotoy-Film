import { tokenize } from '../src/utils/linkify.ts';
import { sanitizeExternalUrl, isInternalUrl } from '../src/utils/safeUrl.ts';

const testCases = [
  { name: '1. Plain HTTPS URL', input: 'Check https://example.com for details', expectedType: 'url', expectedHref: 'https://example.com/' },
  { name: '2. WWW URL', input: 'Visit www.example.com today', expectedType: 'url', expectedHref: 'https://www.example.com/' },
  { name: '3. Trailing period', input: 'Go to https://example.com.', expectedType: 'url', expectedHref: 'https://example.com/' },
  { name: '4. Trailing comma', input: 'See https://example.com, and more', expectedType: 'url', expectedHref: 'https://example.com/' },
  { name: '5. Trailing exclamation', input: 'Amazing https://example.com!', expectedType: 'url', expectedHref: 'https://example.com/' },
  { name: '6. Balanced parentheses Wikipedia style', input: 'Read (https://en.wikipedia.org/wiki/Film_(disambiguation)) now', expectedType: 'url', expectedHref: 'https://en.wikipedia.org/wiki/Film_(disambiguation)' },
  { name: '7. URL with @ in path', input: 'Profile at https://medium.com/@username/article', expectedType: 'url', expectedHref: 'https://medium.com/@username/article' },
  { name: '8. Two URLs in one line', input: 'Compare https://google.com and https://example.org', count: 2 },
  { name: '9. Mention next to URL', input: 'Hey @budi check https://example.com', hasMention: true, hasUrl: true },
  { name: '10. Javascript scheme rejected', input: 'Click javascript:alert(1)', expectedHref: null },
  { name: '11. Data scheme rejected', input: 'Visit data:text/html,foo', expectedHref: null },
  { name: '12. Credentials user:pass@ rejected', input: 'Login at https://user:pass@example.com', expectedHref: null },
  { name: '13. Blocked domain lk21 rejected', input: 'Watch at https://lk21.net/movie', expectedHref: null },
  { name: '14. Blocked domain indoxxi rejected', input: 'Watch at https://indoxxi.foo', expectedHref: null },
  { name: '15. Internal URL sotoyfilm', input: 'Read on https://sotoyfilm.my.id/article/1', isInternal: true },
  { name: '16. Very long URL truncated or handled', input: 'https://example.com/' + 'a'.repeat(2500), expectedHref: null },
  { name: '17. Empty string', input: '', tokensCount: 1 },
  { name: '18. Indonesian text with URL at end', input: 'Film terbaik tahun ini bisa dilihat di https://sotoyfilm.my.id.', expectedType: 'url' },
  { name: '19. Vbscript rejected', input: 'vbscript:msgbox(1)', expectedHref: null },
  { name: '20. File scheme rejected', input: 'file:///etc/passwd', expectedHref: null },
  { name: '21. Mailto rejected', input: 'mailto:test@example.com', expectedHref: null },
  { name: '22. Uppercase WWW URL', input: 'Visit WWW.EXAMPLE.COM', expectedType: 'url', expectedHref: 'https://www.example.com/' },
  { name: '23. HTTPS URL with port', input: 'Server at https://localhost:3000/api', expectedType: 'url', expectedHref: 'https://localhost:3000/api' },
  { name: '24. URL with query parameters', input: 'Search at https://example.com/search?q=film&page=1', expectedType: 'url', expectedHref: 'https://example.com/search?q=film&page=1' },
  { name: '25. URL with anchor fragment', input: 'Section at https://example.com/page#section2', expectedType: 'url', expectedHref: 'https://example.com/page#section2' },
  { name: '26. Multiple mentions', input: 'Hello @riansinotoy and @budi_film', mentionCount: 2 },
  { name: '27. Plain text with no links or mentions', input: 'Just a normal sentence without anything special.', tokenType: 'text' },
];

let passed = 0;
let failed = 0;

console.log('Running Linkify & SafeUrl test cases:\n');

for (const tc of testCases) {
  try {
    const tokens = tokenize(tc.input);
    let success = true;
    let details = '';

    if (tc.expectedHref !== undefined) {
      const urlToken = tokens.find(t => t.type === 'url');
      const href = urlToken ? urlToken.href : null;
      if (href !== tc.expectedHref) {
        success = false;
        details = `Expected href ${tc.expectedHref}, got ${href}`;
      }
    }

    if (tc.isInternal !== undefined) {
      const urlToken = tokens.find(t => t.type === 'url');
      if (urlToken && urlToken.href) {
        const internal = isInternalUrl(urlToken.href);
        if (internal !== tc.isInternal) {
          success = false;
          details = `Expected internal ${tc.isInternal}, got ${internal}`;
        }
      }
    }

    if (tc.mentionCount !== undefined) {
      const mentions = tokens.filter(t => t.type === 'mention');
      if (mentions.length !== tc.mentionCount) {
        success = false;
        details = `Expected ${tc.mentionCount} mentions, got ${mentions.length}`;
      }
    }

    if (success) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name} - ${details}`);
      failed++;
    }
  } catch (err: any) {
    console.error(`[ERROR] ${tc.name} - ${err.message}`);
    failed++;
  }
}

console.log(`\nTest results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
