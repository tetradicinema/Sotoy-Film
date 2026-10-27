/**
 * Buzz Story Card (Threads-style, 1080x1920).
 *
 * ONE renderer is used for both the on-screen preview and the downloaded PNG,
 * so the two are always identical. The preview in the modal is simply an <img>
 * of the canvas produced here.
 *
 * This module also owns the pure Film share layout used by both the DOM
 * preview (FilmRatingStoryCard) and the film canvas renderer, so the two stay
 * pixel-consistent without importing React/Firebase into tests.
 */

import {
  fitFontSize,
  getShareLayoutBudget,
  wrapShareText,
  type ShareLayoutBlock,
} from './shareCardText';

export interface BuzzCardFilm {
  title: string;
  year?: number | string;
  poster?: string;
  score?: number; // Skor Sotoy (0-10 scale as shown in the app) or rating
  genres?: string[];
}

export interface BuzzCardArticle {
  title: string;
  cover?: string;
  category?: string;
  author?: string;
}

export interface BuzzCardCollection {
  name: string;
  itemCount?: number;
  previewImages?: string[];
}

export interface BuzzCardInput {
  authorName: string;
  authorHandle?: string; // with or without leading "@"
  authorAvatar?: string;
  roleLabel?: string; // e.g. "PENULIS", "ADMIN", "SI PALING SOTOY"
  text: string;
  image?: string; // attached photo (URL or data URL)
  film?: BuzzCardFilm | null;
  article?: BuzzCardArticle | null;
  collection?: BuzzCardCollection | null;
  tags?: string[];
  likes?: number;
  replies?: number;
}

export interface BuzzCardDeps {
  /** Loads an image safely for canvas (reuse loadCanvasImage from SocialShareModal). */
  loadImage: (src: string) => Promise<CanvasImageSource & { width: number; height: number }>;
  /** Defaults to document.createElement('canvas'). Overridable for tests. */
  createCanvas?: (w: number, h: number) => any;
  /** Optional callback fired when attached photo (input.image) was provided but failed to load */
  onPhotoLoadFailed?: () => void;
}

export const BUZZ_CARD_W = 1080;
export const BUZZ_CARD_H = 1920;
export const BUZZ_CARD_FEED_H = 1350;

const FONT = `"Plus Jakarta Sans", "Geist", "Segoe UI", Arial, sans-serif`;
const PINK = '#FF2E7E';

export const normalizeHandle = (h?: string): string => {
  if (!h) return '';
  const clean = h.trim().replace(/^@+/, '');
  return clean ? `@${clean}` : '';
};

// =============================================================================
// FILM SHARE LAYOUT
// The single source of truth for the FilmRatingStoryCard DOM preview and the
// canvas renderer. All sizes are explicit per format so 1080x1350 and
// 1080x1920 share the same design without inheriting 1920-only offsets.
// =============================================================================

export type ShareFormat = 'story' | 'feed';
export type TextMeasure = (font: string, text: string) => number;

export interface FilmShareData {
  title?: string;
  filmTitle?: string;
  filmYear?: number | string;
  filmGenres?: string[];
  filmDirector?: string;
  reviewerName?: string;
  authorName?: string;
  reviewerRole?: string;
  reviewerAvatar?: string;
}

export interface FilmFormatMetrics {
  width: number;
  height: number;
  /** Top of the copy block. */
  top: number;
  /** Lowest allowed bottom of the copy block (above the footer rule). */
  bottom: number;
  footerDividerY: number;
  footerTextY: number;
  titleBase: number;
  titleMin: number;
  directorBase: number;
  directorMin: number;
  metaBase: number;
  metaMin: number;
  reviewerBase: number;
  reviewerMin: number;
  ratingScale: number;
  gapTitleDirector: number;
  gapTitleMeta: number;
  gapDirectorMeta: number;
  gapMetaRating: number;
  gapRatingReviewer: number;
  reviewerHeight: number;
  maxTextW: number;
  /** Poster scrim stops (0-1 of canvas height) shared by DOM and canvas. */
  scrimStops: Array<{ at: number; color: string }>;
}

export const FILM_SHARE_FORMATS: Record<ShareFormat, FilmFormatMetrics> = {
  story: {
    width: 1080,
    height: 1920,
    top: 960,
    bottom: 1745,
    footerDividerY: 1795,
    footerTextY: 1830,
    titleBase: 96,
    titleMin: 52,
    directorBase: 34,
    directorMin: 24,
    metaBase: 38,
    metaMin: 26,
    reviewerBase: 24,
    reviewerMin: 18,
    ratingScale: 6,
    gapTitleDirector: 24,
    gapTitleMeta: 14,
    gapDirectorMeta: 10,
    gapMetaRating: 30,
    gapRatingReviewer: 22,
    reviewerHeight: 46,
    maxTextW: 960,
    scrimStops: [
      { at: 0.42, color: 'rgba(10, 10, 10, 0)' },
      { at: 0.58, color: 'rgba(10, 10, 10, 0.66)' },
      { at: 0.74, color: '#0A0A0A' },
      { at: 1, color: '#0A0A0A' },
    ],
  },
  feed: {
    width: 1080,
    height: 1350,
    top: 690,
    bottom: 1180,
    footerDividerY: 1225,
    footerTextY: 1260,
    titleBase: 84,
    titleMin: 52,
    directorBase: 30,
    directorMin: 22,
    metaBase: 34,
    metaMin: 24,
    reviewerBase: 22,
    reviewerMin: 17,
    ratingScale: 5,
    gapTitleDirector: 20,
    gapTitleMeta: 12,
    gapDirectorMeta: 8,
    gapMetaRating: 26,
    gapRatingReviewer: 18,
    reviewerHeight: 42,
    maxTextW: 960,
    scrimStops: [
      { at: 0.3, color: 'rgba(10, 10, 10, 0)' },
      { at: 0.46, color: 'rgba(10, 10, 10, 0.66)' },
      { at: 0.62, color: '#0A0A0A' },
      { at: 1, color: '#0A0A0A' },
    ],
  },
};

export const getFilmShareLayoutMetrics = (
  format: ShareFormat = 'story'
): FilmFormatMetrics => FILM_SHARE_FORMATS[format] || FILM_SHARE_FORMATS.story;

export interface FilmRatingMetrics {
  scale: number;
  starSize: number;
  gap: number;
  padX: number;
  padY: number;
  border: number;
  radius: number;
  scoreFont: number;
  denomFont: number;
  emptyFont: number;
  boxHeight: number;
}

/** Exact copy of the FilmDbCard rating pill, scaled up per format. */
export const getFilmRatingMetrics = (scale: number): FilmRatingMetrics => {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 4;
  return {
    scale: safeScale,
    starSize: 14 * safeScale,
    gap: 4 * safeScale,
    padX: 8 * safeScale,
    padY: 4 * safeScale,
    border: 1 * safeScale,
    radius: 6 * safeScale,
    scoreFont: 18 * safeScale,
    denomFont: 10 * safeScale,
    emptyFont: 10 * safeScale,
    boxHeight: 18 * safeScale + 4 * safeScale * 2 + 1 * safeScale * 2,
  };
};

export interface FilmShareTextLayout {
  format: ShareFormat;
  availableTop: number;
  availableBottom: number;
  footerDividerY: number;
  footerTextY: number;
  titleLines: string[];
  titleFontSize: number;
  titleLineHeight: number;
  titleTop: number;
  titleBottom: number;
  hasDirector: boolean;
  directorText: string;
  directorFontSize: number;
  directorLineHeight: number;
  directorTop: number;
  directorBottom: number;
  metaText: string;
  metaFontSize: number;
  metaLineHeight: number;
  metaTop: number;
  metaBottom: number;
  hasReviewer: boolean;
  reviewerText: string;
  reviewerFontSize: number;
  reviewerLineHeight: number;
  reviewerTop: number;
  reviewerBottom: number;
  rating: FilmRatingMetrics;
  ratingTop: number;
  ratingBottom: number;
  startY: number;
  endY: number;
  contentHeight: number;
  fits: boolean;
}

export const buildFilmShareLayout = (
  data: FilmShareData,
  _displayScore: number,
  _hasScore: boolean,
  measure: TextMeasure,
  format: ShareFormat = 'story'
): FilmShareTextLayout => {
  const metrics = getFilmShareLayoutMetrics(format);
  const rating = getFilmRatingMetrics(metrics.ratingScale);
  const maxTextW = metrics.maxTextW;

  const titleFont = (size: number) =>
    `900 ${size}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
  const directorFont = (size: number) =>
    `700 ${size}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
  const metaFont = (size: number) =>
    `800 ${size}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
  const reviewerFont = (size: number) =>
    `bold ${size}px 'Geist', 'Plus Jakarta Sans', sans-serif`;

  const fitOneLine = (
    text: string,
    fontFor: (size: number) => string,
    base: number,
    min: number
  ): { text: string; fontSize: number; lineHeight: number } => {
    let fontSize = base;
    let wrapped = wrapShareText(text, maxTextW, 1, (value) =>
      measure(fontFor(fontSize), value)
    );
    while (wrapped.truncated && fontSize > min) {
      fontSize -= 2;
      wrapped = wrapShareText(text, maxTextW, 1, (value) =>
        measure(fontFor(fontSize), value)
      );
    }
    return {
      text: wrapped.lines[0] || '',
      fontSize,
      lineHeight: Math.round(fontSize * 1.3),
    };
  };

  const title = (data.filmTitle || data.title || '').trim();
  let titleFontSize = fitFontSize(
    measure(titleFont(metrics.titleBase), title),
    maxTextW * 2,
    metrics.titleBase,
    metrics.titleMin
  );
  let titleWrap = wrapShareText(title, maxTextW, 2, (value) =>
    measure(titleFont(titleFontSize), value)
  );
  while (titleWrap.truncated && titleFontSize > metrics.titleMin) {
    titleFontSize -= 2;
    titleWrap = wrapShareText(title, maxTextW, 2, (value) =>
      measure(titleFont(titleFontSize), value)
    );
  }

  const directorName = (data.filmDirector || '').trim();
  const director = directorName
    ? fitOneLine(
        `Director: ${directorName}`,
        directorFont,
        metrics.directorBase,
        metrics.directorMin
      )
    : { text: '', fontSize: metrics.directorBase, lineHeight: 0 };

  const genresStr = (data.filmGenres || []).slice(0, 3).join(' • ');
  const rawMetaText = [data.filmYear, genresStr].filter(Boolean).join(' | ');
  const meta = rawMetaText
    ? fitOneLine(rawMetaText, metaFont, metrics.metaBase, metrics.metaMin)
    : { text: '', fontSize: metrics.metaBase, lineHeight: 0 };

  const reviewerName = (data.reviewerName || data.authorName || '').trim();
  const reviewerRole = (data.reviewerRole || '').trim();
  const hasReviewer = Boolean(reviewerName || data.reviewerAvatar);
  const reviewerLine = hasReviewer
    ? `Ulasan oleh ${reviewerName || 'Cinephile'}${
        reviewerRole ? ` (${reviewerRole})` : ''
      }`
    : '';
  const reviewer = reviewerLine
    ? fitOneLine(
        reviewerLine,
        reviewerFont,
        metrics.reviewerBase,
        metrics.reviewerMin
      )
    : { text: '', fontSize: metrics.reviewerBase, lineHeight: 0 };

  let titleLines = titleWrap.lines;
  let titleLineHeight = Math.round(titleFontSize * 1.2);

  const buildBlocks = (): ShareLayoutBlock[] => {
    const blocks: ShareLayoutBlock[] = [];
    if (titleLines.length > 0) {
      blocks.push({ height: titleLines.length * titleLineHeight });
    }
    if (director.text) {
      blocks.push({
        height: director.lineHeight,
        gapBefore: titleLines.length > 0 ? metrics.gapTitleDirector : 0,
      });
    }
    if (meta.text) {
      blocks.push({
        height: meta.lineHeight,
        gapBefore:
          titleLines.length > 0 || director.text
            ? director.text
              ? metrics.gapDirectorMeta
              : metrics.gapTitleMeta
            : 0,
      });
    }
    blocks.push({
      height: rating.boxHeight,
      gapBefore:
        titleLines.length > 0 || director.text || meta.text
          ? metrics.gapMetaRating
          : 0,
    });
    if (hasReviewer) {
      blocks.push({
        height: metrics.reviewerHeight,
        gapBefore: metrics.gapRatingReviewer,
      });
    }
    return blocks;
  };

  let budget = getShareLayoutBudget({
    availableTop: metrics.top,
    availableBottom: metrics.bottom,
    blocks: buildBlocks(),
    bias: 1,
  });

  while (!budget.fits && titleFontSize > metrics.titleMin) {
    titleFontSize -= 2;
    titleLineHeight = Math.round(titleFontSize * 1.2);
    titleWrap = wrapShareText(title, maxTextW, 2, (value) =>
      measure(titleFont(titleFontSize), value)
    );
    titleLines = titleWrap.lines;
    budget = getShareLayoutBudget({
      availableTop: metrics.top,
      availableBottom: metrics.bottom,
      blocks: buildBlocks(),
      bias: 1,
    });
  }

  let cursor = budget.startY;
  const place = (height: number, gapBefore = 0) => {
    cursor += gapBefore;
    const top = cursor;
    cursor += height;
    return { top, bottom: cursor };
  };

  const titleBox = place(titleLines.length * titleLineHeight);
  const directorBox = director.text
    ? place(
        director.lineHeight,
        titleLines.length > 0 ? metrics.gapTitleDirector : 0
      )
    : { top: cursor, bottom: cursor };
  const metaBox = meta.text
    ? place(
        meta.lineHeight,
        titleLines.length > 0 || director.text
          ? director.text
            ? metrics.gapDirectorMeta
            : metrics.gapTitleMeta
          : 0
      )
    : { top: cursor, bottom: cursor };
  const ratingBox = place(
    rating.boxHeight,
    titleLines.length > 0 || director.text || meta.text
      ? metrics.gapMetaRating
      : 0
  );
  const reviewerBox = hasReviewer
    ? place(metrics.reviewerHeight, metrics.gapRatingReviewer)
    : { top: cursor, bottom: cursor };

  return {
    format,
    availableTop: metrics.top,
    availableBottom: metrics.bottom,
    footerDividerY: metrics.footerDividerY,
    footerTextY: metrics.footerTextY,
    titleLines,
    titleFontSize,
    titleLineHeight,
    titleTop: titleBox.top,
    titleBottom: titleBox.bottom,
    hasDirector: Boolean(director.text),
    directorText: director.text,
    directorFontSize: director.fontSize,
    directorLineHeight: director.lineHeight,
    directorTop: directorBox.top,
    directorBottom: directorBox.bottom,
    metaText: meta.text,
    metaFontSize: meta.fontSize,
    metaLineHeight: meta.lineHeight,
    metaTop: metaBox.top,
    metaBottom: metaBox.bottom,
    hasReviewer,
    reviewerText: reviewer.text,
    reviewerFontSize: reviewer.fontSize,
    reviewerLineHeight: metrics.reviewerHeight,
    reviewerTop: reviewerBox.top,
    reviewerBottom: reviewerBox.bottom,
    rating,
    ratingTop: ratingBox.top,
    ratingBottom: ratingBox.bottom,
    startY: budget.startY,
    endY: budget.endY,
    contentHeight: budget.contentHeight,
    fits: budget.fits,
  };
};

// =============================================================================
// BUZZ CARD LAYOUT
// Pure geometry shared by the renderer and tests. Every vertical position is
// derived from the canvas height so 1080x1350 never inherits 1920 offsets.
// =============================================================================

export interface BuzzCardTagRect {
  kind: 'film' | 'article' | 'collection';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BuzzCardLayoutOptions {
  textLineCount?: number;
  photoHeight?: number;
}

export interface BuzzCardLayout {
  width: number;
  height: number;
  scale: number;
  cardX: number;
  cardY: number;
  cardW: number;
  cardH: number;
  pad: number;
  innerX: number;
  innerW: number;
  topSafe: number;
  bottomSafe: number;
  footerPrimaryY: number;
  footerSecondaryY: number;
  logoH: number;
  logoY: number;
  avatarSize: number;
  headerY: number;
  gapAfterHeader: number;
  textY: number;
  textFontSize: number;
  textLineHeight: number;
  maxTextLines: number;
  textLineCount: number;
  textHeight: number;
  textGap: number;
  photoY: number;
  photoHeight: number;
  photoGap: number;
  tags: BuzzCardTagRect[];
  tagsY: number;
  tagsHeight: number;
  afterTagsGap: number;
  hashtagsY: number;
  hashtagsHeight: number;
  statsY: number;
  statsHeight: number;
  showStats: boolean;
  shortText: boolean;
}

export const getBuzzCardLayout = (
  input: BuzzCardInput,
  format: ShareFormat = 'story',
  options: BuzzCardLayoutOptions = {}
): BuzzCardLayout => {
  const W = BUZZ_CARD_W;
  const H = format === 'feed' ? BUZZ_CARD_FEED_H : BUZZ_CARD_H;
  const s = H / BUZZ_CARD_H;

  const cardX = 56;
  const cardW = W - cardX * 2;
  const pad = Math.round(52 * s);
  const innerX = cardX + pad;
  const innerW = cardW - pad * 2;
  const topSafe = Math.round(190 * s);
  const bottomSafe = Math.round(1730 * s);
  const footerPrimaryY = Math.round(1830 * s);
  const footerSecondaryY = Math.round(1868 * s);
  const logoH = Math.round(120 * s);
  const logoY = Math.round(60 * s);
  const avatarSize = Math.round(108 * s);
  const gapAfterHeader = Math.round(36 * s);
  const textGap = Math.round(28 * s);
  const photoGap = Math.round(32 * s);
  const afterTagsGap = Math.round(28 * s);
  const tagGap = Math.round(16 * s);
  const hashtagGap = Math.round(20 * s);
  const statsGap = Math.round(24 * s);

  const rawText = (input.text || '').trim();
  const hasFilm = Boolean(input.film && input.film.title);
  const hasArticle = Boolean(input.article && input.article.title);
  const hasCollection = Boolean(input.collection && input.collection.name);
  const hasPhoto = Boolean(options.photoHeight && options.photoHeight > 0);
  const shortText =
    rawText.length <= 90 && !hasPhoto && !hasFilm && !hasArticle && !hasCollection;
  const textFontSize = Math.round((shortText ? 58 : 42) * s);
  const textLineHeight = Math.round((shortText ? 84 : 62) * s);

  const tagHeights: Array<{ kind: BuzzCardTagRect['kind']; height: number }> = [];
  if (hasFilm) tagHeights.push({ kind: 'film', height: Math.round(190 * s) });
  if (hasArticle)
    tagHeights.push({ kind: 'article', height: Math.round(160 * s) });
  if (hasCollection)
    tagHeights.push({ kind: 'collection', height: Math.round(160 * s) });
  const tagsHeight =
    tagHeights.reduce((sum, tag) => sum + tag.height, 0) +
    Math.max(0, tagHeights.length - 1) * tagGap;

  const hashtags = (input.tags || []).filter(Boolean).slice(0, 3);
  const hashtagsHeight = hashtags.length ? Math.round(56 * s) : 0;
  const showStats = (input.likes ?? 0) > 0 || (input.replies ?? 0) > 0;
  const statsHeight = showStats ? Math.round(44 * s) : 0;

  const fixedBase =
    pad +
    avatarSize +
    gapAfterHeader +
    pad +
    (tagsHeight ? tagsHeight + afterTagsGap : 0) +
    (hashtagsHeight ? hashtagsHeight + hashtagGap : 0) +
    (statsHeight ? statsHeight + statsGap : 0);

  const maxCardH = bottomSafe - topSafe;
  const minTextLines = rawText ? 3 : 0;
  const baseForPhotoCap =
    fixedBase + (rawText ? textGap + minTextLines * textLineHeight : 0);
  const desiredPhotoH = Math.max(0, Math.round(options.photoHeight || 0));
  const photoHeight = Math.min(
    desiredPhotoH,
    Math.max(0, maxCardH - baseForPhotoCap)
  );
  const fixedWithPhoto =
    fixedBase + (photoHeight ? photoHeight + photoGap : 0);
  const availableForText = rawText
    ? maxCardH - fixedWithPhoto - textGap
    : 0;
  const maxTextLines = rawText
    ? Math.max(minTextLines, Math.floor(availableForText / textLineHeight))
    : 0;
  const textLineCount = rawText
    ? Math.min(Math.max(0, Math.round(options.textLineCount ?? 0)), maxTextLines)
    : 0;
  const textHeight = textLineCount * textLineHeight;

  let cardH =
    fixedBase +
    (photoHeight ? photoHeight + photoGap : 0) +
    (textLineCount > 0 ? textHeight + textGap : 0);
  cardH = Math.min(cardH, maxCardH);
  const cardY = Math.round(topSafe + (maxCardH - cardH) / 2);

  const headerY = cardY + pad;
  const textY = headerY + avatarSize + gapAfterHeader;
  const photoY = textY + (textLineCount > 0 ? textHeight + textGap : 0);
  const tagsY = photoY + (photoHeight ? photoHeight + photoGap : 0);

  let tagCursor = tagsY;
  const tags: BuzzCardTagRect[] = tagHeights.map((tag) => {
    const rect: BuzzCardTagRect = {
      kind: tag.kind,
      x: innerX,
      y: tagCursor,
      width: innerW,
      height: tag.height,
    };
    tagCursor += tag.height + tagGap;
    return rect;
  });

  const hashtagsY = tagsY + (tagsHeight ? tagsHeight + afterTagsGap : 0);
  const statsY =
    hashtagsY + (hashtagsHeight ? hashtagsHeight + hashtagGap : 0);

  return {
    width: W,
    height: H,
    scale: s,
    cardX,
    cardY,
    cardW,
    cardH,
    pad,
    innerX,
    innerW,
    topSafe,
    bottomSafe,
    footerPrimaryY,
    footerSecondaryY,
    logoH,
    logoY,
    avatarSize,
    headerY,
    gapAfterHeader,
    textY,
    textFontSize,
    textLineHeight,
    maxTextLines,
    textLineCount,
    textHeight,
    textGap,
    photoY,
    photoHeight,
    photoGap,
    tags,
    tagsY,
    tagsHeight,
    afterTagsGap,
    hashtagsY,
    hashtagsHeight,
    statsY,
    statsHeight,
    showStats,
    shortText,
  };
};

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.lineTo(x + w - rad, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rad);
  c.lineTo(x + w, y + h - rad);
  c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  c.lineTo(x + rad, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rad);
  c.lineTo(x, y + rad);
  c.quadraticCurveTo(x, y, x + rad, y);
  c.closePath();
};

/** Draw an image using "cover" cropping into the rect (x,y,w,h). */
const drawCover = (
  c: CanvasRenderingContext2D,
  img: any,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const iw = img.width || 1;
  const ih = img.height || 1;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
};

/** Wrap text to lines (handles long words + newlines). Truncates with an ellipsis after maxLines. */
const wrapLines = (
  c: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): { lines: string[]; truncated: boolean } => {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r/g, '').split('\n');
  let truncated = false;

  outer: for (let p = 0; p < paragraphs.length; p++) {
    const words = paragraphs[p].split(/(\s+)/).filter(s => s.length > 0);
    let line = '';
    if (paragraphs[p].trim() === '') {
      if (lines.length > 0) lines.push('');
      if (lines.length >= maxLines) {
        truncated = p < paragraphs.length - 1;
        break;
      }
      continue;
    }
    for (const w of words) {
      const test = line + w;
      if (c.measureText(test).width <= maxWidth || line === '') {
        // very long single word: hard-break by characters
        if (c.measureText(test).width > maxWidth && line === '') {
          let chunk = '';
          for (const ch of w) {
            if (c.measureText(chunk + ch).width > maxWidth) {
              lines.push(chunk);
              chunk = ch;
              if (lines.length >= maxLines) {
                truncated = true;
                break outer;
              }
            } else {
              chunk += ch;
            }
          }
          line = chunk;
        } else {
          line = test;
        }
      } else {
        lines.push(line.trimEnd());
        if (lines.length >= maxLines) {
          truncated = true;
          break outer;
        }
        line = w.trimStart();
      }
    }
    if (line.trim() !== '') {
      lines.push(line.trimEnd());
      if (lines.length >= maxLines && p < paragraphs.length - 1) {
        truncated = true;
        break;
      }
    }
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
    truncated = true;
  }
  if (truncated && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 0 && c.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = last.trimEnd() + '…';
  }
  return { lines, truncated };
};

const compactNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')} rb`;
  return String(n);
};

const fitSingleLine = (
  c: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number
): string => {
  c.font = font;
  if (c.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && c.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value.trimEnd()}…`;
};

export async function renderBuzzStoryCanvas(input: BuzzCardInput, deps: BuzzCardDeps, format: 'story' | 'feed' = 'story'): Promise<any> {
  if (typeof document !== 'undefined' && (document as any).fonts?.load) {
    try {
      await Promise.all([
        (document as any).fonts.load(`400 40px "Plus Jakarta Sans"`),
        (document as any).fonts.load(`600 40px "Plus Jakarta Sans"`),
        (document as any).fonts.load(`700 40px "Plus Jakarta Sans"`),
        (document as any).fonts.load(`800 40px "Plus Jakarta Sans"`),
      ]);
    } catch {
      /* fall back to system fonts */
    }
  }

  const W = BUZZ_CARD_W;
  const H = format === 'feed' ? BUZZ_CARD_FEED_H : BUZZ_CARD_H;
  const s = H / BUZZ_CARD_H;
  const canvas: any = deps.createCanvas
    ? deps.createCanvas(W, H)
    : (() => {
        const el = document.createElement('canvas');
        el.width = W;
        el.height = H;
        return el;
      })();
  const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

  // ---- Load all images up front (skip on failure for avatar/poster/logo, flag for attached photo) ----
  const safeLoad = async (src?: string, isAttachedPhoto: boolean = false) => {
    if (!src) return null;
    try {
      return await deps.loadImage(src);
    } catch (err) {
      console.warn(`[buzzStoryCard] Failed to load ${isAttachedPhoto ? 'buzz attached photo' : 'asset'}: "${src}"`, err);
      return null;
    }
  };
  const collectionPreviews = (input.collection?.previewImages || [])
    .filter((src): src is string => Boolean(src && src.trim()))
    .slice(0, 4);
  const [avatarImg, photoImg, posterImg, logoImg, articleCoverImg] = await Promise.all([
    safeLoad(input.authorAvatar, false),
    safeLoad(input.image, true),
    safeLoad(input.film?.poster, false),
    safeLoad(encodeURI('/v2_sotoyfilm full logo transparent.PNG'), false),
    safeLoad(input.article?.cover, false),
  ]);
  const collectionPreviewImgs = await Promise.all(
    collectionPreviews.map((src) => safeLoad(src, false))
  );
  const hasPhoto = !!photoImg;
  const photoFailed = Boolean(input.image && !photoImg);
  if (photoFailed && deps.onPhotoLoadFailed) {
    try {
      deps.onPhotoLoadFailed();
    } catch (cbErr) {
      console.warn('[buzzStoryCard] onPhotoLoadFailed callback error:', cbErr);
    }
  }
  if (canvas) {
    (canvas as any).photoFailed = photoFailed;
  }

  const provisional = getBuzzCardLayout(input, format, { textLineCount: 0, photoHeight: 0 });
  let desiredPhotoH = 0;
  if (hasPhoto && photoImg) {
    const ratio = (photoImg as any).height / (photoImg as any).width;
    desiredPhotoH = Math.round(
      Math.min(
        Math.max(provisional.innerW * ratio, provisional.innerW * 0.6),
        1000 * s
      )
    );
  }

  const preLayout = getBuzzCardLayout(input, format, {
    textLineCount: 0,
    photoHeight: desiredPhotoH,
  });
  const rawText = (input.text || '').trim();
  ctx.font = `500 ${preLayout.textFontSize}px ${FONT}`;
  const { lines } = wrapLines(
    ctx,
    rawText || ' ',
    preLayout.innerW,
    Math.max(1, preLayout.maxTextLines)
  );
  const layout = getBuzzCardLayout(input, format, {
    textLineCount: lines.length,
    photoHeight: desiredPhotoH,
  });

  // ---- Background (light, Threads-like) ----
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#F4F4F5');
  bg.addColorStop(1, '#E9E9EC');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // soft brand glow
  const glow = ctx.createRadialGradient(W - 120, 120, 40, W - 120, 120, 700);
  glow.addColorStop(0, 'rgba(255,46,126,0.16)');
  glow.addColorStop(1, 'rgba(255,46,126,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Brand logo (top-left, preserve aspect ratio)
  if (logoImg) {
    const logoAspect = ((logoImg as any).width || 1) / ((logoImg as any).height || 1);
    const logoW = Math.round(layout.logoH * logoAspect);
    const logoX = Math.max(24, layout.cardX - 10);
    ctx.drawImage(logoImg as any, logoX, layout.logoY, logoW, layout.logoH);
  } else {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PINK;
    ctx.font = `800 ${56 * s}px ${FONT}`;
    ctx.fillText('SOTOY FILM', layout.cardX, layout.logoY + 60 * s);
  }

  // ---- Card (white, soft shadow) ----
  ctx.save();
  ctx.shadowColor = 'rgba(15, 15, 30, 0.14)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, layout.cardX, layout.cardY, layout.cardW, layout.cardH, 48 * s);
  ctx.fill();
  ctx.restore();

  // ---- Header: avatar + name/handle + role badge ----
  const avX = layout.innerX;
  const avY = layout.headerY;
  const avatarSize = layout.avatarSize;
  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX + avatarSize / 2, avY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    drawCover(ctx, avatarImg, avX, avY, avatarSize, avatarSize);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(avX + avatarSize / 2, avY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = PINK;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${52 * s}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText((input.authorName || 'S').charAt(0).toUpperCase(), avX + avatarSize / 2, avY + avatarSize / 2 + 18 * s);
    ctx.textAlign = 'left';
  }
  // thin ring
  ctx.beginPath();
  ctx.arc(avX + avatarSize / 2, avY + avatarSize / 2, avatarSize / 2 - 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  const nameX = avX + avatarSize + 26 * s;
  const maxNameW = layout.innerX + layout.innerW - nameX - 8 * s;
  ctx.fillStyle = '#0F0F14';
  ctx.font = `800 ${40 * s}px ${FONT}`;
  let displayName = input.authorName || 'Warga Sotoy';
  while (displayName.length > 1 && ctx.measureText(displayName).width > maxNameW - (input.roleLabel ? 190 * s : 0)) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== input.authorName) displayName = displayName.trimEnd() + '…';
  ctx.fillText(displayName, nameX, avY + 44 * s);
  const nameW = ctx.measureText(displayName).width;

  if (input.roleLabel) {
    ctx.font = `800 ${20 * s}px ${FONT}`;
    const label = input.roleLabel.toUpperCase();
    const bw = ctx.measureText(label).width + 30 * s;
    const bx = nameX + nameW + 16 * s;
    ctx.fillStyle = PINK;
    rr(ctx, bx, avY + 16 * s, bw, 38 * s, 19 * s);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(label, bx + bw / 2, avY + 42 * s);
    ctx.textAlign = 'left';
  }

  const handle = normalizeHandle(input.authorHandle);
  ctx.fillStyle = '#8A8A93';
  ctx.font = `500 ${30 * s}px ${FONT}`;
  ctx.fillText(handle || 'di Sotoy Film', nameX, avY + 88 * s);

  // ---- Text ----
  if (lines.length) {
    ctx.fillStyle = '#0F0F14';
    ctx.font = `500 ${layout.textFontSize}px ${FONT}`;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(
        lines[i],
        layout.innerX,
        layout.textY + layout.textFontSize + i * layout.textLineHeight - (layout.shortText ? 6 : 4) * s
      );
    }
  }

  // ---- Photo ----
  if (photoImg && layout.photoHeight) {
    ctx.save();
    rr(ctx, layout.innerX, layout.photoY, layout.innerW, layout.photoHeight, 30 * s);
    ctx.clip();
    drawCover(ctx, photoImg, layout.innerX, layout.photoY, layout.innerW, layout.photoHeight);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2 * s;
    rr(ctx, layout.innerX, layout.photoY, layout.innerW, layout.photoHeight, 30 * s);
    ctx.stroke();
  }

  // ---- Attached tags: film, article, shared watchlist ----
  const drawFilmChip = (rect: BuzzCardTagRect) => {
    const f = input.film;
    if (!f) return;
    ctx.fillStyle = '#F7F7F8';
    rr(ctx, rect.x, rect.y, rect.width, rect.height, 28 * s);
    ctx.fill();
    ctx.strokeStyle = '#E4E4E8';
    ctx.lineWidth = 2 * s;
    rr(ctx, rect.x, rect.y, rect.width, rect.height, 28 * s);
    ctx.stroke();

    const pW = 104 * s;
    const pH = 156 * s;
    const pX = rect.x + 18 * s;
    const pY = rect.y + (rect.height - pH) / 2;
    if (posterImg) {
      ctx.save();
      rr(ctx, pX, pY, pW, pH, 14 * s);
      ctx.clip();
      drawCover(ctx, posterImg, pX, pY, pW, pH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#E4E4E8';
      rr(ctx, pX, pY, pW, pH, 14 * s);
      ctx.fill();
    }

    const tX = pX + pW + 26 * s;
    const scoreW = typeof f.score === 'number' ? 150 * s : 0;
    const maxTitleW = rect.x + rect.width - 24 * s - tX - scoreW;

    ctx.fillStyle = PINK;
    ctx.font = `800 ${19 * s}px ${FONT}`;
    ctx.fillText('FILM YANG DIBAHAS', tX, rect.y + 56 * s);

    ctx.fillStyle = '#0F0F14';
    ctx.font = `800 ${38 * s}px ${FONT}`;
    ctx.fillText(
      fitSingleLine(ctx, f.title, `800 ${38 * s}px ${FONT}`, maxTitleW),
      tX,
      rect.y + 102 * s
    );

    ctx.fillStyle = '#8A8A93';
    ctx.font = `500 ${26 * s}px ${FONT}`;
    const meta = [f.year, (f.genres || []).slice(0, 2).join(', ')].filter(Boolean).join('  •  ');
    ctx.fillText(
      fitSingleLine(ctx, meta, `500 ${26 * s}px ${FONT}`, maxTitleW),
      tX,
      rect.y + 142 * s
    );

    if (typeof f.score === 'number') {
      const label = `★ ${f.score.toFixed(1)}`;
      ctx.font = `800 ${30 * s}px ${FONT}`;
      const sw = ctx.measureText(label).width + 36 * s;
      const sx = rect.x + rect.width - 24 * s - sw;
      ctx.fillStyle = '#FFF4DB';
      rr(ctx, sx, rect.y + rect.height / 2 - 27 * s, sw, 54 * s, 27 * s);
      ctx.fill();
      ctx.fillStyle = '#B7791F';
      ctx.textAlign = 'center';
      ctx.fillText(label, sx + sw / 2, rect.y + rect.height / 2 + 11 * s);
      ctx.textAlign = 'left';
    }
  };

  const drawArticleChip = (rect: BuzzCardTagRect) => {
    const a = input.article;
    if (!a) return;
    ctx.fillStyle = '#F7F7F8';
    rr(ctx, rect.x, rect.y, rect.width, rect.height, 28 * s);
    ctx.fill();
    ctx.strokeStyle = '#E4E4E8';
    ctx.lineWidth = 2 * s;
    rr(ctx, rect.x, rect.y, rect.width, rect.height, 28 * s);
    ctx.stroke();

    const cW = 140 * s;
    const cH = 96 * s;
    const cX = rect.x + 18 * s;
    const cY = rect.y + (rect.height - cH) / 2;
    if (articleCoverImg) {
      ctx.save();
      rr(ctx, cX, cY, cW, cH, 14 * s);
      ctx.clip();
      drawCover(ctx, articleCoverImg, cX, cY, cW, cH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#E4E4E8';
      rr(ctx, cX, cY, cW, cH, 14 * s);
      ctx.fill();
    }

    const tX = cX + cW + 24 * s;
    const maxW = rect.x + rect.width - 24 * s - tX;
    ctx.fillStyle = PINK;
    ctx.font = `800 ${19 * s}px ${FONT}`;
    ctx.fillText('ARTIKEL', tX, rect.y + 42 * s);

    ctx.fillStyle = '#0F0F14';
    ctx.font = `800 ${34 * s}px ${FONT}`;
    ctx.fillText(
      fitSingleLine(ctx, a.title, `800 ${34 * s}px ${FONT}`, maxW),
      tX,
      rect.y + 84 * s
    );

    const meta = [a.category, a.author].filter(Boolean).join('  •  ');
    if (meta) {
      ctx.fillStyle = '#8A8A93';
      ctx.font = `500 ${24 * s}px ${FONT}`;
      ctx.fillText(
        fitSingleLine(ctx, meta, `500 ${24 * s}px ${FONT}`, maxW),
        tX,
        rect.y + 124 * s
      );
    }
  };

  const drawCollectionChip = (rect: BuzzCardTagRect) => {
    const c = input.collection;
    if (!c) return;
    ctx.fillStyle = '#F7F7F8';
    rr(ctx, rect.x, rect.y, rect.width, rect.height, 28 * s);
    ctx.fill();
    ctx.strokeStyle = '#E4E4E8';
    ctx.lineWidth = 2 * s;
    rr(ctx, rect.x, rect.y, rect.width, rect.height, 28 * s);
    ctx.stroke();

    const gridSize = 120 * s;
    const gap = 6 * s;
    const cell = (gridSize - gap) / 2;
    const gX = rect.x + 18 * s;
    const gY = rect.y + (rect.height - gridSize) / 2;
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = gX + col * (cell + gap);
      const y = gY + row * (cell + gap);
      const img = collectionPreviewImgs[i];
      if (img) {
        ctx.save();
        rr(ctx, x, y, cell, cell, 10 * s);
        ctx.clip();
        drawCover(ctx, img, x, y, cell, cell);
        ctx.restore();
      } else {
        ctx.fillStyle = '#E4E4E8';
        rr(ctx, x, y, cell, cell, 10 * s);
        ctx.fill();
      }
    }

    const tX = gX + gridSize + 24 * s;
    const maxW = rect.x + rect.width - 24 * s - tX;
    ctx.fillStyle = PINK;
    ctx.font = `800 ${19 * s}px ${FONT}`;
    ctx.fillText('WATCHLIST', tX, rect.y + 42 * s);

    ctx.fillStyle = '#0F0F14';
    ctx.font = `800 ${34 * s}px ${FONT}`;
    ctx.fillText(
      fitSingleLine(ctx, c.name, `800 ${34 * s}px ${FONT}`, maxW),
      tX,
      rect.y + 84 * s
    );

    ctx.fillStyle = '#8A8A93';
    ctx.font = `500 ${24 * s}px ${FONT}`;
    const countLabel = `${c.itemCount ?? 0} item`;
    ctx.fillText(countLabel, tX, rect.y + 124 * s);
  };

  for (const tag of layout.tags) {
    if (tag.kind === 'film') drawFilmChip(tag);
    else if (tag.kind === 'article') drawArticleChip(tag);
    else drawCollectionChip(tag);
  }

  // ---- Hashtags ----
  const tags = (input.tags || []).filter(Boolean).slice(0, 3);
  if (tags.length) {
    let tx = layout.innerX;
    ctx.font = `700 ${26 * s}px ${FONT}`;
    for (const t of tags) {
      const str = `#${t}`;
      const tw = ctx.measureText(str).width + 32 * s;
      if (tx + tw > layout.innerX + layout.innerW) break;
      ctx.fillStyle = '#FFE8F1';
      rr(ctx, tx, layout.hashtagsY, tw, 46 * s, 23 * s);
      ctx.fill();
      ctx.fillStyle = PINK;
      ctx.fillText(str, tx + 16 * s, layout.hashtagsY + 32 * s);
      tx += tw + 12 * s;
    }
  }

  // ---- Stats (Threads-style "391 suka · 520 balasan") ----
  if (layout.showStats) {
    ctx.fillStyle = '#9A9AA3';
    ctx.font = `500 ${28 * s}px ${FONT}`;
    const parts: string[] = [];
    if ((input.likes ?? 0) > 0) parts.push(`${compactNumber(input.likes as number)} suka`);
    if ((input.replies ?? 0) > 0) parts.push(`${compactNumber(input.replies as number)} balasan`);
    ctx.fillText(parts.join('  ·  '), layout.innerX, layout.statsY + 30 * s);
  }

  // ---- Footer (outside the card, proportional to the canvas height) ----
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6B6B75';
  ctx.font = `700 ${30 * s}px ${FONT}`;
  ctx.fillText('sotoyfilm.my.id', W / 2, layout.footerPrimaryY);
  ctx.fillStyle = '#9A9AA3';
  ctx.font = `500 ${22 * s}px ${FONT}`;
  ctx.fillText('Diskusi film & pop-culture bareng cinephile', W / 2, layout.footerSecondaryY);
  ctx.textAlign = 'left';

  return canvas;
}
