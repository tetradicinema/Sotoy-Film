import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, terminate } from 'firebase/firestore';

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

function formatDateToYMD(val: any, fallbackDate: string = ''): string {
  if (!val) {
    return fallbackDate;
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      // Validate year is not ancient (e.g. >= 2020 for website lastmod)
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

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

// Static pages are not regenerated on a schedule; keep a single stable lastmod
// so crawlers do not see a fake "changed today" signal on every request.
const STATIC_LASTMOD = '2026-10-25';

async function run() {
  console.log('[Sitemap Builder] Starting build-time static sitemap generation...');
  const baseUrl = 'https://www.sotoyfilm.my.id';
  const nowMs = Date.now();

  // 1. Static Core Routes
  const entries: SitemapEntry[] = [
    { loc: `${baseUrl}/`, lastmod: STATIC_LASTMOD, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/film-database`, lastmod: STATIC_LASTMOD, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/rekomendasi-film`, lastmod: STATIC_LASTMOD, changefreq: 'weekly', priority: '0.8' },
    { loc: `${baseUrl}/komunitas`, lastmod: STATIC_LASTMOD, changefreq: 'daily', priority: '0.8' },
    { loc: `${baseUrl}/panduan-leaderboard`, lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.6' },
    { loc: `${baseUrl}/tentang-kami`, lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/kebijakan-privasi`, lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/syarat-ketentuan`, lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/kontak-bisnis`, lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/gabung-kritikus`, lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { loc: `${baseUrl}/kriteria-kritikus`, lastmod: STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
  ];

  // Category exploration hubs
  const categories = ['movies', 'series', 'animation', 'cinema-gear', 'film-studies'];
  for (const cat of categories) {
    entries.push({
      loc: `${baseUrl}/kategori/${cat}`,
      lastmod: STATIC_LASTMOD,
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  const seenArticleSlugs = new Set<string>();
  const seenFilmSlugs = new Set<string>();
  let articlesCount = 0;
  let filmsCount = 0;

  let app: any = null;
  let db: any = null;
  let isOfflineFallback = false;

  try {
    // 2. Connect to Firestore using client configuration (Read-only)
    const configPath = path.join(rootDir, 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn(`[Sitemap Builder] Config not found at: ${configPath}. Falling back to static catalog entries.`);
      isOfflineFallback = true;
    } else {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      app = initializeApp(firebaseConfig, `sitemap-builder-${Date.now()}`);
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }

    if (db) {
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
        const lastmod = formatDateToYMD(article.updatedAt || article.publishedAt || article.createdAt, '');
        const entry: SitemapEntry = {
          loc: `${baseUrl}/artikel/${encodeURIComponent(slug)}`,
          changefreq: 'weekly',
          priority: '0.8',
        };
        if (lastmod) {
          entry.lastmod = lastmod;
        }
        entries.push(entry);
        articlesCount++;
      });
    }

    console.log(`[Sitemap Builder] Indexed ${articlesCount} published articles.`);

    if (db) {
      // 4. Fetch Films Catalog from Firestore
      console.log('[Sitemap Builder] Querying films catalog from Firestore...');
      const filmsCol = collection(db, 'films');
      const filmsSnap = await getDocs(filmsCol);

      filmsSnap.forEach(docSnap => {
        const film = docSnap.data();
        const docId = docSnap.id;
        const slug = film.slug || slugify(film.title) || docId;

        if (!slug || seenFilmSlugs.has(slug)) return;

        seenFilmSlugs.add(slug);
        const lastmod = formatDateToYMD(film.updatedAt || film.createdAt, '');
        const entry: SitemapEntry = {
          loc: `${baseUrl}/film/${encodeURIComponent(slug)}`,
          changefreq: 'monthly',
          priority: '0.9',
        };
        if (lastmod) {
          entry.lastmod = lastmod;
        }
        entries.push(entry);
        filmsCount++;
      });
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

    isOfflineFallback = true;
    // In offline fallback, no film URLs are added
    filmsCount = 0;
  } finally {
    try {
      if (db) await terminate(db);
      if (app) await deleteApp(app);
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
    if (item.lastmod) {
      xml += `    <lastmod>${escapeXml(item.lastmod)}</lastmod>\n`;
    }
    xml += `    <changefreq>${escapeXml(item.changefreq)}</changefreq>\n`;
    xml += `    <priority>${escapeXml(item.priority)}</priority>\n`;
    xml += '  </url>\n';
  }
  xml += '</urlset>\n';

  // 6. Write to data/sitemap-snapshot.xml and public/sitemap.xml
  const dataDir = path.join(rootDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapDest = path.join(dataDir, 'sitemap-snapshot.xml');
  const publicSitemapDest = path.join(publicDir, 'sitemap.xml');
  const totalUrls = entries.length;

  if (isOfflineFallback && fs.existsSync(sitemapDest)) {
    const existingContent = fs.readFileSync(sitemapDest, 'utf-8');
    const existingUrlCount = (existingContent.match(/<url>/g) || []).length;
    if (existingUrlCount > totalUrls) {
      console.warn(`[Sitemap Builder] WARNING: Firestore cannot be read (offline fallback). Existing ${sitemapDest} has ${existingUrlCount} URLs which is more than fallback generated ${totalUrls} URLs. Keeping existing sitemap file.`);
      console.log(`[Sitemap Builder] Generated fallback counts: ${articlesCount} articles, ${filmsCount} films, ${totalUrls} total URLs.`);
      return;
    }
  }

  fs.writeFileSync(sitemapDest, xml, 'utf-8');
  fs.writeFileSync(publicSitemapDest, xml, 'utf-8');

  console.log(`[Sitemap Builder] Successfully wrote ${totalUrls} URLs (${articlesCount} articles, ${filmsCount} films) to ${sitemapDest} and ${publicSitemapDest}`);

}

run().catch(err => {
  console.error('[Sitemap Builder] Fatal error:', err);
  process.exit(1);
});
