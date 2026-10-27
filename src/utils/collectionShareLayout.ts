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
  maxWidth: number = COLLECTION_TITLE_MAX_WIDTH
): CollectionTitleFit {
  const value = (title || 'Koleksi').trim() || 'Koleksi';
  const text = value.toUpperCase();
  const safeWidth = positiveValue(maxWidth, COLLECTION_TITLE_MAX_WIDTH);

  let fontSize = fitFontSize(
    measure(titleFont(COLLECTION_TITLE_BASE), text),
    safeWidth * 2,
    COLLECTION_TITLE_BASE,
    COLLECTION_TITLE_MIN
  );
  let wrapped = wrapShareText(text, safeWidth, 2, (line) =>
    measure(titleFont(fontSize), line)
  );

  while (wrapped.truncated && fontSize > COLLECTION_TITLE_MIN) {
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
      Math.round(fontSize * COLLECTION_TITLE_LINE_HEIGHT_RATIO * 100) / 100,
    truncated: wrapped.truncated,
  };
}

export function fitCollectionOwnerLine(
  ownerName: string,
  measure: CollectionTextMeasure,
  maxWidth: number = COLLECTION_PANEL_WIDTH -
    COLLECTION_COUNT_STICKER_WIDTH -
    COLLECTION_OWNER_GAP
): CollectionOwnerFit {
  const name = (ownerName || 'Pengguna Sotoy').trim() || 'Pengguna Sotoy';
  const label = `oleh ${name}`;
  const safeWidth = positiveValue(
    maxWidth,
    COLLECTION_PANEL_WIDTH -
      COLLECTION_COUNT_STICKER_WIDTH -
      COLLECTION_OWNER_GAP
  );

  let fontSize = fitFontSize(
    measure(ownerFont(COLLECTION_OWNER_BASE), label),
    safeWidth,
    COLLECTION_OWNER_BASE,
    COLLECTION_OWNER_MIN
  );
  let wrapped = wrapShareText(label, safeWidth, 1, (line) =>
    measure(ownerFont(fontSize), line)
  );

  while (wrapped.truncated && fontSize > COLLECTION_OWNER_MIN) {
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
  measure: CollectionTextMeasure
): string[] {
  const value = (description || '').trim();
  if (!value) return [];
  return wrapShareText(
    value,
    COLLECTION_PANEL_WIDTH,
    COLLECTION_DESCRIPTION_MAX_LINES,
    (line) => measure(bodyFont(COLLECTION_DESCRIPTION_FONT), line)
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
}): CollectionStoryPanelLayout {
  const title = fitCollectionTitle(input.title, input.measure);
  const descriptionLines = wrapCollectionDescription(
    input.description,
    input.measure
  );
  const owner = fitCollectionOwnerLine(input.ownerName, input.measure);
  const countText = `${normalizeShareCount(input.itemCount)} JUDUL`;
  const countFontSize = fitFontSize(
    input.measure(titleFont(COLLECTION_COUNT_FONT_BASE), countText),
    COLLECTION_COUNT_STICKER_WIDTH - COLLECTION_COUNT_TEXT_PADDING,
    COLLECTION_COUNT_FONT_BASE,
    COLLECTION_COUNT_FONT_MIN
  );

  const titleHeight = title.lines.length * title.lineHeight;
  const descriptionVisible = descriptionLines.length > 0;
  const descriptionHeight = descriptionLines.length
    ? descriptionLines.length * COLLECTION_DESCRIPTION_LINE_HEIGHT
    : 0;

  const availableTop = COLLECTION_PANEL_TOP + COLLECTION_PANEL_TOP_PADDING;
  const availableBottom =
    COLLECTION_FOOTER_TOP - COLLECTION_PANEL_BOTTOM_PADDING;

  const blocks: Array<{ height: number; gapBefore?: number }> = [
    { height: titleHeight },
  ];
  if (descriptionVisible) {
    blocks.push({
      height: descriptionHeight,
      gapBefore: COLLECTION_DESCRIPTION_GAP,
    });
  }
  blocks.push({
    height: COLLECTION_COUNT_STICKER_HEIGHT,
    gapBefore: COLLECTION_ROW_GAP,
  });

  const budget = getShareLayoutBudget({
    availableTop,
    availableBottom,
    blocks,
    bias: 0.5,
  });

  const titleTop = budget.startY;
  const descriptionTop =
    titleTop + titleHeight + (descriptionVisible ? COLLECTION_DESCRIPTION_GAP : 0);
  const rowTop =
    (descriptionVisible ? descriptionTop + descriptionHeight : descriptionTop) +
    COLLECTION_ROW_GAP;
  const contentBottom = rowTop + COLLECTION_COUNT_STICKER_HEIGHT;

  return {
    titleText: title.text,
    titleLines: title.lines,
    titleFontSize: title.fontSize,
    titleLineHeight: title.lineHeight,
    titleTop,
    titleLeft: COLLECTION_PANEL_LEFT,
    titleWidth: COLLECTION_PANEL_WIDTH,
    titleHeight,
    descriptionVisible,
    descriptionLines,
    descriptionFontSize: COLLECTION_DESCRIPTION_FONT,
    descriptionLineHeight: COLLECTION_DESCRIPTION_LINE_HEIGHT,
    descriptionTop,
    descriptionHeight,
    countText,
    countFontSize,
    countStickerWidth: COLLECTION_COUNT_STICKER_WIDTH,
    countStickerHeight: COLLECTION_COUNT_STICKER_HEIGHT,
    ownerLabel: owner.label,
    ownerFontSize: owner.fontSize,
    ownerLeft:
      COLLECTION_PANEL_LEFT + COLLECTION_COUNT_STICKER_WIDTH + COLLECTION_OWNER_GAP,
    ownerWidth:
      COLLECTION_PANEL_WIDTH -
      COLLECTION_COUNT_STICKER_WIDTH -
      COLLECTION_OWNER_GAP,
    rowTop,
    rowHeight: COLLECTION_COUNT_STICKER_HEIGHT,
    contentTop: titleTop,
    contentBottom,
    fits: budget.fits && contentBottom <= availableBottom + 0.01,
  };
}
