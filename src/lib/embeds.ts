export type EmbedProvider = 'youtube' | 'instagram' | 'x' | 'tiktok' | 'threads';
import { sanitizeExternalUrl } from '../utils/safeUrl';

export interface EmbedData {
  provider: EmbedProvider;
  url: string;
  id: string;
  kind?: 'video' | 'shorts' | 'post' | 'reel' | 'status';
  caption?: string;
  user?: string;
}

export interface ProviderConfig {
  name: string;
  iconName: string;
  hosts: string[];
  placeholderText: string;
  exampleUrl: string;
}

export const PROVIDER_CONFIGS: Record<EmbedProvider, ProviderConfig> = {
  youtube: {
    name: 'YouTube',
    iconName: 'Youtube',
    hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com'],
    placeholderText: 'https://www.youtube.com/watch?v=...',
    exampleUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ atau https://youtu.be/...',
  },
  instagram: {
    name: 'Instagram',
    iconName: 'Instagram',
    hosts: ['instagram.com', 'www.instagram.com'],
    placeholderText: 'https://www.instagram.com/p/... atau /reel/...',
    exampleUrl: 'https://www.instagram.com/p/C6q0XYZ123/',
  },
  x: {
    name: 'X (Twitter)',
    iconName: 'Twitter',
    hosts: ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com', 'mobile.x.com', 'mobile.twitter.com'],
    placeholderText: 'https://x.com/username/status/...',
    exampleUrl: 'https://x.com/sotoyfilm/status/1234567890123456789',
  },
  tiktok: {
    name: 'TikTok',
    iconName: 'Video',
    hosts: ['tiktok.com', 'www.tiktok.com'],
    placeholderText: 'https://www.tiktok.com/@user/video/...',
    exampleUrl: 'https://www.tiktok.com/@sotoyfilm/video/7123456789012345678',
  },
  threads: {
    name: 'Threads',
    iconName: 'AtSign',
    hosts: ['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'],
    placeholderText: 'https://www.threads.net/@user/post/...',
    exampleUrl: 'https://www.threads.net/@sotoyfilm/post/C6q0XYZ123',
  },
};

/**
 * Parses and strictly validates a social media URL against an exact hostname allowlist.
 * Returns normalized canonical EmbedData or null if invalid/unsupported.
 */
export function parseEmbedUrl(input: string): EmbedData | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  // Upgrade http:// to https://
  let urlString = trimmed;
  if (/^http:\/\//i.test(urlString)) {
    urlString = urlString.replace(/^http:\/\//i, 'https://');
  } else if (!/^https?:\/\//i.test(urlString)) {
    // Only accept URLs starting with scheme or bare domain matching known host
    if (
      urlString.startsWith('youtube.com') ||
      urlString.startsWith('www.youtube.com') ||
      urlString.startsWith('youtu.be') ||
      urlString.startsWith('instagram.com') ||
      urlString.startsWith('www.instagram.com') ||
      urlString.startsWith('x.com') ||
      urlString.startsWith('twitter.com') ||
      urlString.startsWith('tiktok.com') ||
      urlString.startsWith('www.tiktok.com') ||
      urlString.startsWith('threads.net') ||
      urlString.startsWith('www.threads.net')
    ) {
      urlString = `https://${urlString}`;
    } else {
      return null;
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return null;
  }

  // Reject credentials (user:pass@)
  if (parsed.username || parsed.password) {
    return null;
  }

  // Strictly enforce https
  if (parsed.protocol !== 'https:') {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // 1. YouTube
  if (PROVIDER_CONFIGS.youtube.hosts.includes(host)) {
    let videoId = '';
    let kind: 'video' | 'shorts' = 'video';

    if (host === 'youtu.be') {
      const match = pathname.match(/^\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
      if (match) videoId = match[1];
    } else if (pathname.startsWith('/shorts/')) {
      const match = pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
      if (match) {
        videoId = match[1];
        kind = 'shorts';
      }
    } else if (pathname.startsWith('/live/')) {
      const match = pathname.match(/^\/live\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
      if (match) videoId = match[1];
    } else if (pathname.startsWith('/embed/')) {
      const match = pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
      if (match) videoId = match[1];
    } else if (pathname === '/watch') {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        videoId = v;
      }
    }

    if (videoId) {
      const canonical = kind === 'shorts'
        ? `https://www.youtube.com/shorts/${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`;
      return {
        provider: 'youtube',
        id: videoId,
        url: canonical,
        kind,
      };
    }
  }

  // 2. Instagram
  if (PROVIDER_CONFIGS.instagram.hosts.includes(host)) {
    // /p/CODE, /reel/CODE, /reels/CODE, /tv/CODE
    const match = pathname.match(/^\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)(?:\/|$)/i);
    if (match) {
      const rawKind = match[1].toLowerCase();
      const code = match[2];
      const kind: 'post' | 'reel' = rawKind.startsWith('reel') ? 'reel' : 'post';
      const canonical = `https://www.instagram.com/${rawKind === 'reels' ? 'reel' : rawKind}/${code}/`;
      return {
        provider: 'instagram',
        id: code,
        url: canonical,
        kind,
      };
    }
  }

  // 3. X / Twitter
  if (PROVIDER_CONFIGS.x.hosts.includes(host)) {
    // /{user}/status/{digits}
    const match = pathname.match(/^\/([a-zA-Z0-9_]{1,30})\/status\/(\d+)(?:\/|$)/i);
    if (match) {
      const user = match[1];
      const statusId = match[2];
      const canonical = `https://x.com/${user}/status/${statusId}`;
      return {
        provider: 'x',
        id: statusId,
        url: canonical,
        kind: 'status',
        user,
      };
    }
  }

  // 4. TikTok
  if (PROVIDER_CONFIGS.tiktok.hosts.includes(host)) {
    // /@{user}/video/{digits}
    const match = pathname.match(/^\/@([a-zA-Z0-9_.-]+)\/video\/(\d+)(?:\/|$)/i);
    if (match) {
      const user = match[1];
      const videoId = match[2];
      const canonical = `https://www.tiktok.com/@${user}/video/${videoId}`;
      return {
        provider: 'tiktok',
        id: videoId,
        url: canonical,
        kind: 'video',
        user,
      };
    }
  }

  // 5. Threads
  if (PROVIDER_CONFIGS.threads.hosts.includes(host)) {
    // /@{user}/post/{CODE}
    const match = pathname.match(/^\/@([a-zA-Z0-9_.-]+)\/post\/([a-zA-Z0-9_-]+)(?:\/|$)/i);
    if (match) {
      const user = match[1];
      const postId = match[2];
      const canonical = `https://www.threads.net/@${user}/post/${postId}`;
      return {
        provider: 'threads',
        id: postId,
        url: canonical,
        kind: 'post',
        user,
      };
    }
  }

  return null;
}

/**
 * Returns a friendly Indonesian explanation if a user provides an invalid or short link.
 */
export function getEmbedValidationFeedback(input: string): { valid: boolean; error?: string; data?: EmbedData } {
  if (!input || !input.trim()) {
    return { valid: false, error: 'Masukkan link tautan konten media sosial.' };
  }

  const trimmed = input.trim();

  // Special check for TikTok shortlinks
  if (/^(https?:\/\/)?(vm\.tiktok\.com|vt\.tiktok\.com)\//i.test(trimmed) || /tiktok\.com\/t\//i.test(trimmed)) {
    return {
      valid: false,
      error: 'Gunakan link lengkap video TikTok (yang berisi /video/angka), bukan tautan pendek vm/vt.',
    };
  }

  const parsed = parseEmbedUrl(trimmed);
  if (parsed) {
    return { valid: true, data: parsed };
  }

  return {
    valid: false,
    error: 'Format link tidak dikenali atau belum didukung. Hanya mendukung YouTube, Instagram, X (Twitter), TikTok, dan Threads.',
  };
}

export function getEmbedIframe(data: EmbedData): { src: string; aspect?: string; height?: number; maxWidth: number } | null {
  if (!data || !data.id) return null;

  switch (data.provider) {
    case 'youtube': {
      const id = data.id;
      if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return null;
      }
      const isShorts = data.kind === 'shorts';
      return {
        src: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
        aspect: isShorts ? '9/16' : '16/9',
        maxWidth: isShorts ? 360 : 560,
      };
    }
    case 'instagram': {
      const id = data.id;
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return null;
      }
      try {
        const canonical = new URL(data.url);
        const pathname = canonical.pathname.toLowerCase();
        const segMatch = pathname.match(/^\/(p|reel|reels|tv)\/[a-zA-Z0-9_-]+/);
        if (!segMatch) return null;
        const rawSeg = segMatch[1];
        if (rawSeg === 'reel' || rawSeg === 'reels') {
          return {
            src: `https://www.instagram.com/reel/${id}/embed/`,
            height: 620,
            maxWidth: 540,
          };
        }
        if (rawSeg === 'tv') {
          return {
            src: `https://www.instagram.com/tv/${id}/embed/`,
            height: 620,
            maxWidth: 540,
          };
        }
        return {
          src: `https://www.instagram.com/p/${id}/embed/`,
          height: 620,
          maxWidth: 540,
        };
      } catch {
        return null;
      }
    }
    case 'x': {
      const id = data.id;
      if (!/^\d+$/.test(id)) {
        return null;
      }
      return {
        src: `https://platform.twitter.com/embed/Tweet.html?id=${id}&dnt=true&theme=dark`,
        height: 500,
        maxWidth: 550,
      };
    }
    case 'tiktok': {
      const id = data.id;
      if (!/^\d+$/.test(id)) {
        return null;
      }
      return {
        src: `https://www.tiktok.com/embed/v2/${id}`,
        height: 740,
        maxWidth: 605,
      };
    }
    case 'threads': {
      return null;
    }
    default:
      return null;
  }
}

export function getSafeEmbedLink(data: EmbedData): string | null {
  const parsed = parseEmbedUrl(data.url);
  if (!parsed) return null;
  return sanitizeExternalUrl(parsed.url);
}
