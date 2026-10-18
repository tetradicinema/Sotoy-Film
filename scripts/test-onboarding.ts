import {
  TERMS_VERSION,
  normalizeName,
  validateName,
  suggestHandles,
  serializeDraft,
  parseDraft,
  draftStorageKey,
  OnboardingDraft,
} from '../src/utils/onboardingHelpers.ts';
import { RESERVED_HANDLES, isReservedHandle, validateHandle, normalizeHandle } from '../src/utils/handleHelpers.ts';

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

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every(k =>
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    );
  }
  return false;
}

const HANDLE_FORMAT = /^@[a-z0-9_]{3,30}$/;

console.log('Running Onboarding helper test cases:\n');

// --- Name normalization & validation ---
console.log('Name:');
check('1. normalizeName trims', normalizeName('  Budi Santoso  ') === 'Budi Santoso');
check('2. normalizeName collapses whitespace', normalizeName('Budi \t\n  Santoso') === 'Budi Santoso');
check('3. normalizeName non-string -> empty', normalizeName(42 as unknown as string) === '');
check('4. empty name rejected', validateName('   ').isValid === false && validateName('').error === 'Nama wajib diisi.');
check('5. too short rejected (1 char)', validateName('A').isValid === false && validateName('A').error === 'Nama minimal 2 karakter.');
check('6. too long rejected (51 chars)', validateName('x'.repeat(51)).isValid === false && validateName('x'.repeat(51)).error === 'Nama maksimal 50 karakter.');
check('7. http URL rejected', validateName('http://budi.com').isValid === false && validateName('http://budi.com').error?.includes('URL') === true);
check('8. https URL rejected', validateName('https://budi.com').isValid === false);
check('9. www. rejected', validateName('Budi www.facebook.com').isValid === false);
check('10. dot-TLD rejected', validateName('budi.com').isValid === false);
check('11. email rejected', validateName('budi@sotoyfilm.id').isValid === false && validateName('budi@sotoyfilm.id').error?.includes('email') === true);
check('12. plain name accepted', validateName('Budi Santoso').isValid === true);
check('13. validation normalizes whitespace', (() => {
  const r = validateName('  Budi    Santoso  ');
  return r.isValid && r.normalized === 'Budi Santoso';
})());
check('14. accented name accepted', validateName('José Marcelino').isValid === true);
check('15. apostrophe & period name accepted', validateName("D'Angelo Rizky").isValid === true);
check('16. @ without dot is not an email', validateName('@budi_film').isValid === true);
check('17. non-string name rejected safely', validateName(null).isValid === false);

// --- Reserved handles ---
console.log('\nReserved handles:');
check('18. RESERVED_HANDLES has 19 lowercase entries without @', RESERVED_HANDLES.length === 19 && RESERVED_HANDLES.every(h => typeof h === 'string' && !h.startsWith('@') && h === h.toLowerCase()));
check('19. key entries present', ['admin', 'sotoy', 'moderator', 'null', 'undefined', 'www'].every(h => RESERVED_HANDLES.includes(h)));
check('20. isReservedHandle without @', isReservedHandle('admin') === true);
check('21. isReservedHandle with @ and uppercase', isReservedHandle('@ADMIN') === true);
check('22. isReservedHandle case-insensitive plain', isReservedHandle('SotoyFilm') === true);
check('23. normal handle not reserved', isReservedHandle('budi_cinephile') === false);
check('24. legacy reserved still reserved', isReservedHandle('@tamu') === true && isReservedHandle('guest') === true);
check('25. empty input not reserved', isReservedHandle('') === false);
check('26. validateHandle behavior unchanged (new list NOT enforced)', validateHandle('@admin').isValid === true && validateHandle('@sotoy').isValid === true);
check('27. validateHandle legacy behavior unchanged', validateHandle('@tamu').isValid === false && validateHandle('@system').isValid === false);
check('28. normalizeHandle unchanged', normalizeHandle(' @Budi ') === '@budi' && normalizeHandle('') === '');

// --- suggestHandles ---
console.log('\nsuggestHandles:');
const s1 = suggestHandles('Budi Santoso');
check('29. default count is 3', s1.length === 3);
check('30. built from slug with @', s1[0] === '@budi_santoso');
check('31. all suggestions well-formatted', s1.every(h => HANDLE_FORMAT.test(h)));
check('32. numeric suffix variants are unique', new Set(s1).size === s1.length);
check('33. custom count respected', suggestHandles('Budi', 5).length === 5);
check('34. reserved base skipped, variants returned', (() => {
  const r = suggestHandles('admin', 3);
  return r.length === 3 && !r.includes('@admin') && r.every(h => HANDLE_FORMAT.test(h));
})());
check('35. reserved slug "sotoy" skipped', suggestHandles('Sotoy', 3)[0] !== '@sotoy');
check('36. empty base -> []', suggestHandles('   ').length === 0 && suggestHandles('!!!').length === 0);
check('37. too-short base never yields <3 char handles', suggestHandles('ab', 3).every(h => h.length - 1 >= 3));
check('38. long base keeps handles <= 30 chars', suggestHandles('a'.repeat(40), 3).every(h => h.length - 1 <= 30));
check('39. count 0 -> []', suggestHandles('Budi', 0).length === 0);
check('40. no @ duplicates across suggestions', new Set(suggestHandles('budi', 10)).size === 10);

// --- Draft serialization ---
console.log('\nDraft:');
const baseDraft: OnboardingDraft = {
  step: 3,
  name: 'Budi Santoso',
  handle: '@budi',
  bio: 'Penonton setia.',
  avatar: 'https://example.com/a.jpg',
  links: [{ id: 'l1', url: 'https://instagram.com/budi', label: 'IG', platform: 'instagram' }],
  favoriteGenres: ['Drama', 'Horror'],
  acceptedTerms: true,
};
check('41. TERMS_VERSION is 2026-10', TERMS_VERSION === '2026-10');
check('42. parseDraft(null) -> null', parseDraft(null) === null);
check('43. parseDraft invalid JSON -> null', parseDraft('not json {{{') === null && parseDraft('') === null);
check('44. parseDraft non-object JSON -> null', parseDraft('[1,2]') === null && parseDraft('"hello"') === null && parseDraft('42') === null && parseDraft('null') === null);
check('45. parseDraft({}) -> clamped defaults', (() => {
  const d = parseDraft('{}');
  return !!d && d.step === 1 && d.name === '' && d.handle === '' && d.bio === '' && d.avatar === undefined && d.links.length === 0 && d.favoriteGenres.length === 0 && d.acceptedTerms === false;
})());
check('46. step clamped high (99 -> 4)', parseDraft(JSON.stringify({ step: 99 }))?.step === 4);
check('47. step clamped low (0, -3 -> 1)', parseDraft(JSON.stringify({ step: 0 }))?.step === 1 && parseDraft(JSON.stringify({ step: -3 }))?.step === 1);
check('48. step coerced (garbage -> 1, 2.9 -> 2)', parseDraft(JSON.stringify({ step: 'abc' }))?.step === 1 && parseDraft(JSON.stringify({ step: 2.9 }))?.step === 2);
check('49. bio clamped to 160 chars', parseDraft(JSON.stringify({ bio: 'x'.repeat(200) }))?.bio.length === 160);
check('50. links sanitized (bad entries dropped)', (() => {
  const d = parseDraft(JSON.stringify({
    links: [
      { id: 'l1', url: 'https://instagram.com/budi' },
      { id: 'l2', url: 'javascript:alert(1)' },
      42,
      { id: 'l3', url: 'https://example.com', label: 123 },
    ],
  }));
  return !!d && d.links.length === 1 && d.links[0].platform === 'instagram';
})());
check('51. genres filtered to strings', deepEqual(parseDraft(JSON.stringify({ favoriteGenres: ['Drama', 42, null, 'Horror', true] }))?.favoriteGenres, ['Drama', 'Horror']));
check('52. genres capped at 10', parseDraft(JSON.stringify({ favoriteGenres: Array.from({ length: 15 }, (_, i) => `g${i}`) }))?.favoriteGenres.length === 10);
check('53. non-array genres -> []', deepEqual(parseDraft(JSON.stringify({ favoriteGenres: 'Drama' }))?.favoriteGenres, []));
check('54. acceptedTerms only true stays true', parseDraft(JSON.stringify({ acceptedTerms: true }))?.acceptedTerms === true && parseDraft(JSON.stringify({ acceptedTerms: 'yes' }))?.acceptedTerms === false);
check('55. round trip preserves a valid draft', (() => {
  const restored = parseDraft(serializeDraft(baseDraft));
  return !!restored && deepEqual(restored, baseDraft);
})());
check('56. round trip is idempotent', (() => {
  const once = parseDraft(serializeDraft(baseDraft));
  const twice = once ? parseDraft(serializeDraft(once)) : null;
  return !!once && !!twice && deepEqual(once, twice);
})());
check('57. serializeDraft clamps on write', (() => {
  const dirty = { ...baseDraft, step: 99, bio: 'y'.repeat(500) } as unknown as OnboardingDraft;
  const parsed = parseDraft(serializeDraft(dirty));
  return !!parsed && parsed.step === 4 && parsed.bio.length === 160;
})());
check('58. draftStorageKey format', draftStorageKey('abc123') === 'sotoy_onboarding_draft_abc123');
check('59. draftStorageKey empty uid', draftStorageKey('') === 'sotoy_onboarding_draft_');

// --- Summary ---
console.log(`\nResult: ${passed} passed, ${failed} failed, ${passed + failed} total.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All onboarding tests passed.');
}
