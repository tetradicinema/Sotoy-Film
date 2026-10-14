import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { INITIAL_ARTICLES, INITIAL_FILMS } from '../src/data/mockData.ts';

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Builds standard XML sitemap content fallback
 */
function buildFallbackSitemapXml(): string {
  const baseUrl = 'https://www.sotoyfilm.my.id';
  const today = new Date().toISOString().split('T')[0];

  const staticUrls = [
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
    { loc: `${baseUrl}/kategori/movies`, lastmod: today, changefreq: 'weekly', priority: '0.7' },
    { loc: `${baseUrl}/kategori/series`, lastmod: today, changefreq: 'weekly', priority: '0.7' },
    { loc: `${baseUrl}/kategori/anime`, lastmod: today, changefreq: 'weekly', priority: '0.7' },
    { loc: `${baseUrl}/kategori/cinema-gear`, lastmod: today, changefreq: 'weekly', priority: '0.7' },
    { loc: `${baseUrl}/kategori/film-studies`, lastmod: today, changefreq: 'weekly', priority: '0.7' },
  ];

  const seenArticleSlugs = new Set<string>();
  const seenFilmSlugs = new Set<string>();

  const articleUrls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];
  for (const item of INITIAL_ARTICLES) {
    if (item.status === 'trash' || item.status === 'draft') continue;
    const slug = item.slug || slugify(item.title) || item.id;
    if (!slug || seenArticleSlugs.has(slug)) continue;
    seenArticleSlugs.add(slug);
    articleUrls.push({
      loc: `${baseUrl}/artikel/${encodeURIComponent(slug)}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  const filmUrls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];
  for (const film of INITIAL_FILMS) {
    const slug = film.slug || slugify(film.title) || film.id;
    if (!slug || seenFilmSlugs.has(slug)) continue;
    seenFilmSlugs.add(slug);
    filmUrls.push({
      loc: `${baseUrl}/film/${encodeURIComponent(slug)}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.9',
    });
  }

  const allEntries = [...staticUrls, ...articleUrls, ...filmUrls];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const entry of allEntries) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(entry.loc)}</loc>\n`;
    xml += `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n`;
    xml += `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n`;
    xml += `    <priority>${escapeXml(entry.priority)}</priority>\n`;
    xml += '  </url>\n';
  }
  xml += '</urlset>\n';

  return xml;
}

/**
 * Shared sitemap request handler for Express and Vercel Serverless
 */
export async function handleSitemapRequest(req: any, res: any) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');

  const candidatePaths = [
    path.join(process.cwd(), 'public', 'sitemap.xml'),
    path.join(process.cwd(), 'dist', 'sitemap.xml'),
    path.join(process.cwd(), 'sitemap.xml'),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        if (content && content.includes('<urlset')) {
          if (res.status) {
            return res.status(200).send(content);
          } else {
            res.writeHead(200);
            return res.end(content);
          }
        }
      }
    } catch {
      // ignore file read error, fallback to memory generation
    }
  }

  // Generate valid XML dynamically if file not found on disk
  const xml = buildFallbackSitemapXml();
  if (res.status) {
    return res.status(200).send(xml);
  } else {
    res.writeHead(200);
    return res.end(xml);
  }
}

export default async function handler(req: any, res: any) {
  return handleSitemapRequest(req, res);
}
