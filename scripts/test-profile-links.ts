import { ProfileLink } from '../src/types/index.ts';
import {
  detectPlatform,
  normalizeProfileLink,
  validateProfileLinks,
  sanitizeStoredLinks,
  PROFILE_LINK_MAX_LINKS,
  PROFILE_LINK_MAX_URL_LENGTH,
  PROFILE_LINK_MAX_LABEL_LENGTH,
} from '../src/utils/profileLinks.ts';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function makeLink(url: string, id: string, label?: string): ProfileLink {
  return { id, url, ...(label ? { label } : {}), platform: 'website' };
}

console.log('Running Profile Links test cases:\n');

// --- detectPlatform ---
console.log('Platform detection:');
check('1. instagram.com', detectPlatform('https://instagram.com/sotoy') === 'instagram');
check('2. www.instagram.com strips www', detectPlatform('https://www.instagram.com/p/x') === 'instagram');
check('3. tiktok.com bare domain typed by user', detectPlatform('tiktok.com/@sotoy') === 'tiktok');
check('4. youtube.com', detectPlatform('https://youtube.com/@sotoyfilm') === 'youtube');
check('5. youtu.be', detectPlatform('https://youtu.be/abc123') === 'youtube');
check('6. x.com', detectPlatform('https://x.com/sotoy') === 'x');
check('7. twitter.com maps to x', detectPlatform('https://twitter.com/sotoy') === 'x');
check('8. facebook.com', detectPlatform('https://facebook.com/sotoy') === 'facebook');
check('9. fb.com maps to facebook', detectPlatform('https://fb.com/sotoy') === 'facebook');
check('10. threads.net', detectPlatform('https://threads.net/@sotoy') === 'threads');
check('11. threads.com maps to threads', detectPlatform('https://threads.com/@sotoy') === 'threads');
check('12. linkedin.com', detectPlatform('https://linkedin.com/in/sotoy') === 'linkedin');
check('13. github.com', detectPlatform('https://github.com/sotoy') === 'github');
check('14. open.spotify.com', detectPlatform('https://open.spotify.com/user/sotoy') === 'spotify');
check('15. unknown domain falls back to website', detectPlatform('https://example.com/sotoy') === 'website');
check('16. mobile subdomain stripped (m.tiktok.com)', detectPlatform('https://m.tiktok.com/@sotoy') === 'tiktok');
check('17. empty string falls back to website', detectPlatform('') === 'website');
check('18. javascript: URL falls back to website (no throw)', detectPlatform('javascript:alert(1)') === 'website');

// --- normalizeProfileLink ---
console.log('\nNormalize:');
const bare = normalizeProfileLink({ id: 'a', url: 'instagram.com/sotoy' });
check('19. bare domain gets https:// prepended', bare !== null && bare.url === 'https://instagram.com/sotoy');
check('20. platform auto-detected in normalized link', bare !== null && bare.platform === 'instagram');

const httpUpgraded = normalizeProfileLink({ id: 'b', url: 'http://tiktok.com/@sotoy' });
check('21. http:// upgraded to https://', httpUpgraded !== null && httpUpgraded.url === 'https://tiktok.com/@sotoy');

check('22. javascript: rejected', normalizeProfileLink({ id: 'c', url: 'javascript:alert(1)' }) === null);
check('23. data: rejected', normalizeProfileLink({ id: 'd', url: 'data:text/html,foo' }) === null);
check('24. credentials rejected', normalizeProfileLink({ id: 'e', url: 'https://user:pass@example.com' }) === null);
check(
  '25. url > 200 chars rejected',
  normalizeProfileLink({ id: 'f', url: 'https://example.com/' + 'a'.repeat(PROFILE_LINK_MAX_URL_LENGTH) }) === null
);
check(
  '26. label > 30 chars rejected',
  normalizeProfileLink({ id: 'g', url: 'https://example.com', label: 'x'.repeat(PROFILE_LINK_MAX_LABEL_LENGTH + 1) }) === null
);
const trimmed = normalizeProfileLink({ id: 'h', url: '  https://github.com/sotoy  ', label: '  GitHub  ' });
check('27. url and label trimmed', trimmed !== null && trimmed.url === 'https://github.com/sotoy' && trimmed.label === 'GitHub');
check('28. empty label becomes undefined', normalizeProfileLink({ id: 'i', url: 'https://example.com', label: '   ' })?.label === undefined);
check('29. missing id gets generated', normalizeProfileLink({ url: 'https://example.com' })?.id.startsWith('link-') === true);
check('30. blocked domain lk21 rejected', normalizeProfileLink({ id: 'j', url: 'https://lk21.example/movie' }) === null);
check('31. non-object input rejected', normalizeProfileLink('https://example.com') === null);

// --- validateProfileLinks ---
console.log('\nValidate:');
const dup = validateProfileLinks([
  makeLink('https://example.com', 'l1'),
  makeLink('https://example.com/', 'l2'), // normalizes to the same URL
]);
check('32. duplicate normalized URL rejected', dup.valid.length === 1 && dup.errors.l2.includes('duplikat'));

const sixth = validateProfileLinks(
  Array.from({ length: 6 }, (_, i) => makeLink(`https://example.com/${i}`, `l${i + 1}`))
);
check(
  '33. sixth link rejected with max message',
  sixth.valid.length === PROFILE_LINK_MAX_LINKS && sixth.errors.l6 === `Maksimal ${PROFILE_LINK_MAX_LINKS} tautan.`
);

const blocked = validateProfileLinks([makeLink('https://indoxxi.example/movie', 'l1')]);
check('34. blocked domain error is clear (Bahasa Indonesia)', blocked.valid.length === 0 && blocked.errors.l1 === 'Domain ini tidak diizinkan.');

const emptyUrl = validateProfileLinks([{ id: 'l1', url: '', platform: 'website' }]);
check('35. empty url error', emptyUrl.errors.l1 === 'URL wajib diisi.');

const longLabel = validateProfileLinks([
  { id: 'l1', url: 'https://example.com', label: 'y'.repeat(31), platform: 'website' },
]);
check('36. label length error', longLabel.valid.length === 0 && longLabel.errors.l1 === 'Label maksimal 30 karakter.');

const badScheme = validateProfileLinks([makeLink('javascript:alert(1)', 'l1')]);
check('37. javascript: validation error', badScheme.valid.length === 0 && !!badScheme.errors.l1);

const mixed = validateProfileLinks([
  makeLink('https://instagram.com/sotoy', 'l1', 'IG'),
  makeLink('not a url at all!!', 'l2'),
  makeLink('https://tiktok.com/@sotoy', 'l3'),
]);
check('38. valid entries kept alongside invalid ones', mixed.valid.length === 2 && mixed.valid[0].platform === 'instagram' && mixed.valid[1].platform === 'tiktok');
check('39. invalid entry gets error keyed by id', !!mixed.errors.l2);

check('40. non-array input returns empty result', validateProfileLinks(null).valid.length === 0 && validateProfileLinks(undefined).valid.length === 0);

// --- sanitizeStoredLinks ---
console.log('\nSanitize stored:');
check('41. non-array garbage dropped', sanitizeStoredLinks('nope').length === 0 && sanitizeStoredLinks(null).length === 0 && sanitizeStoredLinks({ url: 'x' }).length === 0);
check(
  '42. garbage entries dropped, valid kept',
  sanitizeStoredLinks([
    42,
    null,
    'https://example.com',
    { label: 'no url' },
    { url: 'javascript:alert(1)' },
    { url: 'https://example.com', label: 123 },
    { url: 'https://instagram.com/sotoy', label: 'IG' },
  ]).length === 1
);
const sanitized = sanitizeStoredLinks([
  { url: 'https://example.com' },
  { url: 'https://example.com/' }, // duplicate after normalization
  { url: 'http://github.com/sotoy' }, // upgraded to https, kept
]);
check('43. duplicates deduped by normalized URL', sanitized.length === 2 && sanitized[0].url === 'https://example.com/');
check('44. http upgraded in stored links', sanitized[1].url === 'https://github.com/sotoy' && sanitized[1].platform === 'github');
check(
  '45. capped at max links',
  sanitizeStoredLinks(Array.from({ length: 8 }, (_, i) => ({ url: `https://example.com/${i}` }))).length === PROFILE_LINK_MAX_LINKS
);
check('46. blocked domain dropped at render time', sanitizeStoredLinks([{ url: 'https://layarkaca21.example/x' }]).length === 0);
check('47. sanitized links always have id + platform', sanitizeStoredLinks([{ url: 'https://x.com/sotoy' }]).every(l => !!l.id && l.platform === 'x'));

// --- Summary ---
console.log(`\nResult: ${passed} passed, ${failed} failed, ${passed + failed} total.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All profile links tests passed.');
}
