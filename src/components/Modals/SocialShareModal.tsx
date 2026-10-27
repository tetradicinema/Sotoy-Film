import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Send,
  MessageCircle,
  ExternalLink,
  Film,
  Sparkles,
  Download,
  Instagram,
  Camera,
  Star,
} from 'lucide-react';
import { toBlob as captureDomToBlob } from 'html-to-image';
import { useApp } from '../../context/AppContext';
import {
  renderBuzzStoryCanvas,
  buildFilmShareLayout,
  getFilmShareLayoutMetrics,
  getFilmRatingMetrics,
  BuzzCardInput,
  BuzzCardFilm,
  type BuzzCardArticle,
  type BuzzCardCollection,
  normalizeHandle,
  type FilmShareTextLayout,
  type ShareFormat,
  type TextMeasure,
} from '../../utils/buzzStoryCard';
import {
  buildCollectionStoryItems,
  COLLECTION_LOGO_ASPECT,
  COLLECTION_LOGO_PATH,
  COLLECTION_LOGO_TEXT_START_RATIO,
  COLLECTION_WALL_HEIGHT,
  getCollectionInitials,
  getCollectionShareMetrics,
  getCollectionStoryPanelLayout,
  getWallLayout,
  type CollectionStoryItem,
  type CollectionStoryPanelLayout,
} from '../../utils/collectionShareLayout';
import {
  mapShareLinkName,
  recordShareEvent,
} from '../../utils/shareAnalytics';

export interface ShareData {
  title: string;
  text: string;
  url?: string;
  type?: 'article' | 'buzz' | 'film' | 'review' | 'collection';
  contentId?: string;
  image?: string;
  imageUrl?: string;
  meta?: string;
  description?: string;
  itemCount?: number;
  ownerName?: string;
  previewImages?: string[];
  isPublic?: boolean;
  collectionId?: string;
  collectionName?: string;
  collectionDescription?: string;
  collectionItemCount?: number;
  collectionOwnerId?: string;
  collectionOwnerName?: string;
  collectionPreviewImages?: string[];
  collectionIsPublic?: boolean;
  collectionItems?: Array<{
    title?: string;
    image?: string;
    itemType?: 'film' | 'article';
  }>;
  tags?: string[];
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  authorRole?: string;
  roleLabel?: string;
  likes?: number;
  replies?: number;
  category?: string;
  readTime?: string;
  publishedAt?: string;
  skorSotoy?: number;
  // Specific for film rating & review card
  rating?: number;
  filmTitle?: string;
  filmYear?: number | string;
  filmPoster?: string;
  filmBackdrop?: string;
  filmGenres?: string[];
  filmDirector?: string;
  reviewerName?: string;
  reviewerAvatar?: string;
  reviewerRole?: string;
  headline?: string;
  reviewText?: string;
  criticReviewCount?: number;
  communityReviewCount?: number;
  // Specific for buzz attached photo and tagged film
  buzzImage?: string;
  taggedFilmPoster?: string;
  taggedFilmTitle?: string;
  taggedFilmYear?: number | string;
  taggedFilmScore?: number;
  taggedFilmGenres?: string[];
  // Specific for buzz tagged article
  taggedArticleTitle?: string;
  taggedArticleCover?: string;
  taggedArticleCategory?: string;
  taggedArticleAuthor?: string;
  // Specific for buzz shared watchlist/collection
  taggedCollectionName?: string;
  taggedCollectionItemCount?: number;
  taggedCollectionPreviewImages?: string[];
}

export const formatRoleLabel = (role?: string): string => {
  if (!role) return '';
  const r = role.toLowerCase().trim();
  if (r === 'admin') return 'ADMIN';
  if (r === 'writer' || r === 'penulis') return 'PENULIS';
  if (r === 'critic' || r === 'kurator' || r === 'si paling sotoy' || r === 'si paling sotoy (critic)') return 'SI PALING SOTOY';
  return '';
};

export const getStarsString = (score: number): string => {
  const fullStars = Math.min(5, Math.max(1, Math.round(score)));
  return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
};

// Helper to pre-fetch external cross-origin images as Data URLs with mode: 'cors' and cache-buster retry
export const ensureBlobUrl = async (url: string): Promise<string> => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const tryFetchAsBlobDataUrl = async (targetUrl: string): Promise<string> => {
    const res = await fetch(targetUrl, { mode: 'cors' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('FileReader did not produce a data URL'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  };

  try {
    return await tryFetchAsBlobDataUrl(url);
  } catch (errInitial) {
    try {
      const cacheBustUrl = `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`;
      return await tryFetchAsBlobDataUrl(cacheBustUrl);
    } catch (errRetry) {
      console.warn(`[ensureBlobUrl] Failed to pre-fetch image as data URL after retry (${url}):`, errRetry);
      return url;
    }
  }
};

// Backwards-compatible alias if referenced elsewhere
export const urlToDataUrl = ensureBlobUrl;

// Module-level cache for logo data URLs, keyed by the requested asset path.
const logoDataUrlCache = new Map<string, string>();

export const getLogoDataUrl = async (
  path: string = '/v2_sotoyfilm full logo transparent.PNG'
): Promise<string> => {
  const encodedPath = encodeURI(path || '/v2_sotoyfilm full logo transparent.PNG');
  const cached = logoDataUrlCache.get(encodedPath);
  if (cached) return cached;

  try {
    const dataUrl = await ensureBlobUrl(encodedPath);
    if (dataUrl && dataUrl.startsWith('data:')) {
      logoDataUrlCache.set(encodedPath, dataUrl);
      return dataUrl;
    }
    // Direct fetch fallback if ensureBlobUrl returned the plain relative path
    const res = await fetch(encodedPath);
    if (res.ok) {
      const blob = await res.blob();
      const readerDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('FileReader did not produce a data URL string'));
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
      logoDataUrlCache.set(encodedPath, readerDataUrl);
      return readerDataUrl;
    }
    console.warn(`[getLogoDataUrl] Failed to fetch ${encodedPath} (non-200), falling back to relative path`);
  } catch (err) {
    console.warn(`[getLogoDataUrl] Error converting ${encodedPath} to data URL, falling back to relative path:`, err);
  }
  return encodedPath;
};

const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('FileReader did not produce a data URL'));
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });

/**
 * Converts a collection poster/cover into a data URL for DOM capture. Remote
 * assets (Firebase Storage, TMDB, etc.) go through the existing image proxy
 * first so the capture never taints the canvas or silently drops an image.
 */
const getCollectionImageDataUrl = async (
  src: string
): Promise<string | null> => {
  const value = typeof src === 'string' ? src.trim() : '';
  if (!value) return null;
  if (value.startsWith('data:')) return value;

  const candidates: string[] = [];
  if (value.startsWith('blob:') || value.startsWith('/') || value.startsWith('.')) {
    candidates.push(value);
  } else {
    candidates.push(`/api/image-proxy?url=${encodeURIComponent(value)}`);
    candidates.push(value);
  }

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { mode: 'cors' });
      if (!response.ok) continue;
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) continue;
      return await readBlobAsDataUrl(blob);
    } catch (err) {
      console.warn(
        `[getCollectionImageDataUrl] Failed to preload "${candidate}":`,
        err
      );
    }
  }

  return null;
};

const formatImgSrc = (src: string): string => {
  if (!src) return '(empty src)';
  if (src.startsWith('data:')) return `${src.slice(0, 32)}... (data URL, len=${src.length})`;
  return src;
};

// Helper to wait until all images within a DOM container are completely loaded before capturing
export const waitForImages = async (container: HTMLElement): Promise<void> => {
  let imgs = Array.from(container.querySelectorAll('img'));
  if (imgs.length === 0) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    imgs = Array.from(container.querySelectorAll('img'));
  }

  await Promise.all(
    imgs.map((img) => {
      if (img.complete) {
        if (img.naturalWidth === 0 && img.src) {
          console.warn(`[waitForImages] Image complete but naturalWidth === 0 (failed to load): ${formatImgSrc(img.src)} (alt: ${img.alt || 'none'})`);
        }
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const cleanup = () => {
          img.removeEventListener('load', onDone);
          img.removeEventListener('error', onError);
          if (timer) clearTimeout(timer);
        };

        const onDone = () => {
          cleanup();
          resolve();
        };

        const onError = (e: Event) => {
          cleanup();
          console.warn(`[waitForImages] Failed to load image: ${formatImgSrc(img.src)} (alt: ${img.alt || 'none'})`, e);
          resolve();
        };

        // Safety fallback timeout to prevent hanging the export if network stalls
        timer = setTimeout(() => {
          cleanup();
          console.warn(`[waitForImages] Timed out waiting for image to load: ${formatImgSrc(img.src)} (alt: ${img.alt || 'none'})`);
          resolve();
        }, 5000);

        img.addEventListener('load', onDone);
        img.addEventListener('error', onError);
      });
    })
  );
};

export const cleanTrailingPunctuation = (str: string): string => {
  return str.replace(/[.,:;…!?-]+$/g, '').trimEnd();
};

export const getArticleStoryByline = (data: ShareData): string => {
  const parts: string[] = [];
  const author = data.authorName?.trim();
  if (author && author !== 'undefined' && author !== 'null') {
    parts.push(`Oleh ${author}`);
  }

  let readTime = '';
  if (data.readTime && data.readTime.trim() && data.readTime !== 'undefined' && data.readTime !== 'null') {
    readTime = data.readTime.trim();
  } else if (data.meta && typeof data.meta === 'string') {
    const match = data.meta.match(/\(?\d+\s*(?:mnt|menit)\s*baca\)?/i);
    if (match) {
      readTime = match[0].replace(/[()]/g, '').trim();
    }
  }

  if (readTime) {
    parts.push(readTime);
  }

  return parts.join(' • ');
};

/**
 * Rounded-rectangle path shared by every canvas renderer in this module.
 */
function drawRoundRectPath(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  c.beginPath();
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, r);
  } else {
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
  }
  c.closePath();
}

/**
 * Builds the single BuzzCardInput used by both the live preview and the
 * downloaded PNG. Keeping this in one place guarantees the two never diverge.
 */
export const buildBuzzCardInput = (data: ShareData): BuzzCardInput => {
  const authorHandle = normalizeHandle(
    data.authorHandle ||
      (data.meta?.startsWith('@') ? data.meta.split(' ')[0] : undefined)
  );
  const roleLabel = data.roleLabel || formatRoleLabel(data.authorRole);

  const film: BuzzCardFilm | null =
    data.taggedFilmTitle || data.filmTitle
      ? {
          title: data.taggedFilmTitle || data.filmTitle || '',
          year: data.taggedFilmYear || data.filmYear,
          poster: data.taggedFilmPoster || data.filmPoster,
          score: data.taggedFilmScore ?? data.rating ?? data.skorSotoy,
          genres: data.taggedFilmGenres || data.filmGenres,
        }
      : null;

  const article: BuzzCardArticle | null = data.taggedArticleTitle
    ? {
        title: data.taggedArticleTitle,
        cover: data.taggedArticleCover,
        category: data.taggedArticleCategory,
        author: data.taggedArticleAuthor,
      }
    : null;

  const collection: BuzzCardCollection | null = data.taggedCollectionName
    ? {
        name: data.taggedCollectionName,
        itemCount: data.taggedCollectionItemCount,
        previewImages: data.taggedCollectionPreviewImages,
      }
    : null;

  return {
    authorName:
      data.authorName || data.title.replace('Buzz Diskusi: ', '').trim(),
    authorHandle,
    authorAvatar: data.authorAvatar || data.image,
    roleLabel,
    text: data.text || '',
    image:
      data.buzzImage ||
      (data.type === 'buzz' && data.image && data.image !== data.authorAvatar
        ? data.image
        : undefined),
    film,
    article,
    collection,
    tags: data.tags,
    likes: data.likes,
    replies: data.replies,
  };
};

// =============================================================================
// ARTICLE SHARE CANVAS
// One renderer for the 9:16 story and the 4:5 feed. The feed is the story
// design scaled proportionally from the 1920px reference height, so the
// approved 9:16 output stays pixel-identical while the feed never overflows.
// =============================================================================

export interface ArticleShareCanvasDeps {
  loadImage: (
    src: string
  ) => Promise<CanvasImageSource & { width: number; height: number }>;
  createCanvas?: (w: number, h: number) => any;
}

export const renderArticleShareCanvas = async (
  data: ShareData,
  format: 'story' | 'feed' = 'story',
  deps: ArticleShareCanvasDeps
): Promise<any> => {
  if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
    try {
      await (document as any).fonts.ready;
    } catch {
      /* fall back to system fonts */
    }
  }

  const width = 1080;
  const height = format === 'feed' ? 1350 : 1920;
  const s = height / 1920;

  const canvas: any = deps.createCanvas
    ? deps.createCanvas(width, height)
    : (() => {
        const el = document.createElement('canvas');
        el.width = width;
        el.height = height;
        return el;
      })();
  const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

  // Base solid background (#0A0A0A)
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, width, height);

  // 1. Background + cover: full-bleed over the top 60% of the story canvas.
  const coverUrl = data.image || data.imageUrl;
  const coverH = Math.round(1150 * s);
  let coverLoaded = false;

  if (coverUrl) {
    try {
      const coverImg = await deps.loadImage(coverUrl);
      coverLoaded = true;

      const imgAspect = coverImg.width / coverImg.height;
      const targetAspect = width / coverH;

      let sx = 0;
      let sy = 0;
      let sWidth = coverImg.width;
      let sHeight = coverImg.height;
      if (imgAspect > targetAspect) {
        sWidth = coverImg.height * targetAspect;
        sx = (coverImg.width - sWidth) / 2;
      } else {
        sHeight = coverImg.width / targetAspect;
        sy = (coverImg.height - sHeight) / 2;
      }

      ctx.drawImage(coverImg, sx, sy, sWidth, sHeight, 0, 0, width, coverH);
    } catch (coverErr) {
      console.warn(
        '[SocialShareModal] Article cover load failed for canvas, using fallback gradient:',
        coverErr
      );
    }
  }

  if (!coverLoaded) {
    const fallbackGrad = ctx.createLinearGradient(0, 0, 0, coverH);
    fallbackGrad.addColorStop(0, '#262626');
    fallbackGrad.addColorStop(0.5, '#0A0A0A');
    fallbackGrad.addColorStop(1, '#0A0A0A');
    ctx.fillStyle = fallbackGrad;
    ctx.fillRect(0, 0, width, coverH);

    const glow = ctx.createRadialGradient(
      width / 2,
      450 * s,
      40 * s,
      width / 2,
      450 * s,
      500 * s
    );
    glow.addColorStop(0, 'rgba(255, 46, 126, 0.25)');
    glow.addColorStop(1, 'rgba(14, 16, 19, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, coverH);
  }

  // 2. Single continuous scrim: no seam, opaque #0A0A0A by the cover bottom.
  const scrim = ctx.createLinearGradient(0, 0, 0, height);
  scrim.addColorStop(0, 'rgba(14, 16, 19, 0.90)');
  scrim.addColorStop(0.1, 'rgba(14, 16, 19, 0.50)');
  scrim.addColorStop(0.22, 'rgba(14, 16, 19, 0.25)');
  scrim.addColorStop(0.35, 'rgba(14, 16, 19, 0.55)');
  scrim.addColorStop(0.48, 'rgba(14, 16, 19, 0.85)');
  scrim.addColorStop(0.58, '#0A0A0A');
  scrim.addColorStop(1, '#0A0A0A');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);

  // 3. Top row: logo (left) + category pill (right), scaled with the canvas.
  const topPad = 110 * s;
  const sidePad = 60 * s;
  const logoTargetW = 380 * s;
  let logoTargetH = 95 * s;

  try {
    const logoImg = await deps.loadImage(
      '/v2_sotoyfilm full logo transparent.PNG'
    );
    logoTargetH = logoImg.height * (logoTargetW / logoImg.width);
    ctx.drawImage(logoImg, sidePad, topPad, logoTargetW, logoTargetH);
  } catch (logoErr) {
    console.warn(
      '[SocialShareModal] Could not load /v2_sotoyfilm full logo transparent.PNG for canvas:',
      logoErr
    );
    ctx.fillStyle = '#FF2E7E';
    ctx.font = `900 ${48 * s}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('SOTOY FILM', sidePad, topPad + 58 * s);
    logoTargetH = 80 * s;
  }

  const categoryText = (data.category || 'ARTIKEL').toUpperCase();
  const maxPillW = width - sidePad * 2 - logoTargetW - 40 * s;
  const pillPadX = 26 * s;
  let pillFontSize = 28 * s;
  let pillText = categoryText;
  let catTextW = 0;

  ctx.save();
  while (pillFontSize >= 16 * s) {
    ctx.font = `900 ${pillFontSize}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
    catTextW = ctx.measureText(pillText).width;
    if (catTextW + pillPadX * 2 <= maxPillW) break;
    pillFontSize -= 2 * s;
  }

  if (catTextW + pillPadX * 2 > maxPillW) {
    ctx.font = `900 ${16 * s}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
    let truncated = pillText;
    while (
      truncated.length > 0 &&
      ctx.measureText(`${cleanTrailingPunctuation(truncated)}...`).width +
        pillPadX * 2 >
        maxPillW
    ) {
      truncated = truncated.slice(0, -1);
    }
    pillText = `${cleanTrailingPunctuation(truncated)}...`;
    catTextW = ctx.measureText(pillText).width;
  }
  ctx.restore();

  const pillH = 60 * s;
  const pillW = catTextW + pillPadX * 2;
  const pillX = width - sidePad - pillW;
  const logoCenterY = topPad + logoTargetH / 2;
  const pillY = logoCenterY - pillH / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(14, 16, 19, 0.90)';
  ctx.strokeStyle = 'rgba(255, 46, 126, 0.45)';
  ctx.lineWidth = 2.5 * s;
  drawRoundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FF2E7E';
  ctx.font = `900 ${pillFontSize}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH / 2);
  ctx.restore();

  // 4. Text block, bottom-anchored on the gradient.
  const maxTextW = width - sidePad * 2;

  const getWrappedLines = (
    text: string,
    maxWidth: number,
    font: string,
    maxLines: number = 4
  ): string[] => {
    if (!text) return [];
    ctx.save();
    ctx.font = font;
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
        if (lines.length === maxLines - 1) {
          const remainingWords = words.slice(i).join(' ');
          let lastLine = remainingWords;
          while (
            ctx.measureText(`${cleanTrailingPunctuation(lastLine)}...`).width >
              maxWidth &&
            lastLine.includes(' ')
          ) {
            lastLine = lastLine.substring(0, lastLine.lastIndexOf(' '));
          }
          lines.push(`${cleanTrailingPunctuation(lastLine)}...`);
          currentLine = '';
          break;
        }
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    ctx.restore();
    return lines.slice(0, maxLines);
  };

  const titleFont = `900 ${80 * s}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
  const titleLineH = 92 * s;
  const titleLines = getWrappedLines(data.title || '', maxTextW, titleFont, 4);
  const titleHeight = titleLines.length * titleLineH;

  const excerptFont = `${34 * s}px 'Plus Jakarta Sans', sans-serif`;
  const excerptLineH = 46 * s;
  const excerptLines = data.text
    ? getWrappedLines(data.text, maxTextW, excerptFont, 3)
    : [];
  const excerptGap = excerptLines.length > 0 ? 24 * s : 0;
  const excerptHeight = excerptLines.length * excerptLineH;

  const bylineStr = getArticleStoryByline(data);

  let authorAvatarImg: HTMLImageElement | null = null;
  if (data.authorAvatar) {
    try {
      authorAvatarImg = (await deps.loadImage(
        data.authorAvatar
      )) as HTMLImageElement;
    } catch {
      /* graceful fallback */
    }
  }

  const hasByline = Boolean(bylineStr || authorAvatarImg);
  const bylineGap = hasByline ? 24 * s : 0;
  const bylineHeight = hasByline ? 48 * s : 0;

  const totalContentH =
    titleHeight + excerptGap + excerptHeight + bylineGap + bylineHeight;
  const targetBottom = 1720 * s;
  let yCursor = Math.max(920 * s, targetBottom - totalContentH);

  ctx.textBaseline = 'top';

  ctx.font = titleFont;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  for (const line of titleLines) {
    ctx.fillText(line, sidePad, yCursor);
    yCursor += titleLineH;
  }

  if (excerptLines.length > 0) {
    yCursor += excerptGap;
    ctx.font = excerptFont;
    ctx.fillStyle = '#D4D4D4';
    ctx.textAlign = 'left';
    for (const line of excerptLines) {
      ctx.fillText(line, sidePad, yCursor);
      yCursor += excerptLineH;
    }
  }

  if (hasByline) {
    yCursor += bylineGap;
    let bylineX = sidePad;
    const avatarSize = 44 * s;

    if (authorAvatarImg) {
      const avatarCenterY = yCursor + avatarSize / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        bylineX + avatarSize / 2,
        avatarCenterY,
        avatarSize / 2,
        0,
        Math.PI * 2
      );
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(authorAvatarImg, bylineX, yCursor, avatarSize, avatarSize);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = '#FF2E7E';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.arc(
        bylineX + avatarSize / 2,
        avatarCenterY,
        avatarSize / 2,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();

      bylineX += avatarSize + 16 * s;
    }

    if (bylineStr) {
      ctx.fillStyle = '#E5E5E5';
      ctx.font = `bold ${24 * s}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'left';
      const textOffsetY = authorAvatarImg
        ? yCursor + (avatarSize - 24 * s) / 2
        : yCursor + 10 * s;
      ctx.fillText(bylineStr, bylineX, textOffsetY);
    }
  }

  // 5. Footer: thin divider + pink accent + cyan domain.
  const footerDividerY = height - 135 * s;
  const footerTextY = height - 90 * s;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(sidePad, footerDividerY);
  ctx.lineTo(width - sidePad, footerDividerY);
  ctx.stroke();

  ctx.fillStyle = '#FF2E7E';
  ctx.font = `bold ${22 * s}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('★ Baca selengkapnya di Sotoy Film', sidePad, footerTextY);

  ctx.fillStyle = '#00F0FF';
  ctx.font = `bold ${22 * s}px 'Geist Mono', monospace`;
  ctx.textAlign = 'right';
  ctx.fillText('sotoyfilm.my.id', width - sidePad, footerTextY);

  return canvas;
};

// =============================================================================
// SINGLE SOURCE OF TRUTH: Film Rating Instagram Story Card (1080x1920)
// The preview and the canvas renderer share the same text layout decisions so
// the exported PNG keeps the exact proportions and line breaks of the modal.
// =============================================================================
// The rating pill is now scaled per format by buildFilmShareLayout.
// Lucide Star path used by FilmDbCard, so the canvas star matches the preview.
const FILM_RATING_STAR_PATH =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z';

const approximateTextMeasure: TextMeasure = (font, text) => {
  const size = Number.parseInt(font.match(/(\d+)px/)?.[1] || '20', 10);
  return text.length * size * 0.56;
};

const useShareFontRevision = (): number => {
  const [revision, setRevision] = React.useState(0);

  React.useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.ready) return;
    let active = true;
    document.fonts.ready.then(() => {
      if (active) setRevision((current) => current + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  return revision;
};

interface FilmRatingStoryCardProps {
  data: ShareData;
  displayScore: number;
  hasScore: boolean;
  posterUrl?: string;
  reviewerAvatarUrl?: string;
  posterUrlForExport?: string;
  reviewerAvatarUrlForExport?: string;
  logoUrlForExport?: string;
  format?: 'story' | 'feed';
}

export const FilmRatingStoryCard: React.FC<FilmRatingStoryCardProps> = ({
  data,
  displayScore,
  hasScore,
  posterUrl,
  reviewerAvatarUrl,
  posterUrlForExport,
  reviewerAvatarUrlForExport,
  logoUrlForExport,
  format = 'story',
}) => {
  const cardHeight = format === 'feed' ? 1350 : 1920;
  const effectivePoster = posterUrlForExport !== undefined ? posterUrlForExport : posterUrl;
  const effectiveAvatar =
    reviewerAvatarUrlForExport !== undefined
      ? reviewerAvatarUrlForExport
      : reviewerAvatarUrl || data.reviewerAvatar || data.authorAvatar;
  const effectiveLogo = logoUrlForExport || '/v2_sotoyfilm full logo transparent.PNG';
  const fontRevision = useShareFontRevision();

  const measure = React.useMemo<TextMeasure>(() => {
    if (typeof document === 'undefined') return approximateTextMeasure;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return approximateTextMeasure;
    return (font, text) => {
      context.font = font;
      return context.measureText(text).width;
    };
  }, []);

  const layout = React.useMemo(
    () => buildFilmShareLayout(data, displayScore, hasScore, measure, format),
    [data, displayScore, hasScore, measure, format, fontRevision]
  );

  return (
    <div
      className="relative w-[1080px] bg-[#0A0A0A] overflow-hidden text-center select-none"
      style={{ width: '1080px', height: `${cardHeight}px` }}
    >
      {effectivePoster && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={effectivePoster}
            alt={data.filmTitle || data.title}
            className="w-full h-full object-cover object-top"
          />
        </div>
      )}

      {/* Neutral black fade for the wordmark and badge over the top of the art. */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: `${Math.round(320 * (format === 'feed' ? 1350 / 1920 : 1))}px`,
          background:
            'linear-gradient(to bottom, rgba(10, 10, 10, 0.85) 0%, rgba(10, 10, 10, 0) 100%)',
        }}
      />

      {/* Neutral black fade blends the poster into the copy below. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, rgba(10, 10, 10, 0) 0%, ${getFilmShareLayoutMetrics(
            format
          ).scrimStops
            .map((stop) => `${stop.color} ${Math.round(stop.at * 100)}%`)
            .join(', ')})`,
        }}
      />

      <div className="relative z-10 pt-[110px] px-[60px] flex items-center justify-between">
        <img
          src={effectiveLogo}
          alt="Sotoy Film"
          className="w-[380px] h-auto object-contain"
        />
        <div className="px-7 h-[60px] inline-flex items-center rounded-full font-black text-[28px] tracking-wider text-[#FF2E7E] bg-[#0A0A0A] border-2 border-[#FF2E7E] whitespace-nowrap uppercase">
          SKOR & ULASAN
        </div>
      </div>

      {/* Anchored to the card top: without an explicit top this absolutely
          positioned wrapper inherits its static position (below the header),
          which pushed the whole copy block out of the preview frame. */}
      <div className="absolute inset-x-0 top-0 px-[60px] text-center">
        <h1
          className="absolute inset-x-0 font-display font-black text-white"
          style={{
            top: `${layout.titleTop}px`,
            fontSize: `${layout.titleFontSize}px`,
            lineHeight: `${layout.titleLineHeight}px`,
          }}
        >
          {layout.titleLines.map((line, index) => (
            <div key={`film-title-${index}`}>{line}</div>
          ))}
        </h1>

        {layout.hasDirector && (
          <div
            className="absolute inset-x-0 text-slate-200 font-bold truncate"
            style={{
              top: `${layout.directorTop}px`,
              fontSize: `${layout.directorFontSize}px`,
              lineHeight: `${layout.directorLineHeight}px`,
            }}
          >
            {layout.directorText}
          </div>
        )}

        {layout.metaText && (
          <div
            className="absolute inset-x-0 text-[#FF2E7E] font-extrabold tracking-wide truncate"
            style={{
              top: `${layout.metaTop}px`,
              fontSize: `${layout.metaFontSize}px`,
              lineHeight: `${layout.metaLineHeight}px`,
            }}
          >
            {layout.metaText}
          </div>
        )}

        <div
          className="absolute inset-x-0 flex justify-center"
          style={{ top: `${layout.ratingTop}px` }}
        >
          <div
            className={`inline-flex items-center justify-center border bg-[#0A0A0A] ${
              hasScore ? 'border-[#FFD000]' : 'border-slate-600'
            }`}
            style={{
              height: `${layout.rating.boxHeight}px`,
              paddingInline: `${layout.rating.padX}px`,
              paddingBlock: `${layout.rating.padY}px`,
              gap: `${layout.rating.gap}px`,
              borderWidth: `${layout.rating.border}px`,
              borderRadius: `${layout.rating.radius}px`,
            }}
          >
            {hasScore ? (
              <>
                <Star
                  className="shrink-0 text-[#FFD000] fill-current"
                  style={{
                    width: `${layout.rating.starSize}px`,
                    height: `${layout.rating.starSize}px`,
                  }}
                />
                <span
                  className="font-display font-black text-white leading-none tabular-nums"
                  style={{ fontSize: `${layout.rating.scoreFont}px` }}
                >
                  {displayScore.toFixed(1)}
                </span>
                <span
                  className="font-bold text-slate-400 leading-none"
                  style={{ fontSize: `${layout.rating.denomFont}px` }}
                >
                  /10
                </span>
              </>
            ) : (
              <span
                className="font-bold text-slate-400 leading-none"
                style={{ fontSize: `${layout.rating.emptyFont}px` }}
              >
                Belum ada skor
              </span>
            )}
          </div>
        </div>

        {layout.hasReviewer && (
          <div
            className="absolute inset-x-0 flex items-center justify-center"
            style={{
              top: `${layout.reviewerTop}px`,
              height: `${layout.reviewerLineHeight}px`,
            }}
          >
            {effectiveAvatar ? (
              <div className="flex items-center justify-center gap-3 min-w-0 max-w-full">
                <img
                  src={effectiveAvatar}
                  alt={data.reviewerName || 'Reviewer'}
                  className="w-[44px] h-[44px] rounded-full object-cover border-2 border-[#FF2E7E] shrink-0"
                />
                <span
                  className="text-slate-200 font-bold truncate"
                  style={{ fontSize: `${layout.reviewerFontSize}px` }}
                >
                  {layout.reviewerText}
                </span>
              </div>
            ) : (
              <span
                className="text-slate-200 font-semibold truncate max-w-full"
                style={{ fontSize: `${layout.reviewerFontSize}px` }}
              >
                {layout.reviewerText}
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className="absolute inset-x-0 px-[60px]"
        style={{ top: `${layout.footerDividerY}px` }}
      >
        <div className="border-t border-white/15" />
      </div>
      <div
        className="absolute inset-x-0 px-[60px] flex items-center justify-between"
        style={{ top: `${layout.footerTextY}px` }}
      >
        <span className="text-[20px] leading-none font-bold text-[#FF2E7E]">
          Ulas & Nilai Film di Sotoy Film
        </span>
        <span className="text-[20px] leading-none text-[#00F0FF] font-mono font-bold">
          sotoyfilm.my.id
        </span>
      </div>
    </div>
  );
};

interface CollectionSharePreviewProps {
  data: ShareData;
  variant?: 'quick' | 'story';
  items?: CollectionStoryItem[];
  format?: 'story' | 'feed';
}

const CollectionShareCollage: React.FC<{
  images: string[];
  variant?: 'quick' | 'story';
}> = ({ images, variant = 'quick' }) => {
  const slots = Array.from({ length: 4 }, (_, index) => images[index] || '');
  const isStory = variant === 'story';

  return (
    <div
      className={`grid grid-cols-2 grid-rows-2 w-full ${
        isStory ? 'h-full gap-[14px]' : 'aspect-square gap-2'
      }`}
    >
      {slots.map((src, index) => (
        <div
          key={`collection-image-${index}`}
          className={`relative overflow-hidden bg-[#171717] ${
            isStory
              ? 'rounded-[24px] border-2 border-slate-700'
              : 'rounded-xl border border-slate-700'
          }`}
        >
          {src ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
};

interface CollectionStoryCardProps {
  data: ShareData;
  items?: CollectionStoryItem[];
  imageUrlsForExport?: Array<string | null | undefined>;
  logoUrlForExport?: string;
  format?: 'story' | 'feed';
}

export const CollectionStoryCard: React.FC<CollectionStoryCardProps> = ({
  data,
  items,
  imageUrlsForExport,
  logoUrlForExport,
  format = 'story',
}) => {
  const metrics = getCollectionShareMetrics(format);
  const storyHeight = metrics.height;
  const storyItems = React.useMemo(
    () => (items !== undefined ? items : buildCollectionStoryItems(data)),
    [data, items]
  );
  const visibleItems = storyItems.slice(0, 5);
  const [failedImages, setFailedImages] = React.useState<Record<number, boolean>>(
    {}
  );

  React.useEffect(() => {
    setFailedImages((current) =>
      Object.keys(current).length > 0 ? {} : current
    );
  }, [storyItems, imageUrlsForExport]);

  const fontRevision = useShareFontRevision();
  const measure = React.useMemo<TextMeasure>(() => {
    if (typeof document === 'undefined') return approximateTextMeasure;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return approximateTextMeasure;
    return (font, text) => {
      context.font = font;
      return context.measureText(text).width;
    };
  }, []);

  const collectionName = (
    data.collectionName ||
    data.title ||
    'Koleksi'
  ).trim();
  const collectionDescription =
    data.collectionDescription !== undefined
      ? data.collectionDescription
      : data.description || '';
  const ownerName =
    data.collectionOwnerName ||
    data.ownerName ||
    data.authorName ||
    'Pengguna Sotoy';

  const panelLayout: CollectionStoryPanelLayout = React.useMemo(
    () =>
      getCollectionStoryPanelLayout({
        title: collectionName,
        description: collectionDescription,
        ownerName,
        measure,
        format,
      }),
    [
      collectionName,
      collectionDescription,
      ownerName,
      measure,
      fontRevision,
      format,
    ]
  );

  const wallTiles = React.useMemo(
    () =>
      getWallLayout(
        visibleItems.length,
        metrics.width,
        metrics.wallGutter,
        metrics.wallHeight
      ),
    [visibleItems.length, metrics]
  );
  const emptyInitials = React.useMemo(
    () => getCollectionInitials(collectionName, 3).join(''),
    [collectionName]
  );
  const logo = logoUrlForExport || encodeURI(COLLECTION_LOGO_PATH);
  const emptyWallTile = wallTiles[0] || {
    x: 0,
    y: 0,
    width: metrics.width,
    height: metrics.wallHeight,
  };
  const logoHeight = metrics.logoWidth / COLLECTION_LOGO_ASPECT;

  return (
    <div
      className="relative overflow-hidden select-none text-left"
      style={{
        width: `${metrics.width}px`,
        height: `${storyHeight}px`,
        background: '#FFD000',
        fontFamily: "'Geist', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${metrics.width}px`,
          height: `${metrics.wallHeight}px`,
          overflow: 'hidden',
          background: '#0A0A0A',
          zIndex: 1,
        }}
      >
        {visibleItems.length === 0 ? (
          <div
            style={{
              position: 'absolute',
              left: `${emptyWallTile.x}px`,
              top: `${emptyWallTile.y}px`,
              width: `${emptyWallTile.width}px`,
              height: `${emptyWallTile.height}px`,
              background: '#FF2E7E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0A0A0A',
              fontFamily: "'Geist', 'Plus Jakarta Sans', sans-serif",
              fontSize: `${Math.round(
                300 * (metrics.wallHeight / COLLECTION_WALL_HEIGHT)
              )}px`,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.06em',
            }}
          >
            {emptyInitials}
          </div>
        ) : (
          visibleItems.map((item, index) => {
            const slot = wallTiles[index];
            if (!slot) return null;
            const override = imageUrlsForExport
              ? imageUrlsForExport[index]
              : undefined;
            const src =
              override === undefined ? item.image || '' : override || '';
            const showFallback = !src || failedImages[index] === true;
            const tileTitle = item.title || collectionName;

            return (
              <div
                key={`collection-poster-${index}`}
                style={{
                  position: 'absolute',
                  left: `${slot.x}px`,
                  top: `${slot.y}px`,
                  width: `${slot.width}px`,
                  height: `${slot.height}px`,
                  overflow: 'hidden',
                  background: '#00F0FF',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    boxSizing: 'border-box',
                    background: '#00F0FF',
                    color: '#0A0A0A',
                    fontFamily: "'Geist', 'Plus Jakarta Sans', sans-serif",
                    fontSize: `${Math.max(
                      20,
                      Math.min(34, slot.width / 16)
                    )}px`,
                    fontWeight: 900,
                    lineHeight: 1.15,
                    textAlign: 'center',
                  }}
                >
                  {tileTitle}
                </div>
                {!showFallback && (
                  <img
                    src={src}
                    alt={tileTitle}
                    draggable={false}
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                      setFailedImages((current) => ({
                        ...current,
                        [index]: true,
                      }));
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 25%',
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: `${metrics.wallHeight}px`,
          width: `${metrics.width}px`,
          height: `${metrics.wallSeparator}px`,
          background: '#0A0A0A',
          zIndex: 3,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: `${metrics.panelTop}px`,
          width: `${metrics.width}px`,
          height: `${metrics.height - metrics.panelTop}px`,
          background: '#FFD000',
          zIndex: 2,
        }}
      />

      {/* Text-only outline under-layer: the filter is on the wrapper so it
          applies after the inner clip, then the unfiltered logo sits on top. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: `${metrics.logoLeft}px`,
          top: `${metrics.logoTop}px`,
          width: `${metrics.logoWidth}px`,
          height: `${logoHeight}px`,
          filter:
            'drop-shadow(2px 0 0 #0A0A0A) drop-shadow(-2px 0 0 #0A0A0A) drop-shadow(0 2px 0 #0A0A0A) drop-shadow(0 -2px 0 #0A0A0A)',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            clipPath: `inset(0 0 0 ${COLLECTION_LOGO_TEXT_START_RATIO * 100}%)`,
            WebkitClipPath: `inset(0 0 0 ${COLLECTION_LOGO_TEXT_START_RATIO * 100}%)`,
          }}
        >
          <img
            src={logo}
            alt=""
            draggable={false}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>

      <img
        src={logo}
        alt="Sotoy Film"
        draggable={false}
        style={{
          position: 'absolute',
          left: `${metrics.logoLeft}px`,
          top: `${metrics.logoTop}px`,
          display: 'block',
          width: `${metrics.logoWidth}px`,
          height: 'auto',
          pointerEvents: 'none',
          zIndex: 31,
        }}
      />

      <div
        style={{
          position: 'absolute',
          right: `${metrics.badgeRight}px`,
          top: `${metrics.badgeTop}px`,
          background: '#FF2E7E',
          border: `${metrics.badgeBorder}px solid #0A0A0A`,
          borderRadius: `${metrics.badgeRadius}px`,
          boxShadow: `${metrics.badgeShadow}px ${metrics.badgeShadow}px 0 #0A0A0A`,
          transform: 'rotate(3deg)',
          padding: `${metrics.badgePadY}px ${metrics.badgePadX}px`,
          boxSizing: 'border-box',
          color: '#FFFFFF',
          fontFamily: "'Geist', 'Plus Jakarta Sans', sans-serif",
          fontSize: `${metrics.badgeFontSize}px`,
          fontWeight: 900,
          letterSpacing: '0.08em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          zIndex: 30,
        }}
      >
        KOLEKSI
      </div>

      <div
        style={{
          position: 'absolute',
          left: `${panelLayout.titleLeft}px`,
          top: `${panelLayout.titleTop}px`,
          width: `${panelLayout.titleWidth}px`,
          height: `${panelLayout.titleHeight}px`,
          color: '#0A0A0A',
          fontFamily: "'Geist', 'Plus Jakarta Sans', sans-serif",
          fontSize: `${panelLayout.titleFontSize}px`,
          fontWeight: 900,
          lineHeight: `${panelLayout.titleLineHeight}px`,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          overflow: 'visible',
          zIndex: 5,
        }}
      >
        {panelLayout.titleLines.map((line, index) => (
          <div key={`collection-title-${index}`}>{line}</div>
        ))}
      </div>

      {panelLayout.descriptionVisible && (
        <div
          style={{
            position: 'absolute',
            left: `${metrics.panelLeft}px`,
            top: `${panelLayout.descriptionTop}px`,
            width: `${metrics.panelWidth}px`,
            height: `${panelLayout.descriptionHeight}px`,
            display: 'flex',
            flexDirection: 'column',
            color: '#0A0A0A',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: `${panelLayout.descriptionFontSize}px`,
            fontWeight: 600,
            lineHeight: `${panelLayout.descriptionLineHeight}px`,
            overflow: 'hidden',
            zIndex: 5,
          }}
        >
          {panelLayout.descriptionLines.map((line, index) => (
            <div key={`collection-description-${index}`}>{line}</div>
          ))}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          left: `${panelLayout.pillLeft}px`,
          top: `${panelLayout.pillTop}px`,
          width: `${panelLayout.pillWidth}px`,
          height: `${panelLayout.pillHeight}px`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0A',
          border: '5px solid #0A0A0A',
          borderRadius: '22px',
          boxShadow: '8px 8px 0 #FF2E7E',
          transform: 'rotate(-2deg)',
          color: '#FFD000',
          fontFamily: "'Geist', 'Plus Jakarta Sans', sans-serif",
          fontSize: `${panelLayout.pillFontSize}px`,
          fontWeight: 900,
          letterSpacing: '0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          zIndex: 5,
        }}
      >
        {panelLayout.pillText}
      </div>

      <div
        style={{
          position: 'absolute',
          left: `${metrics.footerInsetX}px`,
          right: `${metrics.footerInsetX}px`,
          top: `${metrics.footerTop}px`,
          height: `${metrics.footerHeight}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#0A0A0A',
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontFamily: "'Geist', 'Plus Jakarta Sans', sans-serif",
            fontSize: `${metrics.footerFontSize}px`,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          Koleksi Pilihan di Sotoy Film
        </span>
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: `${metrics.footerFontSize}px`,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          sotoyfilm.my.id
        </span>
      </div>
    </div>
  );
};

const CollectionSharePreview: React.FC<CollectionSharePreviewProps> = ({
  data,
  variant = 'quick',
  items,
  format = 'story',
}) => {
  const images = data.collectionPreviewImages || data.previewImages || [];
  const storyItems = React.useMemo(
    () => (items !== undefined ? items : buildCollectionStoryItems(data)),
    [data, items]
  );
  const name = data.collectionName || data.title || 'Koleksi';
  const description =
    (data.collectionDescription || data.description || '').trim() ||
    'Koleksi film dan artikel pilihan di Sotoy Film.';
  const itemCount = data.collectionItemCount ?? data.itemCount ?? 0;
  const ownerName =
    data.collectionOwnerName || data.ownerName || data.authorName || 'Pengguna Sotoy';

  if (variant === 'story') {
    const isFeed = format === 'feed';
    return (
      <div className={`relative mx-auto w-[240px] ${isFeed ? 'h-[300px]' : 'h-[426.67px]'} overflow-hidden shadow-2xl rounded-2xl bg-[#FFD000] select-none`}>
        <div
          style={{
            width: '1080px',
            height: isFeed ? '1350px' : '1920px',
            transform: `scale(${240 / 1080})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <CollectionStoryCard data={data} items={storyItems} format={format} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0A0A0A] p-3.5 space-y-3">
      <div className="overflow-hidden rounded-xl">
        <CollectionShareCollage images={images} />
      </div>

      <div className="min-w-0 text-center space-y-2">
        <h4 className="font-display font-black text-base text-white line-clamp-2 leading-snug">
          {name}
        </h4>
        <p className="text-xs text-slate-400 line-clamp-4 leading-relaxed">
          {description}
        </p>
        <div className="inline-flex items-center justify-center bg-[#0A0A0A] border-2 border-[#FFD000] rounded-xl px-4 py-1.5 text-xs font-black text-white">
          {itemCount} Judul
        </div>
        <div className="text-[11px] text-slate-400 font-semibold truncate">
          Koleksi oleh {ownerName}
        </div>
      </div>

      <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-[#FF2E7E] truncate">
          Koleksi Pilihan di Sotoy Film
        </span>
        <span className="text-[10px] text-[#00F0FF] font-mono font-bold shrink-0">
          sotoyfilm.my.id
        </span>
      </div>
    </div>
  );
};

interface SocialShareModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  data?: ShareData | null;
}

type ShareTab = 'quick' | 'ig_story';

interface CollectionStoryExportPayload {
  data: ShareData;
  items: CollectionStoryItem[];
  imageUrls: Array<string | null>;
  logoUrl: string;
  format: 'story' | 'feed';
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  data: propData,
}) => {
  const {
    showToast,
    shareModalData,
    closeShareModal,
    currentUser,
    isLoggedIn,
    shareCollectionToBuzz,
    films,
    articles,
    buzzList,
  } = useApp();
  const [activeTab, setActiveTab] = useState<ShareTab>('quick');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [buzzStoryDataUrl, setBuzzStoryDataUrl] = useState<string | null>(null);
  const [isRenderingBuzzStory, setIsRenderingBuzzStory] = useState(false);
  const buzzCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [articleStoryDataUrl, setArticleStoryDataUrl] = useState<string | null>(
    null
  );
  const [isRenderingArticle, setIsRenderingArticle] = useState(false);
  const articleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isFileShareSupported, setIsFileShareSupported] = useState(false);
  const [collectionExportPayload, setCollectionExportPayload] =
    useState<CollectionStoryExportPayload | null>(null);
  const collectionExportNodeRef = useRef<HTMLDivElement | null>(null);
  const collectionExportResolveRef = useRef<
    ((blob: Blob | null) => void) | null
  >(null);

  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function'
    ) {
      try {
        const dummyFile = new File([''], 'dummy.png', { type: 'image/png' });
        setIsFileShareSupported(navigator.canShare({ files: [dummyFile] }));
      } catch (e) {
        setIsFileShareSupported(false);
      }
    } else {
      setIsFileShareSupported(false);
    }
  }, []);

  const isOpen = propIsOpen !== undefined ? propIsOpen : shareModalData !== null;
  const onClose = propOnClose || closeShareModal;
  const data = propData !== undefined ? propData : shareModalData;

  const [igFormat, setIgFormat] = React.useState<'story' | 'feed'>('story');

  const isCollection = data?.type === 'collection';
  const isPrivateCollection = isCollection && data?.collectionIsPublic === false;
  const posterUrl = data ? data.filmPoster || data.image || data.imageUrl || data.filmBackdrop : undefined;
  const currentUrl = data?.url || (typeof window !== 'undefined' ? window.location.href : '');
  // App user ids are Firebase auth UIDs; guests do not contribute a uid.
  const currentShareUid = isLoggedIn ? currentUser?.id : undefined;
  const collectionStoryItems = React.useMemo(
    () =>
      data?.type === 'collection'
        ? buildCollectionStoryItems(data, { films, articles })
        : [],
    [data, films, articles]
  );

  // Feed/home share buttons use window.location.href, so resolve a real content
  // id from the in-memory catalog before the analytics helper falls back to the URL.
  const analyticsShareData = React.useMemo<ShareData | null>(() => {
    if (!data || data.contentId || data.type === 'collection') return data;

    if (data.type === 'article') {
      const article = articles.find((entry) => entry.title === data.title);
      return article ? { ...data, contentId: article.id } : data;
    }

    if (data.type === 'film' || data.type === 'review') {
      const film = films.find(
        (entry) => entry.title === data.filmTitle || entry.title === data.title
      );
      return film ? { ...data, contentId: film.id } : data;
    }

    if (data.type === 'buzz') {
      const buzzText = data.text.trim();
      const buzz = buzzList.find((entry) => entry.content.trim() === buzzText);
      return buzz ? { ...data, contentId: buzz.id } : data;
    }

    return data;
  }, [data, articles, films, buzzList]);

  // The offscreen DOM card is rendered by the modal, then captured as a PNG.
  // Keeping this effect above the early return preserves hook order.
  useEffect(() => {
    if (!collectionExportPayload) return;

    let cancelled = false;
    const renderAndCapture = async () => {
      let blob: Blob | null = null;
      try {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await document.fonts.ready;
        }
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        const node = collectionExportNodeRef.current;
        if (!node) {
          throw new Error('Collection story export node is not mounted.');
        }

        await waitForImages(node);
        blob = await captureDomToBlob(node, {
          width: 1080,
          // Capture at the same height the offscreen node was laid out at, so
          // the 4:5 feed export is never cropped to a 9:16 frame.
          height: collectionExportPayload.format === 'feed' ? 1350 : 1920,
          pixelRatio: 1,
          backgroundColor: '#FFD000',
          cacheBust: true,
        });
      } catch (err) {
        console.error(
          '[SocialShareModal] Failed to capture collection story:',
          err
        );
      } finally {
        if (!cancelled) {
          const resolve = collectionExportResolveRef.current;
          collectionExportResolveRef.current = null;
          setCollectionExportPayload(null);
          resolve?.(blob);
        }
      }
    };

    void renderAndCapture();

    return () => {
      cancelled = true;
      const resolve = collectionExportResolveRef.current;
      if (resolve) {
        collectionExportResolveRef.current = null;
        resolve(null);
      }
    };
  }, [collectionExportPayload]);

  const captureCollectionStory = (
    payload: CollectionStoryExportPayload
  ): Promise<Blob | null> =>
    new Promise<Blob | null>((resolve) => {
      collectionExportResolveRef.current = resolve;
      setCollectionExportPayload(payload);
    });
  const shareText = data
    ? isCollection
      ? `${data.title}\n\n${data.text || ''}\n\nLihat koleksinya di Sotoy Film:`
      : `${data.title}\n\n${data.text ? data.text.slice(0, 140) + '...' : ''}\n\nBaca selengkapnya di Sotoy Film:`
    : '';
  const igCaption = data
    ? isCollection
      ? isPrivateCollection
        ? `${data.title}\n\n${data.text || ''}\n\nKoleksi pilihan di Sotoy Film.\n\n#SotoyFilm #KoleksiFilm #CinephileIndonesia #FilmIndonesia #PopCulture`
        : `${data.title}\n\n${data.text || ''}\n\nLihat koleksi film dan artikel pilihan ini di: ${currentUrl}\n\n#SotoyFilm #KoleksiFilm #CinephileIndonesia #FilmIndonesia #PopCulture`
      : `${data.title}\n\n"${data.text ? data.text.slice(0, 280) : ''}"\n\n📌 Simak ulasan dan diskusinya di: ${currentUrl}\n\n#SotoyFilm #ReviewFilm #CinephileIndonesia #FilmBagus #PopCulture #DiskusiFilm #KritikFilm`
    : '';

  const handleCopyLink = async () => {
    if (!data) return;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(currentUrl);
        recordShareEvent('copy_link', analyticsShareData, currentShareUid);
        setCopiedLink(true);
        showToast('Tautan berhasil disalin ke clipboard!');
        setTimeout(() => setCopiedLink(false), 2500);
      } catch {
        showToast('Gagal menyalin tautan secara otomatis.');
      }
    } else {
      showToast('Gagal menyalin tautan secara otomatis.');
    }
  };

  const handleCopyCaption = () => {
    if (!data) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(igCaption);
      setCopiedCaption(true);
      showToast('Caption & Hashtag Instagram berhasil disalin!');
      setTimeout(() => setCopiedCaption(false), 2500);
    } else {
      showToast('Gagal menyalin caption.');
    }
  };

  const handleNativeShare = async () => {
    if (!data) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: currentUrl,
        });
        recordShareEvent('native', analyticsShareData, currentShareUid);
        showToast('Berhasil dibagikan via menu sistem!');
        onClose();
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCollectionToBuzz = () => {
    if (!data?.collectionId) return;
    shareCollectionToBuzz(data.collectionId);
    onClose();
  };

  // Helper to load image for canvas without CORS taint issues
  const loadCanvasImage = async (src: string): Promise<HTMLImageElement> => {
    if (!src) {
      console.warn('[loadCanvasImage] Empty image source passed to canvas loader');
      throw new Error('Empty image source');
    }

    // 1. If it's already a data URL or blob URL, load directly
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => {
          console.warn(`[loadCanvasImage] Failed to load data/blob URL (${src.slice(0, 48)}...):`, e);
          reject(new Error('Gagal memuat data/blob URL'));
        };
        img.src = src;
      });
    }

    // 2. Relative URLs (e.g. /logo..., /assets...) -> load directly with crossOrigin anonymous
    if (src.startsWith('/')) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => {
          console.warn(`[loadCanvasImage] Failed to load local asset: "${src}"`, e);
          reject(new Error(`Gagal memuat gambar lokal: ${src}`));
        };
        img.src = src;
      });
    }

    // Determine host for remote URLs
    let isFirebaseOrGoogleStorage = false;
    try {
      const parsed = new URL(src, typeof window !== 'undefined' ? window.location.href : 'https://www.sotoyfilm.my.id');
      const host = parsed.hostname.toLowerCase();
      isFirebaseOrGoogleStorage = host === 'firebasestorage.googleapis.com' || host === 'storage.googleapis.com';
    } catch {
      // Ignore URL parse error and proceed with standard fallbacks
    }

    // 3. For Firebase Storage / Google Storage, try server image-proxy FIRST (avoids known CORS rejections)
    if (isFirebaseOrGoogleStorage) {
      try {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          return await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => {
              console.warn(`[loadCanvasImage] Failed to decode image from proxy blob for "${src}":`, e);
              reject(new Error('Gagal memuat proxy blob'));
            };
            img.src = objectUrl;
          });
        } else {
          console.warn(`[loadCanvasImage] Image proxy returned status ${response.status} for "${src}"`);
        }
      } catch (proxyErr) {
        console.warn(`[loadCanvasImage] Proxy fetch failed for "${src}":`, proxyErr);
      }
    }

    // 4. Try direct fetch as blob with CORS mode (for non-Firebase hosts)
    if (!isFirebaseOrGoogleStorage) {
      try {
        const response = await fetch(src, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          return await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => {
              console.warn(`[loadCanvasImage] Failed to decode CORS blob for "${src}":`, e);
              reject(new Error('Gagal memuat blob'));
            };
            img.src = objectUrl;
          });
        } else {
          console.warn(`[loadCanvasImage] Direct fetch returned status ${response.status} for "${src}"`);
        }
      } catch (corsErr) {
        console.warn(`[loadCanvasImage] Direct CORS fetch failed for "${src}":`, corsErr);
      }

      // 5. Try backend image-proxy endpoint as secondary fallback for non-Firebase hosts
      try {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          return await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => {
              console.warn(`[loadCanvasImage] Failed to decode fallback proxy blob for "${src}":`, e);
              reject(new Error('Gagal memuat proxy blob'));
            };
            img.src = objectUrl;
          });
        } else {
          console.warn(`[loadCanvasImage] Fallback proxy returned status ${response.status} for "${src}"`);
        }
      } catch (proxyErr) {
        console.warn(`[loadCanvasImage] Fallback proxy fetch failed for "${src}":`, proxyErr);
      }
    }

    // 6. Try fetching as Blob with cache-buster
    try {
      const corsUrl = `${src}${src.includes('?') ? '&' : '?'}cors_cb=${Date.now()}`;
      const response = await fetch(corsUrl, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        return await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = (e) => {
            console.warn(`[loadCanvasImage] Failed to decode cache-busted blob for "${src}":`, e);
            reject(new Error('Gagal memuat blob'));
          };
          img.src = objectUrl;
        });
      }
    } catch (cbErr) {
      console.warn(`[loadCanvasImage] Cache-busted fetch failed for "${src}":`, cbErr);
    }

    // 7. Final fallback: Image element with crossOrigin anonymous
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        console.warn(`[loadCanvasImage] Image element crossOrigin failed for "${src}":`, e);
        reject(new Error(`Gagal memuat gambar dengan CORS: ${src}`));
      };
      img.src = src;
    });
  };

  // Draws the same filled + stroked Lucide Star used by the card preview.
  const drawFilmRatingStar = (
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ) => {
    const path = new Path2D(FILM_RATING_STAR_PATH);
    c.save();
    c.translate(x, y);
    c.scale(size / 24, size / 24);
    c.lineWidth = 2;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.fill(path);
    c.stroke(path);
    c.restore();
  };

  // Resolve content type: 'buzz', 'article', 'collection', or 'film' / 'review'
  const isBuzz = data?.type === 'buzz';
  const isArticle = data?.type === 'article';
  const isFilmRating = data
    ? data.type === 'review' ||
      data.type === 'film' ||
      (!isBuzz &&
        !isArticle &&
        !isCollection &&
        (typeof data.rating === 'number' ||
          typeof data.skorSotoy === 'number' ||
          !!data.filmPoster ||
          !!data.filmTitle))
    : false;
  const canShareCollectionToBuzz =
    isCollection && Boolean(data?.collectionId) && currentUser?.id === data?.collectionOwnerId;

  const rawDisplayScore = data
    ? typeof data.rating === 'number'
      ? data.rating
      : typeof data.skorSotoy === 'number'
      ? data.skorSotoy
      : 0
    : 0;
  const hasScore =
    Number.isFinite(rawDisplayScore) && rawDisplayScore > 0;
  const displayScore = hasScore ? Math.min(10, rawDisplayScore) : 0;

  // On-screen preview generator for Buzz Story
  useEffect(() => {
    if (!isOpen || !data || data.type !== 'buzz') {
      setBuzzStoryDataUrl(null);
      buzzCanvasRef.current = null;
      return;
    }

    let cancelled = false;
    setIsRenderingBuzzStory(true);

    const generateBuzzPreview = async () => {
      try {
        const buzzInput = buildBuzzCardInput(data);

        const canvas = await renderBuzzStoryCanvas(buzzInput, {
          loadImage: loadCanvasImage,
          onPhotoLoadFailed: () => {
            showToast('Foto gagal dimuat di story, coba lagi');
          },
        }, igFormat);
        if (!cancelled) {
          buzzCanvasRef.current = canvas;
          const dataUrl = canvas.toDataURL('image/png');
          setBuzzStoryDataUrl(dataUrl);
        }
      } catch (err) {
        console.error('[SocialShareModal] Failed to render buzz story preview:', err);
      } finally {
        if (!cancelled) {
          setIsRenderingBuzzStory(false);
        }
      }
    };

    generateBuzzPreview();

    return () => {
      cancelled = true;
    };
  }, [isOpen, data, activeTab, igFormat]);

  // On-screen preview generator for the Article story/feed canvas. The preview
  // is an <img> of the exact canvas used for the download, so the two match.
  useEffect(() => {
    if (!isOpen || !data || data.type !== 'article') {
      setArticleStoryDataUrl(null);
      articleCanvasRef.current = null;
      return;
    }

    let cancelled = false;
    setIsRenderingArticle(true);

    const generateArticlePreview = async () => {
      try {
        const canvas = await renderArticleShareCanvas(data, igFormat, {
          loadImage: loadCanvasImage,
        });
        if (!cancelled) {
          articleCanvasRef.current = canvas;
          setArticleStoryDataUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.error('[SocialShareModal] Failed to render article preview:', err);
      } finally {
        if (!cancelled) {
          setIsRenderingArticle(false);
        }
      }
    };

    generateArticlePreview();

    return () => {
      cancelled = true;
    };
  }, [isOpen, data, activeTab, igFormat]);

  // Generate high-resolution Instagram Card PNG using Canvas / DOM Capture
  const handleDownloadInstagramVisual = async (format: 'story' | 'feed' = 'story') => {
    if (!data) return;
    const trackInstagramStory = () =>
      recordShareEvent('instagram_story', analyticsShareData, currentShareUid);
    const showInstagramStorySuccess = (message: string) => {
      trackInstagramStory();
      showToast(message);
    };
    setIsGeneratingImage(true);
    try {
      // 0. Collection Story (1080x1920) - one DOM card for preview and export
      if (isCollection) {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await document.fonts.ready;
        }

        const storyItems =
          collectionStoryItems.length > 0
            ? collectionStoryItems
            : buildCollectionStoryItems(data, { films, articles });
        const collectionName = data.collectionName || data.title || 'Koleksi';
        const [imageUrls, logoUrl] = await Promise.all([
          Promise.all(
            storyItems.map((item) => getCollectionImageDataUrl(item.image))
          ),
          getLogoDataUrl(COLLECTION_LOGO_PATH),
        ]);

        const blob = await captureCollectionStory({
          data,
          items: storyItems,
          imageUrls,
          logoUrl,
          format,
        });

        if (!blob) {
          showToast('Gagal membuat gambar story koleksi. Coba lagi.');
          setIsGeneratingImage(false);
          return;
        }

        const fileName = `sotoyfilm-collection-${format}-${Date.now()}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        const isMobileDevice =
          typeof navigator !== 'undefined' &&
          navigator.maxTouchPoints > 0 &&
          typeof window !== 'undefined' &&
          window.matchMedia('(pointer: coarse)').matches;
        const canShareFiles =
          isMobileDevice &&
          typeof navigator.share === 'function' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] });

        let sharedViaSheet = false;
        if (canShareFiles) {
          try {
            await navigator.share({
              files: [file],
              title: `Sotoy Film - ${collectionName}`,
            });
            sharedViaSheet = true;
            showInstagramStorySuccess(
              format === 'feed'
                ? 'Gambar Feed (.PNG) siap disimpan ke galeri foto!'
                : 'Gambar Story (.PNG) siap disimpan ke galeri foto!'
            );
          } catch (shareErr: any) {
            if (
              shareErr?.name === 'AbortError' ||
              shareErr?.message?.toLowerCase().includes('abort') ||
              shareErr?.message?.toLowerCase().includes('cancel')
            ) {
              return;
            }
            console.warn('[SocialShareModal] Native share failed, falling back to direct download:', shareErr);
          }
        }

        if (!sharedViaSheet) {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = fileName;
          link.href = blobUrl;
          link.click();
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 1000);

          showInstagramStorySuccess(
            format === 'feed'
              ? 'Gambar Feed (.PNG) berhasil diunduh! Siap diunggah ke Instagram Feed.'
              : 'Gambar Story (.PNG) berhasil diunduh! Siap diunggah ke Instagram Stories.'
          );
        }
        return;
      }

      // 1. Buzz Story/Feed (Threads-style) - Uses renderBuzzStoryCanvas directly
      if (isBuzz) {
        const expectedBuzzHeight = format === 'feed' ? 1350 : 1920;
        let canvas = buzzCanvasRef.current;
        if (!canvas || canvas.height !== expectedBuzzHeight) {
          canvas = await renderBuzzStoryCanvas(
            buildBuzzCardInput(data),
            {
              loadImage: loadCanvasImage,
              onPhotoLoadFailed: () => {
                showToast('Foto gagal dimuat di story, coba lagi');
              },
            },
            format
          );
          buzzCanvasRef.current = canvas;
        }

        if (!canvas) {
          throw new Error('Gagal merender kanvas buzz.');
        }

        const currentCanvas = canvas;
        const blob = await new Promise<Blob | null>((resolve) => {
          currentCanvas.toBlob((b: Blob | null) => resolve(b), 'image/png');
        });

        if (!blob) {
          throw new Error('Gagal mengonversi kanvas buzz menjadi gambar.');
        }

        const fileName = `sotoyfilm-buzz-${format}-${Date.now()}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        const isMobileDevice =
          typeof navigator !== 'undefined' &&
          navigator.maxTouchPoints > 0 &&
          typeof window !== 'undefined' &&
          window.matchMedia('(pointer: coarse)').matches;

        const canShareFiles =
          isMobileDevice &&
          typeof navigator.share === 'function' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] });

        let sharedViaSheet = false;
        if (canShareFiles) {
          try {
            const shareTitle = `Sotoy Film - ${data.title || 'Buzz Story'}`;
            await navigator.share({
              files: [file],
              title: shareTitle,
            });
            sharedViaSheet = true;
            showInstagramStorySuccess('Gambar Story (.PNG) siap disimpan ke galeri foto!');
          } catch (shareErr: any) {
            if (
              shareErr?.name === 'AbortError' ||
              shareErr?.message?.toLowerCase().includes('abort') ||
              shareErr?.message?.toLowerCase().includes('cancel')
            ) {
              return;
            }
            console.warn('[SocialShareModal] Native share failed, falling back to direct download:', shareErr);
          }
        }

        if (!sharedViaSheet) {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = fileName;
          link.href = blobUrl;
          link.click();
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 1000);

          showInstagramStorySuccess('Gambar Story (.PNG) berhasil diunduh! Siap diunggah ke Instagram Stories.');
        }
        return;
      }

      // 2. Article Story/Feed (9:16 or 4:5) - shared canvas renderer
      if (isArticle) {
        const expectedArticleHeight = format === 'feed' ? 1350 : 1920;
        let canvas = articleCanvasRef.current;
        if (!canvas || canvas.height !== expectedArticleHeight) {
          canvas = await renderArticleShareCanvas(data, format, {
            loadImage: loadCanvasImage,
          });
          articleCanvasRef.current = canvas;
        }

        if (!canvas) {
          throw new Error('Gagal merender kanvas artikel.');
        }

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b: Blob | null) => resolve(b), 'image/png');
        });

        if (!blob) {
          throw new Error('Gagal mengonversi kanvas artikel menjadi gambar.');
        }

        const fileName = `sotoyfilm-article-${format}-${Date.now()}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        const isMobileDevice =
          typeof navigator !== 'undefined' &&
          navigator.maxTouchPoints > 0 &&
          typeof window !== 'undefined' &&
          window.matchMedia('(pointer: coarse)').matches;
        const canShareFiles =
          isMobileDevice &&
          typeof navigator.share === 'function' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] });

        let sharedViaSheet = false;
        if (canShareFiles) {
          try {
            const shareTitle = `Sotoy Film - ${data.title || 'Artikel'}`;
            await navigator.share({
              files: [file],
              title: shareTitle,
            });
            sharedViaSheet = true;
            showInstagramStorySuccess('Gambar Story (.PNG) siap disimpan ke galeri foto!');
          } catch (shareErr: any) {
            if (
              shareErr?.name === 'AbortError' ||
              shareErr?.message?.toLowerCase().includes('abort') ||
              shareErr?.message?.toLowerCase().includes('cancel')
            ) {
              return;
            }
            console.warn('[SocialShareModal] Native share failed, falling back to direct download:', shareErr);
          }
        }

        if (!sharedViaSheet) {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = fileName;
          link.href = blobUrl;
          link.click();
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 1000);

          showInstagramStorySuccess(
            format === 'story'
              ? 'Gambar Story (.PNG) berhasil diunduh! Siap diunggah ke Instagram Stories.'
              : 'Gambar Feed (.PNG) berhasil diunduh! Siap diunggah ke Instagram Feed.'
          );
        }
        return;
      }

      // 3. Film Rating Story/Feed - direct canvas rendering from the shared layout
      if (isFilmRating) {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await document.fonts.ready;
        }

        const width = 1080;
        const height = format === 'feed' ? 1350 : 1920;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          showToast('Gagal menginisialisasi perender visual.');
          setIsGeneratingImage(false);
          return;
        }

        const metrics = getFilmShareLayoutMetrics(format);
        const sidePad = 60;

        // Base solid background (#0A0A0A)
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, 0, width, height);

        // 1. Full-bleed poster, anchored to the top of the key art.
        const filmPosterUrl =
          data.filmPoster || data.image || data.imageUrl || data.filmBackdrop;
        let posterLoaded = false;
        if (filmPosterUrl) {
          try {
            const posterImg = await loadCanvasImage(filmPosterUrl);
            posterLoaded = true;

            const imgAspect = posterImg.width / posterImg.height;
            const canvasAspect = width / height;

            let sx = 0;
            let sy = 0;
            let sWidth = posterImg.width;
            let sHeight = posterImg.height;
            if (imgAspect > canvasAspect) {
              sWidth = posterImg.height * canvasAspect;
              sx = (posterImg.width - sWidth) / 2;
            } else {
              sHeight = posterImg.width / canvasAspect;
              sy = 0;
            }

            ctx.drawImage(posterImg, sx, sy, sWidth, sHeight, 0, 0, width, height);
          } catch (posterErr) {
            console.warn(
              '[SocialShareModal] Poster load failed for canvas, using solid placeholder:',
              posterErr
            );
          }
        }

        if (!posterLoaded) {
          ctx.fillStyle = '#171717';
          ctx.fillRect(0, 0, width, height);
        }

        // Top scrim keeps the wordmark and badge legible on the art.
        const topScrimH = Math.round(320 * (height / 1920));
        const topScrim = ctx.createLinearGradient(0, 0, 0, topScrimH);
        topScrim.addColorStop(0, 'rgba(10, 10, 10, 0.85)');
        topScrim.addColorStop(1, 'rgba(10, 10, 10, 0)');
        ctx.fillStyle = topScrim;
        ctx.fillRect(0, 0, width, topScrimH);

        // Per-format scrim blends the poster into the copy below.
        const scrim = ctx.createLinearGradient(0, 0, 0, height);
        for (const stop of metrics.scrimStops) {
          scrim.addColorStop(stop.at, stop.color);
        }
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, width, height);

        // 2. Header: logo left, badge right.
        const topPad = 110;
        const logoTargetW = 380;
        let logoTargetH = 95;

        try {
          const logoImg = await loadCanvasImage(
            '/v2_sotoyfilm full logo transparent.PNG'
          );
          logoTargetH = logoImg.height * (logoTargetW / logoImg.width);
          ctx.drawImage(logoImg, sidePad, topPad, logoTargetW, logoTargetH);
        } catch (logoErr) {
          console.warn(
            '[SocialShareModal] Could not load /v2_sotoyfilm full logo transparent.PNG for canvas:',
            logoErr
          );
          ctx.fillStyle = '#FF2E7E';
          ctx.font = "900 48px 'Geist', 'Plus Jakarta Sans', sans-serif";
          ctx.textAlign = 'left';
          ctx.fillText('SOTOY FILM', sidePad, topPad + 58);
          logoTargetH = 80;
        }

        const badgeText = 'SKOR & ULASAN';
        const badgeFont = "900 28px 'Geist', 'Plus Jakarta Sans', sans-serif";
        ctx.font = badgeFont;
        const badgeTextW = ctx.measureText(badgeText).width;
        const badgeH = 60;
        const badgePadX = 28;
        const badgeBorder = 2;
        const badgeW = badgeTextW + badgePadX * 2 + badgeBorder * 2;
        const badgeX = width - sidePad - badgeW;
        const logoCenterY = topPad + logoTargetH / 2;
        const badgeY = logoCenterY - badgeH / 2;

        ctx.save();
        ctx.fillStyle = '#0A0A0A';
        ctx.strokeStyle = '#FF2E7E';
        ctx.lineWidth = badgeBorder;
        drawRoundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FF2E7E';
        ctx.font = badgeFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
        ctx.restore();

        // 3. Copy block, bottom-anchored inside the per-format bounds.
        const measure: TextMeasure = (font, text) => {
          ctx.font = font;
          return ctx.measureText(text).width;
        };
        const layout = buildFilmShareLayout(
          data,
          displayScore,
          hasScore,
          measure,
          format
        );
        const rating = layout.rating;

        let avatarImg: HTMLImageElement | null = null;
        if (layout.hasReviewer) {
          const rawAvatar = data.reviewerAvatar || data.authorAvatar;
          if (rawAvatar) {
            try {
              avatarImg = await loadCanvasImage(rawAvatar);
            } catch {
              // fall back to the text-only reviewer row
            }
          }
        }

        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `900 ${layout.titleFontSize}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
        layout.titleLines.forEach((line, index) => {
          ctx.fillText(line, width / 2, layout.titleTop + index * layout.titleLineHeight);
        });

        if (layout.hasDirector) {
          ctx.fillStyle = '#E2E8F0';
          ctx.font = `700 ${layout.directorFontSize}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
          ctx.fillText(layout.directorText, width / 2, layout.directorTop);
        }

        if (layout.metaText) {
          ctx.fillStyle = '#FF2E7E';
          ctx.font = `800 ${layout.metaFontSize}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
          ctx.fillText(layout.metaText, width / 2, layout.metaTop);
        }

        // Rating pill, identical construction to the DOM preview.
        const scoreStr = displayScore.toFixed(1);
        const scoreFont = `900 ${rating.scoreFont}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
        const denomFont = `700 ${rating.denomFont}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
        const emptyFont = `700 ${rating.emptyFont}px 'Geist', 'Plus Jakarta Sans', sans-serif`;

        ctx.font = scoreFont;
        const scoreW = hasScore ? ctx.measureText(scoreStr).width : 0;
        ctx.font = denomFont;
        const denomW = hasScore ? ctx.measureText('/10').width : 0;
        ctx.font = emptyFont;
        const emptyScoreW = hasScore ? 0 : ctx.measureText('Belum ada skor').width;

        const ratingContentW = hasScore
          ? rating.starSize + rating.gap + scoreW + rating.gap + denomW
          : emptyScoreW;
        const ratingBoxW = Math.ceil(
          ratingContentW + rating.padX * 2 + rating.border * 2
        );
        const ratingBoxX = (width - ratingBoxW) / 2;
        const ratingBoxY = layout.ratingTop;

        ctx.fillStyle = '#0A0A0A';
        ctx.strokeStyle = hasScore ? '#FFD000' : '#64748B';
        ctx.lineWidth = rating.border;
        drawRoundRectPath(
          ctx,
          ratingBoxX,
          ratingBoxY,
          ratingBoxW,
          rating.boxHeight,
          rating.radius
        );
        ctx.fill();
        ctx.stroke();

        ctx.textBaseline = 'middle';
        const ratingCenterY = ratingBoxY + rating.boxHeight / 2;
        if (hasScore) {
          let contentX = ratingBoxX + rating.border + rating.padX;
          ctx.fillStyle = '#FFD000';
          ctx.strokeStyle = '#FFD000';
          drawFilmRatingStar(
            ctx,
            contentX,
            ratingCenterY - rating.starSize / 2,
            rating.starSize
          );
          contentX += rating.starSize + rating.gap;

          ctx.fillStyle = '#FFFFFF';
          ctx.font = scoreFont;
          ctx.textAlign = 'left';
          ctx.fillText(scoreStr, contentX, ratingCenterY);
          contentX += scoreW + rating.gap;

          ctx.fillStyle = '#94A3B8';
          ctx.font = denomFont;
          ctx.textAlign = 'left';
          ctx.fillText('/10', contentX, ratingCenterY);
        } else {
          ctx.fillStyle = '#94A3B8';
          ctx.font = emptyFont;
          ctx.textAlign = 'center';
          ctx.fillText('Belum ada skor', width / 2, ratingCenterY);
        }
        ctx.textBaseline = 'top';

        if (layout.hasReviewer) {
          const reviewerFont = `700 ${layout.reviewerFontSize}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
          ctx.font = reviewerFont;
          const textW = ctx.measureText(layout.reviewerText).width;
          const avatarSize = 44;
          const avatarGap = 12;
          const rowW = avatarImg ? avatarSize + avatarGap + textW : textW;
          const startX = (width - rowW) / 2;
          const rowCenterY = layout.reviewerTop + layout.reviewerLineHeight / 2;

          if (avatarImg) {
            const avatarCenterY = rowCenterY;
            ctx.save();
            ctx.beginPath();
            ctx.arc(
              startX + avatarSize / 2,
              avatarCenterY,
              avatarSize / 2,
              0,
              Math.PI * 2
            );
            ctx.closePath();
            ctx.clip();
            const iw = avatarImg.width || 1;
            const ih = avatarImg.height || 1;
            const coverScale = Math.max(avatarSize / iw, avatarSize / ih);
            const sw = avatarSize / coverScale;
            const sh = avatarSize / coverScale;
            ctx.drawImage(
              avatarImg,
              (iw - sw) / 2,
              (ih - sh) / 2,
              sw,
              sh,
              startX,
              rowCenterY - avatarSize / 2,
              avatarSize,
              avatarSize
            );
            ctx.restore();

            ctx.save();
            ctx.strokeStyle = '#FF2E7E';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
              startX + avatarSize / 2,
              avatarCenterY,
              avatarSize / 2,
              0,
              Math.PI * 2
            );
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = '#E2E8F0';
            ctx.font = reviewerFont;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              layout.reviewerText,
              startX + avatarSize + avatarGap,
              rowCenterY
            );
            ctx.textBaseline = 'top';
          } else {
            ctx.fillStyle = '#E2E8F0';
            ctx.font = reviewerFont;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(layout.reviewerText, width / 2, rowCenterY);
            ctx.textBaseline = 'top';
          }
        }

        // 4. Footer inside the per-format bounds.
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sidePad, layout.footerDividerY);
        ctx.lineTo(width - sidePad, layout.footerDividerY);
        ctx.stroke();

        ctx.fillStyle = '#FF2E7E';
        ctx.font = "700 20px 'Geist', 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(
          'Ulas & Nilai Film di Sotoy Film',
          sidePad,
          layout.footerTextY
        );

        ctx.fillStyle = '#00F0FF';
        ctx.font = "700 20px 'Geist Mono', monospace";
        ctx.textAlign = 'right';
        ctx.fillText('sotoyfilm.my.id', width - sidePad, layout.footerTextY);

        // Export Canvas to PNG Blob
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (!blob) {
          throw new Error('Gagal mengonversi kanvas visual menjadi gambar.');
        }

        const fileName = `sotoyfilm-rating-${format}-${Date.now()}.png`;

        // Native share (mobile only) / download fallback
        const file = new File([blob], fileName, { type: 'image/png' });
        const isMobileDevice =
          typeof navigator !== 'undefined' &&
          navigator.maxTouchPoints > 0 &&
          typeof window !== 'undefined' &&
          window.matchMedia('(pointer: coarse)').matches;
        const canShareFiles =
          isMobileDevice &&
          typeof navigator.share === 'function' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] });

        let sharedViaSheet = false;

        if (canShareFiles) {
          try {
            const shareTitle = `Sotoy Film - ${data.filmTitle || data.title || 'Visual Card'}`;
            await navigator.share({
              files: [file],
              title: shareTitle,
            });
            sharedViaSheet = true;
            showInstagramStorySuccess('Gambar Story (.PNG) siap disimpan ke galeri foto!');
          } catch (shareErr: any) {
            if (
              shareErr?.name === 'AbortError' ||
              shareErr?.message?.toLowerCase().includes('abort') ||
              shareErr?.message?.toLowerCase().includes('cancel')
            ) {
              return;
            }
            console.warn('[SocialShareModal] Native share failed, falling back to direct download:', shareErr);
          }
        }

        if (!sharedViaSheet) {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = fileName;
          link.href = blobUrl;
          link.click();
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 1000);

          showInstagramStorySuccess(
            format === 'story'
              ? 'Gambar Story (.PNG) berhasil diunduh! Siap diunggah ke Instagram Stories.'
              : 'Gambar Feed (.PNG) berhasil diunduh! Siap diunggah ke Instagram Feed.'
          );
        }
        return;
      }

      // Every supported share type (collection, buzz, article, film/review)
      // returns above, so this is a defensive guard only. There is exactly one
      // film renderer (the branch above); the legacy generic film card is gone.
      console.warn(
        '[SocialShareModal] Unsupported share payload type:',
        data.type
      );
      showToast('Format gambar share ini belum didukung.');
    } catch (err) {
      console.error(err);
      showToast('Gagal membuat gambar otomatis.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (!isOpen || !data) return null;

  const shareLinks = [
    {
      name: 'WhatsApp',
      color: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      ),
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + currentUrl)}`,
    },
    {
      name: 'X (Twitter)',
      color: 'bg-slate-900 hover:bg-black text-white border border-slate-700',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(data.title)}&url=${encodeURIComponent(currentUrl)}`,
    },
    {
      name: 'Telegram',
      color: 'bg-[#229ED9] hover:bg-[#1E88E5] text-white',
      icon: <Send className="w-3.5 h-3.5" />,
      url: `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(data.title)}`,
    },
    {
      name: 'Facebook',
      color: 'bg-[#1877F2] hover:bg-[#166FE5] text-white',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
    },
  ];

  return (
    <div
      id="social-share-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center"
    >
      <div
        id="social-share-modal"
        className="relative my-auto w-full max-w-lg bg-[#171717] border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF2E7E] via-[#e0266e] to-[#FF2E7E] p-0.5 shadow-md shadow-sm">
              <div className="w-full h-full bg-[#171717] rounded-[10px] flex items-center justify-center text-[#FF2E7E]">
                <Share2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base">
                {isCollection ? 'Bagikan Koleksi' : 'Bagikan Konten'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isCollection
                  ? 'Bagikan koleksi ke Buzz atau simpan sebagai gambar Story'
                  : 'Opsi share WhatsApp, Twitter, atau Instagram Stories'}
              </p>
            </div>
          </div>

          <button
            id="close-share-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div
          className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto scrollbar-none flex-nowrap scroll-smooth touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
              activeTab === 'quick'
                ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Bagikan Cepat</span>
          </button>

          <button
            onClick={() => setActiveTab('ig_story')}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
              activeTab === 'ig_story'
                ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>IG Stories</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: QUICK SHARE (WHATSAPP, X, TELEGRAM, FACEBOOK, COPY LINK) */}
        {/* ========================================================================= */}
        {activeTab === 'quick' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Item Preview Card */}
            {isCollection ? (
              <CollectionSharePreview data={data} />
            ) : (
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-3">
              {data.filmPoster || data.image || data.imageUrl ? (
                <img
                  src={data.filmPoster || data.image || data.imageUrl}
                  alt={data.title}
                  className={`rounded-xl object-cover shrink-0 border border-white/10 ${
                    isFilmRating ? 'w-14 h-20 shadow-md border-amber-500/30' : 'w-14 h-14'
                  }`}
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-[#FF2E7E] shrink-0">
                  <Film className="w-6 h-6" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                {isFilmRating && (
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span
                      className={`bg-[#0A0A0A] text-white border-2 text-[11px] font-black px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${
                        hasScore ? 'border-[#FFD000]' : 'border-slate-600'
                      }`}
                    >
                      {hasScore ? (
                        <>
                          <Star className="w-3.5 h-3.5 text-[#FFD000] fill-current" />
                          <span>{displayScore.toFixed(1)}</span>
                          <span className="text-slate-400 text-[9px]">/10</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Belum ada skor</span>
                      )}
                    </span>
                  </div>
                )}
                <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                  {data.filmTitle || data.title}
                </h4>
                {data.meta && (
                  <span className="text-[10px] text-slate-400 mt-0.5 inline-block truncate">
                    {data.meta}
                  </span>
                )}
                <div className="text-[10px] text-[#FF2E7E] font-semibold mt-1">
                  sotoyfilm.id
                </div>
              </div>
            </div>
            )}

            {isCollection && data.collectionIsPublic === false ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1">
                <div className="text-xs font-bold text-amber-300">Koleksi ini privat</div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Tautan publik tidak tersedia.{' '}
                  {canShareCollectionToBuzz
                    ? 'Kamu tetap dapat membagikannya ke Buzz sebagai snapshot koleksi.'
                    : 'Hanya pemilik koleksi yang dapat membagikannya ke Buzz.'}
                </p>
              </div>
            ) : (
              <>
            {/* Social Share Buttons Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {shareLinks.map(platform => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    const sharePlatform = mapShareLinkName(platform.name);
                    if (sharePlatform) {
                      recordShareEvent(sharePlatform, analyticsShareData, currentShareUid);
                    }
                    showToast(`Membuka ${platform.name}...`);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition-transform hover:scale-[1.02] shadow-md ${platform.color}`}
                >
                  {platform.icon}
                  <span>{platform.name}</span>
                </a>
              ))}
            </div>

            {/* Native Share button */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                onClick={handleNativeShare}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 hover:border-[#FF2E7E] text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-[#FF2E7E]" />
                <span>Bagikan via Menu Sistem HP (Native Share)</span>
              </button>
            )}

            {/* Direct Copy Link */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-medium text-slate-400">Salin tautan langsung:</label>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 pl-3">
                <span className="text-xs text-slate-300 truncate flex-1 font-mono">
                  {currentUrl}
                </span>
                <button
                  id="share-copy-link-btn"
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    copiedLink
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                      : 'bg-[#FF2E7E] text-black hover:bg-[#00d0e0]'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
              </>
            )}

            {canShareCollectionToBuzz && (
              <button
                type="button"
                onClick={handleCollectionToBuzz}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FF2E7E]/15 border border-[#FF2E7E]/35 hover:bg-[#FF2E7E]/25 hover:border-[#FF2E7E] text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#FF2E7E]" />
                <span>Bagikan ke Buzz</span>
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INSTAGRAM STORIES (9:16 VERTICAL CINEMATIC CARD) */}
        {/* ========================================================================= */}
        {activeTab === 'ig_story' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Format Selector: IG Stories (9:16) vs IG Feed (4:5) */}
            <div className="flex items-center gap-2 bg-[#121422] p-1.5 rounded-xl border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIgFormat('story')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  igFormat === 'story'
                    ? 'bg-[#FF2E7E] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>IG Stories (9:16)</span>
              </button>
              <button
                type="button"
                onClick={() => setIgFormat('feed')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  igFormat === 'feed'
                    ? 'bg-[#FF2E7E] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>IG Feed (4:5)</span>
              </button>
            </div>

            {/* Visual Story Card Preview */}
            {isCollection ? (
              <CollectionSharePreview
                data={data}
                variant="story"
                items={collectionStoryItems}
                format={igFormat}
              />
            ) : isFilmRating ? (
              <div className={`relative mx-auto w-[270px] ${igFormat === 'feed' ? 'h-[337.5px]' : 'h-[480px]'} overflow-hidden shadow-2xl rounded-2xl bg-[#0A0A0A] select-none`}>
                <div
                  style={{
                    width: '1080px',
                    height: igFormat === 'feed' ? '1350px' : '1920px',
                    transform: 'scale(0.25)',
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                >
                  <FilmRatingStoryCard
                    data={data}
                    displayScore={displayScore}
                    hasScore={hasScore}
                    posterUrl={posterUrl}
                    reviewerAvatarUrl={data.reviewerAvatar || data.authorAvatar}
                    format={igFormat}
                  />
                </div>
              </div>
            ) : isBuzz ? (
              <div className={`relative mx-auto w-[270px] ${igFormat === 'feed' ? 'aspect-[4/5]' : 'aspect-[9/16]'} rounded-2xl overflow-hidden shadow-2xl bg-neutral-900 flex items-center justify-center border border-white/10 select-none`}>
                {isRenderingBuzzStory || !buzzStoryDataUrl ? (
                  <div className="flex flex-col items-center justify-center gap-2.5 p-6 text-center">
                    <Sparkles className="w-7 h-7 text-[#FF2E7E] animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Membuat Story Card...</span>
                  </div>
                ) : (
                  <img
                    src={buzzStoryDataUrl}
                    alt="Buzz Story Preview"
                    className="w-full h-full object-contain rounded-2xl"
                  />
                )}
              </div>
            ) : isArticle ? (
              <div className={`relative mx-auto w-[270px] ${igFormat === 'feed' ? 'aspect-[4/5]' : 'aspect-[9/16]'} rounded-2xl overflow-hidden shadow-2xl bg-neutral-900 flex items-center justify-center border border-white/10 select-none`}>
                {isRenderingArticle || !articleStoryDataUrl ? (
                  <div className="flex flex-col items-center justify-center gap-2.5 p-6 text-center">
                    <Sparkles className="w-7 h-7 text-[#FF2E7E] animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Membuat Story Card...</span>
                  </div>
                ) : (
                  <img
                    src={articleStoryDataUrl}
                    alt="Article Story Preview"
                    className="w-full h-full object-contain rounded-2xl"
                  />
                )}
              </div>
            ) : (
              <div
                className={`relative mx-auto w-[240px] ${igFormat === 'feed' ? 'aspect-[4/5]' : 'aspect-[9/16]'} rounded-2xl overflow-hidden bg-gradient-to-b from-[#15162b] via-[#10111e] to-[#090a10] border border-[#FF2E7E]/40 shadow-2xl p-4 flex flex-col justify-between text-left`}
              >
                {/* Top watermark */}
                <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[9px] font-black tracking-widest text-[#FF2E7E] uppercase">
                    Sotoy Film
                  </span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded font-bold text-slate-300 bg-white/10">
                    STORIES
                  </span>
                </div>

                {/* Center Content */}
                <div className="relative z-10 py-1 space-y-2 overflow-hidden flex-1 flex flex-col justify-center">
                  <h4 className="font-display font-black text-xs text-white leading-tight line-clamp-3">
                    {data.title}
                  </h4>
                  {data.text && (
                    <p className="text-[9px] text-slate-300 line-clamp-2 leading-snug">
                      {data.text}
                    </p>
                  )}
                </div>

                {/* Bottom footer */}
                <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[8px] font-bold text-[#FF2E7E] truncate max-w-[140px]">
                    ★ {data.meta || 'Sotoy Film'}
                  </span>
                  <span className="text-[8px] text-cyan-400 font-mono">
                    sotoyfilm.my.id
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons for IG Stories */}
            <div className="space-y-2 pt-1">
              <button
                id="download-ig-story-card-btn"
                onClick={() => handleDownloadInstagramVisual(igFormat)}
                disabled={isGeneratingImage}
                className="w-full py-3 bg-[#FF2E7E] hover:brightness-110 active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sm flex flex-col items-center justify-center gap-0.5 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>
                    {isGeneratingImage
                      ? 'Membuat Gambar...'
                      : isFileShareSupported
                      ? 'Bagikan ke Instagram'
                      : igFormat === 'story'
                      ? 'Unduh Gambar Story (PNG 9:16)'
                      : 'Unduh Gambar Feed (PNG 4:5)'}
                  </span>
                </div>
                {isFileShareSupported && !isGeneratingImage && (
                  <span className="text-[9px] lowercase font-normal opacity-90 normal-case">
                    (atau simpan sebagai gambar)
                  </span>
                )}
              </button>

              <button
                onClick={handleCopyCaption}
                className="w-full py-2.5 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCaption ? 'Caption Tersalin' : 'Salin Caption & Tagar'}</span>
              </button>

              {!isFileShareSupported && (
                <div className="text-[11px] text-slate-400 text-center bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-xl leading-relaxed">
                  Setelah diunduh, buka <strong className="text-white">Instagram &gt; Story &gt; pilih gambar</strong> dari galeri.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {collectionExportPayload && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-20000px',
            top: 0,
            width: '1080px',
            height: `${collectionExportPayload.format === 'feed' ? 1350 : 1920}px`,
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          <div
            ref={collectionExportNodeRef}
            style={{ width: '1080px', height: `${collectionExportPayload.format === 'feed' ? 1350 : 1920}px` }}
          >
            <CollectionStoryCard
              data={collectionExportPayload.data}
              items={collectionExportPayload.items}
              imageUrlsForExport={collectionExportPayload.imageUrls}
              logoUrlForExport={collectionExportPayload.logoUrl}
              format={collectionExportPayload.format}
            />
          </div>
        </div>
      )}
    </div>
  );
};
