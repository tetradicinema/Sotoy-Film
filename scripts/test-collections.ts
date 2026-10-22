import {
  buildCollectionShareData,
  COLLECTION_DESCRIPTION_LIMIT,
  COLLECTION_NAME_LIMIT,
  COLLECTION_SHARE_DESCRIPTION_FALLBACK,
  getCollectionItemKey,
  moveItem,
  reorderByKeys,
  validateCollectionDetails,
} from '../src/utils/collectionHelpers';
import type { Article, FilmItem, UserCollection } from '../src/types';

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
  assert(same, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
};

const makeItem = (itemId: string, itemType: 'film' | 'article' = 'film') => ({
  itemId,
  itemType,
  addedAt: '2026-01-01T00:00:00.000Z',
});

const makeCollection = (overrides: Partial<UserCollection> = {}): UserCollection => ({
  id: 'collection-1',
  name: 'Watchlist Akhir Pekan',
  description: 'Film pilihan untuk akhir pekan.',
  isDefault: false,
  isPublic: true,
  items: [makeItem('film-1')],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeFilm = (id: string, poster: string): FilmItem =>
  ({ id, title: `Film ${id}`, poster } as unknown as FilmItem);

const makeArticle = (id: string, coverImage: string): Article =>
  ({ id, title: `Artikel ${id}`, coverImage } as unknown as Article);

const owner = { id: 'user-1', name: 'Budi Santoso' };
const baseUrl = 'https://www.sotoyfilm.my.id';

// moveItem
assertEquals(moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a'], 'moveItem: moves an item forward');
assertEquals(moveItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b'], 'moveItem: moves an item backward');
assertEquals(moveItem(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c'], 'moveItem: same index returns unchanged order');

const outOfRangeFrom = moveItem(['a', 'b', 'c'], -1, 2);
assertEquals(outOfRangeFrom, ['a', 'b', 'c'], 'moveItem: negative source index is ignored');
const outOfRangeTo = moveItem(['a', 'b', 'c'], 0, 9);
assertEquals(outOfRangeTo, ['a', 'b', 'c'], 'moveItem: out-of-range target is ignored');
assertEquals(moveItem(['only'], 0, 0), ['only'], 'moveItem: single-item arrays are stable');

const mutableSource = ['a', 'b', 'c'];
const movedCopy = moveItem(mutableSource, 0, 2);
assert(
  mutableSource[0] === 'a' && mutableSource[1] === 'b' && mutableSource[2] === 'c',
  'moveItem: does not mutate the source array'
);
assertEquals(movedCopy, ['b', 'c', 'a'], 'moveItem: returns a reordered copy');

// reorderByKeys
const keyedItems = [makeItem('a'), makeItem('b'), makeItem('c')];
assertEquals(
  reorderByKeys(keyedItems, ['film:c', 'film:a', 'film:b']).map(getCollectionItemKey),
  ['film:c', 'film:a', 'film:b'],
  'reorderByKeys: applies a full custom order'
);
assertEquals(
  reorderByKeys(keyedItems, ['film:a', 'unknown-key', 'film:c']).map(getCollectionItemKey),
  ['film:a', 'film:c', 'film:b'],
  'reorderByKeys: ignores unknown keys and appends missing items'
);
assertEquals(
  reorderByKeys(keyedItems, []).map(getCollectionItemKey),
  ['film:a', 'film:b', 'film:c'],
  'reorderByKeys: empty key list preserves original order'
);
assertEquals(
  reorderByKeys(keyedItems, ['film:b', 'film:b', 'film:a']).map(getCollectionItemKey),
  ['film:b', 'film:a', 'film:c'],
  'reorderByKeys: duplicate keys do not duplicate items'
);
assertEquals(
  reorderByKeys(keyedItems, ['c', 'a']).map(getCollectionItemKey),
  ['film:c', 'film:a', 'film:b'],
  'reorderByKeys: accepts unambiguous plain itemId keys'
);

const duplicateItems = [makeItem('same'), makeItem('same'), makeItem('other')];
const duplicateResult = reorderByKeys(duplicateItems, ['film:same', 'film:other']);
assertEquals(
  duplicateResult.length,
  3,
  'reorderByKeys: preserves duplicate item entries without losing data'
);

const mixedItems = [makeItem('shared', 'film'), makeItem('shared', 'article')];
assertEquals(
  reorderByKeys(mixedItems, ['article:shared', 'film:shared']).map(getCollectionItemKey),
  ['article:shared', 'film:shared'],
  'reorderByKeys: disambiguates same itemId across item types'
);

// validateCollectionDetails
const validated = validateCollectionDetails({
  name: '  Watchlist  ',
  description: '  Film seru  ',
});
assertEquals(validated.name, 'Watchlist', 'validateCollectionDetails: trims the name');
assertEquals(validated.description, 'Film seru', 'validateCollectionDetails: trims the description');
assert(validated.ok, 'validateCollectionDetails: accepts a valid name and description');

const emptyName = validateCollectionDetails({ name: '   ', description: 'Deskripsi' });
assert(!emptyName.ok, 'validateCollectionDetails: rejects an empty or whitespace-only name');
assert(Boolean(emptyName.error), 'validateCollectionDetails: returns an error for an empty name');

const longName = validateCollectionDetails({
  name: 'N'.repeat(COLLECTION_NAME_LIMIT + 20),
  description: '',
});
assertEquals(
  longName.name.length,
  COLLECTION_NAME_LIMIT,
  'validateCollectionDetails: caps the name length'
);
const longDescription = validateCollectionDetails({
  name: 'Koleksi',
  description: 'D'.repeat(COLLECTION_DESCRIPTION_LIMIT + 50),
});
assertEquals(
  longDescription.description.length,
  COLLECTION_DESCRIPTION_LIMIT,
  'validateCollectionDetails: caps the description length'
);
const emptyDescription = validateCollectionDetails({ name: 'Koleksi', description: '   ' });
assert(
  emptyDescription.ok && emptyDescription.description === '',
  'validateCollectionDetails: allows an empty description'
);
const missingDescription = validateCollectionDetails({ name: 'Koleksi' });
assert(
  missingDescription.ok && missingDescription.description === '',
  'validateCollectionDetails: treats a missing description as empty'
);

// buildCollectionShareData
const sixFilms: UserCollection = makeCollection({
  items: Array.from({ length: 6 }, (_, index) => makeItem(`film-${index + 1}`)),
});
const sixFilmMedia = {
  films: Array.from({ length: 6 }, (_, index) =>
    makeFilm(`film-${index + 1}`, `https://img.test/poster-${index + 1}.jpg`)
  ),
};
const shareData = buildCollectionShareData(sixFilms, owner, baseUrl, sixFilmMedia);
assertEquals(
  shareData.collectionPreviewImages,
  [
    'https://img.test/poster-1.jpg',
    'https://img.test/poster-2.jpg',
    'https://img.test/poster-3.jpg',
    'https://img.test/poster-4.jpg',
  ],
  'buildCollectionShareData: takes at most four preview images from the first items'
);
assertEquals(shareData.collectionItemCount, 6, 'buildCollectionShareData: includes the total item count');
assertEquals(shareData.collectionOwnerName, owner.name, 'buildCollectionShareData: includes the owner name');
assertEquals(
  shareData.url,
  'https://www.sotoyfilm.my.id/koleksi/user-1/collection-1',
  'buildCollectionShareData: builds the public collection URL'
);
assertEquals(shareData.collectionIsPublic, true, 'buildCollectionShareData: defaults to public');
assertEquals(shareData.image, 'https://img.test/poster-1.jpg', 'buildCollectionShareData: exposes the first preview as the main image');

const articleCollection = makeCollection({
  items: [makeItem('film-1', 'film'), makeItem('article-1', 'article')],
});
const articleShareData = buildCollectionShareData(articleCollection, owner, baseUrl, {
  films: [makeFilm('film-1', 'https://img.test/film-1.jpg')],
  articles: [makeArticle('article-1', 'https://img.test/article-1.jpg')],
});
assertEquals(
  articleShareData.collectionPreviewImages,
  ['https://img.test/film-1.jpg', 'https://img.test/article-1.jpg'],
  'buildCollectionShareData: resolves article cover images'
);

const emptyShareData = buildCollectionShareData(
  makeCollection({ items: [] }),
  owner,
  baseUrl
);
assertEquals(
  emptyShareData.collectionPreviewImages,
  [],
  'buildCollectionShareData: returns no preview images for an empty collection'
);
assertEquals(emptyShareData.collectionItemCount, 0, 'buildCollectionShareData: reports zero items for an empty collection');

const privateShareData = buildCollectionShareData(
  makeCollection({ isPublic: false }),
  owner,
  baseUrl
);
assert(!privateShareData.collectionIsPublic, 'buildCollectionShareData: carries the private collection flag');

const fallbackShareData = buildCollectionShareData(
  makeCollection({ description: '   ' }),
  owner,
  baseUrl
);
assertEquals(
  fallbackShareData.description,
  COLLECTION_SHARE_DESCRIPTION_FALLBACK,
  'buildCollectionShareData: uses a description fallback when none is set'
);
assertEquals(
  fallbackShareData.collectionDescription,
  '',
  'buildCollectionShareData: keeps the original empty description separately'
);

const overrideShareData = buildCollectionShareData(sixFilms, owner, baseUrl, {
  films: sixFilmMedia.films,
  previewImages: ['https://img.test/custom-1.jpg', 'https://img.test/custom-2.jpg'],
});
assertEquals(
  overrideShareData.collectionPreviewImages,
  ['https://img.test/custom-1.jpg', 'https://img.test/custom-2.jpg'],
  'buildCollectionShareData: allows pre-computed preview images to override lookups'
);

const encodedShareData = buildCollectionShareData(
  makeCollection({ id: 'col/1' }),
  { id: 'user one', name: 'Owner' },
  'https://www.sotoyfilm.my.id/'
);
assertEquals(
  encodedShareData.url,
  'https://www.sotoyfilm.my.id/koleksi/user%20one/col%2F1',
  'buildCollectionShareData: encodes ids and strips a trailing slash from the base URL'
);

const aliasShareData = buildCollectionShareData(sixFilms, owner, baseUrl, sixFilmMedia);
assertEquals(aliasShareData.title, sixFilms.name, 'buildCollectionShareData: exposes the collection name as title');
assertEquals(aliasShareData.itemCount, 6, 'buildCollectionShareData: exposes itemCount alias');
assertEquals(aliasShareData.isPublic, true, 'buildCollectionShareData: exposes isPublic alias');
assertEquals(aliasShareData.previewImages.length, 4, 'buildCollectionShareData: exposes previewImages alias');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
