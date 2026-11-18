/**
 * Canonical URL builders for entity links (articles, films, categories).
 *
 * These mirror the exact URL logic used by `generateSitemap.ts`, so every
 * crawlable <a> rendered in the UI points at the same URL the sitemap lists.
 * Intentionally import-free so it can be unit-tested and reused from scripts
 * without pulling in Firebase, React, or the app context.
 */

export interface EntityPathArticle {
  id: string;
  slug?: string | null;
  title?: string | null;
}

export interface EntityPathFilm {
  id: string;
  slug?: string | null;
  title?: string | null;
}

/**
 * Local copy of `slugify` (src/utils/slugify.ts) so this module stays
 * import-free. Keep both implementations in sync.
 */
function slugifyLocal(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (e.g. ō -> o)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word characters except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // replace spaces, underscores, and consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // remove leading and trailing hyphens
}

/**
 * `/artikel/{slug|id}` — same as generateSitemap: `data.slug || doc.id`
 * (articles fall back to the raw id, not a slugified title).
 */
export function buildArticlePath(article: EntityPathArticle): string {
  const slug = article.slug || article.id;
  return `/artikel/${encodeURIComponent(slug)}`;
}

/**
 * `/film/{slug|slugified-title|id}` — same as generateSitemap:
 * `data.slug || slugify(data.title) || doc.id`.
 */
export function buildFilmPath(film: EntityPathFilm): string {
  const slug = film.slug || slugifyLocal(film.title || '') || film.id;
  return `/film/${encodeURIComponent(slug)}`;
}

/**
 * `/kategori/{category}[/{subCategory}]` — same as navigateTo: category and
 * subcategory path segments are used verbatim (no encodeURIComponent), exactly
 * like the URLs emitted by navigateTo and listed in the sitemap.
 */
export function buildCategoryPath(
  category: string,
  subCategory?: string | null
): string {
  return subCategory ? `/kategori/${category}/${subCategory}` : `/kategori/${category}`;
}
