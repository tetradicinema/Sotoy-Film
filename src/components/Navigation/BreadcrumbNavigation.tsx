import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { slugify } from '../../utils/slugify';

export interface BreadcrumbStep {
  label: string;
  path?: string;
}

export interface BreadcrumbNavigationProps {
  /**
   * Explicit breadcrumb steps to display, including the leading Home step.
   * Build these with `src/utils/breadcrumbs.ts` so the visible trail and the
   * page's BreadcrumbList JSON-LD are generated from the same array.
   *
   * When omitted or empty, steps are derived from `useLocation().pathname`
   * as a visual-only fallback.
   */
  items?: BreadcrumbStep[];
  /**
   * Optional override label for the current (leaf) page.
   * Ideal when the leaf segment in URL is an ID or slug, but you want to display the real title.
   */
  currentTitle?: string;
  /**
   * Optional custom label mapping for specific URL segments (e.g., { film: 'Movies', artikel: 'Artikel' })
   */
  customLabels?: Record<string, string>;
  /**
   * Optional extra container styling classes.
   */
  className?: string;
}

const SEGMENT_LABEL_MAP: Record<string, string> = {
  film: 'Film',
  artikel: 'Artikel',
  article: 'Artikel',
  kategori: 'Kategori',
  category: 'Kategori',
  movies: 'Movies',
  series: 'Series',
  'k-drama': 'K-Drama',
  action: 'Action',
  drama: 'Drama',
  comedy: 'Comedy',
  komedi: 'Komedi',
  horror: 'Horror',
  horor: 'Horor',
  scifi: 'Sci-Fi',
  'sci-fi': 'Sci-Fi',
  romance: 'Romance',
  romantis: 'Romantis',
  thriller: 'Thriller',
  animation: 'Animation',
  documentary: 'Dokumenter',
  dokumenter: 'Dokumenter',
  adventure: 'Petualangan',
  petualangan: 'Petualangan',
  fantasy: 'Fantasi',
  fantasi: 'Fantasi',
  crime: 'Kriminal',
  kriminal: 'Kriminal',
  mystery: 'Misteri',
  misteri: 'Misteri',
  trending: 'Trending',
  reviews: 'Reviews',
  news: 'Berita',
  features: 'Fitur',
  'database-film': 'Database Film',
  komunitas: 'Komunitas',
  'tentang-kami': 'Tentang Kami',
  'kebijakan-privasi': 'Kebijakan Privasi',
  'syarat-ketentuan': 'Syarat & Ketentuan',
  cms: 'CMS',
  write: 'Tulis Artikel',
  search: 'Pencarian',
  settings: 'Pengaturan',
  critic: 'Kritikus',
  onboarding: 'Onboarding',
};

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  items,
  currentTitle,
  customLabels,
  className = '',
}) => {
  const location = useLocation();

  // Helper to format a URL segment into human-readable label
  const formatSegmentLabel = (segment: string): string => {
    try {
      const decoded = decodeURIComponent(segment);
      const lower = decoded.toLowerCase();
      if (customLabels && customLabels[lower]) {
        return customLabels[lower];
      }
      if (SEGMENT_LABEL_MAP[lower]) {
        return SEGMENT_LABEL_MAP[lower];
      }
      // Convert kebab-case or snake_case to Title Case
      return decoded
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    } catch {
      return segment;
    }
  };

  // Derive steps either from the explicit items prop (the full trail,
  // including Home) or from useLocation().pathname as a visual fallback.
  const effectiveSteps = useMemo<BreadcrumbStep[]>(() => {
    if (items && items.length > 0) {
      return items;
    }

    // Auto-generate from location.pathname
    const rawSegments = location.pathname.split('/').filter(Boolean);
    if (rawSegments.length === 0) {
      return [{ label: 'Home', path: '/' }];
    }

    const steps: BreadcrumbStep[] = [{ label: 'Home', path: '/' }];
    let cumulativePath = '';

    rawSegments.forEach((segment, index) => {
      const isLast = index === rawSegments.length - 1;
      cumulativePath += `/${segment}`;
      const lower = segment.toLowerCase();

      // The taxonomy prefix is a path segment, not a crumb: show
      // "Home > Movies", never "Home > Kategori > Movies".
      if (lower === 'kategori' || lower === 'category') return;

      let label = formatSegmentLabel(segment);
      if (isLast && currentTitle) {
        label = currentTitle;
      }

      // Smart target paths for top-level prefixes
      let targetPath: string | undefined = isLast ? undefined : cumulativePath;
      if (lower === 'film') {
        targetPath = '/film-database';
      }

      steps.push({
        label,
        path: targetPath,
      });
    });

    return steps;
  }, [items, location.pathname, currentTitle, customLabels]);

  // BreadcrumbList JSON-LD is emitted once per page by `SEOHead`, built from
  // the same trail (`src/utils/breadcrumbs.ts` + `generateBreadcrumbSchema`).
  // This component is visual-only: rendering a second, non-Helmet schema here
  // duplicated the BreadcrumbList and could not use canonical URLs.

  return (
    <nav
      id="breadcrumb-navigation-container"
      aria-label="Breadcrumb"
      className={`w-full py-2.5 flex items-center justify-between text-xs font-medium text-slate-400 select-none ${className}`}
    >
      <ol id="breadcrumb-list" className="flex flex-wrap items-center gap-1.5 min-w-0">
        {effectiveSteps.map((step, index) => {
          const isLast = index === effectiveSteps.length - 1;
          const stepSlug = slugify(step.label) || `step-${index}`;

          return (
            <li
              key={index}
              id={`breadcrumb-item-${index}-${stepSlug}`}
              aria-current={isLast ? 'page' : undefined}
              className="flex items-center gap-1.5 min-w-0"
            >
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
              )}

              {isLast ? (
                <span
                  id={`breadcrumb-current-label-${stepSlug}`}
                  className="text-slate-200 font-semibold truncate max-w-[170px] sm:max-w-xs md:max-w-md lg:max-w-lg"
                  title={step.label}
                >
                  {step.label}
                </span>
              ) : (
                <Link
                  to={step.path || '/'}
                  id={`breadcrumb-link-${index}-${stepSlug}`}
                  className="group flex items-center gap-1 transition-colors hover:text-[#FF2E7E] text-slate-400 focus-visible:text-[#FF2E7E] focus-visible:outline-none"
                >
                  {index === 0 && (
                    <Home className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-[#FF2E7E] transition-colors" aria-hidden="true" />
                  )}
                  <span className="truncate">{step.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
