/**
 * Pure layout helpers for the collection share story (1080x1920).
 *
 * The same values drive the on-screen preview and the DOM capture used for
 * the PNG export, so both always describe the same poster wall and copy panel.
 */

import {
  fitFontSize,
  getShareLayoutBudget,
  wrapShareText,
} from './shareCardText';

export type CollectionTextMeasure = (font: string, text: string) => number;

export interface CollectionWallTile {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollectionStoryItem {
  image: string;
  title: string;
  itemType?: 'film' | 'article';
}

export interface CollectionStoryMedia {
  films?: Array<{ title?: string; poster?: string }>;
  articles?: Array<{ title?: string; coverImage?: string }>;
}

export interface CollectionStoryItemSource {
  title?: string;
  image?: string;
  collectionName?: string;
  collectionPreviewImages?: string[];
  previewImages?: string[];
  collectionItems?: Array<{
    title?: string;
    image?: string;
    itemType?: 'film' | 'article';
  }>;
}

export interface CollectionTitleFit {
  text: string;
  lines: string[];
  fontSize: number;
  lineHeight: number;
  truncated: boolean;
}

export interface CollectionOwnerFit {
  label: string;
  fontSize: number;
  truncated: boolean;
}

export interface CollectionStoryPanelLayout {
  titleText: string;
  titleLines: string[];
  titleFontSize: number;
  titleLineHeight: number;
  titleTop: number;
  titleLeft: number;
  titleWidth: number;
  titleHeight: number;
  descriptionVisible: boolean;
  descriptionLines: string[];
  descriptionFontSize: number;
  descriptionLineHeight: number;
  descriptionTop: number;
  descriptionHeight: number;
  pillText: string;
  pillFontSize: number;
  pillWidth: number;
  pillHeight: number;
  pillTop: number;
  pillLeft: number;
  pillTruncated: boolean;
  contentTop: number;
  contentBottom: number;
  fits: boolean;
}

export const COLLECTION_STORY_WIDTH = 1080;
export const COLLECTION_STORY_HEIGHT = 1920;
export const COLLECTION_WALL_HEIGHT = 1240;
export const COLLECTION_WALL_GUTTER = 8;
export const COLLECTION_WALL_SEPARATOR = 6;
export const COLLECTION_PANEL_TOP =
  COLLECTION_WALL_HEIGHT + COLLECTION_WALL_SEPARATOR;
export const COLLECTION_PANEL_LEFT = 60;
export const COLLECTION_PANEL_WIDTH = 960;
export const COLLECTION_PANEL_TOP_PADDING = 26;
export const COLLECTION_PANEL_BOTTOM_PADDING = 26;
export const COLLECTION_TITLE_BASE = 130;
export const COLLECTION_TITLE_MIN = 56;
export const COLLECTION_TITLE_MAX_WIDTH = COLLECTION_PANEL_WIDTH;
export const COLLECTION_TITLE_LINE_HEIGHT_RATIO = 0.98;
export const COLLECTION_DESCRIPTION_FONT = 36;
export const COLLECTION_DESCRIPTION_LINE_HEIGHT = 44;
export const COLLECTION_DESCRIPTION_MAX_LINES = 2;
export const COLLECTION_DESCRIPTION_GAP = 18;
export const COLLECTION_PILL_MIN_WIDTH = 300;
export const COLLECTION_PILL_HEIGHT = 92;
export const COLLECTION_PILL_FONT_BASE = 34;
export const COLLECTION_PILL_FONT_MIN = 22;
export const COLLECTION_PILL_PADDING_X = 44;
export const COLLECTION_ROW_GAP = 24;
export const COLLECTION_FOOTER_TOP = 1800;
export const COLLECTION_FOOTER_HEIGHT = 120;
export const COLLECTION_LOGO_PATH = '/v2_sotoyfilm full logo transparent.PNG';
export const COLLECTION_LOGO_LEFT = 60;
export const COLLECTION_LOGO_TOP = 90;
export const COLLECTION_LOGO_WIDTH = 400;
export const COLLECTION_LOGO_ASPECT = 2206 / 713;
export const COLLECTION_LOGO_HEIGHT = COLLECTION_LOGO_WIDTH / COLLECTION_LOGO_ASPECT;
/**
 * The clapper icon ends at x=564 in the 2206px-wide asset and the wordmark
 * starts at x=599, so the text-only clip begins at 599/2206.
 */
export const COLLECTION_LOGO_TEXT_START_RATIO = 599 / 2206;

/**
 * Share formats for the collection card. The story keeps the approved 9:16
 * geometry; the feed is the same design fitted to 1080x1350 with a poster wall
 * that takes about half the canvas.
 */
export type CollectionShareFormat = 'story' | 'feed';
export const COLLECTION_FEED_HEIGHT = 1350;

export interface CollectionFormatMetrics {
  format: CollectionShareFormat;
  width: number;
  height: number;
  wallHeight: number;
  wallGutter: number;
  wallSeparator: number;
  panelTop: number;
  panelLeft: number;
  panelWidth: number;
  panelTopPadding: number;
  panelBottomPadding: number;
  titleBase: number;
  titleMin: number;
  titleLineHeightRatio: number;
  titleMaxWidth: number;
  descriptionFont: number;
  descriptionLineHeight: number;
  descriptionMaxLines: number;
  descriptionGap: number;
  pillMinWidth: number;
  pillHeight: number;
  pillFontBase: number;
  pillFontMin: number;
  pillPaddingX: number;
  /** Highest title size the panel may grow to when it needs to fill the space. */
  titleBaseMax?: number;
  /** Centered free space per side (px) the panel tries to stay under. */
  maxPanelFreeSpace?: number;
  rowGap: number;
  footerTop: number;
  footerHeight: number;
  footerInsetX: number;
  footerFontSize: number;
  logoLeft: number;
  logoTop: number;
  logoWidth: number;
  badgeRight: number;
  badgeTop: number;
  badgeFontSize: number;
  badgePadY: number;
  badgePadX: number;
  badgeBorder: number;
  badgeRadius: number;
  badgeShadow: number;
}

export const COLLECTION_SHARE_FORMATS: Record<
  CollectionShareFormat,
  CollectionFormatMetrics
> = {
  story: {
    format: 'story',
    width: COLLECTION_STORY_WIDTH,
    height: COLLECTION_STORY_HEIGHT,
    wallHeight: COLLECTION_WALL_HEIGHT,
    wallGutter: COLLECTION_WALL_GUTTER,
    wallSeparator: COLLECTION_WALL_SEPARATOR,
    panelTop: COLLECTION_PANEL_TOP,
    panelLeft: COLLECTION_PANEL_LEFT,
    panelWidth: COLLECTION_PANEL_WIDTH,
    panelTopPadding: COLLECTION_PANEL_TOP_PADDING,
    panelBottomPadding: COLLECTION_PANEL_BOTTOM_PADDING,
    titleBase: COLLECTION_TITLE_BASE,
    titleMin: COLLECTION_TITLE_MIN,
    titleLineHeightRatio: COLLECTION_TITLE_LINE_HEIGHT_RATIO,
    titleMaxWidth: COLLECTION_TITLE_MAX_WIDTH,
    descriptionFont: COLLECTION_DESCRIPTION_FONT,
    descriptionLineHeight: COLLECTION_DESCRIPTION_LINE_HEIGHT,
    descriptionMaxLines: COLLECTION_DESCRIPTION_MAX_LINES,
    descriptionGap: COLLECTION_DESCRIPTION_GAP,
    pillMinWidth: COLLECTION_PILL_MIN_WIDTH,
    pillHeight: COLLECTION_PILL_HEIGHT,
    pillFontBase: COLLECTION_PILL_FONT_BASE,
    pillFontMin: COLLECTION_PILL_FONT_MIN,
    pillPaddingX: COLLECTION_PILL_PADDING_X,
    rowGap: COLLECTION_ROW_GAP,
    footerTop: COLLECTION_FOOTER_TOP,
    footerHeight: COLLECTION_FOOTER_HEIGHT,
    footerInsetX: 50,
    footerFontSize: 26,
    logoLeft: COLLECTION_LOGO_LEFT,
    logoTop: COLLECTION_LOGO_TOP,
    logoWidth: COLLECTION_LOGO_WIDTH,
    badgeRight: 46,
    badgeTop: 48,
    badgeFontSize: 40,
    badgePadY: 14,
    badgePadX: 34,
    badgeBorder: 5,
    badgeRadius: 20,
    badgeShadow: 8,
  },
  feed: {
    format: 'feed',
    width: 1080,
    height: COLLECTION_FEED_HEIGHT,
    // Poster wall takes ~47% of the 1350px canvas, like the 9:16 card.
    wallHeight: 640,
    wallGutter: COLLECTION_WALL_GUTTER,
    wallSeparator: COLLECTION_WALL_SEPARATOR,
    panelTop: 646,
    panelLeft: 60,
    panelWidth: 960,
    panelTopPadding: 20,
    panelBottomPadding: 18,
    titleBase: 120,
    titleMin: 56,
    titleLineHeightRatio: COLLECTION_TITLE_LINE_HEIGHT_RATIO,
    titleMaxWidth: 960,
    descriptionFont: 28,
    descriptionLineHeight: 34,
    // The feed copy block is KOLEKSI + title + owner pill, so no description.
    descriptionMaxLines: 0,
    descriptionGap: 12,
    pillMinWidth: 250,
    pillHeight: 84,
    pillFontBase: 32,
    pillFontMin: 22,
    pillPaddingX: 38,
    // A short title grows up to 140px so the panel never looks empty.
    titleBaseMax: 140,
    maxPanelFreeSpace: 150,
    rowGap: 20,
    footerTop: 1262,
    footerHeight: 76,
    footerInsetX: 60,
    footerFontSize: 24,
    logoLeft: 60,
    logoTop: 44,
    logoWidth: 300,
    badgeRight: 30,
    badgeTop: 26,
    badgeFontSize: 26,
    badgePadY: 10,
    badgePadX: 22,
    badgeBorder: 3,
    badgeRadius: 14,
    badgeShadow: 5,
  },
};

export const getCollectionShareMetrics = (
  format: CollectionShareFormat = 'story'
): CollectionFormatMetrics =>
  COLLECTION_SHARE_FORMATS[format] || COLLECTION_SHARE_FORMATS.story;

const TITLE_FONT_FAMILY = "'Geist', 'Plus Jakarta Sans', sans-serif";
const BODY_FONT_FAMILY = "'Plus Jakarta Sans', sans-serif";
const FIVE_TILE_TOP_RATIO = 0.52;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const titleFont = (size: number): string =>
  `900 ${size}px ${TITLE_FONT_FAMILY}`;
const bodyFont = (size: number): string =>
  `600 ${size}px ${BODY_FONT_FAMILY}`;
const ownerFont = (size: number): string =>
  `800 ${size}px ${TITLE_FONT_FAMILY}`;

const positiveValue = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

/**
 * Returns the poster rectangles for the full-bleed wall. Tiles cover the whole
 * wall exactly; the only space between them is the solid gutter. Count 0 still
 * returns one full tile so the caller can render the pink initials block.
 */
export function getWallLayout(
  count: number,
  width: number = COLLECTION_STORY_WIDTH,
  gutter: number = COLLECTION_WALL_GUTTER,
  height: number = COLLECTION_WALL_HEIGHT
): CollectionWallTile[] {
  const safeCount = clamp(
    Number.isFinite(count) ? Math.floor(count) : 0,
    0,
    5
  );
  const wallWidth = positiveValue(width, COLLECTION_STORY_WIDTH);
  const wallHeight = positiveValue(height, COLLECTION_WALL_HEIGHT);
  const safeGutter = clamp(
    Number.isFinite(gutter) ? gutter : COLLECTION_WALL_GUTTER,
    0,
    Math.min(wallWidth, wallHeight) / 3
  );

  if (safeCount <= 1) {
    return [{ x: 0, y: 0, width: wallWidth, height: wallHeight }];
  }

  if (safeCount === 2) {
    const tileWidth = (wallWidth - safeGutter) / 2;
    return [
      { x: 0, y: 0, width: tileWidth, height: wallHeight },
      {
        x: tileWidth + safeGutter,
        y: 0,
        width: tileWidth,
        height: wallHeight,
      },
    ];
  }

  if (safeCount === 3) {
    const tileWidth = (wallWidth - safeGutter) / 2;
    const rightX = tileWidth + safeGutter;
    const tileHeight = (wallHeight - safeGutter) / 2;
    return [
      { x: 0, y: 0, width: tileWidth, height: wallHeight },
      { x: rightX, y: 0, width: tileWidth, height: tileHeight },
      {
        x: rightX,
        y: tileHeight + safeGutter,
        width: tileWidth,
        height: tileHeight,
      },
    ];
  }

  if (safeCount === 4) {
    const tileWidth = (wallWidth - safeGutter) / 2;
    const tileHeight = (wallHeight - safeGutter) / 2;
    const rightX = tileWidth + safeGutter;
    const bottomY = tileHeight + safeGutter;
    return [
      { x: 0, y: 0, width: tileWidth, height: tileHeight },
      { x: rightX, y: 0, width: tileWidth, height: tileHeight },
      { x: 0, y: bottomY, width: tileWidth, height: tileHeight },
      {
        x: rightX,
        y: bottomY,
        width: tileWidth,
        height: tileHeight,
      },
    ];
  }

  const topHeight = (wallHeight - safeGutter) * FIVE_TILE_TOP_RATIO;
  const bottomY = topHeight + safeGutter;
  const bottomHeight = wallHeight - bottomY;
  const topWidth = (wallWidth - safeGutter) / 2;
  const bottomWidth = (wallWidth - safeGutter * 2) / 3;

  return [
    { x: 0, y: 0, width: topWidth, height: topHeight },
    {
      x: topWidth + safeGutter,
      y: 0,
      width: topWidth,
      height: topHeight,
    },
    { x: 0, y: bottomY, width: bottomWidth, height: bottomHeight },
    {
      x: bottomWidth + safeGutter,
      y: bottomY,
      width: bottomWidth,
      height: bottomHeight,
    },
    {
      x: bottomWidth * 2 + safeGutter * 2,
      y: bottomY,
      width: bottomWidth,
      height: bottomHeight,
    },
  ];
}

const normalizeUrl = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * Builds the ordered story items. Explicit collection items win; otherwise the
 * first preview images are used so existing `buildCollectionShareData` callers
 * keep working. Titles are recovered from the local media lookup when the
 * preview image matches a known poster or article cover.
 */
export function buildCollectionStoryItems(
  data: CollectionStoryItemSource | null | undefined,
  media?: CollectionStoryMedia
): CollectionStoryItem[] {
  const fallbackTitle =
    (data?.collectionName || data?.title || 'Koleksi').trim() || 'Koleksi';

  const titleByImage = new Map<
    string,
    { title: string; itemType: 'film' | 'article' }
  >();
  (media?.films || []).forEach((film) => {
    const image = normalizeUrl(film?.poster);
    const title = normalizeUrl(film?.title);
    if (image && title) titleByImage.set(image, { title, itemType: 'film' });
  });
  (media?.articles || []).forEach((article) => {
    const image = normalizeUrl(article?.coverImage);
    const title = normalizeUrl(article?.title);
    if (image && title) {
      titleByImage.set(image, { title, itemType: 'article' });
    }
  });

  const explicit = Array.isArray(data?.collectionItems)
    ? data.collectionItems
    : [];
  if (explicit.length > 0) {
    return explicit.slice(0, 5).map((item) => {
      const image = normalizeUrl(item?.image);
      const match = image ? titleByImage.get(image) : undefined;
      return {
        image,
        title: normalizeUrl(item?.title) || match?.title || fallbackTitle,
        itemType: item?.itemType || match?.itemType,
      };
    });
  }

  const previewImages = Array.isArray(data?.collectionPreviewImages)
    ? data.collectionPreviewImages
    : Array.isArray(data?.previewImages)
      ? data.previewImages
      : [];
  const images = previewImages.map(normalizeUrl).filter(Boolean);
  if (images.length === 0) {
    const image = normalizeUrl(data?.image);
    if (image) images.push(image);
  }

  return images.slice(0, 5).map((image) => {
    const match = titleByImage.get(image);
    return {
      image,
      title: match?.title || fallbackTitle,
      itemType: match?.itemType,
    };
  });
}

/** First letters for the empty-collection poster block. */
export function getCollectionInitials(title: string, count = 3): string[] {
  const safeCount = clamp(
    Number.isFinite(count) ? Math.floor(count) : 0,
    0,
    10
  );
  const normalized = (title || 'Koleksi').trim();
  if (safeCount === 0) return [];

  const wordInitials = normalized
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase());

  const compact = normalized.replace(/[^\p{L}\p{N}]/gu, '');
  const initials = [...wordInitials];
  let letterIndex = initials.length;
  while (initials.length < safeCount && letterIndex < compact.length) {
    initials.push(compact.charAt(letterIndex).toUpperCase());
    letterIndex += 1;
  }

  while (initials.length < safeCount) {
    initials.push('S');
  }

  return initials.slice(0, safeCount);
}

/**
 * Uppercases and fits the collection name into at most two lines. The text
 * shrinks before any truncation happens, and truncation only removes whole
 * words with an ellipsis as a last resort.
 */
export function fitCollectionTitle(
  title: string,
  measure: CollectionTextMeasure,
  maxWidth?: number,
  metrics: CollectionFormatMetrics = COLLECTION_SHARE_FORMATS.story
): CollectionTitleFit {
  const value = (title || 'Koleksi').trim() || 'Koleksi';
  const text = value.toUpperCase();
  const safeWidth = positiveValue(
    maxWidth === undefined ? metrics.titleMaxWidth : maxWidth,
    metrics.titleMaxWidth
  );

  let fontSize = fitFontSize(
    measure(titleFont(metrics.titleBase), text),
    safeWidth * 2,
    metrics.titleBase,
    metrics.titleMin
  );
  let wrapped = wrapShareText(text, safeWidth, 2, (line) =>
    measure(titleFont(fontSize), line)
  );

  while (wrapped.truncated && fontSize > metrics.titleMin) {
    fontSize -= 2;
    wrapped = wrapShareText(text, safeWidth, 2, (line) =>
      measure(titleFont(fontSize), line)
    );
  }

  return {
    text,
    lines: wrapped.lines.length > 0 ? wrapped.lines : [text],
    fontSize,
    lineHeight:
      Math.round(fontSize * metrics.titleLineHeightRatio * 100) / 100,
    truncated: wrapped.truncated,
  };
}

export function fitCollectionOwnerLine(
  ownerName: string,
  measure: CollectionTextMeasure,
  maxWidth?: number,
  metrics: CollectionFormatMetrics = COLLECTION_SHARE_FORMATS.story
): CollectionOwnerFit {
  const name = (ownerName || 'Pengguna Sotoy').trim() || 'Pengguna Sotoy';
  const label = `oleh ${name}`;
  const defaultWidth = Math.max(
    1,
    metrics.panelWidth - metrics.pillPaddingX * 2
  );
  const safeWidth = positiveValue(
    maxWidth === undefined ? defaultWidth : maxWidth,
    defaultWidth
  );

  let fontSize = fitFontSize(
    measure(ownerFont(metrics.pillFontBase), label),
    safeWidth,
    metrics.pillFontBase,
    metrics.pillFontMin
  );
  let wrapped = wrapShareText(label, safeWidth, 1, (line) =>
    measure(ownerFont(fontSize), line)
  );

  while (wrapped.truncated && fontSize > metrics.pillFontMin) {
    fontSize -= 1;
    wrapped = wrapShareText(label, safeWidth, 1, (line) =>
      measure(ownerFont(fontSize), line)
    );
  }

  return {
    label: wrapped.lines[0] || label,
    fontSize,
    truncated: wrapped.truncated,
  };
}

export function wrapCollectionDescription(
  description: string,
  measure: CollectionTextMeasure,
  metrics: CollectionFormatMetrics = COLLECTION_SHARE_FORMATS.story
): string[] {
  const value = (description || '').trim();
  if (!value || metrics.descriptionMaxLines <= 0) return [];
  return wrapShareText(
    value,
    metrics.panelWidth,
    metrics.descriptionMaxLines,
    (line) => measure(bodyFont(metrics.descriptionFont), line)
  ).lines;
}

/**
 * Places the title, optional description, and owner pill inside the yellow
 * panel. The content group is centred in the space above the footer so one-line
 * and two-line combinations keep a balanced rhythm, and the budget reports
 * whether everything stays above the footer.
 */
export function getCollectionStoryPanelLayout(input: {
  title: string;
  description: string;
  ownerName: string;
  measure: CollectionTextMeasure;
  format?: CollectionShareFormat;
}): CollectionStoryPanelLayout {
  const metrics = getCollectionShareMetrics(input.format);
  const descriptionLines = wrapCollectionDescription(
    input.description,
    input.measure,
    metrics
  );
  const descriptionVisible = descriptionLines.length > 0;
  const descriptionHeight = descriptionLines.length
    ? descriptionLines.length * metrics.descriptionLineHeight
    : 0;

  const owner = fitCollectionOwnerLine(
    input.ownerName,
    input.measure,
    undefined,
    metrics
  );
  const pillWidth = clamp(
    input.measure(ownerFont(owner.fontSize), owner.label) +
      metrics.pillPaddingX * 2,
    metrics.pillMinWidth,
    metrics.panelWidth
  );

  const availableTop = metrics.panelTop + metrics.panelTopPadding;
  const availableBottom = metrics.footerTop - metrics.panelBottomPadding;
  const availableHeight = availableBottom - availableTop;

  const fitTitleAt = (base: number) =>
    fitCollectionTitle(input.title, input.measure, metrics.titleMaxWidth, {
      ...metrics,
      titleBase: base,
    });
  const contentHeightFor = (fit: CollectionTitleFit) =>
    fit.lines.length * fit.lineHeight +
    (descriptionVisible ? metrics.descriptionGap + descriptionHeight : 0) +
    metrics.rowGap +
    metrics.pillHeight;

  let title = fitTitleAt(metrics.titleBase);
  const titleBaseMax = Math.max(
    metrics.titleBase,
    metrics.titleBaseMax ?? metrics.titleBase
  );
  if (metrics.maxPanelFreeSpace !== undefined) {
    let base = metrics.titleBase;
    while (
      (availableHeight - contentHeightFor(title)) / 2 >=
        metrics.maxPanelFreeSpace &&
      base < titleBaseMax
    ) {
      base = Math.min(titleBaseMax, base + 2);
      title = fitTitleAt(base);
    }
  }

  const titleHeight = title.lines.length * title.lineHeight;

  const blocks: Array<{ height: number; gapBefore?: number }> = [
    { height: titleHeight },
  ];
  if (descriptionVisible) {
    blocks.push({
      height: descriptionHeight,
      gapBefore: metrics.descriptionGap,
    });
  }
  blocks.push({
    height: metrics.pillHeight,
    gapBefore: metrics.rowGap,
  });

  const budget = getShareLayoutBudget({
    availableTop,
    availableBottom,
    blocks,
    bias: 0.5,
  });

  const titleTop = budget.startY;
  const descriptionTop =
    titleTop + titleHeight + (descriptionVisible ? metrics.descriptionGap : 0);
  const pillTop =
    (descriptionVisible ? descriptionTop + descriptionHeight : descriptionTop) +
    metrics.rowGap;
  const contentBottom = pillTop + metrics.pillHeight;

  return {
    titleText: title.text,
    titleLines: title.lines,
    titleFontSize: title.fontSize,
    titleLineHeight: title.lineHeight,
    titleTop,
    titleLeft: metrics.panelLeft,
    titleWidth: metrics.panelWidth,
    titleHeight,
    descriptionVisible,
    descriptionLines,
    descriptionFontSize: metrics.descriptionFont,
    descriptionLineHeight: metrics.descriptionLineHeight,
    descriptionTop,
    descriptionHeight,
    pillText: owner.label,
    pillFontSize: owner.fontSize,
    pillWidth,
    pillHeight: metrics.pillHeight,
    pillTop,
    pillLeft: metrics.panelLeft,
    pillTruncated: owner.truncated,
    contentTop: titleTop,
    contentBottom,
    fits: budget.fits && contentBottom <= availableBottom + 0.01,
  };
}
