import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import {
  FIRESTORE_DOCUMENTS_URL,
  FIRESTORE_API_KEY,
  fetchWithTimeout,
  parseFirestoreFields,
  isArticlePublished,
} from '../src/lib/edge/firestoreRest.js';
import { slugify } from '../src/utils/slugify.js';

const BASE_URL = 'https://www.sotoyfilm.my.id';

// Static pages are not regenerated on a schedule; keep a single stable lastmod
// so crawlers do not see a fake "changed today" signal on every request.
const STATIC_LASTMOD = '2026-10-25';

/**
 * Only fields required to build sitemap URLs and dates. Article bodies,
 * comments, author emails and admin fields are never requested.
 */
const SITEMAP_SELECT_FIELDS = [
  'id',
  'slug',
  'title',
  'status',
  'scheduledAt',
  'updatedAt',
  'publishedAt',
  'createdAt',
  'excerpt',
];

interface SitemapItem {
  link: string;
  title: string;
  metaDescription: string;
  type: 'Halaman' | 'Kategori' | 'Artikel' | 'Film/Series/Animation';
  lastmod: string;
  changefreq: string;
  priority: string;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDateToYMD(val: any, fallbackDate: string): string {
  if (!val) return fallbackDate;
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const year = parseInt(val.slice(0, 4), 10);
      if (year >= 2020) return val;
      return fallbackDate;
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      const formatted = parsed.toISOString().split('T')[0];
      const year = parsed.getFullYear();
      if (year >= 2020) return formatted;
      return fallbackDate;
    }
  }
  if (val && typeof val.toDate === 'function') {
    try {
      const parsed = val.toDate();
      const formatted = parsed.toISOString().split('T')[0];
      const year = parsed.getFullYear();
      if (year >= 2020) return formatted;
      return fallbackDate;
    } catch {
      // ignore
    }
  }
  if (val && typeof val.seconds === 'number') {
    const parsed = new Date(val.seconds * 1000);
    const formatted = parsed.toISOString().split('T')[0];
    const year = parsed.getFullYear();
    if (year >= 2020) return formatted;
    return fallbackDate;
  }
  return fallbackDate;
}

function getStaticItems(): SitemapItem[] {
  return [
    { link: `${BASE_URL}/`, title: 'Sotoy Film - Beranda', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'daily', priority: '1.0' },
    { link: `${BASE_URL}/film-database`, title: 'Film Database', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'daily', priority: '0.9' },
    { link: `${BASE_URL}/rekomendasi-film`, title: 'Rekomendasi Film', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'weekly', priority: '0.8' },
    { link: `${BASE_URL}/komunitas`, title: 'Komunitas', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'daily', priority: '0.8' },
    { link: `${BASE_URL}/panduan-leaderboard`, title: 'Panduan Leaderboard', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.6' },
    { link: `${BASE_URL}/panduan`, title: 'Panduan & FAQ', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.6' },
    { link: `${BASE_URL}/tentang-kami`, title: 'Tentang Kami', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { link: `${BASE_URL}/kebijakan-privasi`, title: 'Kebijakan Privasi', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { link: `${BASE_URL}/syarat-ketentuan`, title: 'Syarat & Ketentuan', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { link: `${BASE_URL}/kontak-bisnis`, title: 'Kontak Bisnis', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { link: `${BASE_URL}/gabung-kritikus`, title: 'Gabung Kritikus', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { link: `${BASE_URL}/kriteria-kritikus`, title: 'Kriteria Kritikus', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { link: `${BASE_URL}/kategori/movies`, title: 'Kategori Movies', metaDescription: '', type: 'Kategori', lastmod: STATIC_LASTMOD, changefreq: 'weekly', priority: '0.7' },
    { link: `${BASE_URL}/kategori/series`, title: 'Kategori Series', metaDescription: '', type: 'Kategori', lastmod: STATIC_LASTMOD, changefreq: 'weekly', priority: '0.7' },
    { link: `${BASE_URL}/kategori/animation`, title: 'Kategori Animation', metaDescription: '', type: 'Kategori', lastmod: STATIC_LASTMOD, changefreq: 'weekly', priority: '0.7' },
    { link: `${BASE_URL}/kategori/cinema-gear`, title: 'Kategori Cinema Gear', metaDescription: '', type: 'Kategori', lastmod: STATIC_LASTMOD, changefreq: 'weekly', priority: '0.7' },
    { link: `${BASE_URL}/kategori/film-studies`, title: 'Kategori Film Studies', metaDescription: '', type: 'Kategori', lastmod: STATIC_LASTMOD, changefreq: 'weekly', priority: '0.7' },
  ];
}

/**
 * Quotes a string value per RFC 4180
 */
function toCsvField(value: string | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(items: SitemapItem[]): string {
  const header = 'Link,Title,MetaDescription,Type,Lastmod,Priority';
  const rows = items.map(item =>
    [
      toCsvField(item.link),
      toCsvField(item.title),
      toCsvField(item.metaDescription),
      toCsvField(item.type),
      toCsvField(item.lastmod),
      toCsvField(item.priority),
    ].join(',')
  );
  return [header, ...rows].join('\r\n');
}

function buildXml(items: SitemapItem[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
  xml += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';
  for (const item of items) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(item.link)}</loc>\n`;
    if (item.lastmod) {
      xml += `    <lastmod>${escapeXml(item.lastmod)}</lastmod>\n`;
    }
    xml += `    <changefreq>${escapeXml(item.changefreq)}</changefreq>\n`;
    xml += `    <priority>${escapeXml(item.priority)}</priority>\n`;
    xml += '  </url>\n';
  }
  xml += '</urlset>\n';
  return xml;
}

function getSnapshotXml(): string | null {
  const candidatePaths = [
    path.join(process.cwd(), 'data', 'sitemap-snapshot.xml'),
    path.join(process.cwd(), 'sitemap-snapshot.xml'),
  ];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        if (content && content.includes('<urlset')) {
          return content;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function fetchAllCollectionDocs(collectionId: 'articles' | 'films'): Promise<any[]> {
  const allDocs: any[] = [];
  const pageSize = 300;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${FIRESTORE_DOCUMENTS_URL}:runQuery?key=${FIRESTORE_API_KEY}`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId }],
          select: {
            fields: SITEMAP_SELECT_FIELDS.map(fieldPath => ({ fieldPath })),
          },
          offset,
          limit: pageSize,
        },
      }),
    }, 6000);

    if (!res.ok) {
      throw new Error(`Firestore REST query failed with status ${res.status}`);
    }

    const results = await res.json();
    if (!Array.isArray(results)) break;

    const docs = results
      .filter((r: any) => r && r.document)
      .map((r: any) => {
        const parsed = parseFirestoreFields(r.document);
        if (r.document.name && !parsed.id) {
          parsed.id = r.document.name.split('/').pop();
        }
        return parsed;
      });

    allDocs.push(...docs);

    if (docs.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return allDocs;
}

async function generateLiveSitemapItems(): Promise<SitemapItem[]> {
  const staticItems = getStaticItems();
  const items: SitemapItem[] = [...staticItems];

  // Fetch both collections in parallel: the sitemap only needs one round-trip
  // worth of latency per collection instead of two sequential waits.
  const [rawArticles, rawFilms] = await Promise.all([
    fetchAllCollectionDocs('articles'),
    fetchAllCollectionDocs('films'),
  ]);

  // Articles
  const seenArticleSlugs = new Set<string>();

  for (const art of rawArticles) {
    if (!isArticlePublished(art)) continue;

    const slug = art.slug || (art.title ? slugify(art.title) : art.id);
    if (!slug || seenArticleSlugs.has(slug)) continue;
    seenArticleSlugs.add(slug);

    // Never fall back to "today": omit <lastmod> when the document has no
    // valid updatedAt/publishedAt/createdAt value.
    const lastmod = formatDateToYMD(art.updatedAt || art.publishedAt || art.createdAt, '');
    items.push({
      link: `${BASE_URL}/artikel/${encodeURIComponent(slug)}`,
      title: art.title || 'Artikel',
      metaDescription: art.excerpt || '',
      type: 'Artikel',
      lastmod,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  // Films
  const seenFilmSlugs = new Set<string>();

  for (const film of rawFilms) {
    const slug = film.slug || (film.title ? slugify(film.title) : film.id);
    if (!slug || seenFilmSlugs.has(slug)) continue;
    seenFilmSlugs.add(slug);

    const lastmod = formatDateToYMD(film.updatedAt || film.createdAt, '');
    items.push({
      link: `${BASE_URL}/film/${encodeURIComponent(slug)}`,
      title: film.title || 'Film',
      metaDescription: '',
      type: 'Film/Series/Animation',
      lastmod,
      changefreq: 'monthly',
      priority: '0.9',
    });
  }

  return items;
}

function sendResponse(res: any, status: number, contentType: string, body: string) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Robots-Tag', 'all');
  if (typeof res.removeHeader === 'function') {
    res.removeHeader('Content-Disposition');
  }
  if (typeof res.status === 'function') {
    return res.status(status).send(body);
  } else {
    res.writeHead(status);
    return res.end(body);
  }
}

/**
 * Shared sitemap request handler for Express and Vercel Serverless
 */
export async function handleSitemapRequest(req: any, res: any) {
  const rawUrl = req.url || '/';
  const isCsv =
    req.query?.format === 'csv' ||
    rawUrl.includes('format=csv') ||
    rawUrl.endsWith('.csv') ||
    rawUrl.includes('/sitemap.csv');

  try {
    const items = await generateLiveSitemapItems();
    if (isCsv) {
      const csv = buildCsv(items);
      return sendResponse(res, 200, 'text/csv; charset=utf-8', csv);
    } else {
      const xml = buildXml(items);
      return sendResponse(res, 200, 'application/xml; charset=utf-8', xml);
    }
  } catch (err) {
    console.warn('[Live Sitemap] Error querying Firestore, serving fallback snapshot:', err);

    if (isCsv) {
      // Empty-safe fallback built from static pages only
      const fallbackCsv = buildCsv(getStaticItems());
      return sendResponse(res, 200, 'text/csv; charset=utf-8', fallbackCsv);
    } else {
      // Serve snapshot XML if available, otherwise static fallback XML
      const snapshotXml = getSnapshotXml();
      const fallbackXml = snapshotXml || buildXml(getStaticItems());
      return sendResponse(res, 200, 'application/xml; charset=utf-8', fallbackXml);
    }
  }
}

export default async function handler(req: any, res: any) {
  return handleSitemapRequest(req, res);
}
