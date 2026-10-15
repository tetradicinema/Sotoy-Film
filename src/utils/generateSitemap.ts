import { collection, getDocs, Firestore } from 'firebase/firestore';
import { slugify } from './slugify';
import { INITIAL_FILMS } from '../data/mockData';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
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

/**
 * Generates a compliant XML sitemap from Firestore data
 */
export async function generateSitemapXml(db: Firestore): Promise<string> {
  const baseUrl = 'https://www.sotoyfilm.my.id';
  const today = new Date().toISOString().split('T')[0];
  const nowMs = Date.now();

  const urls: SitemapUrl[] = [
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

  // Add category hubs
  const categories = ['movies', 'series', 'anime', 'cinema-gear', 'film-studies'];
  categories.forEach((cat) => {
    urls.push({
      loc: `${baseUrl}/kategori/${cat}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.7',
    });
  });

  const seenArticleSlugs = new Set<string>();
  const seenFilmSlugs = new Set<string>();

  // Fetch Articles
  try {
    const articlesSnap = await getDocs(collection(db, 'articles'));
    articlesSnap.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'trash' || data.status === 'draft') return;
      if (data.status === 'scheduled' && data.scheduledAt) {
        const schedTime = new Date(data.scheduledAt).getTime();
        if (isNaN(schedTime) || schedTime > nowMs) return;
      }
      const slug = data.slug || (data.title ? slugify(data.title) : doc.id);
      if (!slug || seenArticleSlugs.has(slug)) return;
      seenArticleSlugs.add(slug);

      urls.push({
        loc: `${baseUrl}/artikel/${encodeURIComponent(slug)}`,
        lastmod: data.updatedAt ? data.updatedAt.split('T')[0] : (data.publishedAt ? data.publishedAt.split('T')[0] : today),
        changefreq: 'weekly',
        priority: '0.8',
      });
    });
  } catch (error) {
    console.error('Sitemap: Failed to fetch articles', error);
  }

  // Fetch Films
  try {
    const filmsSnap = await getDocs(collection(db, 'films'));
    filmsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.title) {
        const filmSlug = data.slug || slugify(data.title) || doc.id;
        if (!filmSlug || seenFilmSlugs.has(filmSlug)) return;
        seenFilmSlugs.add(filmSlug);

        urls.push({
          loc: `${baseUrl}/film/${encodeURIComponent(filmSlug)}`,
          lastmod: today,
          changefreq: 'monthly',
          priority: '0.9',
        });
      }
    });
  } catch (error) {
    console.error('Sitemap: Failed to fetch films', error);
  }

  // Fallback initial films
  for (const film of INITIAL_FILMS) {
    const filmSlug = film.slug || slugify(film.title) || film.id;
    if (!filmSlug || seenFilmSlugs.has(filmSlug)) continue;
    seenFilmSlugs.add(filmSlug);
    urls.push({
      loc: `${baseUrl}/film/${encodeURIComponent(filmSlug)}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.9',
    });
  }

  // Generate XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  urls.forEach((url) => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
    if (url.lastmod) xml += `    <lastmod>${escapeXml(url.lastmod)}</lastmod>\n`;
    if (url.changefreq) xml += `    <changefreq>${escapeXml(url.changefreq)}</changefreq>\n`;
    if (url.priority) xml += `    <priority>${escapeXml(url.priority)}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';
  return xml;
}
