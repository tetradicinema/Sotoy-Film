import { shouldSyncEditorContent, canAutosave } from '../src/utils/articleFlow';
import { splitProfileArticles } from '../src/utils/articleHelpers';

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

interface TestArticle {
  id: string;
  status?: string;
  scheduledAt?: string;
}

const NOW = new Date('2026-06-15T12:00:00.000Z');

const ARTICLES: TestArticle[] = [
  { id: 'published', status: 'published' },
  { id: 'legacy-no-status' },
  { id: 'draft', status: 'draft' },
  { id: 'trash', status: 'trash' },
  { id: 'scheduled-future', status: 'scheduled', scheduledAt: '2026-07-01T09:00:00.000Z' },
  { id: 'scheduled-past', status: 'scheduled', scheduledAt: '2026-06-01T09:00:00.000Z' },
  { id: 'scheduled-no-date', status: 'scheduled' },
  { id: 'scheduled-invalid', status: 'scheduled', scheduledAt: 'not-a-date' },
];

const ids = (list: TestArticle[]) => list.map(a => a.id);

const runTests = () => {
  console.log('Running Article Flow Tests...\n');

  // ---------------------------------------------------------------------------
  // shouldSyncEditorContent
  // ---------------------------------------------------------------------------
  const jsonDoc = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
  const markdownDoc = 'Paragraf pertama artikel.';

  assert(!shouldSyncEditorContent(jsonDoc, jsonDoc), 'shouldSyncEditorContent: own JSON echo is ignored');
  assert(!shouldSyncEditorContent(markdownDoc, markdownDoc), 'shouldSyncEditorContent: own markdown echo is ignored');
  assert(
    shouldSyncEditorContent(
      JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Baru' }] }] }),
      jsonDoc
    ),
    'shouldSyncEditorContent: real external JSON change is accepted'
  );
  assert(
    shouldSyncEditorContent('Isi hasil restore versi.', markdownDoc),
    'shouldSyncEditorContent: restored markdown change is accepted'
  );
  assert(!shouldSyncEditorContent('', ''), 'shouldSyncEditorContent: empty incoming with empty last known is ignored');
  assert(
    !shouldSyncEditorContent('', markdownDoc),
    'shouldSyncEditorContent: empty incoming never overwrites existing content'
  );
  assert(
    shouldSyncEditorContent(markdownDoc, jsonDoc),
    'shouldSyncEditorContent: JSON and markdown representations are compared as strings'
  );
  assert(
    shouldSyncEditorContent(jsonDoc, jsonDoc + ' '),
    'shouldSyncEditorContent: trailing difference in last known is detected as external'
  );
  assert(
    shouldSyncEditorContent('  spasi  ', 'spasi'),
    'shouldSyncEditorContent: whitespace changes are meaningful'
  );
  assert(
    !shouldSyncEditorContent(jsonDoc, JSON.parse(JSON.stringify(jsonDoc))),
    'shouldSyncEditorContent: structurally identical JSON strings are ignored'
  );

  // ---------------------------------------------------------------------------
  // canAutosave
  // ---------------------------------------------------------------------------
  const guard = (overrides: Partial<Parameters<typeof canAutosave>[0]>) =>
    canAutosave({ isSubmitting: false, isPublishing: false, isSaving: false, isLocked: false, ...overrides });

  assert(guard({}), 'canAutosave: allowed when idle');
  assert(!guard({ isSubmitting: true }), 'canAutosave: blocked while submitting');
  assert(!guard({ isPublishing: true }), 'canAutosave: blocked while publishing');
  assert(!guard({ isSaving: true }), 'canAutosave: blocked while an autosave is in flight');
  assert(!guard({ isLocked: true }), 'canAutosave: blocked while the submit lock is set');
  assert(
    !guard({ isSubmitting: true, isLocked: true }),
    'canAutosave: blocked when multiple guards are active'
  );
  assert(
    !guard({ isPublishing: true, isSaving: true, isLocked: true }),
    'canAutosave: blocked when publishing, saving, and locked'
  );
  assert(guard({ isSubmitting: false, isPublishing: false }), 'canAutosave: allowed again once flags clear');

  // ---------------------------------------------------------------------------
  // splitProfileArticles - visitors
  // ---------------------------------------------------------------------------
  const visitor = splitProfileArticles(ARTICLES, { isOwnerOrAdmin: false, now: NOW });
  assertEquals(
    ids(visitor.published),
    ['published', 'legacy-no-status', 'scheduled-past'],
    'splitProfileArticles: visitor sees only published and past-scheduled articles'
  );
  assertEquals(visitor.drafts, [], 'splitProfileArticles: visitor never receives a drafts group');
  assertEquals(
    visitor.counts,
    { published: 3, drafts: 0, total: 3 },
    'splitProfileArticles: visitor counts only published articles'
  );
  assert(!ids(visitor.published).includes('draft'), 'splitProfileArticles: visitor does not see drafts');
  assert(!ids(visitor.published).includes('trash'), 'splitProfileArticles: visitor does not see trash');
  assert(
    !ids(visitor.published).includes('scheduled-future'),
    'splitProfileArticles: visitor does not see future scheduled articles'
  );
  assert(
    !ids(visitor.published).includes('scheduled-no-date'),
    'splitProfileArticles: visitor does not see scheduled articles without a date'
  );

  // ---------------------------------------------------------------------------
  // splitProfileArticles - owner/admin
  // ---------------------------------------------------------------------------
  const owner = splitProfileArticles(ARTICLES, { isOwnerOrAdmin: true, now: NOW });
  assertEquals(
    ids(owner.published),
    ['published', 'legacy-no-status', 'scheduled-past'],
    'splitProfileArticles: owner published group follows the same live rules'
  );
  assertEquals(
    ids(owner.drafts),
    ['draft', 'scheduled-future', 'scheduled-no-date', 'scheduled-invalid'],
    'splitProfileArticles: owner drafts include drafts, future and invalid scheduled articles'
  );
  assertEquals(
    owner.counts,
    { published: 3, drafts: 4, total: 7 },
    'splitProfileArticles: owner counts include both groups but not trash'
  );
  assert(!ids(owner.published).includes('trash'), 'splitProfileArticles: trash is excluded from published');
  assert(!ids(owner.drafts).includes('trash'), 'splitProfileArticles: trash is excluded from drafts');
  assert(
    ids(owner.published).indexOf('published') < ids(owner.published).indexOf('scheduled-past'),
    'splitProfileArticles: published order is preserved'
  );
  assert(
    ids(owner.drafts).indexOf('draft') < ids(owner.drafts).indexOf('scheduled-future'),
    'splitProfileArticles: drafts order is preserved'
  );

  const scheduledBoundary = splitProfileArticles<TestArticle>(
    [{ id: 'exact-now', status: 'scheduled', scheduledAt: NOW.toISOString() }],
    { isOwnerOrAdmin: true, now: NOW }
  );
  assertEquals(
    ids(scheduledBoundary.published),
    ['exact-now'],
    'splitProfileArticles: scheduled exactly at now counts as published'
  );

  // ---------------------------------------------------------------------------
  // splitProfileArticles - empty / edge cases
  // ---------------------------------------------------------------------------
  const empty = splitProfileArticles<TestArticle>([], { isOwnerOrAdmin: false, now: NOW });
  assertEquals(empty.published, [], 'splitProfileArticles: empty input has no published articles');
  assertEquals(empty.drafts, [], 'splitProfileArticles: empty input has no drafts');
  assertEquals(
    empty.counts,
    { published: 0, drafts: 0, total: 0 },
    'splitProfileArticles: empty input has zero counts'
  );

  const onlyDrafts = splitProfileArticles<TestArticle>(
    [{ id: 'd1', status: 'draft' }, { id: 'd2', status: 'scheduled', scheduledAt: '2026-08-01T00:00:00.000Z' }],
    { isOwnerOrAdmin: true, now: NOW }
  );
  assertEquals(onlyDrafts.published, [], 'splitProfileArticles: drafts-only owner has an empty published group');
  assertEquals(ids(onlyDrafts.drafts), ['d1', 'd2'], 'splitProfileArticles: drafts-only owner keeps both drafts');
  assertEquals(
    onlyDrafts.counts,
    { published: 0, drafts: 2, total: 2 },
    'splitProfileArticles: drafts-only owner counts both drafts'
  );

  const onlyTrash = splitProfileArticles<TestArticle>(
    [{ id: 't1', status: 'trash' }, { id: 't2', status: 'trash' }],
    { isOwnerOrAdmin: true, now: NOW }
  );
  assertEquals(onlyTrash.published, [], 'splitProfileArticles: trash-only owner has no published articles');
  assertEquals(onlyTrash.drafts, [], 'splitProfileArticles: trash-only owner has no drafts');
  assertEquals(
    onlyTrash.counts,
    { published: 0, drafts: 0, total: 0 },
    'splitProfileArticles: trash is never counted'
  );

  const visitorOnlyDrafts = splitProfileArticles<TestArticle>(
    [{ id: 'v1', status: 'draft' }, { id: 'v2', status: 'scheduled', scheduledAt: '2026-09-01T00:00:00.000Z' }],
    { isOwnerOrAdmin: false, now: NOW }
  );
  assertEquals(
    visitorOnlyDrafts.counts,
    { published: 0, drafts: 0, total: 0 },
    'splitProfileArticles: visitor sees zero when the author only has drafts'
  );

  const undefinedStatus = splitProfileArticles<TestArticle>([{ id: 'legacy' }], {
    isOwnerOrAdmin: false,
    now: NOW,
  });
  assertEquals(
    ids(undefinedStatus.published),
    ['legacy'],
    'splitProfileArticles: articles without a status are treated as published'
  );

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
