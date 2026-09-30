/**
 * Metadata Generation Utility for Dynamic Route SEO
 * 
 * Re-exports and wraps the central metadata configuration utility in seoMetadata.ts,
 * providing backward-compatible route generation interfaces.
 */

import {
  buildRouteMetadata,
  CompletePageMetadata,
  STATIC_ROUTE_METADATA_CONFIG,
} from './seoMetadata';

export interface RouteMetadata {
  title: string;
  description: string;
  keywords?: string[];
  type?: 'website' | 'article' | 'video.movie' | string;
  image?: string;
  noindex?: boolean;
}

export const STATIC_ROUTE_METADATA: Record<string, RouteMetadata> = STATIC_ROUTE_METADATA_CONFIG as any;

/**
 * Generates dynamic SEO metadata based on the current path,
 * with support for exact routes, category hierarchies, and entity routes (/film/:slug, /artikel/:slug).
 *
 * @param pathname Current route pathname (e.g. window.location.pathname or React Router location.pathname)
 * @param overrides Optional partial metadata overrides
 */
export function generateMetadata(
  pathname: string = '/',
  overrides?: Partial<RouteMetadata>
): CompletePageMetadata {
  return buildRouteMetadata(pathname, { overrides: overrides as any });
}

export * from './seoMetadata';
