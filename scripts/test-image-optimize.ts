import {
  getTargetSize,
  buildImageStorageFileName,
  formatImageSize,
} from '../src/utils/imageOptimize';
import {
  ALT_TEXT_MAX_LENGTH,
  getArticleSaveBlockMessage,
  looksLikeFileName,
  validateAltText,
} from '../src/utils/articleHelpers';

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
  console.log('Running Image Optimize & Alt Text Tests...\n');

  // ---------------------------------------------------------------------------
  // getTargetSize
  // ---------------------------------------------------------------------------
  assertEquals(
    getTargetSize(4000, 3000, 1600),
    { width: 1600, height: 1200 },
    'getTargetSize: landscape keeps its aspect ratio'
  );
  assertEquals(
    getTargetSize(3000, 4000, 1600),
    { width: 1200, height: 1600 },
    'getTargetSize: portrait keeps its aspect ratio'
  );
  assertEquals(
    getTargetSize(3000, 3000, 1600),
    { width: 1600, height: 1600 },
    'getTargetSize: square stays square'
  );
  assertEquals(
    getTargetSize(800, 600, 1600),
    { width: 800, height: 600 },
    'getTargetSize: already small images are never upscaled'
  );
  assertEquals(
    getTargetSize(1600, 900, 1600),
    { width: 1600, height: 900 },
    'getTargetSize: image exactly at the limit is unchanged'
  );
  assertEquals(
    getTargetSize(6000, 500, 1600),
    { width: 1600, height: 133 },
    'getTargetSize: extreme panorama keeps its wide ratio'
  );
  assertEquals(
    getTargetSize(500, 6000, 1600),
    { width: 133, height: 1600 },
    'getTargetSize: extreme vertical panorama keeps its tall ratio'
  );
  assertEquals(
    getTargetSize(1001, 2000, 1000),
    { width: 501, height: 1000 },
    'getTargetSize: rounds scaled dimensions to integers'
  );
  assertEquals(
    getTargetSize(0, 2000, 1600),
    { width: 0, height: 0 },
    'getTargetSize: zero width is invalid'
  );
  assertEquals(
    getTargetSize(2000, 0, 1600),
    { width: 0, height: 0 },
    'getTargetSize: zero height is invalid'
  );
  assertEquals(
    getTargetSize(2000, 2000, 0),
    { width: 0, height: 0 },
    'getTargetSize: zero max long side is invalid'
  );
  assertEquals(
    getTargetSize(-2000, 1000, 1600),
    { width: 0, height: 0 },
    'getTargetSize: negative width is invalid'
  );
  assertEquals(
    getTargetSize(NaN, 1000, 1600),
    { width: 0, height: 0 },
    'getTargetSize: NaN width is invalid'
  );
  assertEquals(
    getTargetSize(2000, 1000, NaN),
    { width: 0, height: 0 },
    'getTargetSize: NaN max long side is invalid'
  );

  // ---------------------------------------------------------------------------
  // looksLikeFileName
  // ---------------------------------------------------------------------------
  assert(looksLikeFileName('IMG_1234'), 'looksLikeFileName: IMG_1234 is a file name');
  assert(looksLikeFileName('img 1234'), 'looksLikeFileName: lowercase img 1234 is a file name');
  assert(looksLikeFileName('DSC0123'), 'looksLikeFileName: DSC0123 is a file name');
  assert(looksLikeFileName('DSC'), 'looksLikeFileName: bare DSC is a file name');
  assert(looksLikeFileName('screenshot'), 'looksLikeFileName: screenshot is a file name');
  assert(
    looksLikeFileName('Screenshot 2024-01-01 at 10.00.00'),
    'looksLikeFileName: screenshot sentence is a file name'
  );
  assert(looksLikeFileName('123456'), 'looksLikeFileName: only digits is a file name');
  assert(looksLikeFileName('foto.jpg'), 'looksLikeFileName: file extension is a file name');
  assert(looksLikeFileName('20240101_123456'), 'looksLikeFileName: camera timestamp is a file name');
  assert(
    !looksLikeFileName('Adegan pembuka di lorong bioskop'),
    'looksLikeFileName: descriptive alt text is accepted'
  );
  assert(!looksLikeFileName(''), 'looksLikeFileName: empty is not a file name');
  assert(!looksLikeFileName('   '), 'looksLikeFileName: whitespace is not a file name');
  assert(!looksLikeFileName(null as any), 'looksLikeFileName: null is not a file name');

  // ---------------------------------------------------------------------------
  // validateAltText
  // ---------------------------------------------------------------------------
  const exactAlt = 'a'.repeat(ALT_TEXT_MAX_LENGTH);
  const overAlt = 'a'.repeat(ALT_TEXT_MAX_LENGTH + 1);

  assertEquals(
    validateAltText('Aktor utama berjalan di lorong bioskop'),
    { valid: true, warning: null },
    'validateAltText: descriptive text is valid'
  );
  assert(!validateAltText('').valid, 'validateAltText: empty text is invalid');
  assert(!validateAltText('   ').valid, 'validateAltText: whitespace-only text is invalid');
  assert(
    validateAltText(exactAlt).valid,
    'validateAltText: exactly 125 characters is valid'
  );
  assertEquals(
    validateAltText(overAlt),
    { valid: false, warning: 'Teks alternatif maksimal 125 karakter.' },
    'validateAltText: over 125 characters reports the limit'
  );
  assert(!validateAltText('IMG_1234').valid, 'validateAltText: file-like text is invalid');
  assert(
    validateAltText('IMG_1234').warning?.includes('nama berkas') === true,
    'validateAltText: file-like text warns about a file name'
  );
  assert(!validateAltText('987654').valid, 'validateAltText: only digits is invalid');
  assert(!validateAltText(null as any).valid, 'validateAltText: null is invalid');

  // ---------------------------------------------------------------------------
  // getArticleSaveBlockMessage - which field is reported
  // ---------------------------------------------------------------------------
  assertEquals(
    getArticleSaveBlockMessage({
      coverImage: 'data:image/png;base64,AAA',
      ogImage: 'https://example.com/og.jpg',
      content: 'Isi artikel.',
      contentJson: '{"type":"doc"}',
    }),
    'Gambar cover belum terunggah. Unggah ulang gambar cover.',
    'getArticleSaveBlockMessage: cover data URL is reported as cover'
  );
  assertEquals(
    getArticleSaveBlockMessage({
      coverImage: 'https://example.com/cover.jpg',
      ogImage: 'data:image/png;base64,BBB',
      content: 'Isi artikel.',
      contentJson: '{"type":"doc"}',
    }),
    'Gambar OG (SEO) belum terunggah. Kosongkan atau samakan dengan cover.',
    'getArticleSaveBlockMessage: OG data URL is reported as OG'
  );
  assertEquals(
    getArticleSaveBlockMessage({
      coverImage: 'data:image/png;base64,AAA',
      ogImage: 'data:image/png;base64,BBB',
      content: 'Isi artikel.',
      contentJson: '{"type":"doc"}',
    }),
    'Gambar cover belum terunggah. Unggah ulang gambar cover.',
    'getArticleSaveBlockMessage: both fields report cover first'
  );
  assertEquals(
    getArticleSaveBlockMessage({
      coverImage: 'https://example.com/cover.jpg',
      ogImage: '',
      content: 'Isi artikel.',
      contentJson: '{"type":"doc"}',
    }),
    null,
    'getArticleSaveBlockMessage: safe images are not blocked'
  );
  assertEquals(
    getArticleSaveBlockMessage({
      coverImage: 'https://example.com/cover.jpg',
      ogImage: 'https://example.com/og.jpg',
      content: 'Teks ![gambar](data:image/png;base64,AAA)',
      contentJson: '{"type":"doc"}',
    }),
    'Ada gambar yang belum terunggah ke penyimpanan. Hapus lalu unggah ulang gambarnya.',
    'getArticleSaveBlockMessage: inline data image is reported separately'
  );

  // ---------------------------------------------------------------------------
  // buildImageStorageFileName / formatImageSize
  // ---------------------------------------------------------------------------
  assertEquals(
    buildImageStorageFileName('Review Film Dune: Part Two', 'webp', 1700000000000),
    'review-film-dune-part-two-1700000000000.webp',
    'buildImageStorageFileName: slugifies the article title'
  );
  assertEquals(
    buildImageStorageFileName('IMG_1234.JPG', 'jpg', 42),
    'img-1234-42.jpg',
    'buildImageStorageFileName: strips the old extension'
  );
  const longName = buildImageStorageFileName('a'.repeat(120), 'webp', 1);
  assert(
    longName.replace(/-\d+\.webp$/, '').length <= 60,
    'buildImageStorageFileName: caps the slug at 60 characters'
  );
  assertEquals(
    buildImageStorageFileName('', 'webp', 7),
    'artikel-7.webp',
    'buildImageStorageFileName: falls back to artikel'
  );
  assertEquals(formatImageSize(3276800), '3.1 MB', 'formatImageSize: megabytes are formatted');
  assertEquals(formatImageSize(215040), '210 KB', 'formatImageSize: kilobytes are formatted');

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
