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
import { fetchPopularPeopleForSitemap } from '../src/lib/edge/personMeta.js';
import { buildFranchiseSitemapEntries } from '../src/lib/edge/franchiseMeta.js';

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
  'publishedAtTimestamp',
  'createdAt',
  'excerpt',
  // TMDB collection ("franchise") grouping for /franchise/:idSlug entries.
  'collectionId',
  'collectionName',
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
    { link: `${BASE_URL}/people`, title: 'Orang Populer', metaDescription: '', type: 'Halaman', lastmod: STATIC_LASTMOD, changefreq: 'weekly', priority: '0.7' },
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

/** A degraded response may only fall back to a snapshot that is actually useful. */
const MIN_SNAPSHOT_LOCS = 300;

function countOccurrences(value: string, pattern: RegExp): number {
  return (value.match(pattern) || []).length;
}

function countSnapshotLocs(xml: string): number {
  return countOccurrences(xml, /<loc>/g);
}

/**
 * A snapshot is only usable when it is structurally complete and carries at
 * least 300 URLs. A truncated/partial snapshot must never be cached as if it
 * were a healthy live sitemap.
 */
function isValidSnapshotXml(xml: string): boolean {
  if (!xml || !xml.includes('<urlset') || !xml.trimEnd().endsWith('</urlset>')) {
    return false;
  }

  const urlOpen = countOccurrences(xml, /<url>/g);
  const urlClose = countOccurrences(xml, /<\/url>/g);
  const locOpen = countOccurrences(xml, /<loc>/g);
  const locClose = countOccurrences(xml, /<\/loc>/g);

  return (
    urlOpen === urlClose &&
    locOpen === locClose &&
    locOpen === urlOpen &&
    locOpen >= MIN_SNAPSHOT_LOCS
  );
}

/**
 * Returns the build-time snapshot only when it is a complete sitemap with at
 * least 300 URLs.
 */
function getSnapshotXml(): string | null {
  const candidatePaths = [
    path.join(process.cwd(), 'data', 'sitemap-snapshot.xml'),
    path.join(process.cwd(), 'sitemap-snapshot.xml'),
  ];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        if (isValidSnapshotXml(content)) {
          return content;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function inferSitemapType(link: string): SitemapItem['type'] {
  const pathName = link.startsWith(BASE_URL) ? link.slice(BASE_URL.length) : link;
  if (pathName.startsWith('/artikel/')) return 'Artikel';
  if (pathName.startsWith('/film/')) return 'Film/Series/Animation';
  if (pathName.startsWith('/kategori/') || pathName.startsWith('/category/')) {
    return 'Kategori';
  }
  return 'Halaman';
}

/**
 * Builds a CSV view of the valid build-time snapshot for degraded CSV
 * requests. The XML snapshot stays the canonical fallback and its URL rules are
 * not changed.
 */
function getSnapshotCsv(): string | null {
  const snapshotXml = getSnapshotXml();
  if (!snapshotXml) return null;

  const blocks = snapshotXml.match(/<url>[\s\S]*?<\/url>/g) || [];
  const items: SitemapItem[] = [];

  for (const block of blocks) {
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(block)?.[1];
    if (!loc) continue;
    const link = decodeXmlText(loc);
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(block)?.[1] || '';
    const priority = /<priority>([\s\S]*?)<\/priority>/.exec(block)?.[1] || '';
    items.push({
      link,
      title: '',
      metaDescription: '',
      type: inferSitemapType(link),
      lastmod: decodeXmlText(lastmod),
      changefreq: '',
      priority: decodeXmlText(priority),
    });
  }

  return items.length > 0 ? buildCsv(items) : null;
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
    if (!Array.isArray(results)) {
      // An OK response without a runQuery result array cannot be trusted as a
      // complete collection; surface it as a failed fetch so the handler uses
      // the degraded fallback instead of caching a truncated sitemap.
      throw new Error('Firestore REST query returned a non-array result');
    }

    const docs = results
      .filter((r: any) => r && r.document)
      .map((r: any) => {
        const parsed = parseFirestoreFields(r.document);
        if (r.document.name && !parsed.id) {
          parsed.id = r.document.name.split('/').pop();
        }
        // Firestore REST returns the server-side creation time as document
        // metadata, not as a field. Keep it only as a last-resort date fallback
        // for films. Never use updateTime: any write (votes, likes, scores)
        // bumps it, so it is not a real content-change signal.
        if (r.document.createTime && !parsed.createTime) {
          parsed.createTime = r.document.createTime;
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

interface LiveSitemapResult {
  items: SitemapItem[];
  /** Raw Firestore rows, used to detect an empty/degraded live result. */
  rawArticles: any[];
  rawFilms: any[];
}

async function generateLiveSitemapItems(): Promise<LiveSitemapResult> {
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
    // valid updatedAt/publishedAtTimestamp/publishedAt/createdAt value.
    // publishedAt is stored as localized text (e.g. "6 Okt 2026") that the
    // date parser cannot read, so prefer the ISO publishedAtTimestamp.
    const lastmod = formatDateToYMD(
      art.updatedAt || art.publishedAtTimestamp || art.publishedAt || art.createdAt,
      ''
    );
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

    const lastmod = formatDateToYMD(film.updatedAt || film.createdAt || film.createTime, '');
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

  // Franchises grouped from the already-fetched films. Best effort: the
  // helper never throws and only emits franchises with at least 2 catalog
  // films (thin pages stay out of the sitemap), so a problem here can never
  // remove or reorder the static/article/film/person entries above. No
  // extra TMDB call is needed: collectionId/collectionName ship on the film
  // documents.
  let franchiseEntries: ReturnType<typeof buildFranchiseSitemapEntries> = [];
  try {
    franchiseEntries = buildFranchiseSitemapEntries(rawFilms);
  } catch {
    franchiseEntries = [];
  }

  for (const franchise of franchiseEntries) {
    // Same canonical rule as the middleware and buildFranchiseCanonicalUrl.
    items.push({
      link: `${BASE_URL}${franchise.path}`,
      title: franchise.name,
      metaDescription: '',
      type: 'Halaman',
      // No real modification date is known for TMDB collections.
      lastmod: '',
      changefreq: 'weekly',
      priority: '0.6',
    });
  }

  // Popular people from TMDB. Best effort: the helper returns [] on any
  // failure, so a TMDB problem only omits person URLs and never removes or
  // reorders the static/article/film entries above.
  let popularPeople: Array<{ id: number; name: string }> = [];
  try {
    popularPeople = await fetchPopularPeopleForSitemap(40);
  } catch {
    popularPeople = [];
  }

  for (const person of popularPeople) {
    // Same canonical rule as the middleware and the build-time snapshot.
    const slug = slugify(person.name);
    items.push({
      link: slug
        ? `${BASE_URL}/person/${person.id}-${slug}`
        : `${BASE_URL}/person/${person.id}`,
      title: person.name,
      metaDescription: '',
      type: 'Halaman',
      // No real modification date is known for TMDB people.
      lastmod: '',
      changefreq: 'weekly',
      priority: '0.5',
    });
  }

  return { items, rawArticles, rawFilms };
}

const HEALTHY_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';
const DEGRADED_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';

function sendResponse(
  res: any,
  status: number,
  contentType: string,
  body: string,
  cacheControl: string = HEALTHY_CACHE_CONTROL
) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl);
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
 * Serves the validated build-time snapshot (short cache) or, when even that is
 * unusable, 503 + Retry-After so crawlers retry later instead of caching an
 * empty/degraded sitemap for an hour.
 */
function sendDegradedResponse(res: any, isCsv: boolean) {
  if (isCsv) {
    const snapshotCsv = getSnapshotCsv();
    if (snapshotCsv) {
      console.warn('[Live Sitemap] Degraded CSV result, serving snapshot CSV with short cache');
      return sendResponse(
        res,
        200,
        'text/csv; charset=utf-8',
        snapshotCsv,
        DEGRADED_CACHE_CONTROL
      );
    }
  } else {
    const snapshotXml = getSnapshotXml();
    if (snapshotXml) {
      console.warn('[Live Sitemap] Degraded XML result, serving snapshot XML with short cache');
      return sendResponse(
        res,
        200,
        'application/xml; charset=utf-8',
        snapshotXml,
        DEGRADED_CACHE_CONTROL
      );
    }
  }

  console.warn('[Live Sitemap] No valid snapshot available, responding 503');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Retry-After', '300');
  res.setHeader('Cache-Control', 'no-store');
  if (typeof res.removeHeader === 'function') {
    res.removeHeader('Content-Disposition');
  }
  if (typeof res.status === 'function') {
    return res.status(503).send('Service Unavailable');
  } else {
    res.writeHead(503);
    return res.end('Service Unavailable');
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
    const live = await generateLiveSitemapItems();

    // A live result is only healthy when both collections were read as arrays
    // and both contain at least one row. Articles/films can legitimately be
    // filtered down to zero URLs, but an empty Firestore collection almost
    // always means the read was degraded, so it must not receive the 1-hour
    // healthy cache header.
    const degraded =
      !Array.isArray(live.rawArticles) ||
      !Array.isArray(live.rawFilms) ||
      live.rawArticles.length === 0 ||
      live.rawFilms.length === 0;

    if (degraded) {
      return sendDegradedResponse(res, isCsv);
    }

    if (isCsv) {
      const csv = buildCsv(live.items);
      return sendResponse(res, 200, 'text/csv; charset=utf-8', csv);
    } else {
      const xml = buildXml(live.items);
      return sendResponse(res, 200, 'application/xml; charset=utf-8', xml);
    }
  } catch (err) {
    console.warn('[Live Sitemap] Error querying Firestore, serving degraded fallback:', err);
    return sendDegradedResponse(res, isCsv);
  }
}

export default async function handler(req: any, res: any) {
  return handleSitemapRequest(req, res);
}
