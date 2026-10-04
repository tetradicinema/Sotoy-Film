import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, terminate } from 'firebase/firestore';
import { INITIAL_ARTICLES, INITIAL_FILMS } from '../src/data/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (e.g. ō -> o)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function formatDateToYMD(val: any, fallbackDate?: string): string {
  const defaultToday = fallbackDate || new Date().toISOString().split('T')[0];
  if (!val) {
    return defaultToday;
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      // Validate year is not ancient (e.g. >= 2020 for website lastmod)
      const year = parseInt(val.slice(0, 4), 10);
      if (year >= 2020) return val;
      return defaultToday;
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      const formatted = parsed.toISOString().split('T')[0];
      const year = parsed.getFullYear();
      if (year >= 2020) return formatted;
      return defaultToday;
    }
  }
  if (val && typeof val.toDate === 'function') {
    try {
      const parsed = val.toDate();
      const formatted = parsed.toISOString().split('T')[0];
      const year = parsed.getFullYear();
      if (year >= 2020) return formatted;
      return defaultToday;
    } catch {
      // ignore
    }
  }
  if (val && typeof val.seconds === 'number') {
    const parsed = new Date(val.seconds * 1000);
    const formatted = parsed.toISOString().split('T')[0];
    const year = parsed.getFullYear();
    if (year >= 2020) return formatted;
    return defaultToday;
  }
  return defaultToday;
}

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

async function run() {
  console.log('[Sitemap Builder] Starting build-time static sitemap generation...');
  const baseUrl = 'https://www.sotoyfilm.my.id';
  const today = new Date().toISOString().split('T')[0];
  const nowMs = Date.now();

  // 1. Static Core Routes
  const entries: SitemapEntry[] = [
    { loc: `${baseUrl}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/film-database`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/rekomendasi-film`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${baseUrl}/komunitas`, lastmod: today, changefreq: 'daily', priority: '0.8' },
    { loc: `${baseUrl}/panduan-leaderboard`, lastmod: today, changefreq: 'monthly', priority: '0.6' },
    { loc: `${baseUrl}/tentang-kami`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/kebijakan-privasi`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/syarat-ketentuan`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/kontak-bisnis`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/gabung-kritikus`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/kriteria-kritikus`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
  ];

  // Category exploration hubs
  const categories = ['movies', 'series', 'anime', 'cinema-gear', 'film-studies'];
  for (const cat of categories) {
    entries.push({
      loc: `${baseUrl}/kategori/${cat}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  // 2. Connect to Firestore using client configuration (Read-only)
  const configPath = path.join(rootDir, 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`[Sitemap Builder] Configuration not found at: ${configPath}`);
  }

  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const app = initializeApp(firebaseConfig, `sitemap-builder-${Date.now()}`);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  const seenArticleSlugs = new Set<string>();
  const seenFilmSlugs = new Set<string>();
  const removedMockFilmIds = new Set<string>();
  let articlesCount = 0;
  let filmsCount = 0;

  try {
    // 3. Fetch Published Articles from Firestore
    console.log('[Sitemap Builder] Querying articles from Firestore...');
    const articlesCol = collection(db, 'articles');
    const articlesSnap = await getDocs(articlesCol);

    articlesSnap.forEach(docSnap => {
      const article = docSnap.data();
      if (article.status === 'trash' || article.status === 'draft') return;
      if (article.status === 'scheduled') {
        if (!article.scheduledAt) return;
        const schedTime = new Date(article.scheduledAt).getTime();
        if (isNaN(schedTime) || schedTime > nowMs) return;
      }

      const slug = article.slug || slugify(article.title) || docSnap.id;
      if (!slug || seenArticleSlugs.has(slug)) return;

      seenArticleSlugs.add(slug);
      const lastmod = formatDateToYMD(article.updatedAt || article.publishedAt, today);
      entries.push({
        loc: `${baseUrl}/artikel/${encodeURIComponent(slug)}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.8',
      });
      articlesCount++;
    });

    // Also include published articles from INITIAL_ARTICLES if not yet written to Firestore
    for (const item of INITIAL_ARTICLES) {
      if (item.status === 'trash' || item.status === 'draft') continue;
      if (item.status === 'scheduled') {
        if (!item.scheduledAt) continue;
        const schedTime = new Date(item.scheduledAt).getTime();
        if (isNaN(schedTime) || schedTime > nowMs) continue;
      }
      const slug = item.slug || slugify(item.title) || item.id;
      if (!slug || seenArticleSlugs.has(slug)) continue;

      seenArticleSlugs.add(slug);
      const lastmod = formatDateToYMD(item.publishedAt, today);
      entries.push({
        loc: `${baseUrl}/artikel/${encodeURIComponent(slug)}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.8',
      });
      articlesCount++;
    }

    console.log(`[Sitemap Builder] Indexed ${articlesCount} published articles.`);

    // 4. Fetch Removed Mock Films markers from Firestore
    console.log('[Sitemap Builder] Querying removedMockFilms markers from Firestore...');
    const removedMockFilmsCol = collection(db, 'removedMockFilms');
    const removedMockFilmsSnap = await getDocs(removedMockFilmsCol);

    removedMockFilmsSnap.forEach(docSnap => {
      removedMockFilmIds.add(docSnap.id);
      const data = docSnap.data();
      if (data?.id) removedMockFilmIds.add(String(data.id));
      if (data?.slug) removedMockFilmIds.add(String(data.slug));
    });
    console.log(`[Sitemap Builder] Found ${removedMockFilmIds.size} removed mock film markers.`);

    // 5. Fetch Films Catalog from Firestore
    console.log('[Sitemap Builder] Querying films catalog from Firestore...');
    const filmsCol = collection(db, 'films');
    const filmsSnap = await getDocs(filmsCol);

    filmsSnap.forEach(docSnap => {
      const film = docSnap.data();
      const docId = docSnap.id;
      const filmId = film.id || docId;
      const slug = film.slug || slugify(film.title) || docId;

      // Skip if marked as removed mock film
      if (
        removedMockFilmIds.has(docId) ||
        (filmId && removedMockFilmIds.has(filmId)) ||
        (slug && removedMockFilmIds.has(slug))
      ) {
        return;
      }

      if (!slug || seenFilmSlugs.has(slug)) return;

      seenFilmSlugs.add(slug);
      const lastmod = formatDateToYMD(film.updatedAt || film.createdAt, today);
      entries.push({
        loc: `${baseUrl}/film/${encodeURIComponent(slug)}`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.9',
      });
      filmsCount++;
    });

    // Fallback/merge with INITIAL_FILMS, excluding any mock films in removedMockFilms
    for (const film of INITIAL_FILMS) {
      const slug = film.slug || slugify(film.title) || film.id;

      if (
        removedMockFilmIds.has(film.id) ||
        (film.slug && removedMockFilmIds.has(film.slug)) ||
        (slug && removedMockFilmIds.has(slug)) ||
        (film.title && removedMockFilmIds.has(slugify(film.title)))
      ) {
        continue;
      }

      if (!slug || seenFilmSlugs.has(slug)) continue;

      seenFilmSlugs.add(slug);
      const lastmod = formatDateToYMD(null, today);
      entries.push({
        loc: `${baseUrl}/film/${encodeURIComponent(slug)}`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.9',
      });
      filmsCount++;
    }

    console.log(`[Sitemap Builder] Indexed ${filmsCount} films.`);
  } catch (dbError: any) {
    const errorMsg = dbError?.message || String(dbError);
    const isQuotaExceeded = errorMsg.includes('Quota limit exceeded') || errorMsg.includes('quota') || dbError?.code === 'resource-exhausted';

    if (isQuotaExceeded) {
      console.log('[Sitemap Builder] Info: Firestore quota limit exceeded (Free Tier). Gracefully falling back to build-time offline static catalog.');
    } else {
      console.log(`[Sitemap Builder] Info: Firestore offline or unreachable (${errorMsg}). Gracefully falling back to build-time offline static catalog.`);
    }

    // Graceful offline fallback
    for (const item of INITIAL_ARTICLES) {
      if (item.status === 'trash' || item.status === 'draft') continue;
      if (item.status === 'scheduled') {
        if (!item.scheduledAt) continue;
        const schedTime = new Date(item.scheduledAt).getTime();
        if (isNaN(schedTime) || schedTime > nowMs) continue;
      }
      const slug = item.slug || slugify(item.title) || item.id;
      if (!slug || seenArticleSlugs.has(slug)) continue;
      seenArticleSlugs.add(slug);
      entries.push({
        loc: `${baseUrl}/artikel/${encodeURIComponent(slug)}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: '0.8',
      });
      articlesCount++;
    }
    for (const film of INITIAL_FILMS) {
      const slug = film.slug || slugify(film.title) || film.id;
      if (
        removedMockFilmIds.has(film.id) ||
        (film.slug && removedMockFilmIds.has(film.slug)) ||
        (slug && removedMockFilmIds.has(slug)) ||
        (film.title && removedMockFilmIds.has(slugify(film.title)))
      ) {
        continue;
      }
      if (!slug || seenFilmSlugs.has(slug)) continue;
      seenFilmSlugs.add(slug);
      entries.push({
        loc: `${baseUrl}/film/${encodeURIComponent(slug)}`,
        lastmod: today,
        changefreq: 'monthly',
        priority: '0.9',
      });
      filmsCount++;
    }
  } finally {
    try {
      await terminate(db);
      await deleteApp(app);
    } catch {
      // ignore
    }
  }

  // 5. Construct XML string with standard compliant tags & XML entity escaping
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const item of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(item.loc)}</loc>\n`;
    xml += `    <lastmod>${escapeXml(item.lastmod)}</lastmod>\n`;
    xml += `    <changefreq>${escapeXml(item.changefreq)}</changefreq>\n`;
    xml += `    <priority>${escapeXml(item.priority)}</priority>\n`;
    xml += '  </url>\n';
  }
  xml += '</urlset>\n';

  // 6. Write to public/sitemap.xml
  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapDest = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapDest, xml, 'utf-8');

  console.log(`[Sitemap Builder] Successfully wrote ${entries.length} URLs (${articlesCount} articles, ${filmsCount} films) to ${sitemapDest}`);
}

run().catch(err => {
  console.error('[Sitemap Builder] Fatal error:', err);
  process.exit(1);
});
