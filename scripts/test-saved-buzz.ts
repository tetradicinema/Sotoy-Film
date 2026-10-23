import {
  getBuzzExcerpt,
  getMissingBuzzIds,
  resolveSavedBuzzEntries,
  sortSavedBuzzPointers,
  type SavedBuzzPointer,
} from '../src/utils/savedBuzz';
import type { BuzzPost } from '../src/types';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ ${message}`);
  }
};

const assertEquals = (actual: any, expected: any, message: string) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  assert(
    same,
    `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
  );
};

const makePost = (id: string, overrides: Partial<BuzzPost> = {}): BuzzPost => ({
  id,
  author: {
    id: 'author-1',
    name: 'Penulis Sotoy',
    handle: 'penulis',
    avatar: '',
    role: 'user' as BuzzPost['author']['role'],
  },
  content: `Isi Buzz ${id}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  likes: 0,
  repliesCount: 0,
  tags: [],
  ...overrides,
});

const pointer = (buzzId: string, addedAt?: string): SavedBuzzPointer => ({
  buzzId,
  addedAt,
});

// sortSavedBuzzPointers
const sorted = sortSavedBuzzPointers([
  pointer('older', '2026-01-01T00:00:00.000Z'),
  pointer('invalid', 'not-a-date'),
  pointer('newer', '2026-03-01T00:00:00.000Z'),
  pointer('missing'),
]);
assertEquals(
  sorted.map((item) => item.buzzId),
  ['newer', 'older', 'invalid', 'missing'],
  'sortSavedBuzzPointers: newest first, invalid/missing timestamps last'
);

assertEquals(
  sortSavedBuzzPointers([
    pointer('first', '2026-02-01T00:00:00.000Z'),
    pointer('older', '2026-01-01T00:00:00.000Z'),
    pointer('second', '2026-02-01T00:00:00.000Z'),
  ]).map((item) => item.buzzId),
  ['first', 'second', 'older'],
  'sortSavedBuzzPointers: keeps original order for equal timestamps'
);

const originalPointers = [
  pointer('a', '2026-01-01T00:00:00.000Z'),
  pointer('b', '2026-02-01T00:00:00.000Z'),
];
sortSavedBuzzPointers(originalPointers);
assertEquals(
  originalPointers.map((item) => item.buzzId),
  ['a', 'b'],
  'sortSavedBuzzPointers: does not mutate the source array'
);

// resolveSavedBuzzEntries
const knownPost = makePost('known', { content: 'Versi dari feed' });
const fetchedKnownPost = makePost('known', { content: 'Versi hasil getDoc' });
const fetchedOnlyPost = makePost('fetched', { content: 'Buzz lama' });

const resolved = resolveSavedBuzzEntries(
  [pointer('known'), pointer('fetched'), pointer('missing')],
  [knownPost],
  [fetchedKnownPost, fetchedOnlyPost]
);

assertEquals(resolved.length, 3, 'resolveSavedBuzzEntries: keeps each unique pointer');
assertEquals(
  resolved[0].post?.content,
  'Versi dari feed',
  'resolveSavedBuzzEntries: prefers the already-known post over the fetched one'
);
assertEquals(
  resolved[1].post?.content,
  'Buzz lama',
  'resolveSavedBuzzEntries: uses a fetched post when it is not already known'
);
assertEquals(
  [resolved[2].status, resolved[2].post],
  ['unavailable', null],
  'resolveSavedBuzzEntries: marks posts missing everywhere as unavailable'
);

assertEquals(
  resolveSavedBuzzEntries(
    [pointer('same', '2026-01-01T00:00:00.000Z'), pointer('same', '2026-02-01T00:00:00.000Z')],
    [makePost('same')],
    []
  ).length,
  1,
  'resolveSavedBuzzEntries: deduplicates pointers by buzzId'
);

assertEquals(
  resolveSavedBuzzEntries(
    [
      { addedAt: '2026-01-01T00:00:00.000Z' } as SavedBuzzPointer,
      pointer('   '),
      pointer('valid'),
    ],
    [makePost('valid')],
    []
  ).map((entry) => entry.buzzId),
  ['valid'],
  'resolveSavedBuzzEntries: ignores pointers without a usable buzzId'
);

assertEquals(
  resolveSavedBuzzEntries([], [knownPost], [fetchedOnlyPost]),
  [],
  'resolveSavedBuzzEntries: returns an empty list for no pointers'
);

assertEquals(
  resolveSavedBuzzEntries(
    [pointer('b'), pointer('a')],
    [makePost('a'), makePost('b')],
    []
  ).map((entry) => entry.buzzId),
  ['b', 'a'],
  'resolveSavedBuzzEntries: preserves the supplied pointer order'
);

// getMissingBuzzIds
assertEquals(
  getMissingBuzzIds(
    [pointer('known'), pointer('unknown'), pointer('unknown'), pointer('other')],
    [knownPost]
  ),
  ['unknown', 'other'],
  'getMissingBuzzIds: returns only unknown, unique ids in pointer order'
);

assertEquals(
  getMissingBuzzIds(
    [{ addedAt: '2026-01-01T00:00:00.000Z' } as SavedBuzzPointer, pointer('known')],
    [knownPost]
  ),
  [],
  'getMissingBuzzIds: ignores invalid pointers and already-known posts'
);

// getBuzzExcerpt
assertEquals(
  getBuzzExcerpt('Film ini bagus sekali', 100),
  'Film ini bagus sekali',
  'getBuzzExcerpt: leaves short content unchanged'
);

assertEquals(
  getBuzzExcerpt('Alpha beta gamma delta', 12),
  'Alpha beta…',
  'getBuzzExcerpt: cuts at a word boundary and adds an ellipsis'
);

assertEquals(
  getBuzzExcerpt('Alpha beta', 10),
  'Alpha beta',
  'getBuzzExcerpt: does not add an ellipsis when the content fits exactly'
);

assertEquals(
  getBuzzExcerpt('  Film   ini\nbagus  ', 100),
  'Film ini bagus',
  'getBuzzExcerpt: trims and collapses whitespace'
);

assertEquals(getBuzzExcerpt('', 100), '', 'getBuzzExcerpt: returns empty for empty content');
assertEquals(
  getBuzzExcerpt('   \n\t  ', 100),
  '',
  'getBuzzExcerpt: returns empty for whitespace-only content'
);
assertEquals(getBuzzExcerpt('Film panjang', 0), '', 'getBuzzExcerpt: returns empty for a zero limit');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
