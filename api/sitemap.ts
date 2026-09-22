import fs from 'fs';
import path from 'path';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, terminate } from 'firebase/firestore';
import { INITIAL_ARTICLES, INITIAL_FILMS } from '../src/data/mockData';

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

export async function handleSitemapRequest(req: any, res: any) {
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

  const seenArticleSlugs = new Set<string>();
  const seenFilmSlugs = new Set<string>();

  let firebaseConfig: any = null;
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');

  if (fs.existsSync(configPath)) {
    try {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn('[Sitemap] Failed to parse firebase configuration file:', e);
    }
  }

  if (firebaseConfig) {
    const appName = `sitemap-runtime-${Date.now()}`;
    let app: any = null;
    let db: any = null;
    try {
      app = initializeApp(firebaseConfig, appName);
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

      // Fetch Published Articles from Firestore
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
      });

      // Fetch Films Catalog from Firestore
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
      });
    } catch (dbError) {
      console.warn('[Sitemap] Warning: Error querying Firestore collections, falling back to static/mock catalog:', dbError);
    } finally {
      try {
        if (db) await terminate(db);
        if (app) await deleteApp(app);
      } catch {
        // ignore
      }
    }
  } else {
    console.log('[Sitemap] No firebase-applet-config.json found, using fallback catalog.');
  }

  // Populate dynamic entries from INITIAL_ARTICLES and INITIAL_FILMS if not already populated
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
  }

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
  }

  // Construct XML string
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

  res.setHeader('Content-Type', 'application/xml');
  return res.send(xml);
}
