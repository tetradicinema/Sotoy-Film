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
  Layers,
  Quote,
  Star,
  Award,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  renderBuzzStoryCanvas,
  BuzzCardInput,
  BuzzCardFilm,
  normalizeHandle,
} from '../../utils/buzzStoryCard';

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
  reviewerName?: string;
  reviewerAvatar?: string;
  reviewerRole?: string;
  headline?: string;
  reviewText?: string;
  // Specific for buzz attached photo and tagged film
  buzzImage?: string;
  taggedFilmPoster?: string;
  taggedFilmTitle?: string;
  taggedFilmYear?: number | string;
  taggedFilmScore?: number;
  taggedFilmGenres?: string[];
}

export const formatRoleLabel = (role?: string): string => {
  if (!role) return '';
  const r = role.toLowerCase().trim();
  if (r === 'admin') return 'ADMIN';
  if (r === 'writer' || r === 'penulis') return 'PENULIS';
  if (r === 'critic' || r === 'kurator' || r === 'si paling sotoy' || r === 'si paling sotoy (critic)') return 'SI PALING SOTOY';
  return '';
};

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

// Module-level cache for Sotoy Film logo data URL
let cachedLogoDataUrl: string | null = null;

export const getLogoDataUrl = async (): Promise<string> => {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const dataUrl = await ensureBlobUrl('/sotoy-logo-full.png');
    if (dataUrl && dataUrl.startsWith('data:')) {
      cachedLogoDataUrl = dataUrl;
      return dataUrl;
    }
    // Direct fetch fallback if ensureBlobUrl returned the plain relative path
    const res = await fetch('/sotoy-logo-full.png');
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
      cachedLogoDataUrl = readerDataUrl;
      return readerDataUrl;
    }
    console.warn('[getLogoDataUrl] Failed to fetch /sotoy-logo-full.png (non-200), falling back to relative path');
  } catch (err) {
    console.warn('[getLogoDataUrl] Error converting /sotoy-logo-full.png to data URL, falling back to relative path:', err);
  }
  return '/sotoy-logo-full.png';
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

// =============================================================================
// SINGLE SOURCE OF TRUTH: Film Rating Instagram Story Card (1080x1920)
// Designed edge-to-edge for Instagram Stories with proportional safe-zone spacing:
// - Top watermark padding: ~5-6% (110px on 1920px height)
// - Bottom footer padding: ~4-5% (90px on 1920px height)
// - Horizontal safe padding: ~5-6% (60px on 1080px width)
// Both the modal preview (scaled via CSS scale 0.25) and DOM-to-image PNG export
// render from this exact component, guaranteeing 100% visual parity with zero drift.
// =============================================================================
interface FilmRatingStoryCardProps {
  data: ShareData;
  displayScore: number;
  posterUrl?: string;
  reviewerAvatarUrl?: string;
  posterUrlForExport?: string;
  reviewerAvatarUrlForExport?: string;
  logoUrlForExport?: string;
}

export const FilmRatingStoryCard: React.FC<FilmRatingStoryCardProps> = ({
  data,
  displayScore,
  posterUrl,
  reviewerAvatarUrl,
  posterUrlForExport,
  reviewerAvatarUrlForExport,
  logoUrlForExport,
}) => {
  const effectivePoster = posterUrlForExport !== undefined ? posterUrlForExport : posterUrl;
  const effectiveAvatar =
    reviewerAvatarUrlForExport !== undefined
      ? reviewerAvatarUrlForExport
      : reviewerAvatarUrl || data.reviewerAvatar || data.authorAvatar;
  const effectiveLogo = logoUrlForExport || '/sotoy-logo-full.png';

  const genresStr = (data.filmGenres || []).slice(0, 3).join(' • ');
  const metaStr = [data.filmYear, genresStr].filter(Boolean).join(' | ');
  const reviewerName = data.reviewerName || data.authorName;
  const reviewerRole = data.reviewerRole;

  return (
    <div
      className="relative w-[1080px] h-[1920px] bg-[#0E1013] overflow-hidden flex flex-col justify-between text-left select-none"
      style={{ width: '1080px', height: '1920px' }}
    >
      {/* 1. Full-Bleed Film Poster (Full 100% height, edge-to-edge x=0, y=0) */}
      {effectivePoster && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={effectivePoster}
            alt={data.filmTitle || data.title}
            className="w-full h-full object-cover"
          />
          {/* Subtle top vignette for watermark contrast on bright posters */}
          <div className="absolute inset-x-0 top-0 h-[320px] bg-gradient-to-b from-[#0E1013]/95 via-[#0E1013]/50 to-transparent pointer-events-none" />
        </div>
      )}

      {/* 2. Single Continuous Dark Scrim fading poster smoothly into solid dark #0E1013 background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(14, 16, 19, 0.05) 20%, rgba(14, 16, 19, 0.2) 32%, rgba(14, 16, 19, 0.45) 42%, rgba(14, 16, 19, 0.72) 52%, rgba(14, 16, 19, 0.88) 60%, rgba(14, 16, 19, 0.96) 68%, #0E1013 75%, #0E1013 100%)',
        }}
      />

      {/* Top Watermark Overlay (Proportional safe-zone: ~5-6% = 110px top padding, 60px horizontal padding) */}
      <div className="relative z-10 pt-[110px] px-[60px] flex items-center justify-between">
        <img
          src={effectiveLogo}
          alt="Sotoy Film"
          className="w-[380px] h-auto object-contain drop-shadow-lg"
        />
        <div className="px-7 py-3.5 rounded-full font-black text-[28px] tracking-wider text-[#FF2E7E] bg-[#0E1013]/90 border-2 border-[#FF2E7E]/40 backdrop-blur-md shadow-lg whitespace-nowrap uppercase">
          SKOR & ULASAN
        </div>
      </div>

      {/* Center & Lower Content (Proportional 50px horizontal safe-zone padding) */}
      <div className="relative z-10 px-[50px] flex-1 flex flex-col justify-end text-center space-y-4 pb-5">
        {/* Film Title & Meta */}
        <div className="space-y-1.5">
          <h1 className="font-display font-black text-[44px] text-white leading-[1.18] line-clamp-2 drop-shadow-md">
            {data.filmTitle || data.title}
          </h1>
          {metaStr && (
            <div className="text-[20px] text-[#FF2E7E] font-bold tracking-wide">
              {metaStr}
            </div>
          )}
        </div>

        {/* Rating Display (Centered, dominant number, NO box) */}
        <div className="py-0.5">
          <div className="flex items-center justify-center gap-3">
            <Star className="w-13 h-13 text-[#FFD000] fill-current drop-shadow" />
            <span className="font-display font-black text-[92px] text-[#FFD000] leading-none tracking-tight">
              {displayScore.toFixed(1)}
            </span>
            <span className="text-[26px] text-slate-400 font-bold self-end mb-2">/ 10.0</span>
          </div>
          <div className="text-[20px] font-black text-[#00F0FF] uppercase tracking-widest mt-1">
            ★ {getScoreVerdict(displayScore)} ★
          </div>
        </div>

        {/* Reviewer Row */}
        {(reviewerName || effectiveAvatar) && (
          <div className="flex items-center justify-center gap-3 pt-0.5">
            {effectiveAvatar ? (
              <img
                src={effectiveAvatar}
                alt={reviewerName || 'Reviewer'}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#FF2E7E] shadow-md"
              />
            ) : (
              <Quote className="w-5 h-5 text-[#FF2E7E] opacity-90 inline" />
            )}
            <span className="text-[20px] text-slate-200 font-bold truncate max-w-[620px]">
              Ulasan oleh {reviewerName || 'Cinephile'}
              {reviewerRole && (
                <span className="text-[18px] text-[#FF2E7E] font-semibold ml-2">
                  ({reviewerRole})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Headline Quote */}
        {data.headline && (
          <div className="text-[24px] font-bold text-white line-clamp-1 italic px-2 leading-snug">
            “{data.headline}”
          </div>
        )}

        {/* Review Excerpt */}
        {(data.reviewText || data.text) && (
          <p className="text-[20px] text-slate-300 italic line-clamp-3 leading-[1.4] px-2">
            “{data.reviewText || data.text}”
          </p>
        )}
      </div>

      {/* Card Bottom Footer (Proportional safe-zone: ~4-5% = 90px bottom padding, 4-5% = 50px horizontal padding) */}
      <div className="relative z-10 px-[50px] pb-[90px] pt-2">
        <div className="pt-4 border-t border-white/15 flex items-center justify-between">
          <span className="text-[20px] font-bold text-[#FF2E7E]">
            ★ Ulas & Nilai Film di Sotoy Film
          </span>
          <span className="text-[20px] text-[#00F0FF] font-mono font-bold">
            sotoyfilm.my.id
          </span>
        </div>
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
  const [buzzStoryDataUrl, setBuzzStoryDataUrl] = useState<string | null>(null);
  const [isRenderingBuzzStory, setIsRenderingBuzzStory] = useState(false);
  const buzzCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isOpen = propIsOpen !== undefined ? propIsOpen : shareModalData !== null;
  const onClose = propOnClose || closeShareModal;
  const data = propData !== undefined ? propData : shareModalData;

  const posterUrl = data ? data.filmPoster || data.image || data.imageUrl || data.filmBackdrop : undefined;
  const currentUrl = data?.url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = data ? `${data.title}\n\n${data.text ? data.text.slice(0, 140) + '...' : ''}\n\nBaca selengkapnya di Sotoy Film:` : '';
  const igCaption = data ? `${data.title}\n\n"${data.text ? data.text.slice(0, 280) : ''}"\n\n📌 Simak ulasan dan diskusinya di: ${currentUrl}\n\n#SotoyFilm #ReviewFilm #CinephileIndonesia #FilmBagus #PopCulture #DiskusiFilm #KritikFilm` : '';

  const handleCopyLink = () => {
    if (!data) return;
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
  const isBuzz = data?.type === 'buzz';
  const isArticle = data?.type === 'article';
  const isFilmRating = data
    ? data.type === 'review' ||
      data.type === 'film' ||
      (!isBuzz &&
        !isArticle &&
        (typeof data.rating === 'number' ||
          typeof data.skorSotoy === 'number' ||
          !!data.filmPoster ||
          !!data.filmTitle))
    : false;

  const displayScore = data
    ? typeof data.rating === 'number'
      ? data.rating
      : typeof data.skorSotoy === 'number'
      ? data.skorSotoy
      : 4.5
    : 4.5;

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
        const authorHandle = normalizeHandle(
          data.authorHandle || (data.meta?.startsWith('@') ? data.meta.split(' ')[0] : undefined)
        );
        const roleLabel = data.roleLabel || formatRoleLabel(data.authorRole);

        const filmObj: BuzzCardFilm | null =
          data.taggedFilmTitle || data.filmTitle
            ? {
                title: data.taggedFilmTitle || data.filmTitle || '',
                year: data.taggedFilmYear || data.filmYear,
                poster: data.taggedFilmPoster || data.filmPoster,
                score: data.taggedFilmScore ?? data.rating ?? data.skorSotoy,
                genres: data.taggedFilmGenres || data.filmGenres,
              }
            : null;

        const buzzInput: BuzzCardInput = {
          authorName: data.authorName || data.title.replace('Buzz Diskusi: ', '').trim(),
          authorHandle: authorHandle,
          authorAvatar: data.authorAvatar || data.image,
          roleLabel: roleLabel,
          text: data.text || '',
          image: data.buzzImage || (data.type === 'buzz' && data.image && data.image !== data.authorAvatar ? data.image : undefined),
          film: filmObj,
          tags: data.tags,
          likes: data.likes,
          replies: data.replies,
        };

        const canvas = await renderBuzzStoryCanvas(buzzInput, {
          loadImage: loadCanvasImage,
          onPhotoLoadFailed: () => {
            showToast('Foto gagal dimuat di story, coba lagi');
          },
        });
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
  }, [isOpen, data, activeTab]);

  // Generate high-resolution Instagram Card PNG using Canvas / DOM Capture
  const handleDownloadInstagramVisual = async (format: 'story' = 'story') => {
    if (!data) return;
    setIsGeneratingImage(true);
    try {
      // 1. Buzz Story (Threads-style 1080x1920) - Uses renderBuzzStoryCanvas directly
      if (isBuzz) {
        let canvas = buzzCanvasRef.current;
        if (!canvas) {
          const authorHandle = normalizeHandle(
            data.authorHandle || (data.meta?.startsWith('@') ? data.meta.split(' ')[0] : undefined)
          );
          const roleLabel = data.roleLabel || formatRoleLabel(data.authorRole);

          const filmObj: BuzzCardFilm | null =
            data.taggedFilmTitle || data.filmTitle
              ? {
                  title: data.taggedFilmTitle || data.filmTitle || '',
                  year: data.taggedFilmYear || data.filmYear,
                  poster: data.taggedFilmPoster || data.filmPoster,
                  score: data.taggedFilmScore ?? data.rating ?? data.skorSotoy,
                  genres: data.taggedFilmGenres || data.filmGenres,
                }
              : null;

          const buzzInput: BuzzCardInput = {
            authorName: data.authorName || data.title.replace('Buzz Diskusi: ', '').trim(),
            authorHandle: authorHandle,
            authorAvatar: data.authorAvatar || data.image,
            roleLabel: roleLabel,
            text: data.text || '',
            image: data.buzzImage || (data.type === 'buzz' && data.image && data.image !== data.authorAvatar ? data.image : undefined),
            film: filmObj,
            tags: data.tags,
            likes: data.likes,
            replies: data.replies,
          };

          canvas = await renderBuzzStoryCanvas(buzzInput, {
            loadImage: loadCanvasImage,
            onPhotoLoadFailed: () => {
              showToast('Foto gagal dimuat di story, coba lagi');
            },
          });
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

        const fileName = `sotoyfilm-buzz-story-${Date.now()}.png`;
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
            showToast('Gambar Story (.PNG) siap disimpan ke galeri foto!');
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

          showToast('Gambar Story (.PNG) berhasil diunduh! Siap diunggah ke Instagram Stories.');
        }
        return;
      }

      // 2. Article Instagram Story (9:16) - Full-bleed, edge-to-edge cinematic Canvas 2D rendering
      if (isArticle && format === 'story') {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await document.fonts.ready;
        }

        const width = 1080;
        const height = 1920;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          showToast('Gagal menginisialisasi perender visual.');
          setIsGeneratingImage(false);
          return;
        }

        // Base solid background (#0E1013)
        ctx.fillStyle = '#0E1013';
        ctx.fillRect(0, 0, width, height);

        // 1. Background + Cover: Draw article cover over roughly top 60% (1150px) using cover-fit
        const coverUrl = data.image || data.imageUrl;
        const coverH = 1150;
        let coverLoaded = false;

        if (coverUrl) {
          try {
            const coverImg = await loadCanvasImage(coverUrl);
            coverLoaded = true;

            const imgAspect = coverImg.width / coverImg.height;
            const targetAspect = width / coverH; // 1080 / 1150

            let sx = 0,
              sy = 0,
              sWidth = coverImg.width,
              sHeight = coverImg.height;
            if (imgAspect > targetAspect) {
              sWidth = coverImg.height * targetAspect;
              sx = (coverImg.width - sWidth) / 2;
            } else {
              sHeight = coverImg.width / targetAspect;
              sy = (coverImg.height - sHeight) / 2;
            }

            ctx.drawImage(coverImg, sx, sy, sWidth, sHeight, 0, 0, width, coverH);
          } catch (coverErr) {
            console.warn('[SocialShareModal] Article cover load failed for canvas, using fallback gradient:', coverErr);
          }
        }

        if (!coverLoaded) {
          const fallbackGrad = ctx.createLinearGradient(0, 0, 0, coverH);
          fallbackGrad.addColorStop(0, '#171A21');
          fallbackGrad.addColorStop(0.5, '#0E1013');
          fallbackGrad.addColorStop(1, '#08090C');
          ctx.fillStyle = fallbackGrad;
          ctx.fillRect(0, 0, width, coverH);

          const glow = ctx.createRadialGradient(width / 2, 450, 40, width / 2, 450, 500);
          glow.addColorStop(0, 'rgba(255, 46, 126, 0.25)');
          glow.addColorStop(1, 'rgba(14, 16, 19, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, width, coverH);
        }

        // 2. Single Continuous Gradient: No seam, reaches opaque #0E1013 at bottom edge of cover (~58-60%)
        const scrim = ctx.createLinearGradient(0, 0, 0, height);
        scrim.addColorStop(0, 'rgba(14, 16, 19, 0.90)');
        scrim.addColorStop(0.10, 'rgba(14, 16, 19, 0.50)');
        scrim.addColorStop(0.22, 'rgba(14, 16, 19, 0.25)');
        scrim.addColorStop(0.35, 'rgba(14, 16, 19, 0.55)');
        scrim.addColorStop(0.48, 'rgba(14, 16, 19, 0.85)');
        scrim.addColorStop(0.58, '#0E1013');
        scrim.addColorStop(1, '#0E1013');
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, width, height);

        // 3. Top Row: Sotoy Film Logo (top-left) & Category Pill (top-right)
        const topPad = 110;
        const sidePad = 60;
        const logoTargetW = 380;
        let logoTargetH = 95;

        // Draw Sotoy Film Logo (natural aspect ratio, 380px wide)
        try {
          const logoImg = await loadCanvasImage('/sotoy-logo-full.png');
          logoTargetH = logoImg.height * (logoTargetW / logoImg.width);
          ctx.drawImage(logoImg, sidePad, topPad, logoTargetW, logoTargetH);
        } catch (logoErr) {
          console.warn('[SocialShareModal] Could not load /sotoy-logo-full.png for canvas:', logoErr);
          ctx.fillStyle = '#FF2E7E';
          ctx.font = "900 48px 'Geist', 'Plus Jakarta Sans', sans-serif";
          ctx.textAlign = 'left';
          ctx.fillText('SOTOY FILM', sidePad, topPad + 58);
          logoTargetH = 80;
        }

        // Draw Category Pill (Scaled ~1.25x: font 28px, height 60px, vertically centered with logo)
        const categoryText = (data.category || 'ARTIKEL').toUpperCase();
        const maxPillW = width - sidePad * 2 - logoTargetW - 40;
        const pillPadX = 26;
        let pillFontSize = 28;
        let pillText = categoryText;
        let catTextW = 0;

        ctx.save();
        while (pillFontSize >= 16) {
          ctx.font = `900 ${pillFontSize}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
          catTextW = ctx.measureText(pillText).width;
          if (catTextW + pillPadX * 2 <= maxPillW) {
            break;
          }
          pillFontSize -= 2;
        }

        if (catTextW + pillPadX * 2 > maxPillW) {
          ctx.font = `900 16px 'Geist', 'Plus Jakarta Sans', sans-serif`;
          let truncated = pillText;
          while (
            truncated.length > 0 &&
            ctx.measureText(`${cleanTrailingPunctuation(truncated)}...`).width + pillPadX * 2 > maxPillW
          ) {
            truncated = truncated.slice(0, -1);
          }
          pillText = `${cleanTrailingPunctuation(truncated)}...`;
          catTextW = ctx.measureText(pillText).width;
        }
        ctx.restore();

        const pillH = 60;
        const pillW = catTextW + pillPadX * 2;
        const pillX = width - sidePad - pillW;
        const logoCenterY = topPad + logoTargetH / 2;
        const pillY = logoCenterY - pillH / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(14, 16, 19, 0.90)';
        ctx.strokeStyle = 'rgba(255, 46, 126, 0.45)';
        ctx.lineWidth = 2.5;
        drawRoundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FF2E7E';
        ctx.font = `900 ${pillFontSize}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH / 2);
        ctx.restore();

        // 4. Text Block (Sequential y-cursor on gradient, bottom-anchored)
        const maxTextW = width - sidePad * 2; // 960px

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
                // Last line: append remainder with ellipsis if necessary, stripping trailing punctuation
                const remainingWords = words.slice(i).join(' ');
                let lastLine = remainingWords;
                while (
                  ctx.measureText(`${cleanTrailingPunctuation(lastLine)}...`).width > maxWidth &&
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
          if (currentLine) {
            lines.push(currentLine);
          }
          ctx.restore();
          return lines.slice(0, maxLines);
        };

        const titleFont = "900 80px 'Geist', 'Plus Jakarta Sans', sans-serif";
        const titleLineH = 92; // ~1.15
        const titleLines = getWrappedLines(data.title || '', maxTextW, titleFont, 4);
        const titleHeight = titleLines.length * titleLineH;

        const excerptFont = "34px 'Plus Jakarta Sans', sans-serif";
        const excerptLineH = 46;
        const excerptLines = data.text ? getWrappedLines(data.text, maxTextW, excerptFont, 3) : [];
        const excerptGap = excerptLines.length > 0 ? 24 : 0;
        const excerptHeight = excerptLines.length * excerptLineH;

        // Byline data check (built from separate fields only, without duplicate author or raw meta dump)
        const bylineStr = getArticleStoryByline(data);

        let authorAvatarImg: HTMLImageElement | null = null;
        if (data.authorAvatar) {
          try {
            authorAvatarImg = await loadCanvasImage(data.authorAvatar);
          } catch {
            // graceful fallback
          }
        }

        const hasByline = Boolean(bylineStr || authorAvatarImg);
        const bylineGap = hasByline ? 24 : 0;
        const bylineHeight = hasByline ? 48 : 0;

        const totalContentH = titleHeight + excerptGap + excerptHeight + bylineGap + bylineHeight;
        const targetBottom = 1720;
        let yCursor = Math.max(920, targetBottom - totalContentH);

        ctx.textBaseline = 'top';

        // Title
        ctx.font = titleFont;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        for (const line of titleLines) {
          ctx.fillText(line, sidePad, yCursor);
          yCursor += titleLineH;
        }

        // Excerpt
        if (excerptLines.length > 0) {
          yCursor += excerptGap;
          ctx.font = excerptFont;
          ctx.fillStyle = '#CBD5E1';
          ctx.textAlign = 'left';
          for (const line of excerptLines) {
            ctx.fillText(line, sidePad, yCursor);
            yCursor += excerptLineH;
          }
        }

        // Byline
        if (hasByline) {
          yCursor += bylineGap;
          let bylineX = sidePad;
          const avatarSize = 44;

          if (authorAvatarImg) {
            const avatarCenterY = yCursor + avatarSize / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(bylineX + avatarSize / 2, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(authorAvatarImg, bylineX, yCursor, avatarSize, avatarSize);
            ctx.restore();

            ctx.save();
            ctx.strokeStyle = '#FF2E7E';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(bylineX + avatarSize / 2, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            bylineX += avatarSize + 16;
          }

          if (bylineStr) {
            ctx.fillStyle = '#E2E8F0';
            ctx.font = "bold 24px 'Geist', 'Plus Jakarta Sans', sans-serif";
            ctx.textAlign = 'left';
            const textOffsetY = authorAvatarImg ? yCursor + (avatarSize - 24) / 2 : yCursor + 10;
            ctx.fillText(bylineStr, bylineX, textOffsetY);
          }

          yCursor += bylineHeight;
        }

        // 5. Single Footer (thin divider + left accent text + right cyan domain)
        const footerDividerY = height - 135; // 1785px
        const footerTextY = height - 90; // 1830px

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sidePad, footerDividerY);
        ctx.lineTo(width - sidePad, footerDividerY);
        ctx.stroke();

        ctx.fillStyle = '#FF2E7E';
        ctx.font = "bold 22px 'Geist', 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = 'left';
        ctx.fillText('★ Baca selengkapnya di Sotoy Film', sidePad, footerTextY);

        ctx.fillStyle = '#00F0FF';
        ctx.font = "bold 22px 'Geist Mono', monospace";
        ctx.textAlign = 'right';
        ctx.fillText('sotoyfilm.my.id', width - sidePad, footerTextY);

        // Export Canvas to PNG Blob
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (!blob) {
          throw new Error('Gagal mengonversi kanvas artikel menjadi gambar.');
        }

        const fileName = `sotoyfilm-article-story-${Date.now()}.png`;
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
            showToast('Gambar Story (.PNG) siap disimpan ke galeri foto!');
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

          showToast('Gambar Story (.PNG) berhasil diunduh! Siap diunggah ke Instagram Stories.');
        }
        return;
      }

      // 3. Film Rating Story (9:16) - Direct high-resolution Canvas 2D rendering
      if (isFilmRating && format === 'story') {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await document.fonts.ready;
        }

        const width = 1080;
        const height = 1920;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          showToast('Gagal menginisialisasi perender visual.');
          setIsGeneratingImage(false);
          return;
        }

        // Base solid background (#0E1013)
        ctx.fillStyle = '#0E1013';
        ctx.fillRect(0, 0, width, height);

        // 1. Full-Bleed Film Poster (Full 1080x1920 edge-to-edge cover-fit)
        const posterUrl = data.filmPoster || data.image || data.imageUrl || data.filmBackdrop;
        let posterLoaded = false;
        if (posterUrl) {
          try {
            const posterImg = await loadCanvasImage(posterUrl);
            posterLoaded = true;

            const imgAspect = posterImg.width / posterImg.height;
            const canvasAspect = width / height; // 1080 / 1920 = 0.5625

            let sx = 0, sy = 0, sWidth = posterImg.width, sHeight = posterImg.height;
            if (imgAspect > canvasAspect) {
              sWidth = posterImg.height * canvasAspect;
              sx = (posterImg.width - sWidth) / 2;
            } else {
              sHeight = posterImg.width / canvasAspect;
              sy = 0; // Focus on top of key art
            }

            ctx.drawImage(posterImg, sx, sy, sWidth, sHeight, 0, 0, width, height);
          } catch (posterErr) {
            console.warn('[SocialShareModal] Poster load failed for canvas, using fallback gradient:', posterErr);
          }
        }

        if (!posterLoaded) {
          const fallbackGrad = ctx.createLinearGradient(0, 0, 0, height);
          fallbackGrad.addColorStop(0, '#171A21');
          fallbackGrad.addColorStop(0.5, '#0E1013');
          fallbackGrad.addColorStop(1, '#08090C');
          ctx.fillStyle = fallbackGrad;
          ctx.fillRect(0, 0, width, height);
        }

        // 2. Single Continuous Dark Scrim Gradient covering full height (no separate localized overlay)
        // Top vignette for logo & badge legibility on bright posters (h: 320px)
        const topVignette = ctx.createLinearGradient(0, 0, 0, 320);
        topVignette.addColorStop(0, 'rgba(14, 16, 19, 0.90)');
        topVignette.addColorStop(0.5, 'rgba(14, 16, 19, 0.45)');
        topVignette.addColorStop(1, 'rgba(14, 16, 19, 0)');
        ctx.fillStyle = topVignette;
        ctx.fillRect(0, 0, width, 320);

        // Lower scrim fading poster smoothly into solid dark #0E1013 background (no hard seam)
        const mainScrim = ctx.createLinearGradient(0, 0, 0, height);
        mainScrim.addColorStop(0, 'rgba(14, 16, 19, 0)');
        mainScrim.addColorStop(0.20, 'rgba(14, 16, 19, 0.05)');
        mainScrim.addColorStop(0.32, 'rgba(14, 16, 19, 0.20)');
        mainScrim.addColorStop(0.42, 'rgba(14, 16, 19, 0.45)');
        mainScrim.addColorStop(0.52, 'rgba(14, 16, 19, 0.72)');
        mainScrim.addColorStop(0.60, 'rgba(14, 16, 19, 0.88)');
        mainScrim.addColorStop(0.68, 'rgba(14, 16, 19, 0.96)');
        mainScrim.addColorStop(0.75, '#0E1013');
        mainScrim.addColorStop(1, '#0E1013');
        ctx.fillStyle = mainScrim;
        ctx.fillRect(0, 0, width, height);

        // 3. Proportional Top Watermark: Sotoy Film Logo + "SKOR & ULASAN" Badge
        const topPad = 110;
        const sidePad = 60;
        const logoTargetW = 380;
        let logoTargetH = 95;

        // Draw Sotoy Film Logo (natural aspect ratio, 380px wide)
        try {
          const logoImg = await loadCanvasImage('/sotoy-logo-full.png');
          logoTargetH = logoImg.height * (logoTargetW / logoImg.width);
          ctx.drawImage(logoImg, sidePad, topPad, logoTargetW, logoTargetH);
        } catch (logoErr) {
          console.warn('[SocialShareModal] Could not load /sotoy-logo-full.png for canvas:', logoErr);
          ctx.fillStyle = '#FF2E7E';
          ctx.font = "900 48px 'Geist', 'Plus Jakarta Sans', sans-serif";
          ctx.textAlign = 'left';
          ctx.fillText('SOTOY FILM', sidePad, topPad + 58);
          logoTargetH = 80;
        }

        // Draw "SKOR & ULASAN" Badge (pill badge with #FF2E7E border & text)
        const badgeText = 'SKOR & ULASAN';
        const maxBadgeW = width - sidePad * 2 - logoTargetW - 40;
        const badgePadX = 26;
        let badgeFontSize = 28;
        let badgeRenderText = badgeText;
        let badgeTextW = 0;

        ctx.save();
        while (badgeFontSize >= 16) {
          ctx.font = `900 ${badgeFontSize}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
          badgeTextW = ctx.measureText(badgeRenderText).width;
          if (badgeTextW + badgePadX * 2 <= maxBadgeW) {
            break;
          }
          badgeFontSize -= 2;
        }

        if (badgeTextW + badgePadX * 2 > maxBadgeW) {
          ctx.font = `900 16px 'Geist', 'Plus Jakarta Sans', sans-serif`;
          let truncated = badgeRenderText;
          while (
            truncated.length > 0 &&
            ctx.measureText(`${cleanTrailingPunctuation(truncated)}...`).width + badgePadX * 2 > maxBadgeW
          ) {
            truncated = truncated.slice(0, -1);
          }
          badgeRenderText = `${cleanTrailingPunctuation(truncated)}...`;
          badgeTextW = ctx.measureText(badgeRenderText).width;
        }
        ctx.restore();

        const badgeH = 60;
        const badgeW = badgeTextW + badgePadX * 2;
        const badgeX = width - sidePad - badgeW;
        const logoCenterY = topPad + logoTargetH / 2;
        const badgeY = logoCenterY - badgeH / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(14, 16, 19, 0.90)';
        ctx.strokeStyle = 'rgba(255, 46, 126, 0.45)';
        ctx.lineWidth = 2.5;
        drawRoundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FF2E7E';
        ctx.font = `900 ${badgeFontSize}px 'Geist', 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeRenderText, badgeX + badgeW / 2, badgeY + badgeH / 2);
        ctx.restore();

        // 4. Sequential Y-Cursor Text Layout (Matching JSX Reference Exactly)
        const maxTextW = width - (sidePad * 2) - 20; // 940px
        const filmTitle = data.filmTitle || data.title || '';
        const genresStr = (data.filmGenres || []).slice(0, 3).join(' • ');
        const metaStr = [data.filmYear, genresStr].filter(Boolean).join(' | ');

        const getWrappedLines = (
          text: string,
          maxWidth: number,
          font: string,
          maxLines: number = 3
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
                // Last line: append remainder with ellipsis if necessary, stripping trailing punctuation
                const remainingWords = words.slice(i).join(' ');
                let lastLine = remainingWords;
                while (
                  ctx.measureText(`${cleanTrailingPunctuation(lastLine)}...`).width > maxWidth &&
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
          if (currentLine) {
            lines.push(currentLine);
          }
          ctx.restore();
          return lines.slice(0, maxLines);
        };

        // Measure heights of each block
        const titleFont = "900 44px 'Geist', 'Plus Jakarta Sans', sans-serif";
        const titleLineH = 54;
        const titleLines = getWrappedLines(filmTitle, maxTextW, titleFont, 2);
        const titleHeight = titleLines.length * titleLineH;

        const metaFont = "bold 20px 'Geist', 'Plus Jakarta Sans', sans-serif";
        const metaLineH = 28;
        const metaHeight = metaStr ? metaLineH : 0;
        const metaGap = metaStr ? 8 : 0;

        const ratingBlockGap = 20;
        const ratingScoreRowH = 92;
        const verdictGap = 8;
        const verdictH = 26;
        const ratingTotalH = ratingBlockGap + ratingScoreRowH + verdictGap + verdictH;

        const reviewerName = data.reviewerName || data.authorName;
        const reviewerRole = data.reviewerRole;
        const rawAvatar = data.reviewerAvatar || data.authorAvatar;
        const hasReviewer = Boolean(reviewerName || rawAvatar);
        const reviewerGap = hasReviewer ? 18 : 0;
        const reviewerHeight = hasReviewer ? 40 : 0;

        const headlineFont = "bold 24px 'Geist', 'Plus Jakarta Sans', sans-serif";
        const headlineLineH = 34;
        const headlineLines = data.headline ? getWrappedLines(`“${data.headline}”`, maxTextW, headlineFont, 2) : [];
        const headlineGap = headlineLines.length > 0 ? 16 : 0;
        const headlineHeight = headlineLines.length * headlineLineH;

        const reviewText = data.reviewText || data.text;
        const reviewFont = "italic 20px 'Plus Jakarta Sans', sans-serif";
        const reviewLineH = 30;
        const reviewLines = reviewText ? getWrappedLines(`“${reviewText}”`, maxTextW, reviewFont, 3) : [];
        const reviewGap = reviewLines.length > 0 ? 14 : 0;
        const reviewHeight = reviewLines.length * reviewLineH;

        // Total calculated height of all content blocks
        const totalContentH =
          titleHeight +
          metaGap +
          metaHeight +
          ratingTotalH +
          reviewerGap +
          reviewerHeight +
          headlineGap +
          headlineHeight +
          reviewGap +
          reviewHeight;

        // Safe vertical range between dark scrim area and footer line (footer line is at 1795px)
        const availableTop = 1100;
        const availableBottom = 1755;
        const availableSpace = availableBottom - availableTop;

        let yCursor =
          totalContentH < availableSpace
            ? availableTop + (availableSpace - totalContentH) * 0.55
            : Math.max(1040, availableBottom - totalContentH);

        // Render sequentially using top baseline
        ctx.textBaseline = 'top';

        // A. Film Title
        ctx.font = titleFont;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        for (const line of titleLines) {
          ctx.fillText(line, width / 2, yCursor);
          yCursor += titleLineH;
        }

        // B. Meta String
        if (metaStr) {
          yCursor += metaGap;
          ctx.font = metaFont;
          ctx.fillStyle = '#FF2E7E';
          ctx.textAlign = 'center';
          ctx.fillText(metaStr, width / 2, yCursor);
          yCursor += metaLineH;
        }

        // C. Rating Display (Star + Score + / 10.0 + Verdict)
        yCursor += ratingBlockGap;
        const scoreStr = displayScore.toFixed(1);

        ctx.font = "900 92px 'Geist', 'Plus Jakarta Sans', sans-serif";
        const scoreW = ctx.measureText(scoreStr).width;
        ctx.font = "bold 50px sans-serif";
        const starW = ctx.measureText('★').width;
        ctx.font = "bold 26px 'Geist', 'Plus Jakarta Sans', sans-serif";
        const denomW = ctx.measureText('/ 10.0').width;

        const totalRatingRowW = starW + 14 + scoreW + 12 + denomW;
        const startRatingX = (width - totalRatingRowW) / 2;

        // Draw Star Icon
        ctx.fillStyle = '#FFD000';
        ctx.font = "bold 50px sans-serif";
        ctx.textAlign = 'left';
        ctx.fillText('★', startRatingX, yCursor + 20);

        // Draw Score Number
        ctx.fillStyle = '#FFD000';
        ctx.font = "900 92px 'Geist', 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(scoreStr, startRatingX + starW + 14, yCursor);

        // Draw Denominator "/ 10.0"
        ctx.fillStyle = '#94A3B8';
        ctx.font = "bold 26px 'Geist', 'Plus Jakarta Sans', sans-serif";
        ctx.fillText('/ 10.0', startRatingX + starW + 14 + scoreW + 12, yCursor + 52);

        yCursor += ratingScoreRowH;

        // Draw Verdict
        yCursor += verdictGap;
        ctx.fillStyle = '#00F0FF';
        ctx.font = "900 20px 'Geist', 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(`★ ${getScoreVerdict(displayScore)} ★`, width / 2, yCursor);
        yCursor += verdictH;

        // D. Reviewer Row
        if (hasReviewer) {
          yCursor += reviewerGap;
          const reviewerText = `Ulasan oleh ${reviewerName || 'Cinephile'}${reviewerRole ? ` (${reviewerRole})` : ''}`;
          ctx.font = "bold 20px 'Geist', 'Plus Jakarta Sans', sans-serif";
          const textW = ctx.measureText(reviewerText).width;

          let avatarImg: HTMLImageElement | null = null;
          if (rawAvatar) {
            try {
              avatarImg = await loadCanvasImage(rawAvatar);
            } catch {
              // fallback gracefully
            }
          }

          if (avatarImg) {
            const avatarSize = 40;
            const gap = 12;
            const rowW = avatarSize + gap + textW;
            const startX = (width - rowW) / 2;
            const centerY = yCursor + avatarSize / 2;

            ctx.save();
            ctx.beginPath();
            ctx.arc(startX + avatarSize / 2, centerY, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, startX, yCursor, avatarSize, avatarSize);
            ctx.restore();

            ctx.save();
            ctx.strokeStyle = '#FF2E7E';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(startX + avatarSize / 2, centerY, avatarSize / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = '#E2E8F0';
            ctx.textAlign = 'left';
            ctx.fillText(reviewerText, startX + avatarSize + gap, yCursor + (avatarSize - 20) / 2);
          } else {
            ctx.fillStyle = '#E2E8F0';
            ctx.textAlign = 'center';
            ctx.fillText(reviewerText, width / 2, yCursor + 8);
          }

          yCursor += reviewerHeight;
        }

        // E. Headline Quote
        if (headlineLines.length > 0) {
          yCursor += headlineGap;
          ctx.font = headlineFont;
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          for (const line of headlineLines) {
            ctx.fillText(line, width / 2, yCursor);
            yCursor += headlineLineH;
          }
        }

        // F. Review Excerpt
        if (reviewLines.length > 0) {
          yCursor += reviewGap;
          ctx.font = reviewFont;
          ctx.fillStyle = '#CBD5E1';
          ctx.textAlign = 'center';
          for (const line of reviewLines) {
            ctx.fillText(line, width / 2, yCursor);
            yCursor += reviewLineH;
          }
        }

        // 5. Proportional Bottom Footer Line (safe-zone: ~90px from bottom edge)
        const footerY = height - 90; // 1830px

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sidePad, footerY - 35);
        ctx.lineTo(width - sidePad, footerY - 35);
        ctx.stroke();

        ctx.fillStyle = '#FF2E7E';
        ctx.font = "bold 20px 'Geist', 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = 'left';
        ctx.fillText('★ Ulas & Nilai Film di Sotoy Film', sidePad, footerY);

        ctx.fillStyle = '#00F0FF';
        ctx.font = "bold 20px 'Geist Mono', monospace";
        ctx.textAlign = 'right';
        ctx.fillText('sotoyfilm.my.id', width - sidePad, footerY);

        // Export Canvas to PNG Blob
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (!blob) {
          throw new Error('Gagal mengonversi kanvas visual menjadi gambar.');
        }

        const fileName = `sotoyfilm-rating-story-${Date.now()}.png`;

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
            showToast('Gambar Story (.PNG) siap disimpan ke galeri foto!');
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

          showToast('Gambar Story (.PNG) berhasil diunduh! Siap diunggah ke Instagram Stories.');
        }
        return;
      }

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
      if (!isFilmRating || format !== 'story') {
        ctx.strokeStyle = '#222538';
        ctx.lineWidth = 4;
        ctx.strokeRect(36, 36, width - 72, height - 72);
      }

      // 4. Header Branding Bar (Rendered for other formats; story film rating uses in-card full-bleed logo watermark)
      if (!isFilmRating || format !== 'story') {
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
      }

      // 5. Main Card Container
      const cardX = 70;
      const cardY = format === 'story' ? 180 : 130;
      const cardW = width - 140;
      const cardH = format === 'story' ? height - 330 : height - 230;

      if (!isFilmRating || format !== 'story') {
        ctx.fillStyle = '#101221';
        ctx.strokeStyle = '#2c3047';
        ctx.lineWidth = 3;
        drawRoundRectPath(ctx, cardX, cardY, cardW, cardH, 32);
        ctx.fill();
        ctx.stroke();
      }

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
      // DYNAMIC RENDERING: ARTIKEL (IMAGE ARTICLE) VS FILM RATING
      // =========================================================================
      let currentContentY = cardY + 50;

      if (isArticle) {
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

        // FEED FORMAT (1:1) - PRESERVED EXACTLY
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

      // 6. Card Footer Branding & Outer Footer (for standard card layouts; story film rating has its own edge-to-edge footer)
      if (!isFilmRating || format !== 'story') {
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
        ctx.fillText('sotoyfilm.my.id', 70, height - 70);
      }

      // Export image to PNG Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) {
        throw new Error('Gagal mengonversi kanvas menjadi gambar.');
      }

      const fileName = `sotoyfilm-${isFilmRating ? 'rating' : isBuzz ? 'buzz' : 'artikel'}-${format}-${Date.now()}.png`;

      // Check if Web Share API with file support is available (restricted to touch/mobile devices)
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
          showToast(
            format === 'story'
              ? 'Gambar Story (.PNG) siap disimpan ke galeri foto!'
              : 'Gambar Feed (.PNG) siap disimpan ke galeri foto!'
          );
        } catch (shareErr: any) {
          // If user dismissed / cancelled the native share sheet, ignore gracefully without showing error toast
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

      // Desktop fallback or when Web Share with files is unsupported / failed:
      // Use Blob URL (<a download>) instead of base64 data URL
      if (!sharedViaSheet) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = blobUrl;
        link.click();
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);

        showToast(
          format === 'story'
            ? 'Gambar Story (.PNG) berhasil diunduh! Siap diunggah ke Instagram Stories.'
            : 'Gambar Feed (.PNG) berhasil diunduh! Siap diunggah ke Instagram Feed.'
        );
      }
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
                Opsi share WhatsApp, Twitter, atau Instagram Stories
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
            {isFilmRating ? (
              <div className="relative mx-auto w-[270px] h-[480px] overflow-hidden shadow-2xl rounded-2xl bg-[#0E1013] select-none">
                <div
                  style={{
                    width: '1080px',
                    height: '1920px',
                    transform: 'scale(0.25)',
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                >
                  <FilmRatingStoryCard
                    data={data}
                    displayScore={displayScore}
                    posterUrl={posterUrl}
                    reviewerAvatarUrl={data.reviewerAvatar || data.authorAvatar}
                  />
                </div>
              </div>
            ) : isBuzz ? (
              <div className="relative mx-auto w-[270px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-neutral-900 flex items-center justify-center border border-white/10 select-none">
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
              <div className="relative mx-auto w-[240px] aspect-[9/16] rounded-2xl overflow-hidden bg-[#0E1013] shadow-2xl flex flex-col justify-between text-left select-none">
                {/* 1. Full-bleed Article Cover in top ~60% */}
                <div className="absolute top-0 left-0 right-0 h-[60%] overflow-hidden pointer-events-none">
                  {data.image || data.imageUrl ? (
                    <img
                      src={data.image || data.imageUrl}
                      alt={data.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-[#171A21] via-[#0E1013] to-[#08090C]" />
                  )}
                </div>

                {/* 2. Single Continuous Gradient Overlay (Seamless to solid #0E1013 at ~60%) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(14, 16, 19, 0.75) 0%, rgba(14, 16, 19, 0.35) 10%, rgba(14, 16, 19, 0.15) 22%, rgba(14, 16, 19, 0.35) 35%, rgba(14, 16, 19, 0.65) 45%, rgba(14, 16, 19, 0.90) 54%, #0E1013 60%, #0E1013 100%)',
                  }}
                />

                {/* 3. Top Watermark: Logo & Category Pill */}
                <div className="relative z-10 pt-[24px] px-[13px] flex items-center justify-between">
                  <img
                    src="/sotoy-logo-full.png"
                    alt="Sotoy Film"
                    className="w-[84px] h-auto object-contain drop-shadow"
                  />
                  <div className="px-2.5 py-0.5 rounded-full font-black text-[7.5px] tracking-wider text-[#FF2E7E] bg-[#0E1013]/90 border border-[#FF2E7E]/40 backdrop-blur-md shadow whitespace-nowrap uppercase">
                    {data.category || 'ARTIKEL'}
                  </div>
                </div>

                {/* 4. Text Block (Left-aligned, sits on gradient) */}
                <div className="relative z-10 px-[13px] flex-1 flex flex-col justify-end pb-3 space-y-1.5">
                  <h1 className="font-display font-black text-[17px] text-white leading-[1.18] line-clamp-4 drop-shadow-sm">
                    {data.title}
                  </h1>

                  {data.text && (
                    <p className="text-[7.5px] text-slate-300 line-clamp-3 leading-[1.3]">
                      {data.text}
                    </p>
                  )}

                  {(() => {
                    const bylineStr = getArticleStoryByline(data);
                    if (!data.authorAvatar && !bylineStr) return null;
                    return (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {data.authorAvatar ? (
                          <img
                            src={data.authorAvatar}
                            alt={data.authorName || 'Penulis'}
                            className="w-3.5 h-3.5 rounded-full object-cover border border-[#FF2E7E]"
                          />
                        ) : null}
                        {bylineStr && (
                          <span className="text-[7.5px] text-slate-300 font-bold truncate">
                            {bylineStr}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 5. Footer */}
                <div className="relative z-10 px-[13px] pb-[20px]">
                  <div className="pt-2 border-t border-white/15 flex items-center justify-between">
                    <span className="text-[6.5px] font-bold text-[#FF2E7E] truncate">
                      ★ Baca selengkapnya di Sotoy Film
                    </span>
                    <span className="text-[6.5px] text-[#00F0FF] font-mono font-bold shrink-0">
                      sotoyfilm.my.id
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="relative mx-auto w-[240px] aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-b from-[#15162b] via-[#10111e] to-[#090a10] border border-[#FF2E7E]/40 shadow-2xl p-4 flex flex-col justify-between text-left"
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
      </div>
    </div>
  );
};
