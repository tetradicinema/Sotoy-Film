/**
 * Canonical breadcrumb trails for pages that render the visible
 * `<BreadcrumbNavigation>` and/or emit BreadcrumbList JSON-LD.
 *
 * Pure and React-free: the same array feeds the visible navigation and the
 * `generateBreadcrumbSchema` call in `SEOHead`, so the UI and the structured
 * data cannot drift apart. Every `path` is a canonical site-relative path
 * (never `window.location.href`).
 */

import {
  buildArticlePath,
  buildCategoryPath,
  buildFilmPath,
  type EntityPathArticle,
  type EntityPathFilm,
} from './entityPaths';
import { normalizeArticleCategory } from './articleCategory';
import { buildFranchisePath } from './franchiseHelpers';

export interface BreadcrumbTrailItem {
  label: string;
  path: string;
}

export interface BreadcrumbArticleInput extends EntityPathArticle {
  category?: string | null;
  subCategory?: string | null;
}

const HOME: BreadcrumbTrailItem = { label: 'Home', path: '/' };

const MAIN_CATEGORY_LABELS: Record<string, string> = {
  movies: 'Movies',
  series: 'Series',
  animation: 'Animation',
  'cinema-gear': 'Cinema Gear',
  'film-studies': 'Film Studies',
};

const SUB_CATEGORY_LABELS: Record<string, string> = {
  news: 'News',
  lists: 'Lists',
  reviews: 'Reviews',
  'gear-news': 'Gear News',
  'gear-reviews': 'Gear Reviews',
  producing: 'Producing',
  directing: 'Directing',
  cinematography: 'Cinematography',
  lighting: 'Lighting',
  'post-production': 'Post-Production',
};

/** Title-cases a kebab/snake slug ("gear-news" -> "Gear News"). */
function titleCaseSegment(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim();
}

/**
 * Single label helper for main categories. Accepts raw Firestore values
 * (including legacy "anime"/"animasi") so callers never need local
 * `toUpperCase()` logic.
 */
export function getCategoryLabel(category: string): string {
  const normalized = (normalizeArticleCategory(category) || '').trim();
  if (!normalized) return 'Category';
  return MAIN_CATEGORY_LABELS[normalized.toLowerCase()] || titleCaseSegment(normalized);
}

/** Single label helper for subcategories ("gear-news" -> "Gear News"). */
export function getSubCategoryLabel(subCategory: string): string {
  const trimmed = subCategory.trim();
  if (!trimmed) return '';
  return SUB_CATEGORY_LABELS[trimmed.toLowerCase()] || titleCaseSegment(trimmed);
}

/** Home > Film Database > film title. */
export function buildFilmBreadcrumbs(film: EntityPathFilm): BreadcrumbTrailItem[] {
  return [
    { ...HOME },
    { label: 'Film Database', path: '/film-database' },
    {
      label: (film.title || '').trim() || 'Film',
      path: buildFilmPath(film),
    },
  ];
}

/** Home > category > [subcategory] > article title. */
export function buildArticleBreadcrumbs(
  article: BreadcrumbArticleInput
): BreadcrumbTrailItem[] {
  const trail: BreadcrumbTrailItem[] = [{ ...HOME }];
  const category = (normalizeArticleCategory(article.category) || '').trim();
  const subCategory = (article.subCategory || '').trim();

  if (category) {
    trail.push({
      label: getCategoryLabel(category),
      path: buildCategoryPath(category),
    });
    if (subCategory) {
      trail.push({
        label: getSubCategoryLabel(subCategory),
        path: buildCategoryPath(category, subCategory),
      });
    }
  }

  trail.push({
    label: (article.title || '').trim() || 'Artikel',
    path: buildArticlePath(article),
  });

  return trail;
}

/** Home > category title > [subcategory]. */
export function buildCategoryBreadcrumbs(
  category: string,
  subCategory?: string | null
): BreadcrumbTrailItem[] {
  const normalized = (normalizeArticleCategory(category) || category || '').trim();
  const trail: BreadcrumbTrailItem[] = [
    { ...HOME },
    {
      label: getCategoryLabel(normalized),
      path: buildCategoryPath(normalized),
    },
  ];

  const sub = (subCategory || '').trim();
  if (sub) {
    trail.push({
      label: getSubCategoryLabel(sub),
      path: buildCategoryPath(normalized, sub),
    });
  }

  return trail;
}

/** Home > franchise name. */
export function buildFranchiseBreadcrumbs(
  id: number,
  name?: string | null
): BreadcrumbTrailItem[] {
  return [
    { ...HOME },
    {
      label: (name || '').trim() || 'Franchise',
      path: buildFranchisePath(id, name),
    },
  ];
}

/** Maps a trail to the `{ name, item }` shape `generateBreadcrumbSchema` expects. */
export function toSchemaItems(
  items: readonly BreadcrumbTrailItem[]
): { name: string; item: string }[] {
  return items.map(item => ({ name: item.label, item: item.path }));
}
