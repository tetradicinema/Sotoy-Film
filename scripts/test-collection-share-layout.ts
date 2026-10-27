import {
  buildCollectionStoryItems,
  COLLECTION_DESCRIPTION_LINE_HEIGHT,
  COLLECTION_FEED_HEIGHT,
  COLLECTION_FOOTER_HEIGHT,
  COLLECTION_FOOTER_TOP,
  COLLECTION_LOGO_ASPECT,
  COLLECTION_LOGO_LEFT,
  COLLECTION_LOGO_PATH,
  COLLECTION_LOGO_TEXT_START_RATIO,
  COLLECTION_LOGO_TOP,
  COLLECTION_LOGO_WIDTH,
  COLLECTION_PANEL_TOP,
  COLLECTION_PANEL_WIDTH,
  COLLECTION_PILL_FONT_BASE,
  COLLECTION_PILL_FONT_MIN,
  COLLECTION_PILL_HEIGHT,
  COLLECTION_PILL_MIN_WIDTH,
  COLLECTION_PILL_PADDING_X,
  COLLECTION_TITLE_BASE,
  COLLECTION_TITLE_MAX_WIDTH,
  COLLECTION_TITLE_MIN,
  COLLECTION_WALL_GUTTER,
  COLLECTION_WALL_HEIGHT,
  COLLECTION_WALL_SEPARATOR,
  fitCollectionOwnerLine,
  fitCollectionTitle,
  getCollectionInitials,
  getCollectionShareMetrics,
  getCollectionStoryPanelLayout,
  getWallLayout,
  wrapCollectionDescription,
  type CollectionTextMeasure,
  type CollectionWallTile,
} from '../src/utils/collectionShareLayout';

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

const close = (a: number, b: number, tolerance = 0.01): boolean =>
  Math.abs(a - b) <= tolerance;

const measure: CollectionTextMeasure = (font, text) => {
  const size = Number.parseFloat(font.match(/(\d+(?:\.\d+)?)px/)?.[1] || '20');
  return text.length * size * 0.56;
};

const rectsOverlap = (a: CollectionWallTile, b: CollectionWallTile): boolean =>
  a.x < b.x + b.width - 0.01 &&
  a.x + a.width > b.x + 0.01 &&
  a.y < b.y + b.height - 0.01 &&
  a.y + a.height > b.y + 0.01;

const horizontalGap = (left: CollectionWallTile, right: CollectionWallTile) =>
  right.x - (left.x + left.width);

const verticalGap = (top: CollectionWallTile, bottom: CollectionWallTile) =>
  bottom.y - (top.y + top.height);

const WALL_WIDTH = 1080;
const WALL_HEIGHT = COLLECTION_WALL_HEIGHT;
const GUTTER = COLLECTION_WALL_GUTTER;
const LONG_TITLE =
  'Koleksi Film Horor Indonesia Paling Seram Sepanjang Masa';
const DENSE_DESCRIPTION = `${'Deskripsi koleksi yang sangat panjang '.repeat(12)}`;
const LONG_OWNER = 'Pengguna Dengan Nama Yang Sangat Panjang Sekali';
const TRUNCATED_OWNER = `${'Pengguna Dengan Nama Yang Sangat Panjang Sekali '.repeat(4)}`;

console.log('Running Collection Share Layout Tests...\n');

// ---------------------------------------------------------------------------
// Poster wall geometry
// ---------------------------------------------------------------------------
for (let count = 0; count <= 5; count += 1) {
  const tiles = getWallLayout(count, WALL_WIDTH, GUTTER, WALL_HEIGHT);
  const expectedTiles = count <= 1 ? 1 : count;
  assert(
    tiles.length === expectedTiles,
    `getWallLayout: count ${count} returns ${expectedTiles} tile(s)`
  );

  const allInside = tiles.every(
    (tile) =>
      tile.x >= -0.01 &&
      tile.y >= -0.01 &&
      tile.x + tile.width <= WALL_WIDTH + 0.01 &&
      tile.y + tile.height <= WALL_HEIGHT + 0.01
  );
  assert(allInside, `getWallLayout: count ${count} stays inside the wall`);

  const overlaps = tiles.some((tile, index) =>
    tiles.slice(index + 1).some((other) => rectsOverlap(tile, other))
  );
  assert(!overlaps, `getWallLayout: count ${count} has no overlapping tiles`);

  const minX = Math.min(...tiles.map((tile) => tile.x));
  const minY = Math.min(...tiles.map((tile) => tile.y));
  const maxX = Math.max(...tiles.map((tile) => tile.x + tile.width));
  const maxY = Math.max(...tiles.map((tile) => tile.y + tile.height));
  assert(
    close(minX, 0) &&
      close(minY, 0) &&
      close(maxX, WALL_WIDTH) &&
      close(maxY, WALL_HEIGHT),
    `getWallLayout: count ${count} covers edge to edge`
  );

  const tileArea = tiles.reduce(
    (sum, tile) => sum + tile.width * tile.height,
    0
  );
  const expectedGutterArea =
    count <= 1
      ? 0
      : count === 2
        ? GUTTER * WALL_HEIGHT
        : count === 3
          ? GUTTER * WALL_HEIGHT +
            GUTTER * ((WALL_WIDTH - GUTTER) / 2)
          : count === 4
            ? GUTTER * WALL_WIDTH +
              GUTTER * WALL_HEIGHT -
              GUTTER * GUTTER
            : GUTTER * WALL_WIDTH +
              GUTTER * (WALL_HEIGHT - GUTTER) * 0.52 +
              GUTTER * (WALL_HEIGHT - GUTTER) * 0.48 * 2;
  assert(
    close(WALL_WIDTH * WALL_HEIGHT - tileArea, expectedGutterArea, 0.05),
    `getWallLayout: count ${count} leaves room only for the 8px gutters`
  );
}

const singleWall = getWallLayout(1, WALL_WIDTH, GUTTER, WALL_HEIGHT);
assert(
  close(singleWall[0].width, WALL_WIDTH) &&
    close(singleWall[0].height, WALL_HEIGHT),
  'getWallLayout: one item uses one full-bleed tile'
);

const twoWall = getWallLayout(2, WALL_WIDTH, GUTTER, WALL_HEIGHT);
assert(
  close(twoWall[0].width, twoWall[1].width) &&
    close(twoWall[0].height, WALL_HEIGHT) &&
    close(twoWall[1].height, WALL_HEIGHT) &&
    close(horizontalGap(twoWall[0], twoWall[1]), GUTTER),
  'getWallLayout: two items use equal columns with an 8px gutter'
);

const threeWall = getWallLayout(3, WALL_WIDTH, GUTTER, WALL_HEIGHT);
assert(
  close(threeWall[0].height, WALL_HEIGHT) &&
    close(threeWall[0].width, threeWall[1].width) &&
    close(threeWall[1].width, threeWall[2].width) &&
    close(horizontalGap(threeWall[0], threeWall[1]), GUTTER) &&
    close(verticalGap(threeWall[1], threeWall[2]), GUTTER),
  'getWallLayout: three items use one tall left tile and two stacked right tiles'
);

const fourWall = getWallLayout(4, WALL_WIDTH, GUTTER, WALL_HEIGHT);
assert(
  close(fourWall[0].width, fourWall[1].width) &&
    close(fourWall[0].height, fourWall[2].height) &&
    close(horizontalGap(fourWall[0], fourWall[1]), GUTTER) &&
    close(horizontalGap(fourWall[2], fourWall[3]), GUTTER) &&
    close(verticalGap(fourWall[0], fourWall[2]), GUTTER) &&
    close(verticalGap(fourWall[1], fourWall[3]), GUTTER),
  'getWallLayout: four items use a 2x2 grid with 8px gutters'
);

const fiveWall = getWallLayout(5, WALL_WIDTH, GUTTER, WALL_HEIGHT);
const topRow = fiveWall.filter((tile) => close(tile.y, 0));
const bottomRow = fiveWall.filter((tile) => tile.y > 0);
assert(
  topRow.length === 2 &&
    bottomRow.length === 3 &&
    close(horizontalGap(topRow[0], topRow[1]), GUTTER) &&
    close(horizontalGap(bottomRow[0], bottomRow[1]), GUTTER) &&
    close(horizontalGap(bottomRow[1], bottomRow[2]), GUTTER) &&
    close(verticalGap(topRow[0], bottomRow[0]), GUTTER),
  'getWallLayout: five items use two on top and three below with 8px gutters'
);

assert(
  COLLECTION_PANEL_TOP ===
    COLLECTION_WALL_HEIGHT + COLLECTION_WALL_SEPARATOR,
  'layout constants: the yellow panel starts after the 6px wall separator'
);
assert(
  COLLECTION_LOGO_PATH === '/v2_sotoyfilm full logo transparent.PNG' &&
    COLLECTION_LOGO_LEFT === 60 &&
    COLLECTION_LOGO_TOP === 90 &&
    COLLECTION_LOGO_WIDTH === 400,
  'layout constants: the logo is placed directly over the wall at 400px wide'
);
assert(
  COLLECTION_LOGO_TEXT_START_RATIO > 0.25 &&
    COLLECTION_LOGO_TEXT_START_RATIO < 0.3,
  'layout constants: the logo outline clip starts after the clapper icon'
);

// ---------------------------------------------------------------------------
// Title fitting
// ---------------------------------------------------------------------------
const shortTitle = fitCollectionTitle('Horor Lokal', measure);
assert(
  shortTitle.lines.length === 1 &&
    shortTitle.fontSize === COLLECTION_TITLE_BASE &&
    shortTitle.text === 'HOROR LOKAL',
  'fitCollectionTitle: a short title stays on one line at the base size'
);

const longTitle = fitCollectionTitle(LONG_TITLE, measure);
assert(
  longTitle.fontSize < COLLECTION_TITLE_BASE &&
    longTitle.fontSize > COLLECTION_TITLE_MIN &&
    longTitle.lines.length <= 2 &&
    !longTitle.truncated,
  'fitCollectionTitle: a long title shrinks before truncating'
);
assert(
  longTitle.lines.every(
    (line) =>
      measure(`900 ${longTitle.fontSize}px Geist`, line) <=
      COLLECTION_TITLE_MAX_WIDTH + 0.01
  ),
  'fitCollectionTitle: every fitted title line stays inside the panel width'
);

const hugeTitle = fitCollectionTitle(`${LONG_TITLE} Dengan Subjudul Yang Sangat Panjang`, measure);
assert(
  hugeTitle.fontSize === COLLECTION_TITLE_MIN &&
    hugeTitle.lines.length === 2 &&
    hugeTitle.truncated,
  'fitCollectionTitle: an extreme title shrinks to its minimum and truncates on a word boundary'
);
assert(
  hugeTitle.lines[1].endsWith('...'),
  'fitCollectionTitle: truncated copy ends with an ellipsis'
);

// ---------------------------------------------------------------------------
// Description and owner fitting
// ---------------------------------------------------------------------------
assert(
  wrapCollectionDescription('', measure).length === 0,
  'wrapCollectionDescription: an empty description removes its block'
);

const shortDescription = wrapCollectionDescription(
  'Kumpulan film horor pilihan.',
  measure
);
assert(
  shortDescription.length === 1,
  'wrapCollectionDescription: a short description stays on one line'
);

const longDescription = wrapCollectionDescription(DENSE_DESCRIPTION, measure);
assert(
  longDescription.length === 2,
  'wrapCollectionDescription: long copy is capped at two lines'
);
assert(
  longDescription[1].endsWith('...'),
  'wrapCollectionDescription: the second line ends with an ellipsis'
);
assert(
  longDescription.every(
    (line) => measure(`600 36px Plus Jakarta Sans`, line) <= COLLECTION_PANEL_WIDTH + 0.01
  ),
  'wrapCollectionDescription: every line stays inside the panel width'
);

const shortOwner = fitCollectionOwnerLine('Budi', measure);
assert(
  shortOwner.label === 'oleh Budi' &&
    shortOwner.fontSize === COLLECTION_PILL_FONT_BASE &&
    !shortOwner.truncated,
  'fitCollectionOwnerLine: a short owner name stays at the base size'
);

assert(
  fitCollectionOwnerLine('', measure).label === 'oleh Pengguna Sotoy' &&
    fitCollectionOwnerLine('   ', measure).label === 'oleh Pengguna Sotoy',
  'fitCollectionOwnerLine: a missing owner falls back to Pengguna Sotoy'
);

const longOwner = fitCollectionOwnerLine(LONG_OWNER, measure);
assert(
  longOwner.label.startsWith('oleh ') &&
    !longOwner.label.includes('\n') &&
    longOwner.fontSize < COLLECTION_PILL_FONT_BASE &&
    longOwner.fontSize >= COLLECTION_PILL_FONT_MIN,
  'fitCollectionOwnerLine: a long owner name shrinks to a smaller single line'
);
assert(
  measure(`800 ${longOwner.fontSize}px Geist`, longOwner.label) <=
    COLLECTION_PANEL_WIDTH - COLLECTION_PILL_PADDING_X * 2 + 0.01,
  'fitCollectionOwnerLine: the owner line fits inside the pill text area'
);

const truncatedOwner = fitCollectionOwnerLine(TRUNCATED_OWNER, measure);
assert(
  truncatedOwner.fontSize === COLLECTION_PILL_FONT_MIN &&
    truncatedOwner.truncated &&
    truncatedOwner.label.endsWith('...'),
  'fitCollectionOwnerLine: an extreme owner name truncates with an ellipsis at the minimum size'
);
assert(
  measure(`800 ${truncatedOwner.fontSize}px Geist`, truncatedOwner.label) <=
    COLLECTION_PANEL_WIDTH - COLLECTION_PILL_PADDING_X * 2 + 0.01,
  'fitCollectionOwnerLine: the truncated owner line still fits inside the panel'
);

// ---------------------------------------------------------------------------
// Vertical panel budget
// ---------------------------------------------------------------------------
const panelCases = [
  { title: 'Horor Lokal', description: '', label: 'one-line title, no description' },
  {
    title: 'Horor Lokal',
    description: DENSE_DESCRIPTION,
    label: 'one-line title, two-line description',
  },
  {
    title: LONG_TITLE,
    description: '',
    label: 'two-line title, no description',
  },
  {
    title: LONG_TITLE,
    description: DENSE_DESCRIPTION,
    label: 'two-line title, two-line description',
  },
];

panelCases.forEach(({ title, description, label }) => {
  const layout = getCollectionStoryPanelLayout({
    title,
    description,
    ownerName: LONG_OWNER,
    measure,
  });

  assert(
    layout.fits &&
      layout.contentBottom <= COLLECTION_FOOTER_TOP + 0.01,
    `getCollectionStoryPanelLayout: ${label} fits above the footer`
  );
  assert(
    layout.contentTop >= COLLECTION_PANEL_TOP &&
      layout.titleTop + layout.titleHeight <= layout.descriptionTop + 0.01 &&
      layout.descriptionTop + layout.descriptionHeight <=
        layout.pillTop + 0.01 &&
      layout.pillTop + layout.pillHeight <= COLLECTION_FOOTER_TOP + 0.01,
    `getCollectionStoryPanelLayout: ${label} keeps its blocks in order`
  );
  assert(
    close(
      layout.contentTop - COLLECTION_PANEL_TOP,
      COLLECTION_FOOTER_TOP - layout.contentBottom
    ),
    `getCollectionStoryPanelLayout: ${label} keeps balanced space above and below`
  );
});

const emptyDescriptionLayout = getCollectionStoryPanelLayout({
  title: 'Horor Lokal',
  description: '',
  ownerName: 'Budi',
  measure,
});
assert(
  !emptyDescriptionLayout.descriptionVisible &&
    emptyDescriptionLayout.descriptionHeight === 0 &&
    emptyDescriptionLayout.descriptionLines.length === 0,
  'getCollectionStoryPanelLayout: an empty description removes its block'
);
assert(
  emptyDescriptionLayout.pillText === 'oleh Budi' &&
    !emptyDescriptionLayout.pillText.includes('JUDUL') &&
    emptyDescriptionLayout.pillLeft === emptyDescriptionLayout.titleLeft &&
    emptyDescriptionLayout.pillHeight === COLLECTION_PILL_HEIGHT &&
    emptyDescriptionLayout.pillWidth >= COLLECTION_PILL_MIN_WIDTH - 0.01 &&
    emptyDescriptionLayout.pillLeft + emptyDescriptionLayout.pillWidth <=
      emptyDescriptionLayout.titleLeft +
        emptyDescriptionLayout.titleWidth +
        0.01,
  'getCollectionStoryPanelLayout: renders one left-aligned owner pill inside the panel'
);
assert(
  close(
    emptyDescriptionLayout.pillWidth,
    Math.min(
      Math.max(
        measure(
          `800 ${emptyDescriptionLayout.pillFontSize}px Geist`,
          emptyDescriptionLayout.pillText
        ) +
          COLLECTION_PILL_PADDING_X * 2,
        COLLECTION_PILL_MIN_WIDTH
      ),
      COLLECTION_PANEL_WIDTH
    )
  ),
  'getCollectionStoryPanelLayout: the pill width fits the measured owner text'
);
assert(
  !('countText' in emptyDescriptionLayout) &&
    !('countStickerWidth' in emptyDescriptionLayout) &&
    !('countStickerHeight' in emptyDescriptionLayout) &&
    !('ownerLabel' in emptyDescriptionLayout) &&
    !('ownerLeft' in emptyDescriptionLayout) &&
    !('ownerWidth' in emptyDescriptionLayout) &&
    !('rowTop' in emptyDescriptionLayout) &&
    !('rowHeight' in emptyDescriptionLayout),
  'getCollectionStoryPanelLayout: no leftover count sticker or owner text element'
);

const denseLayout = getCollectionStoryPanelLayout({
  title: LONG_TITLE,
  description: DENSE_DESCRIPTION,
  ownerName: LONG_OWNER,
  measure,
});
assert(
  denseLayout.titleLines.length === 2 &&
    denseLayout.descriptionVisible &&
    denseLayout.descriptionLines.length === 2 &&
    denseLayout.descriptionHeight ===
      COLLECTION_DESCRIPTION_LINE_HEIGHT * 2,
  'getCollectionStoryPanelLayout: dense copy reserves exactly two description lines'
);

// ---------------------------------------------------------------------------
// Story vs feed formats (9:16 unchanged, 4:5 fits inside 1350)
// ---------------------------------------------------------------------------
const storyMetrics = getCollectionShareMetrics('story');
const feedMetrics = getCollectionShareMetrics('feed');

assert(
  storyMetrics.height === 1920 &&
    storyMetrics.wallHeight === COLLECTION_WALL_HEIGHT &&
    storyMetrics.wallSeparator === COLLECTION_WALL_SEPARATOR &&
    storyMetrics.panelTop === COLLECTION_PANEL_TOP &&
    storyMetrics.panelLeft === 60 &&
    storyMetrics.panelWidth === COLLECTION_PANEL_WIDTH &&
    storyMetrics.titleBase === COLLECTION_TITLE_BASE &&
    storyMetrics.titleMin === COLLECTION_TITLE_MIN &&
    storyMetrics.titleMaxWidth === COLLECTION_TITLE_MAX_WIDTH &&
    storyMetrics.footerTop === COLLECTION_FOOTER_TOP &&
    storyMetrics.footerHeight === COLLECTION_FOOTER_HEIGHT &&
    storyMetrics.footerInsetX === 50 &&
    storyMetrics.footerFontSize === 26 &&
    storyMetrics.pillMinWidth === COLLECTION_PILL_MIN_WIDTH &&
    storyMetrics.pillHeight === COLLECTION_PILL_HEIGHT &&
    storyMetrics.pillFontBase === COLLECTION_PILL_FONT_BASE &&
    storyMetrics.pillFontMin === COLLECTION_PILL_FONT_MIN &&
    storyMetrics.pillPaddingX === COLLECTION_PILL_PADDING_X &&
    storyMetrics.titleBaseMax === undefined &&
    storyMetrics.maxPanelFreeSpace === undefined &&
    storyMetrics.logoLeft === COLLECTION_LOGO_LEFT &&
    storyMetrics.logoTop === COLLECTION_LOGO_TOP &&
    storyMetrics.logoWidth === COLLECTION_LOGO_WIDTH &&
    storyMetrics.badgeRight === 46 &&
    storyMetrics.badgeTop === 48 &&
    storyMetrics.badgeFontSize === 40,
  'collection story metrics: still exactly the approved 9:16 constants'
);

assert(
  feedMetrics.height === COLLECTION_FEED_HEIGHT &&
    feedMetrics.height === 1350 &&
    feedMetrics.width === 1080 &&
    feedMetrics.wallHeight === 810 &&
    feedMetrics.wallSeparator === COLLECTION_WALL_SEPARATOR &&
    feedMetrics.panelTop === 816 &&
    feedMetrics.panelTop ===
      feedMetrics.wallHeight + feedMetrics.wallSeparator &&
    feedMetrics.wallHeight / feedMetrics.height >= 0.58 &&
    feedMetrics.wallHeight / feedMetrics.height <= 0.62,
  'collection feed metrics: 1080x1350 with a poster wall at 60% of the canvas'
);

assert(
  feedMetrics.panelLeft === 60 &&
    feedMetrics.panelWidth === 960 &&
    feedMetrics.titleMaxWidth === 960 &&
    feedMetrics.footerInsetX === 60 &&
    feedMetrics.footerFontSize === 24 &&
    feedMetrics.logoLeft === 60 &&
    feedMetrics.logoWidth === 300 &&
    feedMetrics.titleBase === 140 &&
    feedMetrics.titleMin === 60 &&
    feedMetrics.titleBaseMax === 150 &&
    feedMetrics.maxPanelFreeSpace === 120 &&
    feedMetrics.pillMinWidth === 250 &&
    feedMetrics.pillHeight === 84 &&
    feedMetrics.pillFontBase === 32 &&
    feedMetrics.pillFontMin === 22 &&
    feedMetrics.pillPaddingX === 38 &&
    feedMetrics.footerTop === 1262,
  'collection feed metrics: bigger title with the 9:16 pill and footer typography'
);

(['story', 'feed'] as const).forEach((format) => {
  const metrics = getCollectionShareMetrics(format);
  const wall = getWallLayout(
    5,
    metrics.width,
    metrics.wallGutter,
    metrics.wallHeight
  );
  const wallBottom = Math.max(...wall.map((tile) => tile.y + tile.height));
  assert(
    wall.every(
      (tile) =>
        tile.x >= -0.01 &&
        tile.y >= -0.01 &&
        tile.x + tile.width <= metrics.width + 0.01 &&
        tile.y + tile.height <= metrics.wallHeight + 0.01
    ) && close(wallBottom, metrics.wallHeight),
    `collection ${format}: every poster tile lies inside the wall and the wall ends at the panel`
  );
  assert(
    metrics.panelTop + metrics.panelTopPadding > metrics.wallHeight &&
      metrics.footerTop - metrics.panelBottomPadding > metrics.panelTop &&
      metrics.footerTop + metrics.footerHeight <= metrics.height,
    `collection ${format}: panel and footer stay inside the ${metrics.height}px canvas`
  );
  assert(
    metrics.logoTop + metrics.logoWidth / COLLECTION_LOGO_ASPECT <=
      metrics.wallHeight &&
      metrics.badgeTop +
        metrics.badgeFontSize +
        metrics.badgePadY * 2 +
        metrics.badgeBorder * 2 <=
        metrics.wallHeight,
    `collection ${format}: logo and KOLEKSI badge sit over the poster wall`
  );
});

const feedCases = [
  { title: 'Horor Lokal', description: '', label: 'one-line title' },
  {
    title: LONG_TITLE,
    description: DENSE_DESCRIPTION,
    label: 'two-line title with description data',
  },
];

feedCases.forEach(({ title, description, label }) => {
  const layout = getCollectionStoryPanelLayout({
    title,
    description,
    ownerName: LONG_OWNER,
    measure,
    format: 'feed',
  });
  assert(
    layout.fits &&
      layout.titleLines.length <= 2 &&
      layout.titleFontSize <=
        (feedMetrics.titleBaseMax ?? feedMetrics.titleBase) &&
      layout.titleFontSize >= feedMetrics.titleMin &&
      layout.contentTop >=
        feedMetrics.panelTop + feedMetrics.panelTopPadding - 0.01 &&
      layout.contentBottom <=
        feedMetrics.footerTop - feedMetrics.panelBottomPadding + 0.01,
    `getCollectionStoryPanelLayout feed: ${label} fits between the panel top and the footer`
  );
  assert(
    layout.titleTop >= feedMetrics.panelTop &&
      layout.titleTop + layout.titleHeight <= layout.pillTop + 0.01 &&
      layout.pillTop + layout.pillHeight <= feedMetrics.footerTop + 0.01 &&
      layout.pillTop + layout.pillHeight <= feedMetrics.height,
    `getCollectionStoryPanelLayout feed: ${label} keeps title and owner pill inside the canvas`
  );
  assert(
    !layout.descriptionVisible &&
      layout.descriptionHeight === 0 &&
      layout.descriptionLines.length === 0,
    `getCollectionStoryPanelLayout feed: ${label} keeps the copy to KOLEKSI + title + owner pill`
  );
  assert(
    layout.pillText === `oleh ${LONG_OWNER}` &&
      !layout.pillText.includes('JUDUL') &&
      layout.pillLeft === feedMetrics.panelLeft &&
      layout.pillWidth >= feedMetrics.pillMinWidth - 0.01 &&
      layout.pillLeft + layout.pillWidth <=
        feedMetrics.panelLeft + feedMetrics.panelWidth + 0.01 &&
      layout.pillHeight === feedMetrics.pillHeight,
    `getCollectionStoryPanelLayout feed: ${label} renders one owner pill inside the panel`
  );
});

const watchlistFeed = getCollectionStoryPanelLayout({
  title: 'Watchlist Utama',
  description: '',
  ownerName: 'Budi',
  measure,
  format: 'feed',
});
assert(
  watchlistFeed.titleLines.length === 2 &&
    watchlistFeed.titleFontSize === feedMetrics.titleBase &&
    watchlistFeed.titleFontSize >= 120,
  'getCollectionStoryPanelLayout feed: WATCHLIST UTAMA wraps to two big lines like the story'
);
const watchlistGapAbove = watchlistFeed.titleTop - feedMetrics.panelTop;
const watchlistGapBelow =
  feedMetrics.footerTop -
  (watchlistFeed.pillTop + watchlistFeed.pillHeight);
assert(
  watchlistGapAbove <= 120 &&
    watchlistGapBelow <= 120 &&
    watchlistGapAbove > 0 &&
    watchlistGapBelow > 0,
  'getCollectionStoryPanelLayout feed: two-line titles keep panel free space at or under 120px'
);
assert(
  !('countText' in watchlistFeed) &&
    !('countStickerWidth' in watchlistFeed) &&
    !('countStickerHeight' in watchlistFeed) &&
    !('ownerLabel' in watchlistFeed) &&
    !('ownerLeft' in watchlistFeed) &&
    !('ownerWidth' in watchlistFeed) &&
    !('rowTop' in watchlistFeed) &&
    !('rowHeight' in watchlistFeed),
  'getCollectionStoryPanelLayout feed: no leftover count sticker or owner text element'
);

const shortFeed = getCollectionStoryPanelLayout({
  title: 'Horor',
  description: '',
  ownerName: 'Budi',
  measure,
  format: 'feed',
});
assert(
  shortFeed.titleLines.length === 1 &&
    shortFeed.titleFontSize === feedMetrics.titleBase &&
    shortFeed.titleFontSize >= 120 &&
    shortFeed.pillTop + shortFeed.pillHeight <= feedMetrics.footerTop &&
    shortFeed.contentBottom <= feedMetrics.height,
  'getCollectionStoryPanelLayout feed: a one-word title stays at 140px and fits above the footer'
);

const feedFallback = getCollectionStoryPanelLayout({
  title: 'Horor Lokal',
  description: '',
  ownerName: '',
  measure,
  format: 'feed',
});
assert(
  feedFallback.pillText === 'oleh Pengguna Sotoy',
  'getCollectionStoryPanelLayout feed: a missing owner falls back to Pengguna Sotoy'
);

const feedTruncatedOwner = getCollectionStoryPanelLayout({
  title: 'Horor Lokal',
  description: '',
  ownerName: TRUNCATED_OWNER,
  measure,
  format: 'feed',
});
assert(
  feedTruncatedOwner.pillTruncated &&
    feedTruncatedOwner.pillText.endsWith('...') &&
    feedTruncatedOwner.pillLeft + feedTruncatedOwner.pillWidth <=
      feedMetrics.panelLeft + feedMetrics.panelWidth + 0.01,
  'getCollectionStoryPanelLayout feed: a very long owner name truncates with an ellipsis'
);

const veryLongFeed = getCollectionStoryPanelLayout({
  title: `${LONG_TITLE} Dengan Subjudul Yang Sangat Panjang`,
  description: '',
  ownerName: TRUNCATED_OWNER,
  measure,
  format: 'feed',
});
assert(
  veryLongFeed.fits &&
    veryLongFeed.titleLines.length <= 2 &&
    veryLongFeed.titleFontSize >= feedMetrics.titleMin &&
    veryLongFeed.pillTop + veryLongFeed.pillHeight <= feedMetrics.footerTop &&
    veryLongFeed.contentBottom <= feedMetrics.height &&
    veryLongFeed.pillText.endsWith('...'),
  'getCollectionStoryPanelLayout feed: very long titles and owner names stay above the footer'
);

const storyFallback = getCollectionStoryPanelLayout({
  title: 'Horor Lokal',
  description: '',
  ownerName: '',
  measure,
});
const storyTruncatedOwner = getCollectionStoryPanelLayout({
  title: 'Horor Lokal',
  description: '',
  ownerName: TRUNCATED_OWNER,
  measure,
});
assert(
  storyFallback.pillText === 'oleh Pengguna Sotoy' &&
    storyTruncatedOwner.pillTruncated &&
    storyTruncatedOwner.pillText.endsWith('...') &&
    storyTruncatedOwner.pillLeft + storyTruncatedOwner.pillWidth <=
      storyMetrics.panelLeft + storyMetrics.panelWidth + 0.01,
  'getCollectionStoryPanelLayout story: owner fallback and ellipsis truncation hold'
);

assert(
  close(emptyDescriptionLayout.titleTop, 1401.3) &&
    close(emptyDescriptionLayout.pillTop, 1552.7) &&
    close(
      emptyDescriptionLayout.pillTop + emptyDescriptionLayout.pillHeight,
      1644.7
    ) &&
    COLLECTION_FOOTER_TOP === 1800,
  'collection story: title, pill and footer keep the approved 9:16 y positions'
);

assert(
  close(watchlistFeed.titleTop, 850.8) &&
    close(watchlistFeed.titleTop + watchlistFeed.titleHeight, 1125.2) &&
    close(watchlistFeed.pillTop, 1145.2) &&
    close(watchlistFeed.pillTop + watchlistFeed.pillHeight, 1229.2),
  'collection feed: two-line title and pill keep the expected 4:5 y positions'
);

assert(
  close(shortFeed.titleTop, 919.4) &&
    close(shortFeed.titleTop + shortFeed.titleHeight, 1056.6) &&
    close(shortFeed.pillTop, 1076.6) &&
    close(shortFeed.pillTop + shortFeed.pillHeight, 1160.6),
  'collection feed: one-line title and pill keep the expected 4:5 y positions'
);

const storyExplicit = getCollectionStoryPanelLayout({
  title: LONG_TITLE,
  description: DENSE_DESCRIPTION,
  ownerName: LONG_OWNER,
  measure,
  format: 'story',
});
const storyImplicit = getCollectionStoryPanelLayout({
  title: LONG_TITLE,
  description: DENSE_DESCRIPTION,
  ownerName: LONG_OWNER,
  measure,
});
assert(
  JSON.stringify(storyExplicit) === JSON.stringify(storyImplicit),
  'collection story: explicit format matches the legacy default output'
);

// ---------------------------------------------------------------------------
// Story item building and empty initials
// ---------------------------------------------------------------------------
const source = {
  title: 'Koleksi Horor',
  collectionName: 'Koleksi Horor',
  collectionPreviewImages: [
    'https://img.test/horor-1.jpg',
    'https://img.test/article-1.jpg',
    'https://img.test/unknown.jpg',
    'https://img.test/horor-2.jpg',
    'https://img.test/horor-3.jpg',
    'https://img.test/horor-4.jpg',
  ],
};
const media = {
  films: [
    { title: 'Film Horor Satu', poster: 'https://img.test/horor-1.jpg' },
    { title: 'Film Horor Dua', poster: 'https://img.test/horor-2.jpg' },
    { title: 'Film Horor Tiga', poster: 'https://img.test/horor-3.jpg' },
  ],
  articles: [
    {
      title: 'Artikel Horor',
      coverImage: 'https://img.test/article-1.jpg',
    },
  ],
};
const storyItems = buildCollectionStoryItems(source, media);
assert(
  storyItems.length === 5,
  'buildCollectionStoryItems: uses at most five preview images'
);
assert(
  storyItems[0].title === 'Film Horor Satu' &&
    storyItems[1].title === 'Artikel Horor',
  'buildCollectionStoryItems: recovers film and article titles from media'
);
assert(
  storyItems[2].title === 'Koleksi Horor',
  'buildCollectionStoryItems: falls back to the collection name for unknown images'
);
assert(
  buildCollectionStoryItems({ collectionPreviewImages: [] }).length === 0,
  'buildCollectionStoryItems: an empty collection returns no items'
);

const explicitItems = buildCollectionStoryItems({
  title: 'Koleksi',
  collectionItems: [
    { title: 'Satu', image: 'a.jpg' },
    { title: 'Dua', image: 'b.jpg' },
    { title: 'Tiga', image: 'c.jpg' },
    { title: 'Empat', image: 'd.jpg' },
    { title: 'Lima', image: 'e.jpg' },
    { title: 'Enam', image: 'f.jpg' },
  ],
});
assert(
  explicitItems.length === 5 && explicitItems[4].title === 'Lima',
  'buildCollectionStoryItems: explicit items are capped at five'
);

assert(
  getCollectionInitials('Koleksi Film Horor', 3).join('') === 'KFH',
  'getCollectionInitials: uses the first letter of each title word'
);
assert(
  getCollectionInitials('Koleksi', 3).join('') === 'KOL',
  'getCollectionInitials: fills three letters when the title has one word'
);

console.log(`\nCollection Share Layout Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
