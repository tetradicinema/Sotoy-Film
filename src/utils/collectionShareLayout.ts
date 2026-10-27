/**
 * Pure layout helpers for the collection share story (1080x1920).
 *
 * The same values drive the on-screen preview and the DOM capture used for
 * the PNG export, so both always describe the same poster wall and copy panel.
 */

import {
  fitFontSize,
  getShareLayoutBudget,
  normalizeShareCount,
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
  countText: string;
  countFontSize: number;
  countStickerWidth: number;
  countStickerHeight: number;
  ownerLabel: string;
  ownerFontSize: number;
  ownerLeft: number;
  ownerWidth: number;
  rowTop: number;
  rowHeight: number;
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
export const COLLECTION_COUNT_STICKER_WIDTH = 300;
export const COLLECTION_COUNT_STICKER_HEIGHT = 92;
export const COLLECTION_COUNT_FONT_BASE = 34;
export const COLLECTION_COUNT_FONT_MIN = 22;
export const COLLECTION_COUNT_TEXT_PADDING = 48;
export const COLLECTION_OWNER_BASE = 32;
export const COLLECTION_OWNER_MIN = 20;
export const COLLECTION_OWNER_GAP = 28;
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
  countStickerWidth: number;
  countStickerHeight: number;
  countFontBase: number;
  countFontMin: number;
  countTextPadding: number;
  ownerBase: number;
  ownerMin: number;
  ownerGap: number;
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
    countStickerWidth: COLLECTION_COUNT_STICKER_WIDTH,
    countStickerHeight: COLLECTION_COUNT_STICKER_HEIGHT,
    countFontBase: COLLECTION_COUNT_FONT_BASE,
    countFontMin: COLLECTION_COUNT_FONT_MIN,
    countTextPadding: COLLECTION_COUNT_TEXT_PADDING,
    ownerBase: COLLECTION_OWNER_BASE,
    ownerMin: COLLECTION_OWNER_MIN,
    ownerGap: COLLECTION_OWNER_GAP,
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
    // Poster wall takes ~50% of the 1350px canvas.
    wallHeight: 675,
    wallGutter: COLLECTION_WALL_GUTTER,
    wallSeparator: COLLECTION_WALL_SEPARATOR,
    panelTop: 681,
    panelLeft: 40,
    panelWidth: 1000,
    panelTopPadding: 20,
    panelBottomPadding: 18,
    titleBase: 92,
    titleMin: 44,
    titleLineHeightRatio: COLLECTION_TITLE_LINE_HEIGHT_RATIO,
    titleMaxWidth: 1000,
    descriptionFont: 28,
    descriptionLineHeight: 34,
    // The feed copy block is KOLEKSI + title + count row, so no description.
    descriptionMaxLines: 0,
    descriptionGap: 12,
    countStickerWidth: 250,
    countStickerHeight: 76,
    countFontBase: 28,
    countFontMin: 18,
    countTextPadding: 40,
    ownerBase: 26,
    ownerMin: 16,
    ownerGap: 20,
    rowGap: 20,
    footerTop: 1262,
    footerHeight: 76,
    footerInsetX: 40,
    footerFontSize: 22,
    logoLeft: 40,
    logoTop: 44,
    logoWidth: 260,
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
  const defaultWidth =
    metrics.panelWidth - metrics.countStickerWidth - metrics.ownerGap;
  const safeWidth = positiveValue(
    maxWidth === undefined ? defaultWidth : maxWidth,
    defaultWidth
  );

  let fontSize = fitFontSize(
    measure(ownerFont(metrics.ownerBase), label),
    safeWidth,
    metrics.ownerBase,
    metrics.ownerMin
  );
  let wrapped = wrapShareText(label, safeWidth, 1, (line) =>
    measure(ownerFont(fontSize), line)
  );

  while (wrapped.truncated && fontSize > metrics.ownerMin) {
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
 * Places the title, optional description, and count/owner row inside the yellow
 * panel. The content group is centred in the space above the footer so one-line
 * and two-line combinations keep a balanced rhythm, and the budget reports
 * whether everything stays above the footer.
 */
export function getCollectionStoryPanelLayout(input: {
  title: string;
  description: string;
  ownerName: string;
  itemCount: number;
  measure: CollectionTextMeasure;
  format?: CollectionShareFormat;
}): CollectionStoryPanelLayout {
  const metrics = getCollectionShareMetrics(input.format);
  const title = fitCollectionTitle(
    input.title,
    input.measure,
    metrics.titleMaxWidth,
    metrics
  );
  const descriptionLines = wrapCollectionDescription(
    input.description,
    input.measure,
    metrics
  );
  const owner = fitCollectionOwnerLine(
    input.ownerName,
    input.measure,
    metrics.panelWidth - metrics.countStickerWidth - metrics.ownerGap,
    metrics
  );
  const countText = `${normalizeShareCount(input.itemCount)} JUDUL`;
  const countFontSize = fitFontSize(
    input.measure(titleFont(metrics.countFontBase), countText),
    metrics.countStickerWidth - metrics.countTextPadding,
    metrics.countFontBase,
    metrics.countFontMin
  );

  const titleHeight = title.lines.length * title.lineHeight;
  const descriptionVisible = descriptionLines.length > 0;
  const descriptionHeight = descriptionLines.length
    ? descriptionLines.length * metrics.descriptionLineHeight
    : 0;

  const availableTop = metrics.panelTop + metrics.panelTopPadding;
  const availableBottom = metrics.footerTop - metrics.panelBottomPadding;

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
    height: metrics.countStickerHeight,
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
  const rowTop =
    (descriptionVisible ? descriptionTop + descriptionHeight : descriptionTop) +
    metrics.rowGap;
  const contentBottom = rowTop + metrics.countStickerHeight;

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
    countText,
    countFontSize,
    countStickerWidth: metrics.countStickerWidth,
    countStickerHeight: metrics.countStickerHeight,
    ownerLabel: owner.label,
    ownerFontSize: owner.fontSize,
    ownerLeft:
      metrics.panelLeft + metrics.countStickerWidth + metrics.ownerGap,
    ownerWidth:
      metrics.panelWidth - metrics.countStickerWidth - metrics.ownerGap,
    rowTop,
    rowHeight: metrics.countStickerHeight,
    contentTop: titleTop,
    contentBottom,
    fits: budget.fits && contentBottom <= availableBottom + 0.01,
  };
}
