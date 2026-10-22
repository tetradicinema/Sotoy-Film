import {
  countReviewAudiences,
  fitFontSize,
  formatReviewCountsLine,
  getShareLayoutBudget,
  normalizeShareCount,
  wrapShareText,
} from '../src/utils/shareCardText';

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

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  assert(
    same,
    `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`
  );
};

const runTests = () => {
  console.log('Running Share Card Tests...\n');

  // ---------------------------------------------------------------------------
  // formatReviewCountsLine
  // ---------------------------------------------------------------------------
  assertEquals(
    formatReviewCountsLine(3, 12),
    '3 Reviews Kritikus Sotoy & 12 Reviews Warga Sotoy',
    'counts: renders both audiences'
  );
  assertEquals(
    formatReviewCountsLine(0, 8),
    '0 Reviews Kritikus Sotoy & 8 Reviews Warga Sotoy',
    'counts: keeps the critic total visible when it is zero'
  );
  assertEquals(
    formatReviewCountsLine(5, 0),
    '5 Reviews Kritikus Sotoy & 0 Reviews Warga Sotoy',
    'counts: keeps the community total visible when it is zero'
  );
  assertEquals(
    formatReviewCountsLine(0, 0),
    null,
    'counts: hides the line when both totals are zero'
  );
  assertEquals(
    formatReviewCountsLine(1, 4),
    '1 Review Kritikus Sotoy & 4 Reviews Warga Sotoy',
    'counts: uses singular wording for one critic'
  );
  assertEquals(
    formatReviewCountsLine(7, 1),
    '7 Reviews Kritikus Sotoy & 1 Review Warga Sotoy',
    'counts: uses singular wording for one community member'
  );
  assertEquals(
    formatReviewCountsLine(1250000, 987654),
    '1250000 Reviews Kritikus Sotoy & 987654 Reviews Warga Sotoy',
    'counts: supports large totals without scientific notation'
  );
  assertEquals(
    formatReviewCountsLine(-4, Number.NaN),
    null,
    'counts: clamps invalid totals to zero and hides the line'
  );

  // ---------------------------------------------------------------------------
  // normalizeShareCount
  // ---------------------------------------------------------------------------
  assertEquals(normalizeShareCount(7.9), 7, 'normalize: floors decimal totals');
  assertEquals(normalizeShareCount(-1), 0, 'normalize: clamps negative totals');
  assertEquals(normalizeShareCount(Infinity), 0, 'normalize: rejects infinity');
  assertEquals(normalizeShareCount('4' as unknown), 0, 'normalize: rejects strings');

  // ---------------------------------------------------------------------------
  // fitFontSize
  // ---------------------------------------------------------------------------
  assertEquals(
    fitFontSize(800, 960, 60, 32),
    60,
    'fit: keeps the base size when the text already fits'
  );
  assertEquals(
    fitFontSize(1200, 960, 60, 32),
    48,
    'fit: scales a wide line down proportionally'
  );
  assertEquals(
    fitFontSize(4000, 960, 60, 32),
    32,
    'fit: never scales below the minimum size'
  );
  assertEquals(
    fitFontSize(0, 960, 60, 32),
    60,
    'fit: empty text keeps the base size'
  );
  assertEquals(
    fitFontSize(1200, 0, 60, 32),
    32,
    'fit: zero available width falls back to the minimum'
  );
  assertEquals(
    fitFontSize(1200, 960, 20, 40),
    20,
    'fit: a minimum larger than the base is clamped to the base'
  );

  // ---------------------------------------------------------------------------
  // wrapShareText
  // ---------------------------------------------------------------------------
  const narrowMeasure = (value: string) => value.length * 10;
  assertEquals(
    wrapShareText('', 100, 3, narrowMeasure),
    { lines: [], truncated: false },
    'wrap: empty text returns no lines'
  );
  assertEquals(
    wrapShareText('one two three', 1000, 3, narrowMeasure),
    { lines: ['one two three'], truncated: false },
    'wrap: keeps short text on one line'
  );
  const truncatedWrap = wrapShareText(
    'alpha beta gamma delta epsilon zeta',
    75,
    2,
    narrowMeasure
  );
  assertEquals(truncatedWrap.lines.length, 2, 'wrap: respects the line cap');
  assertEquals(truncatedWrap.truncated, true, 'wrap: flags truncated copy');
  assert(
    truncatedWrap.lines[1].endsWith('...'),
    'wrap: marks the final truncated line with an ellipsis'
  );

  // ---------------------------------------------------------------------------
  // countReviewAudiences
  // ---------------------------------------------------------------------------
  assertEquals(
    countReviewAudiences([
      { userRole: 'penulis_sotoy' },
      { userRole: 'admin' },
      { userRole: 'warga_sotoy' },
      { userRole: 'warga_sotoy' },
      { userRole: 'si_paling_sotoy' },
      { userRole: undefined },
    ]),
    { critic: 2, community: 2 },
    'audiences: counts only the requested roles'
  );
  assertEquals(
    countReviewAudiences(null),
    { critic: 0, community: 0 },
    'audiences: handles a missing review list'
  );

  // ---------------------------------------------------------------------------
  // getShareLayoutBudget
  // ---------------------------------------------------------------------------
  const centered = getShareLayoutBudget({
    availableTop: 1000,
    availableBottom: 1755,
    blocks: [
      { height: 120 },
      { height: 28, gapBefore: 8 },
      { height: 112, gapBefore: 22 },
      { height: 190, gapBefore: 18 },
    ],
    bias: 0.5,
  });
  assertEquals(
    centered.contentHeight,
    498,
    'layout: adds block heights and gaps'
  );
  assert(
    centered.fits && centered.startY >= 1000 && centered.endY <= 1755,
    'layout: centered content never exceeds the available range'
  );
  assertEquals(
    centered.startY + centered.contentHeight,
    centered.endY,
    'layout: end position follows from the start and content height'
  );

  const topAligned = getShareLayoutBudget({
    availableTop: 100,
    availableBottom: 300,
    blocks: [{ height: 40 }, { height: 40, gapBefore: 10 }],
    bias: 0,
  });
  assertEquals(topAligned.startY, 100, 'layout: bias zero top-aligns content');

  const bottomAligned = getShareLayoutBudget({
    availableTop: 100,
    availableBottom: 300,
    blocks: [{ height: 40 }, { height: 40, gapBefore: 10 }],
    bias: 1,
  });
  assertEquals(bottomAligned.endY, 300, 'layout: bias one bottom-aligns content');

  const overflow = getShareLayoutBudget({
    availableTop: 1000,
    availableBottom: 1100,
    blocks: [{ height: 80 }, { height: 80, gapBefore: 20 }],
    bias: 0.5,
  });
  assertEquals(overflow.fits, false, 'layout: reports content that cannot fit');
  assertEquals(overflow.overflow, 80, 'layout: reports the overflow amount');
  assertEquals(
    overflow.startY,
    1000,
    'layout: overflowing content starts at the available top'
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
