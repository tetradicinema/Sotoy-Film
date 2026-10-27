/**
 * Buzz Story Card (Threads-style, 1080x1920).
 *
 * ONE renderer is used for both the on-screen preview and the downloaded PNG,
 * so the two are always identical. The preview in the modal is simply an <img>
 * of the canvas produced here.
 */

export interface BuzzCardFilm {
  title: string;
  year?: number | string;
  poster?: string;
  score?: number; // Skor Sotoy (0-10 scale as shown in the app) or rating
  genres?: string[];
}

export interface BuzzCardInput {
  authorName: string;
  authorHandle?: string; // with or without leading "@"
  authorAvatar?: string;
  roleLabel?: string; // e.g. "PENULIS", "ADMIN", "SI PALING SOTOY"
  text: string;
  image?: string; // attached photo (URL or data URL)
  film?: BuzzCardFilm | null;
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

const FONT = `"Plus Jakarta Sans", "Geist", "Segoe UI", Arial, sans-serif`;
const PINK = '#FF2E7E';

export const normalizeHandle = (h?: string): string => {
  if (!h) return '';
  const clean = h.trim().replace(/^@+/, '');
  return clean ? `@${clean}` : '';
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

export async function renderBuzzStoryCanvas(input: BuzzCardInput, deps: BuzzCardDeps): Promise<any> {
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
  const H = BUZZ_CARD_H;
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
  const [avatarImg, photoImg, posterImg, logoImg] = await Promise.all([
    safeLoad(input.authorAvatar, false),
    safeLoad(input.image, true),
    safeLoad(input.film?.poster, false),
    safeLoad(encodeURI('/v2_sotoyfilm full logo transparent.PNG'), false),
  ]);
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
  const hasFilm = !!input.film && !!input.film.title;

  // ---- Layout constants ----
  const cardX = 56;
  const cardW = W - cardX * 2; // 968
  const pad = 52;
  const innerX = cardX + pad;
  const innerW = cardW - pad * 2; // 864
  const topSafe = 190; // room for brand wordmark
  const bottomSafe = 1730; // room for footer
  const maxCardH = bottomSafe - topSafe;

  // Header block
  const avatarSize = 108;
  const headerH = avatarSize;
  const gapAfterHeader = 36;

  // Text sizing (bigger when the buzz is short and has no media)
  const rawText = (input.text || '').trim();
  const short = rawText.length <= 90 && !hasPhoto && !hasFilm;
  const fontSize = short ? 58 : 42;
  const lineH = short ? 84 : 62;

  // Film chip
  const filmH = hasFilm ? 190 : 0;

  // Footer (tags + stats)
  const tags = (input.tags || []).filter(Boolean).slice(0, 3);
  const showStats = (input.likes ?? 0) > 0 || (input.replies ?? 0) > 0;
  const tagsH = tags.length ? 56 : 0;
  const statsH = showStats ? 44 : 0;

  // Photo block: cover-crop, portrait allowed but capped
  let photoH = 0;
  if (hasPhoto && photoImg) {
    const ratio = (photoImg as any).height / (photoImg as any).width;
    photoH = Math.round(Math.min(Math.max(innerW * ratio, innerW * 0.6), 1000));
  }

  // Measure text with the room that is left
  ctx.font = `500 ${fontSize}px ${FONT}`;
  const fixed =
    pad + // top padding
    headerH +
    gapAfterHeader +
    (photoH ? photoH + 32 : 0) +
    (hasFilm ? filmH + 28 : 0) +
    (tagsH ? tagsH + 20 : 0) +
    (statsH ? statsH + 24 : 0) +
    pad; // bottom padding
  const roomForText = Math.max(lineH * 3, maxCardH - fixed - 28);
  const maxLines = Math.max(3, Math.floor(roomForText / lineH));
  const { lines } = wrapLines(ctx, rawText || ' ', innerW, maxLines);
  const textH = lines.length * lineH;

  let cardH = fixed + (lines.length ? textH + 28 : 0);
  cardH = Math.min(cardH, maxCardH);
  const cardY = Math.round(topSafe + (maxCardH - cardH) / 2);

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

  // Brand logo (top-left, larger size, preserve aspect ratio)
  if (logoImg) {
    const logoH = 120;
    const logoAspect = ((logoImg as any).width || 1) / ((logoImg as any).height || 1);
    const logoW = Math.round(logoH * logoAspect);
    const logoY = 60;
    const logoX = Math.max(24, cardX - 10);
    ctx.drawImage(logoImg as any, logoX, logoY, logoW, logoH);
  } else {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PINK;
    ctx.font = `800 56px ${FONT}`;
    ctx.fillText('SOTOY FILM', cardX, 120);
  }

  // ---- Card (white, soft shadow) ----
  ctx.save();
  ctx.shadowColor = 'rgba(15, 15, 30, 0.14)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, cardX, cardY, cardW, cardH, 48);
  ctx.fill();
  ctx.restore();

  let y = cardY + pad;

  // ---- Header: avatar + name/handle + role badge ----
  const avX = innerX;
  const avY = y;
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
    ctx.font = `800 52px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText((input.authorName || 'S').charAt(0).toUpperCase(), avX + avatarSize / 2, avY + avatarSize / 2 + 18);
    ctx.textAlign = 'left';
  }
  // thin ring
  ctx.beginPath();
  ctx.arc(avX + avatarSize / 2, avY + avatarSize / 2, avatarSize / 2 - 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const nameX = avX + avatarSize + 26;
  const maxNameW = innerX + innerW - nameX - 8;
  ctx.fillStyle = '#0F0F14';
  ctx.font = `800 40px ${FONT}`;
  let displayName = input.authorName || 'Warga Sotoy';
  while (displayName.length > 1 && ctx.measureText(displayName).width > maxNameW - (input.roleLabel ? 190 : 0)) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== input.authorName) displayName = displayName.trimEnd() + '…';
  ctx.fillText(displayName, nameX, avY + 44);
  const nameW = ctx.measureText(displayName).width;

  if (input.roleLabel) {
    ctx.font = `800 20px ${FONT}`;
    const label = input.roleLabel.toUpperCase();
    const bw = ctx.measureText(label).width + 30;
    const bx = nameX + nameW + 16;
    ctx.fillStyle = PINK;
    rr(ctx, bx, avY + 16, bw, 38, 19);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(label, bx + bw / 2, avY + 42);
    ctx.textAlign = 'left';
  }

  const handle = normalizeHandle(input.authorHandle);
  ctx.fillStyle = '#8A8A93';
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText(handle || 'di Sotoy Film', nameX, avY + 88);

  y += headerH + gapAfterHeader;

  // ---- Text ----
  if (lines.length) {
    ctx.fillStyle = '#0F0F14';
    ctx.font = `500 ${fontSize}px ${FONT}`;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], innerX, y + fontSize + i * lineH - (short ? 6 : 4));
    }
    y += textH + 28;
  }

  // ---- Photo ----
  if (photoImg && photoH) {
    ctx.save();
    rr(ctx, innerX, y, innerW, photoH, 30);
    ctx.clip();
    drawCover(ctx, photoImg, innerX, y, innerW, photoH);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    rr(ctx, innerX, y, innerW, photoH, 30);
    ctx.stroke();
    y += photoH + 32;
  }

  // ---- Film chip ----
  if (hasFilm && input.film) {
    const f = input.film;
    ctx.fillStyle = '#F7F7F8';
    rr(ctx, innerX, y, innerW, filmH, 28);
    ctx.fill();
    ctx.strokeStyle = '#E4E4E8';
    ctx.lineWidth = 2;
    rr(ctx, innerX, y, innerW, filmH, 28);
    ctx.stroke();

    const pW = 104;
    const pH = 156;
    const pX = innerX + 18;
    const pY = y + (filmH - pH) / 2;
    if (posterImg) {
      ctx.save();
      rr(ctx, pX, pY, pW, pH, 14);
      ctx.clip();
      drawCover(ctx, posterImg, pX, pY, pW, pH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#E4E4E8';
      rr(ctx, pX, pY, pW, pH, 14);
      ctx.fill();
    }

    const tX = pX + pW + 26;
    const scoreW = typeof f.score === 'number' ? 150 : 0;
    const maxTitleW = innerX + innerW - 24 - tX - scoreW;

    ctx.fillStyle = PINK;
    ctx.font = `800 19px ${FONT}`;
    ctx.fillText('FILM YANG DIBAHAS', tX, y + 56);

    ctx.fillStyle = '#0F0F14';
    ctx.font = `800 38px ${FONT}`;
    let title = f.title;
    while (title.length > 1 && ctx.measureText(title).width > maxTitleW) title = title.slice(0, -1);
    if (title !== f.title) title = title.trimEnd() + '…';
    ctx.fillText(title, tX, y + 102);

    ctx.fillStyle = '#8A8A93';
    ctx.font = `500 26px ${FONT}`;
    const meta = [f.year, (f.genres || []).slice(0, 2).join(', ')].filter(Boolean).join('  •  ');
    let metaTxt = meta;
    while (metaTxt.length > 1 && ctx.measureText(metaTxt).width > maxTitleW) metaTxt = metaTxt.slice(0, -1);
    ctx.fillText(metaTxt, tX, y + 142);

    if (typeof f.score === 'number') {
      const label = `★ ${f.score.toFixed(1)}`;
      ctx.font = `800 30px ${FONT}`;
      const sw = ctx.measureText(label).width + 36;
      const sx = innerX + innerW - 24 - sw;
      ctx.fillStyle = '#FFF4DB';
      rr(ctx, sx, y + filmH / 2 - 27, sw, 54, 27);
      ctx.fill();
      ctx.fillStyle = '#B7791F';
      ctx.textAlign = 'center';
      ctx.fillText(label, sx + sw / 2, y + filmH / 2 + 11);
      ctx.textAlign = 'left';
    }
    y += filmH + 28;
  }

  // ---- Tags ----
  if (tags.length) {
    let tx = innerX;
    ctx.font = `700 26px ${FONT}`;
    for (const t of tags) {
      const str = `#${t}`;
      const tw = ctx.measureText(str).width + 32;
      if (tx + tw > innerX + innerW) break;
      ctx.fillStyle = '#FFE8F1';
      rr(ctx, tx, y, tw, 46, 23);
      ctx.fill();
      ctx.fillStyle = PINK;
      ctx.fillText(str, tx + 16, y + 32);
      tx += tw + 12;
    }
    y += tagsH + 20;
  }

  // ---- Stats (Threads-style "391 suka · 520 balasan") ----
  if (showStats) {
    ctx.fillStyle = '#9A9AA3';
    ctx.font = `500 28px ${FONT}`;
    const parts: string[] = [];
    if ((input.likes ?? 0) > 0) parts.push(`${compactNumber(input.likes as number)} suka`);
    if ((input.replies ?? 0) > 0) parts.push(`${compactNumber(input.replies as number)} balasan`);
    ctx.fillText(parts.join('  ·  '), innerX, y + 30);
  }

  // ---- Footer (outside the card) ----
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6B6B75';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText('sotoyfilm.my.id', W / 2, 1830);
  ctx.fillStyle = '#9A9AA3';
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText('Diskusi film & pop-culture bareng cinephile', W / 2, 1868);
  ctx.textAlign = 'left';

  return canvas;
}
