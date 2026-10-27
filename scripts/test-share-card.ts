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
  FILM_TEXT_GAP_RATIO,
  FILM_TEXT_LINE_HEIGHT_RATIO,
  FILM_TITLE_LINE_HEIGHT_RATIO,
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
  assertEquals(filmStoryCard.titleFontSize, 88, 'film story: 88px title');
  assertEquals(filmStoryCard.titleLines.length, 1, 'film story: short title stays on one line');
  assertEquals(filmStoryCard.directorFontSize, 40, 'film story: 40px director line');
  assertEquals(filmStoryCard.metaFontSize, 40, 'film story: 40px meta line');
  assertEquals(
    filmStoryCard.directorFontSize,
    filmStoryCard.metaFontSize,
    'film story: director and year | genres share one info size'
  );
  assertEquals(
    filmStoryCard.directorLineHeight,
    Math.round(40 * FILM_TEXT_LINE_HEIGHT_RATIO),
    'film story: info group uses tight 1.2 leading'
  );
  assertEquals(filmStoryCard.rating.scale, 4.5, 'film story: rating pill scale 4.5');
  assertEquals(
    filmStoryCard.titleLineHeight,
    Math.round(88 * FILM_TITLE_LINE_HEIGHT_RATIO),
    'film story: title leading is 1.1'
  );
  assertEquals(filmStoryCard.footerDividerY, 1795, 'film story: divider above footer');
  assertEquals(filmStoryCard.footerTextY, 1830, 'film story: footer baseline');
  assert(
    filmStoryCard.startY >= 960 && filmStoryCard.endY <= 1745,
    'film story: copy stays inside 960-1745'
  );
  assertEquals(
    filmStoryCard.endY,
    1745,
    'film story: copy block stays bottom-anchored above the footer'
  );
  assert(
    filmStoryCard.titleBottom <= filmStoryCard.directorTop &&
      filmStoryCard.directorBottom <= filmStoryCard.metaTop &&
      filmStoryCard.metaBottom <= filmStoryCard.ratingTop &&
      filmStoryCard.ratingBottom <= filmStoryCard.reviewerTop &&
      filmStoryCard.reviewerBottom <= filmStoryCard.availableBottom,
    'film story: title, director, meta, rating, reviewer stack in order'
  );
  assertEquals(
    filmStoryCard.directorTop - filmStoryCard.titleBottom,
    20,
    'film story: title -> director gap is 20'
  );
  assertEquals(
    filmStoryCard.metaTop - filmStoryCard.directorBottom,
    8,
    'film story: director -> meta gap is 8'
  );
  assertEquals(
    filmStoryCard.ratingTop - filmStoryCard.metaBottom,
    34,
    'film story: meta -> pill gap is 34'
  );
  assertEquals(
    filmStoryCard.reviewerTop - filmStoryCard.ratingBottom,
    22,
    'film story: pill -> reviewer gap is 22'
  );
  assert(
    filmStoryCard.directorTop - filmStoryCard.titleBottom <=
      FILM_TEXT_GAP_RATIO * filmStoryCard.titleFontSize &&
      filmStoryCard.metaTop - filmStoryCard.directorBottom <=
        FILM_TEXT_GAP_RATIO * filmStoryCard.titleFontSize,
    'film story: text gaps stay within 0.35x the title size'
  );
  assert(
    filmStoryCard.rating.boxHeight <
      filmStoryCard.titleFontSize * filmStoryCard.titleLineHeight * 2,
    'film story: the rating pill is smaller than a two-line title block'
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
  assertEquals(filmFeedCard.titleFontSize, 76, 'film feed: 76px title');
  assertEquals(filmFeedCard.directorFontSize, 36, 'film feed: 36px director line');
  assertEquals(filmFeedCard.metaFontSize, 36, 'film feed: 36px meta line');
  assertEquals(
    filmFeedCard.directorFontSize,
    filmFeedCard.metaFontSize,
    'film feed: director and year | genres share one info size'
  );
  assertEquals(
    filmFeedCard.directorLineHeight,
    Math.round(36 * FILM_TEXT_LINE_HEIGHT_RATIO),
    'film feed: info group uses tight 1.2 leading'
  );
  assertEquals(filmFeedCard.rating.scale, 4, 'film feed: rating pill scale 4');
  assertEquals(
    filmFeedCard.titleLineHeight,
    Math.round(76 * FILM_TITLE_LINE_HEIGHT_RATIO),
    'film feed: title leading is 1.1'
  );
  assertEquals(filmFeedCard.footerDividerY, 1225, 'film feed: divider above footer');
  assertEquals(filmFeedCard.footerTextY, 1260, 'film feed: footer baseline');
  assert(
    filmFeedCard.startY >= 690 && filmFeedCard.endY <= 1180,
    'film feed: copy stays inside 690-1180'
  );
  assertEquals(
    filmFeedCard.endY,
    1180,
    'film feed: copy block stays bottom-anchored above the footer'
  );
  assert(
    filmFeedCard.titleBottom <= filmFeedCard.directorTop &&
      filmFeedCard.directorBottom <= filmFeedCard.metaTop &&
      filmFeedCard.metaBottom <= filmFeedCard.ratingTop &&
      filmFeedCard.ratingBottom <= filmFeedCard.reviewerTop &&
      filmFeedCard.reviewerBottom <= filmFeedCard.availableBottom,
    'film feed: title, director, meta, rating, reviewer stack in order'
  );
  assertEquals(
    filmFeedCard.directorTop - filmFeedCard.titleBottom,
    16,
    'film feed: title -> director gap is 16'
  );
  assertEquals(
    filmFeedCard.metaTop - filmFeedCard.directorBottom,
    8,
    'film feed: director -> meta gap is 8'
  );
  assertEquals(
    filmFeedCard.ratingTop - filmFeedCard.metaBottom,
    28,
    'film feed: meta -> pill gap is 28'
  );
  assertEquals(
    filmFeedCard.reviewerTop - filmFeedCard.ratingBottom,
    20,
    'film feed: pill -> reviewer gap is 20'
  );
  assert(
    filmFeedCard.directorTop - filmFeedCard.titleBottom <=
      FILM_TEXT_GAP_RATIO * filmFeedCard.titleFontSize &&
      filmFeedCard.metaTop - filmFeedCard.directorBottom <=
        FILM_TEXT_GAP_RATIO * filmFeedCard.titleFontSize,
    'film feed: text gaps stay within 0.35x the title size'
  );
  assert(
    filmFeedCard.rating.boxHeight <
      filmFeedCard.titleFontSize * filmFeedCard.titleLineHeight * 2,
    'film feed: the rating pill is smaller than a two-line title block'
  );
  assert(
    filmFeedCard.reviewerBottom <= filmFeedCard.footerDividerY &&
      filmFeedCard.footerTextY + 20 <= 1350,
    'film feed: reviewer and footer stay inside the 1350px canvas'
  );

  (['story', 'feed'] as ShareFormat[]).forEach((format) => {
    const layout = format === 'story' ? filmStoryCard : filmFeedCard;
    const height = format === 'story' ? 1920 : 1350;
    const divider = format === 'story' ? 1795 : 1225;
    assert(
      layout.startY >= 0 &&
        layout.titleTop >= 0 &&
        layout.directorTop >= layout.titleTop &&
        layout.metaTop >= layout.directorTop &&
        layout.ratingTop >= layout.metaTop &&
        layout.reviewerTop >= layout.ratingTop &&
        layout.endY <= height &&
        layout.reviewerBottom < divider,
      `film ${format}: every block lies inside the canvas and above the footer line`
    );
  });

  const filmLongTitleBase: FilmShareData = {
    ...filmBase,
    filmTitle:
      'Petualangan Sang Sutradara Dalam Dunia Sinema Yang Sangat Panjang Tanpa Henti',
  };

  (['story', 'feed'] as ShareFormat[]).forEach((format) => {
    const bounds =
      format === 'story'
        ? { top: 960, bottom: 1745, divider: 1795, max: 88, min: 52 }
        : { top: 690, bottom: 1180, divider: 1225, max: 76, min: 48 };
    const longTitle = buildFilmShareLayout(
      filmLongTitleBase,
      8.7,
      true,
      measureShareText,
      format
    );
    assert(
      longTitle.titleFontSize >= bounds.min &&
        longTitle.titleFontSize <= bounds.max,
      `film ${format}: long title shrinks but never below the ${bounds.min}px minimum`
    );
    assertEquals(
      longTitle.titleLines.length,
      2,
      `film ${format}: long title caps at two lines`
    );
    assert(
      longTitle.titleLines[1].endsWith('...'),
      `film ${format}: truncated title keeps an ellipsis`
    );
    assert(
      longTitle.startY >= bounds.top &&
        longTitle.endY <= bounds.bottom &&
        longTitle.reviewerBottom <= bounds.divider &&
        longTitle.fits,
      `film ${format}: long title stays inside the canvas and above the footer`
    );
    assert(
      longTitle.directorTop - longTitle.titleBottom <=
        FILM_TEXT_GAP_RATIO * longTitle.titleFontSize + 0.01 &&
        longTitle.metaTop - longTitle.directorBottom <=
          FILM_TEXT_GAP_RATIO * longTitle.titleFontSize + 0.01,
      `film ${format}: long title still respects the 0.35x gap rule`
    );
  });

  (['story', 'feed'] as ShareFormat[]).forEach((format) => {
    const bottom = format === 'story' ? 1745 : 1180;
    const divider = format === 'story' ? 1795 : 1225;
    const expectedGap = format === 'story' ? 20 : 16;

    const noDirector = buildFilmShareLayout(
      { filmTitle: 'Tenet', filmYear: 2020, filmGenres: ['Thriller'] },
      7,
      true,
      measureShareText,
      format
    );
    assertEquals(
      noDirector.hasDirector,
      false,
      `film ${format}: no director row without data`
    );
    assertEquals(
      noDirector.hasReviewer,
      false,
      `film ${format}: no reviewer row without data`
    );
    assertEquals(
      noDirector.metaTop - noDirector.titleBottom,
      expectedGap,
      `film ${format}: title -> meta gap matches the info group without a director`
    );
    assert(
      noDirector.metaTop - noDirector.titleBottom <=
        FILM_TEXT_GAP_RATIO * noDirector.titleFontSize,
      `film ${format}: title -> meta gap respects the 0.35x rule`
    );
    assert(
      noDirector.titleBottom <= noDirector.metaTop &&
        noDirector.metaBottom <= noDirector.ratingTop &&
        noDirector.ratingBottom === noDirector.endY &&
        noDirector.endY <= bottom &&
        noDirector.endY <= divider,
      `film ${format}: rating is the last block above the footer without a reviewer`
    );

    const noScore = buildFilmShareLayout(
      { ...filmBase, filmTitle: 'Tenet' },
      0,
      false,
      measureShareText,
      format
    );
    assertEquals(
      noScore.rating.scale,
      format === 'story' ? 4.5 : 4,
      `film ${format}: missing score keeps the rating pill size`
    );
    assert(
      noScore.fits &&
        noScore.endY <= bottom &&
        noScore.reviewerBottom <= divider,
      `film ${format}: missing score still fits above the footer`
    );

    const empty = buildFilmShareLayout({}, 0, false, measureShareText, format);
    assertEquals(
      empty.titleLines.length,
      0,
      `film ${format}: empty data has no title lines`
    );
    assertEquals(
      empty.hasDirector,
      false,
      `film ${format}: empty data has no director`
    );
    assertEquals(empty.metaText, '', `film ${format}: empty data has no meta`);
    assertEquals(
      empty.hasReviewer,
      false,
      `film ${format}: empty data has no reviewer`
    );
    assert(
      empty.fits && empty.ratingBottom === empty.endY && empty.endY <= bottom,
      `film ${format}: empty data still renders a contained rating pill`
    );
  });

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
