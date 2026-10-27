import {
  countReviewAudiences,
  fitFontSize,
  formatReviewCountsLine,
  getShareLayoutBudget,
  normalizeShareCount,
  wrapShareText,
} from '../src/utils/shareCardText';
import {
  buildFilmShareLayout,
  getBuzzCardLayout,
  getFilmShareLayoutMetrics,
  type BuzzCardInput,
  type FilmShareData,
  type ShareFormat,
  type TextMeasure,
} from '../src/utils/buzzStoryCard';

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

  // Film story: 2-line title, exact 4x rating pill, counts, headline, and a
  // 5-line review must all stay inside the 1010-1755 story copy range.
  const filmStoryBlocks = [
    { height: 144 },
    { height: 28, gapBefore: 8 },
    { height: 112, gapBefore: 22 },
    { height: 34, gapBefore: 18 },
    { height: 34, gapBefore: 16 },
    { height: 190, gapBefore: 18 },
  ];
  const filmStory = getShareLayoutBudget({
    availableTop: 1010,
    availableBottom: 1755,
    blocks: filmStoryBlocks,
    bias: 0.55,
  });
  assertEquals(
    filmStory.contentHeight,
    624,
    'film story: includes the 112px scaled rating pill and 5-line review'
  );
  assert(
    filmStory.fits &&
      filmStory.startY >= 1010 &&
      filmStory.endY <= 1755,
    'film story: 2-line title and 5-line review fit the story range'
  );
  let filmStoryCursor = filmStory.startY;
  const filmStoryRanges = filmStoryBlocks.map((block, index) => {
    filmStoryCursor += index > 0 ? block.gapBefore || 0 : 0;
    const top = filmStoryCursor;
    filmStoryCursor += block.height;
    return { top, bottom: filmStoryCursor };
  });
  assert(
    filmStoryRanges.every(
      (range, index) => index === 0 || range.top >= filmStoryRanges[index - 1].bottom
    ),
    'film story: title, rating, counts, headline, and review never overlap'
  );
  assert(
    filmStoryRanges[filmStoryRanges.length - 1].bottom <= 1755,
    'film story: the last review line stays above the footer'
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

  // ---------------------------------------------------------------------------
  // Film share layout (story + feed share one design, different bounds)
  // ---------------------------------------------------------------------------
  const measureShareText: TextMeasure = (font, text) => {
    const size = Number.parseInt(font.match(/(\d+)px/)?.[1] || '20', 10);
    return text.length * size * 0.56;
  };

  const filmBase: FilmShareData = {
    filmTitle: 'Dune: Part Two',
    filmYear: 2024,
    filmGenres: ['Sci-Fi', 'Adventure'],
    filmDirector: 'Denis Villeneuve',
    reviewerName: 'Marke',
    reviewerRole: 'Kritikus Sotoy',
  };

  const filmStoryCard = buildFilmShareLayout(
    filmBase,
    8.7,
    true,
    measureShareText,
    'story'
  );
  assertEquals(filmStoryCard.titleFontSize, 96, 'film story: 96px title');
  assertEquals(filmStoryCard.titleLines.length, 1, 'film story: short title stays on one line');
  assertEquals(filmStoryCard.directorFontSize, 34, 'film story: 34px director line');
  assertEquals(filmStoryCard.metaFontSize, 38, 'film story: 38px meta line');
  assertEquals(filmStoryCard.rating.scale, 6, 'film story: rating pill scale 6');
  assertEquals(filmStoryCard.footerDividerY, 1795, 'film story: divider above footer');
  assertEquals(filmStoryCard.footerTextY, 1830, 'film story: footer baseline');
  assert(
    filmStoryCard.startY >= 960 && filmStoryCard.endY <= 1745,
    'film story: copy stays inside 960-1745'
  );
  assert(
    filmStoryCard.titleBottom <= filmStoryCard.directorTop &&
      filmStoryCard.directorBottom <= filmStoryCard.metaTop &&
      filmStoryCard.metaBottom <= filmStoryCard.ratingTop &&
      filmStoryCard.ratingBottom <= filmStoryCard.reviewerTop &&
      filmStoryCard.reviewerBottom <= filmStoryCard.availableBottom,
    'film story: title, director, meta, rating, reviewer stack in order'
  );
  assert(
    filmStoryCard.directorText.startsWith('Director:') &&
      filmStoryCard.metaText.includes('2024') &&
      filmStoryCard.metaText.includes('|'),
    'film story: director sits above the year | genres meta line'
  );
  assert(
    !filmStoryCard.reviewerText.includes('Review') &&
      !filmStoryCard.metaText.includes('Reviews'),
    'film story: no review counts in the copy block'
  );

  const filmFeedCard = buildFilmShareLayout(
    filmBase,
    8.7,
    true,
    measureShareText,
    'feed'
  );
  assertEquals(filmFeedCard.titleFontSize, 84, 'film feed: 84px title');
  assertEquals(filmFeedCard.directorFontSize, 30, 'film feed: 30px director line');
  assertEquals(filmFeedCard.metaFontSize, 34, 'film feed: 34px meta line');
  assertEquals(filmFeedCard.rating.scale, 5, 'film feed: rating pill scale 5');
  assertEquals(filmFeedCard.footerDividerY, 1225, 'film feed: divider above footer');
  assertEquals(filmFeedCard.footerTextY, 1260, 'film feed: footer baseline');
  assert(
    filmFeedCard.startY >= 690 && filmFeedCard.endY <= 1180,
    'film feed: copy stays inside 690-1180'
  );
  assert(
    filmFeedCard.footerTextY + 20 <= 1350,
    'film feed: footer fits inside the 1350px canvas'
  );

  const filmLongTitle = buildFilmShareLayout(
    {
      ...filmBase,
      filmTitle:
        'Petualangan Sang Sutradara Dalam Dunia Sinema Yang Sangat Panjang Tanpa Henti',
    },
    8.7,
    true,
    measureShareText,
    'story'
  );
  assert(
    filmLongTitle.titleFontSize >= 52 && filmLongTitle.titleFontSize <= 96,
    'film: long title shrinks but never below the 52px minimum'
  );
  assertEquals(filmLongTitle.titleLines.length, 2, 'film: long title caps at two lines');
  assert(
    filmLongTitle.titleLines[1].endsWith('...'),
    'film: truncated title keeps an ellipsis'
  );
  assert(
    filmLongTitle.startY >= 960 && filmLongTitle.endY <= 1745,
    'film: long title still fits the story bounds'
  );

  const filmNoExtras = buildFilmShareLayout(
    { filmTitle: 'Tenet', filmYear: 2020, filmGenres: ['Thriller'] },
    7,
    true,
    measureShareText,
    'story'
  );
  assertEquals(filmNoExtras.hasDirector, false, 'film: no director row without data');
  assertEquals(filmNoExtras.hasReviewer, false, 'film: no reviewer row without data');
  assert(
    filmNoExtras.titleBottom <= filmNoExtras.metaTop &&
      filmNoExtras.metaBottom <= filmNoExtras.ratingTop &&
      filmNoExtras.ratingBottom === filmNoExtras.endY,
    'film: rating is the last block when there is no reviewer'
  );
  assert(
    filmNoExtras.endY <= 1745,
    'film: rating stays above the footer without director/reviewer'
  );

  const filmEmpty = buildFilmShareLayout({}, 0, false, measureShareText, 'story');
  assertEquals(filmEmpty.titleLines.length, 0, 'film: empty data has no title lines');
  assertEquals(filmEmpty.hasDirector, false, 'film: empty data has no director');
  assertEquals(filmEmpty.metaText, '', 'film: empty data has no meta');
  assertEquals(filmEmpty.hasReviewer, false, 'film: empty data has no reviewer');
  assert(
    filmEmpty.fits && filmEmpty.ratingBottom === filmEmpty.endY,
    'film: empty data still renders a contained rating pill'
  );

  // ---------------------------------------------------------------------------
  // Buzz card layout (story preserves legacy geometry, feed scales from it)
  // ---------------------------------------------------------------------------
  const noTagBuzz: BuzzCardInput = {
    authorName: 'Marke',
    text: 'Halo semua',
  };
  const noTagStory = getBuzzCardLayout(noTagBuzz, 'story');
  assertEquals(noTagStory.width, 1080, 'buzz story: 1080px wide');
  assertEquals(noTagStory.height, 1920, 'buzz story: 1920px tall');
  assertEquals(noTagStory.scale, 1, 'buzz story: legacy scale 1');
  assertEquals(noTagStory.footerPrimaryY, 1830, 'buzz story: footer primary y');
  assertEquals(noTagStory.footerSecondaryY, 1868, 'buzz story: footer secondary y');
  assertEquals(noTagStory.tags.length, 0, 'buzz story: no chips without tags');
  assert(
    noTagStory.cardY >= noTagStory.topSafe &&
      noTagStory.cardY + noTagStory.cardH <= noTagStory.bottomSafe,
    'buzz story: no-tag card stays inside the safe area'
  );

  const noTagFeed = getBuzzCardLayout(noTagBuzz, 'feed');
  assertEquals(noTagFeed.height, 1350, 'buzz feed: 1350px tall');
  assertEquals(noTagFeed.footerPrimaryY, 1287, 'buzz feed: footer primary y');
  assertEquals(noTagFeed.footerSecondaryY, 1313, 'buzz feed: footer secondary y');
  assert(
    noTagFeed.cardY >= noTagFeed.topSafe &&
      noTagFeed.cardY + noTagFeed.cardH <= noTagFeed.bottomSafe,
    'buzz feed: no-tag card stays inside the safe area'
  );
  assert(
    noTagFeed.footerPrimaryY + 30 * noTagFeed.scale <= 1350 &&
      noTagFeed.footerSecondaryY + 22 * noTagFeed.scale <= 1350,
    'buzz feed: footer text fits inside the canvas'
  );

  const taggedBuzz: BuzzCardInput = {
    authorName: 'Marke',
    text: 'Diskusi panjang soal film, artikel, dan watchlist pilihan minggu ini.',
    film: {
      title: 'Dune: Part Two',
      year: 2024,
      genres: ['Sci-Fi'],
      score: 8.7,
    },
    article: {
      title: 'Kenapa Dune Part Two Layak Ditonton',
      cover: 'https://example.com/cover.jpg',
      category: 'Ulasan',
      author: 'Marke',
    },
    collection: {
      name: 'Watchlist Sci-Fi',
      itemCount: 12,
      previewImages: [],
    },
    tags: ['film', 'dune'],
    likes: 10,
    replies: 2,
  };

  (['story', 'feed'] as ShareFormat[]).forEach((format) => {
    const layout = getBuzzCardLayout(taggedBuzz, format, { textLineCount: 3 });
    assertEquals(
      layout.tags.map((tag) => tag.kind),
      ['film', 'article', 'collection'],
      `buzz ${format}: renders film, article, and watchlist chips`
    );
    assert(
      layout.tags.every(
        (tag) => tag.x === layout.innerX && tag.width === layout.innerW
      ),
      `buzz ${format}: chips fill the inner width`
    );
    assert(
      layout.tags.every(
        (tag, index) =>
          index === 0 ||
          tag.y >= layout.tags[index - 1].y + layout.tags[index - 1].height
      ),
      `buzz ${format}: chips stack without overlapping`
    );
    assert(
      layout.tags[layout.tags.length - 1].y +
        layout.tags[layout.tags.length - 1].height <=
        layout.hashtagsY,
      `buzz ${format}: chips end above the hashtags`
    );
    assert(
      layout.cardY >= layout.topSafe &&
        layout.cardY + layout.cardH <= layout.bottomSafe,
      `buzz ${format}: tagged card stays inside the safe area`
    );
    assert(
      layout.statsY + layout.statsHeight <= layout.cardY + layout.cardH,
      `buzz ${format}: stats stay inside the card`
    );
    assert(
      layout.footerPrimaryY > layout.cardY + layout.cardH &&
        layout.footerPrimaryY + 30 * layout.scale <= layout.height &&
        layout.footerSecondaryY + 22 * layout.scale <= layout.height,
      `buzz ${format}: footer sits below the card and inside the canvas`
    );
  });

  const longBuzz: BuzzCardInput = {
    ...taggedBuzz,
    text: 'Kata '.repeat(200),
  };
  (['story', 'feed'] as ShareFormat[]).forEach((format) => {
    const layout = getBuzzCardLayout(longBuzz, format, { textLineCount: 999 });
    assert(
      layout.textLineCount <= layout.maxTextLines,
      `buzz ${format}: long text is clamped to the available lines`
    );
    assert(
      layout.textY + layout.textHeight <= layout.tagsY,
      `buzz ${format}: clamped text never overlaps the chips`
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
