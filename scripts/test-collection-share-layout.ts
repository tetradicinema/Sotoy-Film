import {
  buildCollectionStoryItems,
  COLLECTION_COUNT_STICKER_HEIGHT,
  COLLECTION_COUNT_STICKER_WIDTH,
  COLLECTION_COUNT_TEXT_PADDING,
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
  COLLECTION_OWNER_GAP,
  COLLECTION_PANEL_TOP,
  COLLECTION_PANEL_WIDTH,
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
    shortOwner.fontSize === 32 &&
    !shortOwner.truncated,
  'fitCollectionOwnerLine: a short owner name stays at the base size'
);

const longOwner = fitCollectionOwnerLine(LONG_OWNER, measure);
assert(
  longOwner.label.startsWith('oleh ') &&
    !longOwner.label.includes('\n') &&
    longOwner.fontSize < 32 &&
    longOwner.fontSize >= 20,
  'fitCollectionOwnerLine: a long owner name shrinks to a smaller single line'
);
assert(
  measure(
    `800 ${longOwner.fontSize}px Geist`,
    longOwner.label
  ) <=
    COLLECTION_PANEL_WIDTH -
      COLLECTION_COUNT_STICKER_WIDTH -
      COLLECTION_OWNER_GAP +
      0.01,
  'fitCollectionOwnerLine: the owner line fits beside the count sticker'
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
    itemCount: 27,
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
        layout.rowTop + 0.01 &&
      layout.rowTop + layout.rowHeight <= COLLECTION_FOOTER_TOP + 0.01,
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
  itemCount: 12,
  measure,
});
assert(
  !emptyDescriptionLayout.descriptionVisible &&
    emptyDescriptionLayout.descriptionHeight === 0 &&
    emptyDescriptionLayout.descriptionLines.length === 0,
  'getCollectionStoryPanelLayout: an empty description removes its block'
);
assert(
  emptyDescriptionLayout.countText === '12 JUDUL' &&
    emptyDescriptionLayout.countStickerWidth ===
      COLLECTION_COUNT_STICKER_WIDTH &&
    emptyDescriptionLayout.countStickerHeight ===
      COLLECTION_COUNT_STICKER_HEIGHT,
  'getCollectionStoryPanelLayout: formats the count sticker'
);
assert(
  measure(
    `900 ${emptyDescriptionLayout.countFontSize}px Geist`,
    emptyDescriptionLayout.countText
  ) <=
    COLLECTION_COUNT_STICKER_WIDTH -
      COLLECTION_COUNT_TEXT_PADDING +
      0.01,
  'getCollectionStoryPanelLayout: the count text fits inside its sticker'
);
assert(
  emptyDescriptionLayout.ownerLeft ===
    emptyDescriptionLayout.titleLeft +
      COLLECTION_COUNT_STICKER_WIDTH +
      COLLECTION_OWNER_GAP &&
    emptyDescriptionLayout.ownerLeft + emptyDescriptionLayout.ownerWidth <=
      emptyDescriptionLayout.titleLeft + emptyDescriptionLayout.titleWidth,
  'getCollectionStoryPanelLayout: the owner line stays inside the row'
);

const denseLayout = getCollectionStoryPanelLayout({
  title: LONG_TITLE,
  description: DENSE_DESCRIPTION,
  ownerName: LONG_OWNER,
  itemCount: 27,
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
    storyMetrics.panelTop === COLLECTION_PANEL_TOP &&
    storyMetrics.panelLeft === 60 &&
    storyMetrics.panelWidth === COLLECTION_PANEL_WIDTH &&
    storyMetrics.titleBase === COLLECTION_TITLE_BASE &&
    storyMetrics.titleMin === COLLECTION_TITLE_MIN &&
    storyMetrics.footerTop === COLLECTION_FOOTER_TOP &&
    storyMetrics.footerHeight === COLLECTION_FOOTER_HEIGHT &&
    storyMetrics.countStickerWidth === COLLECTION_COUNT_STICKER_WIDTH &&
    storyMetrics.countStickerHeight === COLLECTION_COUNT_STICKER_HEIGHT &&
    storyMetrics.ownerBase === 32 &&
    storyMetrics.logoLeft === COLLECTION_LOGO_LEFT &&
    storyMetrics.logoTop === COLLECTION_LOGO_TOP &&
    storyMetrics.logoWidth === COLLECTION_LOGO_WIDTH,
  'collection story metrics: still exactly the approved 9:16 constants'
);

assert(
  feedMetrics.height === COLLECTION_FEED_HEIGHT &&
    feedMetrics.height === 1350 &&
    feedMetrics.width === 1080 &&
    feedMetrics.wallHeight === 675 &&
    Math.abs(feedMetrics.wallHeight / feedMetrics.height - 0.5) < 0.01,
  'collection feed metrics: 1080x1350 with a poster wall at 50% of the canvas'
);

assert(
  feedMetrics.panelTop ===
    feedMetrics.wallHeight + feedMetrics.wallSeparator &&
    feedMetrics.panelTop > feedMetrics.wallHeight,
  'collection feed metrics: the yellow panel starts after the wall separator'
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
    itemCount: 27,
    measure,
    format: 'feed',
  });
  assert(
    layout.fits &&
      layout.titleLines.length <= 2 &&
      layout.titleFontSize <= feedMetrics.titleBase &&
      layout.titleFontSize >= feedMetrics.titleMin &&
      layout.contentTop >=
        feedMetrics.panelTop + feedMetrics.panelTopPadding - 0.01 &&
      layout.contentBottom <=
        feedMetrics.footerTop - feedMetrics.panelBottomPadding + 0.01,
    `getCollectionStoryPanelLayout feed: ${label} fits between the panel top and the footer`
  );
  assert(
    layout.titleTop >= feedMetrics.panelTop &&
      layout.titleTop + layout.titleHeight <= layout.rowTop + 0.01 &&
      layout.rowTop + layout.rowHeight <= feedMetrics.footerTop + 0.01 &&
      layout.rowTop + layout.rowHeight <= feedMetrics.height,
    `getCollectionStoryPanelLayout feed: ${label} keeps title and count row inside the canvas`
  );
  assert(
    !layout.descriptionVisible &&
      layout.descriptionHeight === 0 &&
      layout.descriptionLines.length === 0,
    `getCollectionStoryPanelLayout feed: ${label} keeps the copy to KOLEKSI + title + count row`
  );
});

const storyExplicit = getCollectionStoryPanelLayout({
  title: LONG_TITLE,
  description: DENSE_DESCRIPTION,
  ownerName: LONG_OWNER,
  itemCount: 27,
  measure,
  format: 'story',
});
const storyImplicit = getCollectionStoryPanelLayout({
  title: LONG_TITLE,
  description: DENSE_DESCRIPTION,
  ownerName: LONG_OWNER,
  itemCount: 27,
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
