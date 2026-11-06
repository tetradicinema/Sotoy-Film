import { toIsoWithTimezone, pickArticleIsoDate } from '../src/lib/edge/isoDate';

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

const runTests = () => {
  console.log('Running ISO Date Tests...\n');

  // ---------------------------------------------------------------------------
  // toIsoWithTimezone: accepted machine-readable forms
  // ---------------------------------------------------------------------------
  assertEquals(
    toIsoWithTimezone('2024-07-12'),
    '2024-07-12T00:00:00+07:00',
    'date-only -> midnight with +07:00'
  );
  assertEquals(
    toIsoWithTimezone('2026-11-06T04:16:48.704Z'),
    '2026-11-06T04:16:48.704Z',
    'full ISO with Z -> unchanged'
  );
  assertEquals(
    toIsoWithTimezone('2026-11-06T04:16:48.704+07:00'),
    '2026-11-06T04:16:48.704+07:00',
    'ISO with offset -> unchanged'
  );
  assertEquals(
    toIsoWithTimezone('2026-11-06T04:16:48.704'),
    '2026-11-06T04:16:48.704+07:00',
    'ISO without timezone -> appended +07:00'
  );
  assertEquals(
    toIsoWithTimezone('2026-11-06T04:16:48'),
    '2026-11-06T04:16:48+07:00',
    'ISO without seconds/fraction/timezone -> appended +07:00'
  );
  assertEquals(
    toIsoWithTimezone('2024-02-29'),
    '2024-02-29T00:00:00+07:00',
    'leap day in a leap year -> accepted'
  );

  // ---------------------------------------------------------------------------
  // toIsoWithTimezone: rejected values
  // ---------------------------------------------------------------------------
  assertEquals(toIsoWithTimezone('6 Nov 2026'), undefined, 'display date -> undefined');
  assertEquals(toIsoWithTimezone(''), undefined, 'empty string -> undefined');
  assertEquals(toIsoWithTimezone(undefined), undefined, 'undefined -> undefined');
  assertEquals(toIsoWithTimezone(null), undefined, 'null -> undefined');
  assertEquals(toIsoWithTimezone(20260712 as any), undefined, 'non-string -> undefined');
  assertEquals(toIsoWithTimezone('2024-02-31'), undefined, 'impossible date -> undefined');
  assertEquals(toIsoWithTimezone('2023-02-29'), undefined, 'non-leap Feb 29 -> undefined');
  assertEquals(toIsoWithTimezone('2024-13-01'), undefined, 'invalid month -> undefined');
  assertEquals(toIsoWithTimezone('not a date'), undefined, 'free text -> undefined');

  // ---------------------------------------------------------------------------
  // pickArticleIsoDate
  // ---------------------------------------------------------------------------
  assertEquals(
    pickArticleIsoDate(
      {
        publishedAtTimestamp: '2026-11-06T04:16:48.704Z',
        publishedAt: '6 Nov 2026',
      },
      'published'
    ),
    '2026-11-06T04:16:48.704Z',
    'real article example: timestamp wins over display date'
  );
  assertEquals(
    pickArticleIsoDate({ publishedAt: '6 Nov 2026' }, 'published'),
    undefined,
    'display-only publishedAt -> undefined'
  );
  assertEquals(
    pickArticleIsoDate({ publishedAt: '2026-11-06T04:16:48.704Z' }, 'published'),
    '2026-11-06T04:16:48.704Z',
    'ISO publishedAt accepted'
  );
  assertEquals(
    pickArticleIsoDate(
      {
        publishedAtTimestamp: '2026-11-06T04:16:48.704Z',
        publishedAt: '6 Nov 2026',
        updatedAt: '2026-11-07T10:00:00+07:00',
      },
      'modified'
    ),
    '2026-11-07T10:00:00+07:00',
    'modified: updatedAt wins'
  );
  assertEquals(
    pickArticleIsoDate(
      {
        publishedAtTimestamp: '2026-11-06T04:16:48.704Z',
        publishedAt: '6 Nov 2026',
      },
      'modified'
    ),
    '2026-11-06T04:16:48.704Z',
    'modified: falls back to published result'
  );
  assertEquals(
    pickArticleIsoDate({ publishedAt: '6 Nov 2026', updatedAt: '6 Nov 2026' }, 'modified'),
    undefined,
    'modified: no valid dates -> undefined'
  );
  assertEquals(pickArticleIsoDate(undefined, 'published'), undefined, 'missing article -> undefined');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
