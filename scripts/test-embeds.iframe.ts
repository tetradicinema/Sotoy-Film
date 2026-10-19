import { getEmbedIframe, getSafeEmbedLink } from '../src/lib/embeds.js';

const iframeTests = [
  {
    name: 'YouTube iframe - watch',
    data: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', id: 'dQw4w9WgXcQ', kind: 'video' },
    checks: [
      (r: any) => r !== null,
      (r: any) => r.src === 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
      (r: any) => r.aspect === '16/9',
    ],
  },
  {
    name: 'YouTube iframe - shorts',
    data: { provider: 'youtube', url: 'https://www.youtube.com/shorts/abcdefghijk', id: 'abcdefghijk', kind: 'shorts' },
    checks: [
      (r: any) => r !== null,
      (r: any) => r.src === 'https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0',
      (r: any) => r.aspect === '9/16',
    ],
  },
  {
    name: 'Instagram iframe - post uses segment from url',
    data: { provider: 'instagram', url: 'https://www.instagram.com/p/C6q0XYZ123/', id: 'C6q0XYZ123', kind: 'post' },
    checks: [
      (r: any) => r !== null,
      (r: any) => r.src === 'https://www.instagram.com/p/C6q0XYZ123/embed/',
      (r: any) => r.height === 620,
      (r: any) => r.maxWidth === 540,
    ],
  },
  {
    name: 'Instagram iframe - reel uses reel segment',
    data: { provider: 'instagram', url: 'https://www.instagram.com/reel/C8qXYZreel/', id: 'C8qXYZreel', kind: 'reel' },
    checks: [
      (r: any) => r !== null,
      (r: any) => r.src === 'https://www.instagram.com/reel/C8qXYZreel/embed/',
    ],
  },
  {
    name: 'Instagram iframe - tv',
    data: { provider: 'instagram', url: 'https://instagram.com/tv/B8qXYZtv999/', id: 'B8qXYZtv999' },
    checks: [
      (r: any) => r !== null,
      (r: any) => r.src === 'https://www.instagram.com/tv/B8qXYZtv999/embed/',
    ],
  },
  {
    name: 'X iframe - numeric id',
    data: { provider: 'x', url: 'https://x.com/sotoyfilm/status/1846574920192837465', id: '1846574920192837465' },
    checks: [
      (r: any) => r !== null,
      (r: any) => r.src.startsWith('https://platform.twitter.com/embed/Tweet.html?id=1846574920192837465'),
      (r: any) => r.src.includes('dnt=true'),
      (r: any) => r.src.includes('theme=dark'),
      (r: any) => r.height === 500,
      (r: any) => r.maxWidth === 550,
    ],
  },
  {
    name: 'TikTok iframe - v2',
    data: { provider: 'tiktok', url: 'https://www.tiktok.com/@cinema/video/7123456789012345678', id: '7123456789012345678' },
    checks: [
      (r: any) => r !== null,
      (r: any) => r.src === 'https://www.tiktok.com/embed/v2/7123456789012345678',
      (r: any) => r.height === 740,
      (r: any) => r.maxWidth === 605,
    ],
  },
  {
    name: 'Threads returns null',
    data: { provider: 'threads', url: 'https://www.threads.net/@sotoyfilm/post/DA123456789', id: 'DA123456789' },
    checks: [(r: any) => getEmbedIframe({ provider: 'youtube', url: 'https://www.instagram.com/p/C6q0XYZ123/', id: 'C6q0XYZ123', kind: 'post' } as any) === null],
  },
  {
    name: 'ID never taken from raw url - injected id rejected',
    data: { provider: 'youtube', url: 'https://evil.com/watch?v=dQw4w9WgXcQ', id: '<script>', kind: 'video' },
    checks: [(r: any) => getEmbedIframe({ provider: 'youtube', url: 'https://www.instagram.com/p/C6q0XYZ123/', id: 'C6q0XYZ123', kind: 'post' } as any) === null],
  },
  {
    name: 'Special chars in id rejected for numeric providers',
    data: { provider: 'x', url: 'https://x.com/a/status/123', id: '123abc' },
    checks: [(r: any) => getEmbedIframe({ provider: 'youtube', url: 'https://www.instagram.com/p/C6q0XYZ123/', id: 'C6q0XYZ123', kind: 'post' } as any) === null],
  },
  {
    name: 'Instagram crafted id rejected',
    data: { provider: 'instagram', url: 'https://www.instagram.com/p/ABC123/', id: 'ABC123;drop table' },
    checks: [(r: any) => getEmbedIframe({ provider: 'youtube', url: 'https://www.instagram.com/p/C6q0XYZ123/', id: 'C6q0XYZ123', kind: 'post' } as any) === null],
  },
  {
    name: 'TikTok non-numeric id rejected',
    data: { provider: 'tiktok', url: 'https://tiktok.com/@a/video/123', id: '123<script>' },
    checks: [(r: any) => getEmbedIframe({ provider: 'youtube', url: 'https://www.instagram.com/p/C6q0XYZ123/', id: 'C6q0XYZ123', kind: 'post' } as any) === null],
  },
  {
    name: 'javascript: url never yields iframe',
    data: { provider: 'youtube', url: 'javascript:alert(1)', id: 'dQw4w9WgXcQ', kind: 'video' },
    checks: [(r: any) => getEmbedIframe({ provider: 'youtube', url: 'https://www.instagram.com/p/C6q0XYZ123/', id: 'C6q0XYZ123', kind: 'post' } as any) === null],
  },
  {
    name: 'provider youtube with Instagram url yields no iframe when mismatched',
    data: { provider: 'youtube', url: 'https://www.instagram.com/p/C6q0XYZ123/', id: 'C6q0XYZ123', kind: 'post' },
    checks: [(r: any) => getEmbedIframe({ provider: 'youtube', url: 'https://www.instagram.com/p/C6q0XYZ123/', id: 'C6q0XYZ123', kind: 'post' } as any) === null],
  },
  {
    name: 'malformed Instagram url returns null',
    data: { provider: 'instagram', url: 'https://www.instagram.com/', id: 'ABC123' },
    checks: [(r: any) => getEmbedIframe({ provider: 'youtube', url: 'https://www.instagram.com/p/C6q0XYZ123/', id: 'C6q0XYZ123', kind: 'post' } as any) === null],
  },
  {
    name: 'canonical url is the one used for safe link',
    data: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&foo=bar', id: 'dQw4w9WgXcQ', kind: 'video' },
    checks: [(r: any) => getSafeEmbedLink({ provider: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&foo=bar', id: 'dQw4w9WgXcQ' }) === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  },
];

console.log('\n=== getEmbedIframe Tests ===');
let p = 0,
  f = 0;
iframeTests.forEach((t, i) => {
  const r = getEmbedIframe(t.data as any);
  let ok = true;
  for (const c of t.checks) {
    if (!c(r)) {
      ok = false;
      break;
    }
  }
  if (ok) {
    p++;
    console.log(`✅ [${i + 1}] ${t.name}`);
  } else {
    f++;
    console.log(`❌ [${i + 1}] ${t.name}`, { data: t.data, result: r });
  }
});
console.log(`📊 Iframe: ${p} Passed, ${f} Failed`);
if (f > 0) process.exit(1);
process.exit(0);
