import { collection, getDocs, Firestore } from 'firebase/firestore';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
}

/**
 * Generates a compliant XML sitemap from Firestore data
 * Note: In a production app, this would typically run as a server-side route or build script.
 */
export async function generateSitemapXml(db: Firestore): Promise<string> {
  const baseUrl = 'https://sotoyfilm.my.id';
  const urls: SitemapUrl[] = [
    { loc: `${baseUrl}/`, lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/film-database`, lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/film-recommendations`, lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: '0.8' },
    { loc: `${baseUrl}/community-feed`, lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: '0.8' },
  ];

  // Fetch Articles
  try {
    const articlesSnap = await getDocs(collection(db, 'articles'));
    articlesSnap.forEach((doc) => {
      const data = doc.data();
      if (data.title) {
        urls.push({
          loc: `${baseUrl}/article/${data.slug || doc.id}`,
          lastmod: (data.publishedAt || new Date().toISOString()).split('T')[0],
          changefreq: 'weekly',
          priority: '0.8',
        });
      }
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
        urls.push({
          loc: `${baseUrl}/film/${doc.id}`,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: 'monthly',
          priority: '0.7',
        });
      }
    });
  } catch (error) {
    console.error('Sitemap: Failed to fetch films', error);
  }

  // Generate XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  urls.forEach((url) => {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    if (url.lastmod) xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    if (url.changefreq) xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    if (url.priority) xml += `    <priority>${url.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
}
