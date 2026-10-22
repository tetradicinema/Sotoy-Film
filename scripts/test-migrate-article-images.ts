import {
  estimateDataImageBytes,
  extractDataImageUris,
  parseDataImageUri,
  planArticleImageMigration,
  replaceDataImageUris,
} from '../src/utils/dataUriImages';

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

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lK3Q6wAAAABJRU5ErkJggg==';
const JPG = 'data:image/jpeg;base64,AAAA';
const GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const WEBP = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJQBOgCHwAP7+4AAAAA==';

const runTests = () => {
  console.log('Running Article Image Data URI Tests...\n');

  // ---------------------------------------------------------------------------
  // extractDataImageUris
  // ---------------------------------------------------------------------------
  assertEquals(
    extractDataImageUris(`Teks pembuka ![foto](${PNG}) teks penutup`),
    [PNG],
    'extract: finds a markdown image data URI'
  );
  assertEquals(
    extractDataImageUris(`<p>Halo</p><img src="${PNG}" alt="contoh" />`),
    [PNG],
    'extract: finds an HTML img data URI'
  );
  assertEquals(
    extractDataImageUris(JSON.stringify({ type: 'image', src: PNG })),
    [PNG],
    'extract: finds a data URI inside a JSON string'
  );
  assertEquals(
    extractDataImageUris(`![a](${PNG}) dan ![b](${PNG})`),
    [PNG, PNG],
    'extract: returns duplicate occurrences'
  );
  assertEquals(
    extractDataImageUris(`![a](${PNG}) lalu ![b](${JPG})`),
    [PNG, JPG],
    'extract: finds two different data URIs'
  );
  assertEquals(
    extractDataImageUris(`![a](${PNG}) data:text/plain;base64,SGVsbG8=`),
    [PNG],
    'extract: ignores a non-image data URI'
  );
  assertEquals(
    extractDataImageUris('https://example.com/gambar.png'),
    [],
    'extract: ignores a regular https URL'
  );
  assertEquals(
    extractDataImageUris('data:image/png;base64,@@@'),
    [],
    'extract: ignores a malformed base64 payload'
  );
  assertEquals(extractDataImageUris(undefined), [], 'extract: handles undefined');
  assertEquals(extractDataImageUris(''), [], 'extract: handles an empty string');

  // ---------------------------------------------------------------------------
  // parseDataImageUri
  // ---------------------------------------------------------------------------
  const parsedPng = parseDataImageUri(PNG);
  assert(parsedPng !== null, 'parse: returns a result for a valid PNG data URI');
  assertEquals(parsedPng?.mimeType, 'image/png', 'parse: reports the PNG MIME type');
  assertEquals(parsedPng?.extension, 'png', 'parse: reports the PNG extension');
  assert((parsedPng?.buffer.length ?? 0) > 0, 'parse: decodes the base64 buffer');
  assertEquals(
    parseDataImageUri(JPG)?.extension,
    'jpeg',
    'parse: maps image/jpeg to jpeg'
  );
  assertEquals(
    parseDataImageUri('data:image/jpg;base64,AAAA')?.extension,
    'jpeg',
    'parse: maps image/jpg to jpeg'
  );
  assertEquals(parseDataImageUri(GIF)?.extension, 'gif', 'parse: maps GIF to gif');
  assertEquals(parseDataImageUri(WEBP)?.extension, 'webp', 'parse: maps WebP to webp');
  assertEquals(
    parseDataImageUri('data:image/svg+xml;base64,PHN2Zy8+'),
    null,
    'parse: rejects an unsupported MIME type'
  );
  assertEquals(
    parseDataImageUri('data:image/png;base64,not-base64!!!'),
    null,
    'parse: rejects invalid base64 characters'
  );
  assertEquals(
    parseDataImageUri('data:image/png;base64,A'),
    null,
    'parse: rejects an impossible base64 length'
  );
  assertEquals(parseDataImageUri('https://example.com/a.png'), null, 'parse: rejects https URLs');

  // ---------------------------------------------------------------------------
  // replaceDataImageUris
  // ---------------------------------------------------------------------------
  assertEquals(
    replaceDataImageUris(`Sebelum ![foto](${PNG}) sesudah`, new Map([[PNG, 'https://cdn/a.webp']])),
    'Sebelum ![foto](https://cdn/a.webp) sesudah',
    'replace: preserves the surrounding markdown text'
  );
  assertEquals(
    replaceDataImageUris(`<img src="${PNG}">`, { [PNG]: 'https://cdn/a.webp' }),
    '<img src="https://cdn/a.webp">',
    'replace: accepts a plain object map'
  );
  assertEquals(
    replaceDataImageUris(`![a](${PNG}) ![b](${JPG})`, new Map([
      [PNG, 'https://cdn/a.webp'],
      [JPG, 'https://cdn/b.jpg'],
    ])),
    '![a](https://cdn/a.webp) ![b](https://cdn/b.jpg)',
    'replace: replaces two different URIs'
  );
  assertEquals(
    replaceDataImageUris(`![a](${PNG})`, new Map()),
    `![a](${PNG})`,
    'replace: leaves URIs untouched when no mapping exists'
  );
  assertEquals(
    replaceDataImageUris(`https://example.com/a.png`, new Map([[PNG, 'x']])),
    'https://example.com/a.png',
    'replace: never changes https URLs'
  );

  // ---------------------------------------------------------------------------
  // planArticleImageMigration
  // ---------------------------------------------------------------------------
  const sameImagePlan = planArticleImageMigration({
    content: `![a](${PNG}) dan ![b](${PNG})`,
  });
  assertEquals(sameImagePlan.affectedFields, ['content'], 'plan: detects the content field');
  assertEquals(
    sameImagePlan.distinctImageCount,
    1,
    'plan: deduplicates the same URI used twice in one field'
  );

  const twoImagesPlan = planArticleImageMigration({
    content: `![a](${PNG}) dan ![b](${JPG})`,
  });
  assertEquals(
    twoImagesPlan.distinctImageCount,
    2,
    'plan: counts two different images'
  );
  assertEquals(twoImagesPlan.distinctUris, [PNG, JPG], 'plan: keeps distinct URIs in order');

  const coverAndContentPlan = planArticleImageMigration({
    coverImage: PNG,
    content: `<p><img src="${PNG}" /></p>`,
  });
  assertEquals(
    coverAndContentPlan.affectedFields,
    ['coverImage', 'content'],
    'plan: reports cover and content as affected'
  );
  assertEquals(
    coverAndContentPlan.distinctImageCount,
    1,
    'plan: deduplicates an image shared by cover and content'
  );
  assertEquals(
    coverAndContentPlan.fieldUris.coverImage,
    [PNG],
    'plan: exposes the URI found in coverImage'
  );

  const jsonPlan = planArticleImageMigration({
    ogImage: JPG,
    contentJson: JSON.stringify({ src: WEBP }),
  });
  assertEquals(
    jsonPlan.affectedFields,
    ['ogImage', 'contentJson'],
    'plan: detects ogImage and contentJson'
  );
  assertEquals(jsonPlan.distinctImageCount, 2, 'plan: counts ogImage and contentJson images');

  const emptyPlan = planArticleImageMigration({
    coverImage: '',
    ogImage: undefined,
    content: null,
    contentJson: '',
  });
  assertEquals(emptyPlan.affectedFields, [], 'plan: ignores empty and undefined fields');
  assertEquals(emptyPlan.distinctUris, [], 'plan: returns no URIs for empty fields');
  assertEquals(emptyPlan.totalBase64Bytes, 0, 'plan: reports zero bytes for empty fields');

  const missingPlan = planArticleImageMigration(undefined);
  assertEquals(missingPlan.affectedFields, [], 'plan: handles an undefined article');
  assertEquals(missingPlan.distinctImageCount, 0, 'plan: undefined article has no images');

  assert(coverAndContentPlan.totalBase64Bytes > 0, 'plan: reports the decoded base64 size');

  // ---------------------------------------------------------------------------
  // Idempotency
  // ---------------------------------------------------------------------------
  const original = `Intro ![foto](${PNG}) outro`;
  const migrated = replaceDataImageUris(original, new Map([[PNG, 'https://cdn/a.webp']]));
  const secondPlan = planArticleImageMigration({
    coverImage: PNG,
    content: migrated,
  });

  assertEquals(
    secondPlan.affectedFields,
    ['coverImage'],
    'idempotent: only the untouched cover remains affected'
  );
  const fullyMigratedPlan = planArticleImageMigration({
    coverImage: 'https://cdn/a.webp',
    content: migrated,
  });
  assertEquals(
    fullyMigratedPlan.affectedFields,
    [],
    'idempotent: a second pass reports no affected fields'
  );
  assertEquals(
    fullyMigratedPlan.distinctImageCount,
    0,
    'idempotent: a second pass reports zero images'
  );

  // ---------------------------------------------------------------------------
  // Size estimate
  // ---------------------------------------------------------------------------
  const estimated = estimateDataImageBytes('data:image/png;base64,AAAA');
  assertEquals(estimated, 3, 'estimate: four base64 chars decode to three bytes');
  assertEquals(
    estimateDataImageBytes('data:image/png;base64,AA=='),
    1,
    'estimate: accounts for padding'
  );

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
