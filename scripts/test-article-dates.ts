import {
  resolveArticleDates,
  formatArticleDisplayDate,
  isArticleLive,
} from '../src/utils/articleDates';

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

const NOW = new Date('2026-11-25T10:00:00.000Z');
const LATER = new Date('2026-11-25T12:00:00.000Z');
const ORIG = '2026-01-10T08:00:00.000Z';
const DRAFT_STAMP = '2026-05-01T07:00:00.000Z';
const SCHEDULED = new Date('2026-12-01T09:00:00.000Z');
const AFTER_SCHEDULE = new Date('2026-12-02T00:00:00.000Z');

const display = (date: Date) => formatArticleDisplayDate(date);

const runTests = () => {
  console.log('Running Article Date Tests...\n');

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------
  const createdPublished = resolveArticleDates({
    existing: null,
    status: 'published',
    now: NOW,
    isNew: true,
  });
  assertEquals(createdPublished.firstPublish, true, 'create published: first publish');
  assertEquals(
    createdPublished.publishedAtTimestamp,
    NOW.toISOString(),
    'create published: timestamp is now'
  );
  assertEquals(createdPublished.publishedAt, display(NOW), 'create published: display date matches now');
  assertEquals(createdPublished.updatedAt, NOW.toISOString(), 'create published: updatedAt is now');
  assertEquals(createdPublished.createdAt, NOW.toISOString(), 'create published: createdAt is now');

  const createdDraft = resolveArticleDates({
    existing: null,
    status: 'draft',
    now: NOW,
    isNew: true,
  });
  assertEquals(createdDraft.firstPublish, false, 'create draft: not a publish');
  assertEquals(createdDraft.publishedAtTimestamp, undefined, 'create draft: no publish timestamp');
  assertEquals(createdDraft.publishedAt, undefined, 'create draft: no display publish date');
  assertEquals(createdDraft.updatedAt, NOW.toISOString(), 'create draft: updatedAt is now');
  assertEquals(createdDraft.createdAt, NOW.toISOString(), 'create draft: createdAt is now');

  const createdScheduled = resolveArticleDates({
    existing: null,
    status: 'scheduled',
    scheduledAt: SCHEDULED.toISOString(),
    now: NOW,
    isNew: true,
  });
  assertEquals(createdScheduled.firstPublish, true, 'create scheduled: first publish');
  assertEquals(
    createdScheduled.publishedAtTimestamp,
    SCHEDULED.toISOString(),
    'create scheduled: timestamp uses scheduledAt'
  );
  assertEquals(
    createdScheduled.publishedAt,
    display(SCHEDULED),
    'create scheduled: display date uses scheduledAt'
  );

  // ---------------------------------------------------------------------------
  // Edit a live article
  // ---------------------------------------------------------------------------
  const live = {
    status: 'published',
    publishedAtTimestamp: ORIG,
    publishedAt: display(new Date(ORIG)),
  };
  const editedLive = resolveArticleDates({
    existing: live,
    status: 'published',
    now: LATER,
  });
  assertEquals(editedLive.firstPublish, false, 'edit live: no re-publish');
  assertEquals(editedLive.publishedAtTimestamp, undefined, 'edit live: timestamp not returned');
  assertEquals(editedLive.publishedAt, undefined, 'edit live: display date not returned');
  assertEquals(editedLive.updatedAt, LATER.toISOString(), 'edit live: updatedAt bumps');

  // A second edit keeps the same date again.
  const secondEdit = resolveArticleDates({
    existing: live,
    status: 'published',
    now: AFTER_SCHEDULE,
  });
  assertEquals(secondEdit.firstPublish, false, 'second edit: still no re-publish');
  assertEquals(secondEdit.publishedAtTimestamp, undefined, 'second edit: timestamp stays preserved');
  assertEquals(secondEdit.updatedAt, AFTER_SCHEDULE.toISOString(), 'second edit: updatedAt bumps again');

  // ---------------------------------------------------------------------------
  // Draft -> published (old drafts carry a premature stamp)
  // ---------------------------------------------------------------------------
  const oldDraft = {
    status: 'draft',
    publishedAtTimestamp: DRAFT_STAMP,
    publishedAt: display(new Date(DRAFT_STAMP)),
  };
  const draftPublished = resolveArticleDates({
    existing: oldDraft,
    status: 'published',
    now: NOW,
  });
  assertEquals(draftPublished.firstPublish, true, 'draft -> published: first publish');
  assertEquals(
    draftPublished.publishedAtTimestamp,
    NOW.toISOString(),
    'draft -> published: uses publish time, not the draft stamp'
  );
  assertEquals(draftPublished.publishedAt, display(NOW), 'draft -> published: display date is publish time');

  // ---------------------------------------------------------------------------
  // Scheduled -> published
  // ---------------------------------------------------------------------------
  const scheduledLive = {
    status: 'scheduled',
    scheduledAt: SCHEDULED.toISOString(),
    publishedAtTimestamp: SCHEDULED.toISOString(),
    publishedAt: display(SCHEDULED),
  };
  const scheduledEdit = resolveArticleDates({
    existing: scheduledLive,
    status: 'scheduled',
    scheduledAt: SCHEDULED.toISOString(),
    now: NOW,
  });
  assertEquals(
    scheduledEdit.publishedAtTimestamp,
    SCHEDULED.toISOString(),
    'scheduled edit: keeps the scheduled timestamp'
  );
  assertEquals(scheduledEdit.updatedAt, NOW.toISOString(), 'scheduled edit: updatedAt bumps');

  const scheduledPublished = resolveArticleDates({
    existing: scheduledLive,
    status: 'published',
    now: AFTER_SCHEDULE,
  });
  assertEquals(scheduledPublished.firstPublish, false, 'scheduled -> published: not a new publish');
  assertEquals(
    scheduledPublished.publishedAtTimestamp,
    undefined,
    'scheduled -> published: keeps the scheduled date once'
  );
  assertEquals(scheduledPublished.updatedAt, AFTER_SCHEDULE.toISOString(), 'scheduled -> published: updatedAt bumps');

  const publishedEarly = resolveArticleDates({
    existing: {
      status: 'scheduled',
      scheduledAt: SCHEDULED.toISOString(),
    },
    status: 'published',
    now: NOW,
  });
  assertEquals(
    publishedEarly.firstPublish,
    true,
    'publishing a future-scheduled draft early: first live transition'
  );

  // ---------------------------------------------------------------------------
  // Bulk republish of an unpublished document
  // ---------------------------------------------------------------------------
  const fromTrash = resolveArticleDates({
    existing: { status: 'trash', publishedAtTimestamp: ORIG, publishedAt: display(new Date(ORIG)) },
    status: 'published',
    now: LATER,
  });
  assertEquals(fromTrash.firstPublish, true, 'bulk republish: first publish');
  assertEquals(fromTrash.publishedAtTimestamp, LATER.toISOString(), 'bulk republish: timestamp is now');
  assertEquals(fromTrash.publishedAt, display(LATER), 'bulk republish: display date is now');

  const fromDraft = resolveArticleDates({
    existing: { status: 'draft' },
    status: 'published',
    now: LATER,
  });
  assertEquals(fromDraft.firstPublish, true, 'bulk publish draft: first publish');
  assertEquals(fromDraft.publishedAtTimestamp, LATER.toISOString(), 'bulk publish draft: timestamp is now');

  // ---------------------------------------------------------------------------
  // Legacy / liveness helpers
  // ---------------------------------------------------------------------------
  assert(isArticleLive({ status: 'published' }), 'isArticleLive: published is live');
  assert(isArticleLive({}, NOW), 'isArticleLive: missing status is treated as published');
  assert(
    !isArticleLive({ status: 'scheduled', scheduledAt: SCHEDULED.toISOString() }, NOW),
    'isArticleLive: future scheduled is not live'
  );
  assert(
    isArticleLive({ status: 'scheduled', scheduledAt: SCHEDULED.toISOString() }, AFTER_SCHEDULE),
    'isArticleLive: past scheduled is live'
  );
  assert(!isArticleLive({ status: 'draft' }, NOW), 'isArticleLive: draft is not live');
  assert(!isArticleLive({ status: 'trash' }, NOW), 'isArticleLive: trash is not live');

  const legacyNoStatus = resolveArticleDates({
    existing: { publishedAtTimestamp: ORIG, publishedAt: display(new Date(ORIG)) },
    status: 'published',
    now: LATER,
  });
  assertEquals(
    legacyNoStatus.firstPublish,
    false,
    'legacy article without status: edit preserves the stored publish date'
  );

  const liveWithoutDates = resolveArticleDates({
    existing: { status: 'published' },
    status: 'published',
    now: LATER,
  });
  assertEquals(
    liveWithoutDates.firstPublish,
    true,
    'published doc with no usable date: backfills the date once'
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
