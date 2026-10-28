import { getScoreLabel } from '../src/utils/scoreLabel';

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

const expectLabel = (score: number | null | undefined, label: string, tone: string, message: string) => {
  assertEquals(getScoreLabel(score), { label, tone }, message);
};

const runTests = () => {
  console.log('Running Score Label Tests...\n');

  // ---------------------------------------------------------------------------
  // 10-point scale tier boundaries
  // ---------------------------------------------------------------------------
  expectLabel(3.9, 'Poor', 'slate', '3.9 -> Poor');
  expectLabel(4.0, 'Weak', 'slate', '4.0 -> Weak');
  expectLabel(4.9, 'Weak', 'slate', '4.9 -> Weak');
  expectLabel(5.0, 'Mixed', 'neutral', '5.0 -> Mixed');
  expectLabel(5.9, 'Mixed', 'neutral', '5.9 -> Mixed');
  expectLabel(6.0, 'Good', 'neutral', '6.0 -> Good');
  expectLabel(6.9, 'Good', 'neutral', '6.9 -> Good');
  expectLabel(7.0, 'Great', 'amber', '7.0 -> Great');
  expectLabel(7.9, 'Great', 'amber', '7.9 -> Great');
  expectLabel(8.0, 'Awesome', 'amber', '8.0 -> Awesome');
  expectLabel(8.9, 'Awesome', 'amber', '8.9 -> Awesome');
  expectLabel(9.0, 'Masterpiece', 'pink', '9.0 -> Masterpiece');
  expectLabel(9.5, 'Masterpiece', 'pink', '9.5 -> Masterpiece');
  expectLabel(10, 'Masterpiece', 'pink', '10 -> Masterpiece');

  // ---------------------------------------------------------------------------
  // 5-point scale normalization
  // ---------------------------------------------------------------------------
  assertEquals(getScoreLabel(1.95, 5), { label: 'Poor', tone: 'slate' }, '5-point 1.95 -> 3.9 Poor');
  assertEquals(getScoreLabel(2.0, 5), { label: 'Weak', tone: 'slate' }, '5-point 2.0 -> 4.0 Weak');
  assertEquals(getScoreLabel(2.5, 5), { label: 'Mixed', tone: 'neutral' }, '5-point 2.5 -> 5.0 Mixed');
  assertEquals(getScoreLabel(3.0, 5), { label: 'Good', tone: 'neutral' }, '5-point 3.0 -> 6.0 Good');
  assertEquals(getScoreLabel(3.5, 5), { label: 'Great', tone: 'amber' }, '5-point 3.5 -> 7.0 Great');
  assertEquals(getScoreLabel(4.0, 5), { label: 'Awesome', tone: 'amber' }, '5-point 4.0 -> 8.0 Awesome');
  assertEquals(getScoreLabel(4.5, 5), { label: 'Masterpiece', tone: 'pink' }, '5-point 4.5 -> 9.0 Masterpiece');
  assertEquals(getScoreLabel(5.0, 5), { label: 'Masterpiece', tone: 'pink' }, '5-point 5.0 -> 10 Masterpiece');

  // Other scales normalize the same way.
  assertEquals(getScoreLabel(85, 100), { label: 'Awesome', tone: 'amber' }, '100-point 85 -> 8.5 Awesome');
  assertEquals(getScoreLabel(8.5, 0), { label: 'Awesome', tone: 'amber' }, 'invalid scale falls back to 10');
  assertEquals(getScoreLabel(8.5, -5), { label: 'Awesome', tone: 'amber' }, 'negative scale falls back to 10');

  // ---------------------------------------------------------------------------
  // Null cases: missing, zero, invalid, or no votes
  // ---------------------------------------------------------------------------
  assertEquals(getScoreLabel(0), null, 'score 0 -> null');
  assertEquals(getScoreLabel(undefined), null, 'missing score -> null');
  assertEquals(getScoreLabel(null), null, 'null score -> null');
  assertEquals(getScoreLabel(Number.NaN), null, 'NaN score -> null');
  assertEquals(getScoreLabel(-1), null, 'negative score -> null');
  assertEquals(getScoreLabel(8.5, 10, 0), null, 'totalVotes 0 -> null');
  assertEquals(getScoreLabel(8.5, 10, null), null, 'null totalVotes -> null');
  assert(getScoreLabel(8.5, 10, 1) !== null, 'totalVotes 1 -> label');
  assert(getScoreLabel(8.5, 10, undefined) !== null, 'omitted totalVotes -> label (review context)');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
