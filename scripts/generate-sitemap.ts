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
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDateToYMD(val: any, fallbackYear?: number): string {
  if (fallbackYear && (!val || val === '')) {
    return `${fallbackYear}-01-01`;
  }
  if (!val) {
    return new Date().toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return val;
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  if (val && typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString().split('T')[0];
    } catch {
      // ignore
    }
  }
  if (val && typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
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

  // 1. Static Core Routes
  const entries: SitemapEntry[] = [
    { loc: `${baseUrl}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/film-database`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/rekomendasi-film`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${baseUrl}/komunitas`, lastmod: today, changefreq: 'daily', priority: '0.8' },
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

  // 2. Connect to Firestore using client configuration (Read-only if available)
  const configPath = path.join(rootDir, 'firebase-applet-config.json');
  let app: any = null;
  let db: any = null;

  const seenArticleSlugs = new Set<string>();
  const seenFilmSlugs = new Set<string>();
  let articlesCount = 0;
  let filmsCount = 0;

  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`[Sitemap Builder] Configuration not found at: ${configPath}. Using static fallback.`);
    } else {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      app = initializeApp(firebaseConfig, `sitemap-builder-${Date.now()}`);
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

      // 3. Fetch Published Articles from Firestore
      console.log('[Sitemap Builder] Querying articles from Firestore...');
      const articlesCol = collection(db, 'articles');
      const articlesSnap = await getDocs(articlesCol);

      articlesSnap.forEach(docSnap => {
        const article = docSnap.data();
        if (article.status === 'trash' || article.status === 'draft') return;
        const slug = article.slug || slugify(article.title) || docSnap.id;
        if (!slug || seenArticleSlugs.has(slug)) return;

        seenArticleSlugs.add(slug);
        const lastmod = formatDateToYMD(article.updatedAt || article.publishedAt);
        entries.push({
          loc: `${baseUrl}/artikel/${encodeURIComponent(slug)}`,
          lastmod,
          changefreq: 'weekly',
          priority: '0.8',
        });
        articlesCount++;
      });
    }

    // Also include published articles from INITIAL_ARTICLES if not yet written to Firestore
    for (const item of INITIAL_ARTICLES) {
      if (item.status === 'trash' || item.status === 'draft') continue;
      const slug = item.slug || slugify(item.title) || item.id;
      if (!slug || seenArticleSlugs.has(slug)) continue;

      seenArticleSlugs.add(slug);
      const lastmod = formatDateToYMD(item.publishedAt);
      entries.push({
        loc: `${baseUrl}/artikel/${encodeURIComponent(slug)}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.8',
      });
      articlesCount++;
    }

    console.log(`[Sitemap Builder] Indexed ${articlesCount} published articles.`);

    // 4. Fetch Films Catalog from Firestore
    console.log('[Sitemap Builder] Querying films catalog from Firestore...');
    const filmsCol = collection(db, 'films');
    const filmsSnap = await getDocs(filmsCol);

    filmsSnap.forEach(docSnap => {
      const film = docSnap.data();
      const slug = film.slug || slugify(film.title) || docSnap.id;
      if (!slug || seenFilmSlugs.has(slug)) return;

      seenFilmSlugs.add(slug);
      const lastmod = formatDateToYMD(film.updatedAt || film.createdAt, film.year);
      entries.push({
        loc: `${baseUrl}/film/${encodeURIComponent(slug)}`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.9',
      });
      filmsCount++;
    });

    // Fallback/merge with INITIAL_FILMS
    for (const film of INITIAL_FILMS) {
      const slug = film.slug || slugify(film.title) || film.id;
      if (!slug || seenFilmSlugs.has(slug)) continue;

      seenFilmSlugs.add(slug);
      const lastmod = formatDateToYMD(film.year ? `${film.year}-01-01` : null, film.year);
      entries.push({
        loc: `${baseUrl}/film/${encodeURIComponent(slug)}`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.9',
      });
      filmsCount++;
    }

    console.log(`[Sitemap Builder] Indexed ${filmsCount} films.`);
  } catch (dbError) {
    console.error('[Sitemap Builder] Warning: Error querying Firestore collections:', dbError);
    // Graceful offline fallback
    for (const item of INITIAL_ARTICLES) {
      if (item.status === 'trash' || item.status === 'draft') continue;
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
      if (db) await terminate(db);
      if (app) await deleteApp(app);
    } catch {
      // ignore
    }
  }

  // 5. Construct XML string
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const item of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${item.loc}</loc>\n`;
    xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
    xml += `    <priority>${item.priority}</priority>\n`;
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
