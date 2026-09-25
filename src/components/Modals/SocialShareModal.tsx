import React, { useState, useRef } from 'react';
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
  Layers,
  Quote,
  Star,
  Award,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface ShareData {
  title: string;
  text: string;
  url?: string;
  type?: 'article' | 'buzz' | 'film' | 'review';
  image?: string;
  imageUrl?: string;
  meta?: string;
  tags?: string[];
  authorName?: string;
  authorAvatar?: string;
  category?: string;
  skorSotoy?: number;
  // Specific for film rating & review card
  rating?: number;
  filmTitle?: string;
  filmYear?: number | string;
  filmPoster?: string;
  filmBackdrop?: string;
  filmGenres?: string[];
  reviewerName?: string;
  reviewerAvatar?: string;
  reviewerRole?: string;
  headline?: string;
  reviewText?: string;
}

export const getScoreVerdict = (score: number): string => {
  if (score >= 4.8) return 'MASTERPIECE MUTLAK';
  if (score >= 4.0) return 'LUAR BIASA KEREN';
  if (score >= 3.5) return 'SANGAT BAGUS';
  if (score >= 3.0) return 'LAYAK DITONTON';
  if (score >= 2.0) return 'KURANG SOTOY';
  return 'SKIP SAJA';
};

export const getStarsString = (score: number): string => {
  const fullStars = Math.min(5, Math.max(1, Math.round(score)));
  return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
};

interface SocialShareModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  data?: ShareData | null;
}

type ShareTab = 'quick' | 'ig_story' | 'ig_feed';

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  data: propData,
}) => {
  const { showToast, shareModalData, closeShareModal } = useApp();
  const [activeTab, setActiveTab] = useState<ShareTab>('quick');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const isOpen = propIsOpen !== undefined ? propIsOpen : shareModalData !== null;
  const onClose = propOnClose || closeShareModal;
  const data = propData !== undefined ? propData : shareModalData;

  if (!isOpen || !data) return null;

  const currentUrl = data.url || window.location.href;
  const shareText = `${data.title}\n\n${data.text ? data.text.slice(0, 140) + '...' : ''}\n\nBaca selengkapnya di Sotoy Film:`;

  const igCaption = `${data.title}\n\n"${data.text ? data.text.slice(0, 280) : ''}"\n\n📌 Simak ulasan dan diskusinya di: ${currentUrl}\n\n#SotoyFilm #ReviewFilm #CinephileIndonesia #FilmBagus #PopCulture #DiskusiFilm #KritikFilm`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      showToast('Tautan berhasil disalin ke clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      showToast('Gagal menyalin tautan secara otomatis.');
    }
  };

  const handleCopyCaption = () => {
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: currentUrl,
        });
        showToast('Berhasil dibagikan via menu sistem!');
        onClose();
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  // Helper to load image for canvas without CORS taint issues
  const loadCanvasImage = async (src: string): Promise<HTMLImageElement> => {
    if (!src) throw new Error('Empty image source');

    // 1. If it's already a data URL or blob URL, load directly
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Gagal memuat gambar lokal'));
        img.src = src;
      });
    }

    // 2. Try fetching as Blob with cache-buster to prevent browser-cache non-CORS conflicts
    try {
      const corsUrl = `${src}${src.includes('?') ? '&' : '?'}cors_cb=${Date.now()}`;
      const response = await fetch(corsUrl, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Gagal memuat blob'));
          img.src = objectUrl;
        });
      }
    } catch {
      // Fall through to Image with crossOrigin
    }

    // 3. Fallback: Image with crossOrigin
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.src = src;
    });
  };

  // Helper for drawing rounded rectangles on canvas
  const drawRoundRectPath = (
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
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
  };

  // Resolve content type: 'buzz', 'article', or 'film' / 'review'
  const isBuzz = data.type === 'buzz';
  const isArticle = data.type === 'article';
  const isFilmRating =
    data.type === 'review' ||
    data.type === 'film' ||
    (!isBuzz && !isArticle && (typeof data.rating === 'number' || typeof data.skorSotoy === 'number' || !!data.filmPoster || !!data.filmTitle));

  const displayScore =
    typeof data.rating === 'number'
      ? data.rating
      : typeof data.skorSotoy === 'number'
      ? data.skorSotoy
      : 4.5;

  // Generate high-resolution Instagram Card PNG using Canvas
  const handleDownloadInstagramVisual = async (format: 'story' | 'feed') => {
    setIsGeneratingImage(true);
    try {
      const width = 1080;
      const height = format === 'story' ? 1920 : 1080;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        showToast('Gagal menginisialisasi perender visual.');
        setIsGeneratingImage(false);
        return;
      }

      // 1. Deep cinematic background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0a0b12');
      bgGrad.addColorStop(0.45, '#121426');
      bgGrad.addColorStop(1, '#08090f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Ambient neon glow circles
      const glowGrad = ctx.createRadialGradient(
        width * 0.85,
        height * 0.15,
        20,
        width * 0.85,
        height * 0.15,
        format === 'story' ? 650 : 450
      );
      glowGrad.addColorStop(0, 'rgba(255, 46, 126, 0.28)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      const glowGrad2 = ctx.createRadialGradient(
        width * 0.15,
        height * 0.85,
        20,
        width * 0.15,
        height * 0.85,
        format === 'story' ? 650 : 450
      );
      glowGrad2.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
      glowGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad2;
      ctx.fillRect(0, 0, width, height);

      // 3. Outer border accent
      ctx.strokeStyle = '#222538';
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, width - 72, height - 72);

      // 4. Header Branding Bar
      ctx.fillStyle = '#FF2E7E';
      ctx.font = '900 36px sans-serif';
      ctx.fillText('SOTOY FILM', 70, format === 'story' ? 130 : 100);

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 20px sans-serif';
      const badgeText = isFilmRating
        ? '• SKOR SOTOY & ULASAN FILM'
        : isArticle
        ? '• ARTIKEL SINEMA & FEATURE'
        : '• OPINI BUZZ KOMUNITAS';
      ctx.fillText(badgeText, 320, format === 'story' ? 128 : 98);

      // 5. Main Card Container
      const cardX = 70;
      const cardY = format === 'story' ? 180 : 130;
      const cardW = width - 140;
      const cardH = format === 'story' ? height - 330 : height - 230;

      ctx.fillStyle = '#101221';
      ctx.strokeStyle = '#2c3047';
      ctx.lineWidth = 3;
      drawRoundRectPath(ctx, cardX, cardY, cardW, cardH, 32);
      ctx.fill();
      ctx.stroke();

      // Text wrapping helper
      const wrapText = (
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
        maxLines = 4,
        align: 'left' | 'center' = 'left'
      ) => {
        const words = text.split(' ');
        let line = '';
        let lineCount = 0;
        ctx.textAlign = align;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, y);
            line = words[n] + ' ';
            y += lineHeight;
            lineCount++;
            if (lineCount >= maxLines) {
              ctx.fillText(line.trim() + '...', x, y);
              ctx.textAlign = 'left';
              return y + lineHeight;
            }
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), x, y);
        ctx.textAlign = 'left';
        return y + lineHeight;
      };

      // =========================================================================
      // DYNAMIC RENDERING: BUZZ (FOTO PROFIL) VS ARTIKEL (IMAGE ARTICLE)
      // =========================================================================
      let currentContentY = cardY + 50;

      if (isBuzz) {
        // =====================================================================
        // BUZZ: FOTO PROFIL SEBAGAI HERO
        // =====================================================================
        const avatarUrl = data.authorAvatar || data.image;
        const displayAuthorName = data.authorName || data.title.replace('Buzz Diskusi: ', '').trim();

        if (format === 'story') {
          // STORY FORMAT (9:16) - CENTERED HERO AVATAR & QUOTE
          const avatarSize = 180;
          const avatarX = cardX + (cardW - avatarSize) / 2;
          const avatarY = cardY + 70;

          let avatarLoaded = false;
          if (avatarUrl) {
            try {
              const avatarImg = await loadCanvasImage(avatarUrl);
              ctx.save();
              ctx.beginPath();
              ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
              ctx.restore();

              // Dual Glowing Neon Ring around Foto Profil
              ctx.beginPath();
              ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
              ctx.strokeStyle = '#FF2E7E';
              ctx.lineWidth = 6;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(255, 46, 126, 0.4)';
              ctx.lineWidth = 3;
              ctx.stroke();

              avatarLoaded = true;
            } catch {
              // Fallback
            }
          }

          if (!avatarLoaded) {
            // Elegant Stylized Profile Placeholder
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#1e243b';
            ctx.fill();
            ctx.strokeStyle = '#FF2E7E';
            ctx.lineWidth = 5;
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 64px sans-serif';
            ctx.textAlign = 'center';
            const initial = displayAuthorName ? displayAuthorName.charAt(0).toUpperCase() : 'S';
            ctx.fillText(initial, avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 22);
            ctx.textAlign = 'left';
          }

          // Role Badge Pill below Avatar
          const badgePillY = avatarY + avatarSize + 25;
          ctx.fillStyle = '#FF2E7E';
          drawRoundRectPath(ctx, cardX + (cardW - 170) / 2, badgePillY, 170, 36, 18);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('BUZZ KOMUNITAS', cardX + cardW / 2, badgePillY + 24);

          // Author Name
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 42px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(displayAuthorName, cardX + cardW / 2, badgePillY + 80);

          // Handle / Meta info
          ctx.fillStyle = '#FF2E7E';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(data.meta || '@warga.sotoy di Sotoy Film', cardX + cardW / 2, badgePillY + 115);
          ctx.textAlign = 'left';

          // Decorative Quote Container
          const quoteBoxY = badgePillY + 155;
          const quoteBoxH = 680;
          ctx.fillStyle = '#16192d';
          ctx.strokeStyle = '#2d3352';
          ctx.lineWidth = 2;
          drawRoundRectPath(ctx, cardX + 45, quoteBoxY, cardW - 90, quoteBoxH, 24);
          ctx.fill();
          ctx.stroke();

          // Big quotation marks
          ctx.fillStyle = '#FF2E7E';
          ctx.font = '900 90px serif';
          ctx.fillText('“', cardX + 75, quoteBoxY + 80);

          // Buzz content text
          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'italic 36px sans-serif';
          const buzzQuote = data.text ? data.text : 'Opini Pop-Culture dan diskusi sinema di platform Sotoy Film.';
          wrapText(buzzQuote, cardX + 80, quoteBoxY + 120, cardW - 160, 56, 8, 'left');

          // Tagged film/article highlight if present
          if (data.tags && data.tags.length > 0) {
            let tagX = cardX + 80;
            const tagY = quoteBoxY + quoteBoxH - 50;
            ctx.font = 'bold 18px sans-serif';
            for (let i = 0; i < Math.min(data.tags.length, 3); i++) {
              const tagStr = `#${data.tags[i]}`;
              const tWidth = ctx.measureText(tagStr).width;
              ctx.fillStyle = '#222742';
              drawRoundRectPath(ctx, tagX, tagY - 24, tWidth + 24, 34, 10);
              ctx.fill();
              ctx.fillStyle = '#FF2E7E';
              ctx.fillText(tagStr, tagX + 12, tagY);
              tagX += tWidth + 36;
            }
          }

        } else {
          // FEED FORMAT (1:1) - HORIZONTAL PROFILE HEADER & QUOTE CARD
          const avatarSize = 130;
          const avatarX = cardX + 50;
          const avatarY = cardY + 50;

          let avatarLoaded = false;
          if (avatarUrl) {
            try {
              const avatarImg = await loadCanvasImage(avatarUrl);
              ctx.save();
              ctx.beginPath();
              ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
              ctx.restore();

              // Ring glowing outline
              ctx.beginPath();
              ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
              ctx.strokeStyle = '#FF2E7E';
              ctx.lineWidth = 5;
              ctx.stroke();

              avatarLoaded = true;
            } catch {
              // Fallback
            }
          }

          if (!avatarLoaded) {
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#1e243b';
            ctx.fill();
            ctx.strokeStyle = '#FF2E7E';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 50px sans-serif';
            ctx.textAlign = 'center';
            const initial = displayAuthorName ? displayAuthorName.charAt(0).toUpperCase() : 'S';
            ctx.fillText(initial, avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 18);
            ctx.textAlign = 'left';
          }

          // Author details beside Foto Profil
          const textStartX = avatarX + avatarSize + 30;
          ctx.fillStyle = '#FF2E7E';
          drawRoundRectPath(ctx, textStartX, avatarY + 8, 150, 28, 8);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText('BUZZ KOMUNITAS', textStartX + 12, avatarY + 27);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 36px sans-serif';
          ctx.fillText(displayAuthorName, textStartX, avatarY + 76);

          ctx.fillStyle = '#FF2E7E';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(data.meta || 'Pengulas Pop-Culture @ Sotoy Film', textStartX, avatarY + 110);

          // Divider
          currentContentY = avatarY + avatarSize + 35;
          ctx.strokeStyle = '#272A3D';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cardX + 40, currentContentY);
          ctx.lineTo(cardX + cardW - 40, currentContentY);
          ctx.stroke();

          currentContentY += 45;

          // Buzz Quote Box
          ctx.fillStyle = '#16192d';
          ctx.strokeStyle = '#2d3352';
          ctx.lineWidth = 1.5;
          drawRoundRectPath(ctx, cardX + 40, currentContentY, cardW - 80, cardH - (currentContentY - cardY) - 50, 20);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FF2E7E';
          ctx.font = '900 64px serif';
          ctx.fillText('“', cardX + 65, currentContentY + 55);

          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'italic 32px sans-serif';
          const buzzQuote = data.text ? data.text : 'Opini Pop-Culture di platform Sotoy Film.';
          wrapText(buzzQuote, cardX + 70, currentContentY + 85, cardW - 140, 48, 6, 'left');
        }

      } else if (isArticle) {
        // =====================================================================
        // ARTIKEL: IMAGE ARTICLE SEBAGAI HERO
        // =====================================================================
        const coverUrl = data.image || data.imageUrl;
        const imgW = cardW - 80;
        const imgH = format === 'story' ? 560 : 380;
        const imgX = cardX + 40;
        const imgY = currentContentY;

        let coverLoaded = false;
        if (coverUrl) {
          try {
            const coverImg = await loadCanvasImage(coverUrl);
            ctx.save();
            drawRoundRectPath(ctx, imgX, imgY, imgW, imgH, 22);
            ctx.clip();
            ctx.drawImage(coverImg, imgX, imgY, imgW, imgH);
            ctx.restore();

            // Border around cover
            ctx.strokeStyle = '#3d4464';
            ctx.lineWidth = 3;
            drawRoundRectPath(ctx, imgX, imgY, imgW, imgH, 22);
            ctx.stroke();
            coverLoaded = true;
          } catch {
            // Fallback
          }
        }

        if (!coverLoaded) {
          // Sleek Cinematic Cover Placeholder
          const coverGrad = ctx.createLinearGradient(imgX, imgY, imgX + imgW, imgY + imgH);
          coverGrad.addColorStop(0, '#1c1f38');
          coverGrad.addColorStop(1, '#0d0f1c');
          ctx.fillStyle = coverGrad;
          drawRoundRectPath(ctx, imgX, imgY, imgW, imgH, 22);
          ctx.fill();
          ctx.strokeStyle = '#3d4464';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.fillStyle = '#FF2E7E';
          ctx.font = '900 24px sans-serif';
          ctx.fillText('🎬 SOTOY FILM FEATURE', imgX + 30, imgY + 60);
        }

        // Category badge overlaid on Image Article
        const categoryLabel = (data.category || 'ULASAN & ARTIKEL').toUpperCase();
        ctx.font = '900 18px sans-serif';
        const catWidth = ctx.measureText(categoryLabel).width + 36;

        ctx.fillStyle = '#FF2E7E';
        drawRoundRectPath(ctx, imgX + 24, imgY + 24, catWidth, 42, 12);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(categoryLabel, imgX + 42, imgY + 51);

        currentContentY = imgY + imgH + 35;

        // Author Byline
        if (data.authorName) {
          ctx.fillStyle = '#FF2E7E';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(`★ Ditulis oleh: ${data.authorName}`, cardX + 45, currentContentY);
          currentContentY += 40;
        }

        // Article Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = format === 'story' ? '900 46px sans-serif' : '900 38px sans-serif';
        currentContentY = wrapText(
          data.title,
          cardX + 45,
          currentContentY + 10,
          cardW - 90,
          format === 'story' ? 58 : 48,
          format === 'story' ? 4 : 2
        );

        // Article Excerpt
        if (data.text) {
          ctx.fillStyle = '#94A3B8';
          ctx.font = format === 'story' ? '28px sans-serif' : '24px sans-serif';
          currentContentY = wrapText(
            data.text,
            cardX + 45,
            currentContentY + 15,
            cardW - 90,
            format === 'story' ? 42 : 36,
            format === 'story' ? 4 : 2
          );
        }

      } else {
        // =====================================================================
        // FILM RATING & ULASAN: CARD KHUSUS DENGAN BACKGROUND POSTER FILM!
        // =====================================================================
        const posterUrl = data.filmPoster || data.image || data.imageUrl || data.filmBackdrop;
        let posterLoaded = false;
        let posterImg: HTMLImageElement | null = null;

        if (posterUrl) {
          try {
            posterImg = await loadCanvasImage(posterUrl);
            posterLoaded = true;
          } catch {
            // fallback gracefully
          }
        }

        // 1. Draw Poster as Card Background with Moody Cinematic Gradient Overlay
        if (posterLoaded && posterImg) {
          ctx.save();
          drawRoundRectPath(ctx, cardX, cardY, cardW, cardH, 32);
          ctx.clip();

          const imgRatio = posterImg.width / posterImg.height;
          const cardRatio = cardW / cardH;
          let drawW = cardW;
          let drawH = cardH;
          let drawX = cardX;
          let drawY = cardY;
          if (imgRatio > cardRatio) {
            drawW = cardH * imgRatio;
            drawX = cardX - (drawW - cardW) / 2;
          } else {
            drawH = cardW / imgRatio;
            drawY = cardY - (drawH - cardH) / 2;
          }
          ctx.drawImage(posterImg, drawX, drawY, drawW, drawH);

          // Dark atmospheric vignette & gradient overlay on top of poster
          const overlayGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
          overlayGrad.addColorStop(0, 'rgba(8, 10, 20, 0.84)');
          overlayGrad.addColorStop(0.35, 'rgba(10, 12, 26, 0.89)');
          overlayGrad.addColorStop(0.7, 'rgba(8, 10, 22, 0.94)');
          overlayGrad.addColorStop(1, 'rgba(5, 6, 14, 0.98)');
          ctx.fillStyle = overlayGrad;
          ctx.fillRect(cardX, cardY, cardW, cardH);
          ctx.restore();

          // Gold border accent around poster card
          ctx.strokeStyle = 'rgba(255, 208, 0, 0.5)';
          ctx.lineWidth = 3.5;
          drawRoundRectPath(ctx, cardX, cardY, cardW, cardH, 32);
          ctx.stroke();
        }

        if (format === 'story') {
          // STORY FORMAT (9:16)
          // A. Floating elevated movie poster in upper section
          const posterThumbW = 280;
          const posterThumbH = 410;
          const posterThumbX = cardX + (cardW - posterThumbW) / 2;
          const posterThumbY = cardY + 50;

          if (posterLoaded && posterImg) {
            ctx.save();
            drawRoundRectPath(ctx, posterThumbX, posterThumbY, posterThumbW, posterThumbH, 20);
            ctx.clip();
            ctx.drawImage(posterImg, posterThumbX, posterThumbY, posterThumbW, posterThumbH);
            ctx.restore();

            // Glowing border
            ctx.strokeStyle = '#FF2E7E';
            ctx.lineWidth = 4;
            drawRoundRectPath(ctx, posterThumbX, posterThumbY, posterThumbW, posterThumbH, 20);
            ctx.stroke();
          }

          // B. Film Title
          let curY = posterThumbY + posterThumbH + 50;
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 46px sans-serif';
          curY = wrapText(data.filmTitle || data.title, cardX + cardW / 2, curY, cardW - 120, 56, 2, 'center');

          // C. Year & Genres Meta
          ctx.fillStyle = '#FF2E7E';
          ctx.font = 'bold 22px sans-serif';
          const metaStr = [data.filmYear, (data.filmGenres || []).slice(0, 3).join(' • ')].filter(Boolean).join(' | ');
          if (metaStr) {
            ctx.textAlign = 'center';
            ctx.fillText(metaStr, cardX + cardW / 2, curY + 6);
            ctx.textAlign = 'left';
            curY += 40;
          } else {
            curY += 15;
          }

          // D. Huge Skor Sotoy Rating Badge
          const badgeW = 480;
          const badgeH = 114;
          const badgeX = cardX + (cardW - badgeW) / 2;
          const badgeY = curY + 15;

          ctx.fillStyle = 'rgba(14, 16, 32, 0.95)';
          ctx.strokeStyle = '#FF2E7E';
          ctx.lineWidth = 3;
          drawRoundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 24);
          ctx.fill();
          ctx.stroke();

          // Stars & Score inside badge
          ctx.fillStyle = '#FF2E7E';
          ctx.font = '500 52px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`★ ${displayScore.toFixed(1)}`, cardX + cardW / 2 - 40, badgeY + 58);
          ctx.fillStyle = '#94A3B8';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText('/ 10.0', cardX + cardW / 2 + 80, badgeY + 58);

          // Verdict tag below score
          ctx.fillStyle = '#FF2E7E';
          ctx.font = '900 18px sans-serif';
          ctx.fillText(`★ ${getScoreVerdict(displayScore)} ★`, cardX + cardW / 2, badgeY + 94);
          ctx.textAlign = 'left';

          // E. Reviewer & Review Box (if review or headline present)
          const reviewBoxY = badgeY + badgeH + 35;
          const reviewBoxH = Math.max(340, cardY + cardH - reviewBoxY - 70);
          ctx.fillStyle = 'rgba(16, 18, 34, 0.88)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 2;
          drawRoundRectPath(ctx, cardX + 40, reviewBoxY, cardW - 80, reviewBoxH, 24);
          ctx.fill();
          ctx.stroke();

          let revY = reviewBoxY + 45;
          // Reviewer avatar & name
          const revAvatarUrl = data.reviewerAvatar || data.authorAvatar;
          const revName = data.reviewerName || data.authorName;
          if (revAvatarUrl || revName) {
            let revAvatarLoaded = false;
            if (revAvatarUrl) {
              try {
                const revImg = await loadCanvasImage(revAvatarUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(cardX + 80, revY, 26, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(revImg, cardX + 54, revY - 26, 52, 52);
                ctx.restore();

                ctx.beginPath();
                ctx.arc(cardX + 80, revY, 28, 0, Math.PI * 2);
                ctx.strokeStyle = '#FF2E7E';
                ctx.lineWidth = 3;
                ctx.stroke();
                revAvatarLoaded = true;
              } catch {
                // fallback
              }
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText(revName ? `Ulasan oleh ${revName}` : 'Ulasan Komunitas', revAvatarLoaded ? cardX + 125 : cardX + 65, revY - 3);

            ctx.fillStyle = '#FF2E7E';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(data.reviewerRole || 'Warga Sotoy Film', revAvatarLoaded ? cardX + 125 : cardX + 65, revY + 20);

            revY += 55;
          }

          // Headline
          if (data.headline) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 28px sans-serif';
            revY = wrapText(`"${data.headline}"`, cardX + 65, revY + 15, cardW - 130, 36, 2);
          }

          // Review excerpt
          ctx.fillStyle = '#CBD5E1';
          ctx.font = 'italic 24px sans-serif';
          const rText = data.reviewText || data.text || 'Simak ulasan lengkap dan skor sinema di platform Sotoy Film.';
          wrapText(`"${rText}"`, cardX + 65, revY + 15, cardW - 130, 34, 4);

        } else {
          // FEED FORMAT (1:1)
          const posterW = 270;
          const posterH = 390;
          const posterX = cardX + 45;
          const posterY = cardY + 50;

          if (posterLoaded && posterImg) {
            ctx.save();
            drawRoundRectPath(ctx, posterX, posterY, posterW, posterH, 20);
            ctx.clip();
            ctx.drawImage(posterImg, posterX, posterY, posterW, posterH);
            ctx.restore();

            ctx.strokeStyle = '#FF2E7E';
            ctx.lineWidth = 4;
            drawRoundRectPath(ctx, posterX, posterY, posterW, posterH, 20);
            ctx.stroke();
          }

          const rightX = posterX + posterW + 35;
          const rightW = cardW - posterW - 110;
          let rY = posterY + 30;

          // Film Title
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 38px sans-serif';
          rY = wrapText(data.filmTitle || data.title, rightX, rY, rightW, 46, 2);

          // Meta
          ctx.fillStyle = '#FF2E7E';
          ctx.font = 'bold 20px sans-serif';
          const metaStr = [data.filmYear, (data.filmGenres || []).slice(0, 2).join(' • ')].filter(Boolean).join(' | ');
          if (metaStr) {
            ctx.fillText(metaStr, rightX, rY + 8);
            rY += 38;
          } else {
            rY += 15;
          }

          // Rating score box
          const scoreBoxW = rightW;
          const scoreBoxH = 80;
          ctx.fillStyle = 'rgba(14, 16, 32, 0.95)';
          ctx.strokeStyle = '#FF2E7E';
          ctx.lineWidth = 2.5;
          drawRoundRectPath(ctx, rightX, rY, scoreBoxW, scoreBoxH, 18);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FF2E7E';
          ctx.font = '500 42px sans-serif';
          ctx.fillText(`★ ${displayScore.toFixed(1)}`, rightX + 25, rY + 54);

          ctx.fillStyle = '#94A3B8';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('/ 10.0', rightX + 175, rY + 54);

          ctx.fillStyle = '#FF2E7E';
          ctx.font = '900 16px sans-serif';
          ctx.fillText(getScoreVerdict(displayScore), rightX + 240, rY + 52);

          rY += scoreBoxH + 30;

          // Reviewer & Quote box
          const revContainerH = cardY + cardH - rY - 60;
          ctx.fillStyle = 'rgba(16, 18, 34, 0.88)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 2;
          drawRoundRectPath(ctx, cardX + 45, rY, cardW - 90, revContainerH, 20);
          ctx.fill();
          ctx.stroke();

          let bottomRevY = rY + 35;
          const revName = data.reviewerName || data.authorName;
          if (revName) {
            ctx.fillStyle = '#FF2E7E';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(`★ Ulasan oleh: ${revName} (${data.reviewerRole || 'Warga Sotoy'})`, cardX + 70, bottomRevY);
            bottomRevY += 32;
          }

          if (data.headline) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 24px sans-serif';
            bottomRevY = wrapText(`"${data.headline}"`, cardX + 70, bottomRevY, cardW - 140, 32, 1);
            bottomRevY += 6;
          }

          ctx.fillStyle = '#CBD5E1';
          ctx.font = 'italic 20px sans-serif';
          const rText = data.reviewText || data.text || 'Simak ulasan lengkap dan skor sinema di platform Sotoy Film.';
          wrapText(`"${rText}"`, cardX + 70, bottomRevY, cardW - 140, 28, 3);
        }
      }

      // 6. Card Footer Branding
      ctx.fillStyle = '#FF2E7E';
      ctx.font = 'bold 24px sans-serif';
      const bottomMeta = isFilmRating
        ? '★ Ulas & Nilai Film Ini di Sotoy Film'
        : isBuzz
        ? '★ Obrolan Pop-Culture Terkurasi'
        : '★ Baca Analisis Lengkap di Sotoy Film';
      ctx.fillText(bottomMeta, cardX + 45, cardY + cardH - 45);

      // 7. Outer Canvas Footer
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('Baca ulasan & ikuti diskusi di sotoyfilm.id', 70, height - 70);

      ctx.fillStyle = '#FF2E7E';
      ctx.font = 'bold 22px sans-serif';
      const formatLabel = format === 'story' ? 'Instagram Story Card (9:16)' : 'Instagram Feed Card (1:1)';
      ctx.fillText(formatLabel, width - 380, height - 70);

      // Export image to PNG
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `sotoyfilm-${isFilmRating ? 'rating' : isBuzz ? 'buzz' : 'artikel'}-${format}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      showToast(
        format === 'story'
          ? 'Gambar Story (.PNG) berhasil diunduh! Siap diunggah ke Instagram Stories.'
          : 'Gambar Feed (.PNG) berhasil diunduh! Siap diunggah ke Instagram Feed.'
      );
    } catch (err) {
      console.error(err);
      showToast('Gagal membuat gambar otomatis.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="social-share-modal"
        className="relative w-full max-w-lg bg-[#171A1F] border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF2E7E] via-[#e0266e] to-[#FF2E7E] p-0.5 shadow-md shadow-sm">
              <div className="w-full h-full bg-[#171A1F] rounded-[10px] flex items-center justify-center text-[#FF2E7E]">
                <Share2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base">
                Bagikan Konten
              </h3>
              <p className="text-[11px] text-slate-400">
                Opsi share WhatsApp, Twitter, Instagram Stories, atau Feed
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
            className={`flex-1 min-w-[105px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
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
            className={`flex-1 min-w-[105px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
              activeTab === 'ig_story'
                ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>IG Stories</span>
          </button>

          <button
            onClick={() => setActiveTab('ig_feed')}
            className={`flex-1 min-w-[105px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
              activeTab === 'ig_feed'
                ? 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white shadow-md shadow-[#FD1D1D]/25 font-bold border border-amber-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>IG Feed</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: QUICK SHARE (WHATSAPP, X, TELEGRAM, FACEBOOK, COPY LINK) */}
        {/* ========================================================================= */}
        {activeTab === 'quick' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Item Preview Card */}
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
                    <span className="bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{displayScore.toFixed(1)} / 5.0</span>
                    </span>
                    <span className="text-[10px] font-bold text-cyan-400">
                      {getScoreVerdict(displayScore)}
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

            {/* Social Share Buttons Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {shareLinks.map(platform => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
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
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF2E7E]/20 to-[#FF2E7E]/20 border border-[#FF2E7E]/30 hover:border-[#FF2E7E] text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INSTAGRAM STORIES (9:16 VERTICAL CINEMATIC CARD) */}
        {/* ========================================================================= */}
        {activeTab === 'ig_story' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Visual Story Card Preview */}
            <div
              className={`relative mx-auto w-[240px] aspect-[9/16] rounded-2xl overflow-hidden ${
                isFilmRating
                  ? 'border-2 border-[#FF2E7E]/60 shadow-2xl bg-cover bg-center'
                  : 'bg-gradient-to-b from-[#15162b] via-[#10111e] to-[#090a10] border border-[#FF2E7E]/40 shadow-2xl'
              } p-4 flex flex-col justify-between text-left`}
              style={
                isFilmRating && (data.filmPoster || data.image || data.imageUrl || data.filmBackdrop)
                  ? { backgroundImage: `url(${data.filmPoster || data.image || data.imageUrl || data.filmBackdrop})` }
                  : undefined
              }
            >
              {/* Dark Cinematic Vignette Overlay on top of Poster */}
              {isFilmRating && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#080a14]/90 via-[#0c0e1e]/85 to-[#05060c]/98 backdrop-blur-[1px]" />
              )}

              {/* Top watermark */}
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[9px] font-black tracking-widest text-[#FF2E7E] uppercase">
                  {isFilmRating ? 'SOTOY FILM' : 'Sotoy Film'}
                </span>
                <span
                  className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                    isFilmRating
                      ? 'text-[#FF2E7E] bg-[#FF2E7E]/20 border border-[#FF2E7E]/30'
                      : 'text-slate-300 bg-white/10'
                  }`}
                >
                  {isFilmRating ? 'RATING & ULASAN' : isBuzz ? 'BUZZ STORY' : isArticle ? 'ARTIKEL STORY' : 'STORIES'}
                </span>
              </div>

              {/* Center Content: Dynamic by Type */}
              <div className="relative z-10 py-1 space-y-2 overflow-hidden flex-1 flex flex-col justify-center">
                {isBuzz ? (
                  /* BUZZ FEED: Munculkan FOTO PROFIL */
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="relative">
                      <img
                        src={data.authorAvatar || data.image}
                        alt={data.authorName || 'Foto Profil'}
                        className="w-16 h-16 rounded-full object-cover ring-4 ring-[#FF2E7E]/50 border-2 border-white shadow-xl"
                      />
                      <span className="absolute -bottom-1 -right-1 bg-[#FF2E7E] text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                        BUZZ
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white leading-tight">
                        {data.authorName || data.title.replace('Buzz Diskusi: ', '')}
                      </div>
                      <div className="text-[9px] text-[#FF2E7E] font-semibold">
                        {data.meta || 'Opini Pop-Culture @ Sotoy Film'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-2xl w-full text-left">
                      <Quote className="w-3 h-3 text-[#FF2E7E] mb-1 opacity-80" />
                      <p className="text-[10px] text-slate-200 italic line-clamp-4 leading-snug">
                        "{data.text || 'Opini komunitas sinema di platform Sotoy Film...'}"
                      </p>
                    </div>
                  </div>
                ) : isArticle ? (
                  /* ARTIKEL: Munculkan IMAGE ARTICLE */
                  <div className="space-y-2">
                    {(data.image || data.imageUrl) && (
                      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-white/10 shadow-lg">
                        <img
                          src={data.image || data.imageUrl}
                          alt={data.title}
                          className="w-full h-full object-cover"
                        />
                        {data.category && (
                          <span className="absolute top-1.5 left-1.5 bg-[#FF2E7E] text-white text-[8px] font-black uppercase px-2 py-0.5 rounded shadow">
                            {data.category}
                          </span>
                        )}
                      </div>
                    )}
                    <h4 className="font-display font-black text-xs text-white leading-tight line-clamp-3">
                      {data.title}
                    </h4>
                    {data.text && (
                      <p className="text-[9px] text-slate-300 line-clamp-2 leading-snug">
                        {data.text}
                      </p>
                    )}
                    {data.authorName && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {data.authorAvatar && (
                          <img
                            src={data.authorAvatar}
                            alt={data.authorName}
                            className="w-4 h-4 rounded-full object-cover border border-white/20"
                          />
                        )}
                        <span className="text-[9px] text-[#FF2E7E] font-bold truncate">
                          ★ Oleh: {data.authorName}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* FILM RATING & ULASAN: CARD KHUSUS DENGAN BACKGROUND POSTER FILM */
                  <div className="flex flex-col items-center text-center space-y-2">
                    {/* Elevated Movie Poster Thumbnail */}
                    <div className="relative w-20 h-28 rounded-xl overflow-hidden border-2 border-[#FF2E7E] shadow-2xl ring-2 ring-[#FF2E7E]/30 shrink-0">
                      <img
                        src={data.filmPoster || data.image || data.imageUrl}
                        alt={data.filmTitle || data.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Film Title & Year */}
                    <div className="w-full px-1">
                      <h4 className="font-display font-black text-xs text-white leading-tight line-clamp-2">
                        {data.filmTitle || data.title}
                      </h4>
                      <div className="text-[8px] text-[#FF2E7E] font-semibold mt-0.5 truncate">
                        {[data.filmYear, (data.filmGenres || []).slice(0, 2).join(', ')].filter(Boolean).join(' • ')}
                      </div>
                    </div>

                    {/* Big Skor Sotoy Badge */}
                    <div className="bg-slate-950/90 border border-[#FFD000]/60 rounded-xl px-2.5 py-1.5 shadow-lg w-full">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3.5 h-3.5 text-[#FFD000] fill-current" />
                        <span className="font-display font-medium text-base text-[#FFD000]">
                          {displayScore.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">/ 10.0</span>
                      </div>
                      <div className="text-[7.5px] font-black text-cyan-300 uppercase tracking-wider mt-0.5">
                        ★ {getScoreVerdict(displayScore)} ★
                      </div>
                    </div>

                    {/* Review Snippet (if exists) */}
                    {(data.headline || data.reviewText || data.reviewerName) && (
                      <div className="p-2 bg-white/5 border border-white/10 rounded-xl w-full text-left space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {data.reviewerAvatar && (
                            <img
                              src={data.reviewerAvatar}
                              alt={data.reviewerName || 'Reviewer'}
                              className="w-4 h-4 rounded-full object-cover border border-[#FF2E7E]"
                            />
                          )}
                          <span className="text-[8px] text-slate-300 font-bold truncate">
                            {data.reviewerName ? `Oleh: ${data.reviewerName}` : 'Ulasan Komunitas'}
                          </span>
                        </div>
                        {data.headline && (
                          <div className="text-[8.5px] font-bold text-white line-clamp-1">
                            "{data.headline}"
                          </div>
                        )}
                        <p className="text-[8px] text-slate-300 italic line-clamp-2 leading-tight">
                          "{data.reviewText || data.text}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom footer */}
              <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[8px] font-bold text-[#FF2E7E] truncate max-w-[140px]">
                  {isFilmRating ? '★ Skor & Ulasan di Sotoy Film' : `★ ${data.meta || 'Sotoy Film'}`}
                </span>
                <span className="text-[8px] text-cyan-400 font-mono">
                  sotoyfilm.id
                </span>
              </div>
            </div>

            {/* Action Buttons for IG Stories */}
            <div className="space-y-2 pt-1">
              <button
                id="download-ig-story-card-btn"
                onClick={() => handleDownloadInstagramVisual('story')}
                disabled={isGeneratingImage}
                className="w-full py-3 bg-[#FF2E7E] hover:brightness-110 active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingImage ? 'Membuat Gambar...' : 'Unduh Gambar Story (PNG 9:16)'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCaption}
                  className="flex-1 py-2.5 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaption ? 'Caption Tersalin' : 'Salin Caption & Tagar'}</span>
                </button>

                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] rounded-xl text-xs font-bold text-white flex items-center gap-1.5 hover:brightness-110 transition-all shrink-0"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Buka IG</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: INSTAGRAM FEED (1:1 SQUARE CINEMATIC CARD) */}
        {/* ========================================================================= */}
        {activeTab === 'ig_feed' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Visual Feed Card Preview */}
            <div
              className={`relative mx-auto w-[250px] aspect-square rounded-2xl overflow-hidden ${
                isFilmRating
                  ? 'border-2 border-amber-500/60 shadow-2xl bg-cover bg-center'
                  : 'bg-gradient-to-br from-[#171A1F] via-[#171A1F] to-[#0d0e15] border border-amber-500/40 shadow-2xl'
              } p-4 flex flex-col justify-between text-left`}
              style={
                isFilmRating && (data.filmPoster || data.image || data.imageUrl || data.filmBackdrop)
                  ? { backgroundImage: `url(${data.filmPoster || data.image || data.imageUrl || data.filmBackdrop})` }
                  : undefined
              }
            >
              {/* Dark Cinematic Vignette Overlay on top of Poster */}
              {isFilmRating && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#080a14]/90 via-[#0c0e1e]/85 to-[#05060c]/98 backdrop-blur-[1px]" />
              )}

              {/* Top watermark */}
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-black tracking-wider text-[#FF2E7E] uppercase">
                  {isFilmRating ? 'SOTOY FILM RATING' : 'Sotoy Film Post'}
                </span>
                <span className="text-[8px] text-slate-300 bg-white/10 px-1.5 py-0.5 rounded font-bold">
                  {isFilmRating ? '1:1 RATING FEED' : isBuzz ? 'BUZZ FEED' : isArticle ? 'ARTIKEL FEED' : '1:1 FEED'}
                </span>
              </div>

              {/* Center Content: Dynamic by Type */}
              <div className="relative z-10 py-1.5 space-y-2 overflow-hidden flex-1 flex flex-col justify-center">
                {isBuzz ? (
                  /* BUZZ FEED: Munculkan FOTO PROFIL */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={data.authorAvatar || data.image}
                        alt={data.authorName || 'Foto Profil'}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FF2E7E] border border-white/20 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {data.authorName || data.title.replace('Buzz Diskusi: ', '')}
                        </div>
                        <div className="text-[9px] text-[#FF2E7E] truncate">
                          {data.meta || 'Opini Pop-Culture @ Sotoy Film'}
                        </div>
                        <span className="inline-block text-[7px] font-black px-1.5 py-0.2 rounded bg-[#FF2E7E]/20 text-[#FF2E7E] border border-[#FF2E7E]/30 uppercase">
                          Buzz Komunitas
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl">
                      <p className="text-[10px] text-slate-200 italic line-clamp-3 leading-snug">
                        "{data.text || 'Opini sinema dan ulasan komunitas di platform Sotoy Film...'}"
                      </p>
                    </div>
                  </div>
                ) : isArticle ? (
                  /* ARTIKEL: Munculkan IMAGE ARTICLE */
                  <div className="space-y-1.5">
                    {(data.image || data.imageUrl) && (
                      <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10 shadow-md">
                        <img
                          src={data.image || data.imageUrl}
                          alt={data.title}
                          className="w-full h-full object-cover"
                        />
                        {data.category && (
                          <span className="absolute top-1.5 left-1.5 bg-[#FF2E7E] text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded shadow">
                            {data.category}
                          </span>
                        )}
                      </div>
                    )}
                    <h4 className="font-display font-black text-xs text-white leading-snug line-clamp-2">
                      {data.title}
                    </h4>
                    {data.authorName && (
                      <div className="flex items-center gap-1.5">
                        {data.authorAvatar && (
                          <img
                            src={data.authorAvatar}
                            alt={data.authorName}
                            className="w-3.5 h-3.5 rounded-full object-cover border border-white/20"
                          />
                        )}
                        <span className="text-[8px] text-[#FF2E7E] font-bold truncate">
                          ★ {data.authorName}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* FILM RATING & ULASAN: FEED FORMAT DENGAN BACKGROUND POSTER FILM */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-14 h-20 rounded-lg overflow-hidden border border-[#FF2E7E] shadow-md shrink-0">
                        <img
                          src={data.filmPoster || data.image || data.imageUrl}
                          alt={data.filmTitle || data.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="font-display font-black text-xs text-white leading-tight line-clamp-2">
                          {data.filmTitle || data.title}
                        </h4>
                        <div className="flex items-center gap-1.5">
                          <div className="bg-[#FFD000]/20 border border-[#FFD000]/40 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[#FFD000] font-medium text-xs">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{displayScore.toFixed(1)}</span>
                          </div>
                          <span className="text-[8px] font-bold text-cyan-300 uppercase truncate">
                            {getScoreVerdict(displayScore)}
                          </span>
                        </div>
                        <div className="text-[8px] text-slate-300 truncate">
                          {[data.filmYear, (data.filmGenres || []).slice(0, 2).join(', ')].filter(Boolean).join(' • ')}
                        </div>
                      </div>
                    </div>

                    {(data.headline || data.reviewText || data.reviewerName) && (
                      <div className="p-2 bg-slate-950/90 border border-slate-800 rounded-xl space-y-0.5">
                        <div className="flex items-center justify-between text-[7.5px] text-slate-400">
                          <span className="font-bold text-white truncate">
                            {data.reviewerName ? `Ulasan oleh ${data.reviewerName}` : 'Ulasan Komunitas'}
                          </span>
                          {data.reviewerRole && (
                            <span className="text-cyan-400 font-bold">{data.reviewerRole}</span>
                          )}
                        </div>
                        {data.headline && (
                          <div className="text-[8.5px] font-bold text-white line-clamp-1">
                            "{data.headline}"
                          </div>
                        )}
                        <p className="text-[8px] text-slate-300 italic line-clamp-2 leading-tight">
                          "{data.reviewText || data.text}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom footer */}
              <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[8px] font-bold text-cyan-300 truncate max-w-[130px]">
                  ★ {data.meta || 'Komunitas Pecinta Sinema'}
                </span>
                <span className="text-[8px] text-[#FF2E7E] font-mono">
                  sotoyfilm.id
                </span>
              </div>
            </div>

            {/* Action Buttons for IG Feed */}
            <div className="space-y-2 pt-1">
              <button
                id="download-ig-feed-card-btn"
                onClick={() => handleDownloadInstagramVisual('feed')}
                disabled={isGeneratingImage}
                className="w-full py-3 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] hover:brightness-110 active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#FD1D1D]/25 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingImage ? 'Membuat Gambar...' : 'Unduh Gambar Feed (PNG 1:1)'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCaption}
                  className="flex-1 py-2.5 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaption ? 'Caption Tersalin' : 'Salin Caption & Tagar'}</span>
                </button>

                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] rounded-xl text-xs font-bold text-white flex items-center gap-1.5 hover:brightness-110 transition-all shrink-0"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Buka IG</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
