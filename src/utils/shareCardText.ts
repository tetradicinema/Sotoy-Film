/**
 * Pure helpers shared by the SocialShareModal previews and their 1080x1920
 * canvas renderers. Keeping the text decisions here means the on-screen card
 * and the exported PNG use the same copy, line wrapping, font fitting, and
 * vertical budget.
 */

export interface ShareReviewAudienceCounts {
  critic: number;
  community: number;
}

export interface WrappedShareText {
  lines: string[];
  truncated: boolean;
}

export interface ShareLayoutBlock {
  height: number;
  gapBefore?: number;
}

export interface ShareLayoutInput {
  availableTop: number;
  availableBottom: number;
  blocks: ShareLayoutBlock[];
  /** 0 = top aligned, 1 = bottom aligned, 0.5 = balanced. */
  bias?: number;
}

export interface ShareLayoutBudget {
  availableSpace: number;
  contentHeight: number;
  startY: number;
  endY: number;
  fits: boolean;
  overflow: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Accepts only finite, non-negative whole counts. */
export function normalizeShareCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * Builds the community line for a film share:
 * "N Reviews Kritikus Sotoy & M Reviews Warga Sotoy".
 * Returns null when there is nothing to show. A count of one uses the
 * singular "Review" while larger counts use "Reviews".
 */
export function formatReviewCountsLine(
  critic: number,
  community: number
): string | null {
  const criticCount = normalizeShareCount(critic);
  const communityCount = normalizeShareCount(community);

  if (criticCount === 0 && communityCount === 0) return null;

  const criticLabel = `${criticCount} ${
    criticCount === 1 ? 'Review' : 'Reviews'
  } Kritikus Sotoy`;
  const communityLabel = `${communityCount} ${
    communityCount === 1 ? 'Review' : 'Reviews'
  } Warga Sotoy`;

  return `${criticLabel} & ${communityLabel}`;
}

/**
 * Returns the largest font size between `minSize` and `baseSize` that fits
 * the supplied measured text width inside `maxWidth`.
 */
export function fitFontSize(
  textWidthAtBase: number,
  maxWidth: number,
  baseSize: number,
  minSize: number
): number {
  const base = Number.isFinite(baseSize) && baseSize > 0 ? baseSize : 0;
  if (base === 0) return 0;

  const minimum =
    Number.isFinite(minSize) && minSize > 0 ? Math.min(minSize, base) : base;

  if (!Number.isFinite(textWidthAtBase) || textWidthAtBase <= 0) return base;
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return minimum;

  const scaled = base * (maxWidth / textWidthAtBase);
  if (scaled >= base) return base;

  return Math.round(clamp(scaled, minimum, base));
}

/**
 * Greedy word wrapping with a hard maximum line count. When the copy runs
 * longer than `maxLines`, the final line receives an ellipsis that is kept
 * inside `maxWidth`. The measure callback is supplied by the caller because
 * the DOM preview and the canvas use different text engines.
 */
export function wrapShareText(
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (value: string) => number
): WrappedShareText {
  const normalized = typeof text === 'string' ? text.trim() : '';
  if (!normalized || !Number.isFinite(maxWidth) || maxWidth <= 0 || maxLines <= 0) {
    return { lines: [], truncated: false };
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [], truncated: false };

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (measure(word) > maxWidth) {
      if (current) {
        lines.push(current);
        current = '';
      }
      let remainder = word;
      while (remainder.length > 0) {
        let chunkLength = remainder.length;
        while (
          chunkLength > 1 &&
          measure(remainder.slice(0, chunkLength)) > maxWidth
        ) {
          chunkLength -= 1;
        }
        lines.push(remainder.slice(0, chunkLength));
        remainder = remainder.slice(chunkLength);
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (!current || measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);

  if (lines.length <= maxLines) {
    return { lines, truncated: false };
  }

  const visible = lines.slice(0, maxLines);
  let lastLine = visible[visible.length - 1];
  const withEllipsis = (value: string) =>
    `${value.replace(/[.,:;!?…-]+$/g, '').trimEnd()}...`;

  if (measure(withEllipsis(lastLine)) <= maxWidth) {
    visible[visible.length - 1] = withEllipsis(lastLine);
    return { lines: visible, truncated: true };
  }

  while (lastLine.includes(' ')) {
    lastLine = lastLine.slice(0, lastLine.lastIndexOf(' ')).trimEnd();
    if (measure(withEllipsis(lastLine)) <= maxWidth) {
      visible[visible.length - 1] = withEllipsis(lastLine);
      return { lines: visible, truncated: true };
    }
  }

  while (lastLine.length > 1 && measure(withEllipsis(lastLine)) > maxWidth) {
    lastLine = lastLine.slice(0, -1);
  }
  visible[visible.length - 1] = withEllipsis(lastLine);
  return { lines: visible, truncated: true };
}

/**
 * Classifies existing rating/review rows into the two public review audiences.
 * Only the requested roles are counted; unknown or legacy roles stay out of
 * both totals so callers can apply their own fallback.
 */
export function countReviewAudiences(
  reviews: Array<{ userRole?: string | null }> | null | undefined
): ShareReviewAudienceCounts {
  const counts: ShareReviewAudienceCounts = { critic: 0, community: 0 };

  for (const review of reviews || []) {
    const role = (review?.userRole || '').toLowerCase().trim();
    if (role === 'penulis_sotoy' || role === 'admin') {
      counts.critic += 1;
    } else if (role === 'warga_sotoy') {
      counts.community += 1;
    }
  }

  return counts;
}

/**
 * Returns a balanced vertical placement for the measured blocks while keeping
 * the block bottom inside the available range whenever the content fits.
 */
export function getShareLayoutBudget({
  availableTop,
  availableBottom,
  blocks,
  bias = 0.5,
}: ShareLayoutInput): ShareLayoutBudget {
  const top = Number.isFinite(availableTop) ? availableTop : 0;
  const bottom = Number.isFinite(availableBottom) ? availableBottom : top;
  const availableSpace = Math.max(0, bottom - top);

  let contentHeight = 0;
  (blocks || []).forEach((block, index) => {
    const height = Number.isFinite(block?.height)
      ? Math.max(0, block.height)
      : 0;
    const gap =
      index > 0 && Number.isFinite(block?.gapBefore)
        ? Math.max(0, block.gapBefore as number)
        : 0;
    contentHeight += height + gap;
  });

  const fits = contentHeight <= availableSpace;
  const safeBias = Number.isFinite(bias) ? clamp(bias, 0, 1) : 0.5;
  const startY = fits
    ? top + (availableSpace - contentHeight) * safeBias
    : top;

  return {
    availableSpace,
    contentHeight,
    startY,
    endY: startY + contentHeight,
    fits,
    overflow: Math.max(0, contentHeight - availableSpace),
  };
}
