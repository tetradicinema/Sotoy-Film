import {
  buildFranchisePath,
  parseFranchiseRouteParam,
} from '../src/utils/franchiseHelpers';

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

// --- parseFranchiseRouteParam ---
console.log('parseFranchiseRouteParam:');
assertEquals(parseFranchiseRouteParam('119-the-lord-of-the-rings'), 119, '1. parses id from id-slug');
assertEquals(parseFranchiseRouteParam('119'), 119, '2. parses a bare numeric id');
assertEquals(parseFranchiseRouteParam('  42  '), 42, '3. trims surrounding whitespace');
assertEquals(parseFranchiseRouteParam('12abc'), 12, '4. keeps leading digits only');
assertEquals(parseFranchiseRouteParam('abc'), null, '5. rejects a slug with no leading id');
assertEquals(parseFranchiseRouteParam(''), null, '6. rejects an empty string');
assertEquals(parseFranchiseRouteParam(undefined), null, '7. rejects undefined');
assertEquals(parseFranchiseRouteParam(null), null, '8. rejects null');
assertEquals(parseFranchiseRouteParam('0-x'), null, '9. rejects zero');
assertEquals(parseFranchiseRouteParam('-5'), null, '10. rejects negative values');
assertEquals(parseFranchiseRouteParam('999999999999999999999'), null, '11. rejects unsafe integers');
assertEquals(parseFranchiseRouteParam('119-the%20lord'), 119, '12. decodes URI components before parsing');

// --- buildFranchisePath ---
console.log('\nbuildFranchisePath:');
assertEquals(
  buildFranchisePath(119, 'The Lord of the Rings Collection'),
  '/franchise/119-the-lord-of-the-rings-collection',
  '13. builds id + slug path'
);
assertEquals(buildFranchisePath(5, ''), '/franchise/5', '14. omits the slug when the name is empty');
assertEquals(buildFranchisePath(5), '/franchise/5', '15. omits the slug when the name is missing');
assertEquals(buildFranchisePath(5, undefined), '/franchise/5', '16. omits the slug when the name is undefined');
assertEquals(
  buildFranchisePath(7, 'José Antonio García'),
  '/franchise/7-jose-antonio-garcia',
  '17. strips diacritics from the slug'
);
assertEquals(
  buildFranchisePath(10, 'Harry Potter & the Philosopher Stone!'),
  '/franchise/10-harry-potter-the-philosopher-stone',
  '18. removes non-word characters and collapses separators'
);
assertEquals(
  buildFranchisePath(10, '  Trimmed  Name  '),
  '/franchise/10-trimmed-name',
  '19. trims and normalizes whitespace'
);
assertEquals(buildFranchisePath(0, 'Zero'), '/franchise', '20. rejects zero id');
assertEquals(buildFranchisePath(-3, 'Negative'), '/franchise', '21. rejects negative id');
assertEquals(buildFranchisePath(NaN, 'NaN'), '/franchise', '22. rejects NaN id');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
