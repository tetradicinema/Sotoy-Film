import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Film, Layers, Database } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { FilmItem } from '../../types';
import { SEOHead } from '../SEO/SEOHead';
import { FilmDbCard } from '../Film/FilmDbCard';
import { fetchTmdbCollection, type TmdbCollectionResponse } from '../../utils/tmdbHelper';
import {
  buildFranchisePath,
  parseFranchiseRouteParam,
} from '../../utils/franchiseHelpers';
import { generateBreadcrumbSchema } from '../../utils/schemaHelpers';
import { tmdbMediaType } from '../../utils/tmdbSync';
import { DEFAULT_BASE_URL } from '../../utils/seoMetadata';
import { DEFAULT_POSTER } from '../../data/mockData';

type PageStatus = 'loading' | 'ready' | 'not-found';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E7E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]';

/**
 * One row of the franchise grid. Catalog titles carry the real FilmItem so
 * they render as FilmDbCard links; TMDB parts that are not in the catalog are
 * dimmed, non-clickable placeholders ("Belum ada di Sotoy").
 */
interface FranchiseEntry {
  key: string;
  title: string;
  releaseDate: string;
  yearLabel: string;
  posterUrl?: string;
  film?: FilmItem;
  inCatalog: boolean;
}

const partPosterUrl = (posterPath: string | null): string | undefined =>
  posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined;

const filmReleaseDate = (film: FilmItem): string =>
  (film.releaseDate || '').trim();

const filmYearLabel = (film: FilmItem): string =>
  film.year ? String(film.year) : filmReleaseDate(film).substring(0, 4);

const SkeletonCard: React.FC = () => (
  <div className="bg-[#171717] border border-slate-800 rounded-lg overflow-hidden animate-pulse">
    <div className="aspect-[2/3] w-full bg-slate-900" />
    <div className="bg-black px-2.5 py-2 space-y-1.5">
      <div className="h-3 w-3/4 bg-slate-800 rounded" />
      <div className="h-2.5 w-1/3 bg-slate-800 rounded" />
    </div>
  </div>
);

export const FranchisePage: React.FC = () => {
  const { idSlug } = useParams<{ idSlug?: string }>();
  const { films, isLoadingFilms, navigateTo, goBack } = useApp();

  const franchiseId = useMemo(() => parseFranchiseRouteParam(idSlug), [idSlug]);

  const [collection, setCollection] = useState<TmdbCollectionResponse | null>(null);
  const [status, setStatus] = useState<PageStatus>(() =>
    franchiseId ? 'loading' : 'not-found'
  );

  // Load the TMDB collection once per id. fetchTmdbCollection caches and
  // dedupes internally, so revisits and concurrent visits share one request.
  // A null result is NOT immediately "not-found": the catalog fallback below
  // (films sharing the collectionId) can still fill the page.
  useEffect(() => {
    if (!franchiseId) {
      setCollection(null);
      setStatus('not-found');
      return;
    }

    let cancelled = false;
    setCollection(null);
    setStatus('loading');

    fetchTmdbCollection(franchiseId).then(res => {
      if (cancelled) return;
      setCollection(res);
      // "ready" even without TMDB data: the render decides between content
      // and not-found based on the merged catalog entries.
      setStatus('ready');
    });

    return () => {
      cancelled = true;
    };
  }, [franchiseId]);

  /**
   * Merges catalog films and TMDB parts:
   * (a) catalog films with collectionId === franchiseId always belong here;
   * (b) TMDB parts matching a catalog movie by tmdbId merge into that film
   *     (media type movie only, exactly like buildRelatedFilms);
   * (c) parts without a catalog match stay as non-clickable entries.
   * When TMDB returned nothing at all, (a) alone is the catalog fallback and
   * the display name comes from the films' collectionName.
   */
  const entries = useMemo<FranchiseEntry[]>(() => {
    if (franchiseId === null) return [];

    const catalogMap = new Map<string, FilmItem>();
    for (const film of films) {
      if (!film || !film.id) continue;
      if (film.collectionId === franchiseId) {
        catalogMap.set(film.id, film);
      }
    }

    const uncatalogedParts: TmdbCollectionResponse['parts'] = [];
    const matchedPartTmdbIds = new Set<number>();

    const parts = collection?.parts || [];
    // Release date lookup by tmdbId, used as a fallback when a catalog film
    // carries no releaseDate of its own.
    const partByTmdbId = new Map<number, TmdbCollectionResponse['parts'][number]>();
    for (const part of parts) {
      if (!part || typeof part.tmdbId !== 'number' || part.tmdbId <= 0) continue;
      if (partByTmdbId.has(part.tmdbId)) continue;
      partByTmdbId.set(part.tmdbId, part);
    }

    for (const part of parts) {
      if (!part || typeof part.tmdbId !== 'number' || part.tmdbId <= 0) continue;
      if (matchedPartTmdbIds.has(part.tmdbId)) continue;
      matchedPartTmdbIds.add(part.tmdbId);

      const matchedMovie = [...catalogMap.values()].find(
        f => f.tmdbId === part.tmdbId && tmdbMediaType(f) === 'movie'
      ) || films.find(
        f =>
          f &&
          f.tmdbId === part.tmdbId &&
          tmdbMediaType(f) === 'movie'
      );

      if (matchedMovie && matchedMovie.id) {
        catalogMap.set(matchedMovie.id, matchedMovie);
      } else {
        uncatalogedParts.push(part);
      }
    }

    const result: FranchiseEntry[] = [];
    const seenKeys = new Set<string>();

    for (const catFilm of catalogMap.values()) {
      const key = `catalog-${catFilm.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      // Sort key fallbacks when the film has no releaseDate: first the
      // matching TMDB part's releaseDate (by tmdbId), then the film year
      // as Jan 1, otherwise undated.
      const releaseDate =
        filmReleaseDate(catFilm) ||
        (typeof catFilm.tmdbId === 'number'
          ? partByTmdbId.get(catFilm.tmdbId)?.releaseDate?.trim()
          : undefined) ||
        (catFilm.year ? `${catFilm.year}-01-01` : '');
      result.push({
        key,
        title: catFilm.title,
        releaseDate,
        yearLabel: filmYearLabel(catFilm),
        posterUrl: catFilm.poster || undefined,
        film: catFilm,
        inCatalog: true,
      });
    }

    for (const part of uncatalogedParts) {
      const key = `tmdb-${part.tmdbId}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      result.push({
        key,
        title: part.title,
        releaseDate: (part.releaseDate || '').trim(),
        yearLabel: (part.releaseDate || '').substring(0, 4),
        posterUrl: partPosterUrl(part.posterPath),
        inCatalog: false,
      });
    }

    // Release date ascending, undated last; secondary sort by title.
    result.sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return a.title.localeCompare(b.title);
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return (
        a.releaseDate.localeCompare(b.releaseDate) ||
        a.title.localeCompare(b.title)
      );
    });

    return result;
  }, [franchiseId, films, collection]);

  const fallbackNameFilm = useMemo(
    () =>
      films.find(
        f =>
          f &&
          f.collectionId === franchiseId &&
          (f.collectionName || '').trim()
      ),
    [films, franchiseId]
  );

  const displayName = useMemo(() => {
    const name = (collection?.name || '').trim();
    if (name) return name;
    return (fallbackNameFilm?.collectionName || '').trim() || `Franchise #${franchiseId ?? ''}`;
  }, [collection, fallbackNameFilm, franchiseId]);

  // The skeleton must never depend on the film catalogue alone: if TMDB parts
  // already produced entries, render the content even while isLoadingFilms is
  // still true. Googlebot can be left with the loading head forever when the
  // Firestore SDK never settles, so the catalogue may only gate an EMPTY page.
  const tmdbStillLoading = status === 'loading';
  const showSkeleton =
    tmdbStillLoading || (isLoadingFilms && entries.length === 0);

  // Skeleton / neutral loading head. Never noindex: the loading state is
  // transient and must never win over the middleware's indexable HTML. When
  // the TMDB collection name is already known, reuse the final SEO wording;
  // otherwise a neutral title with no robots directive and no canonical
  // override (SEOHead falls back to the current URL).
  if (showSkeleton) {
    const knownName = (collection?.name || '').trim();

    return (
      <>
        {knownName ? (
          <SEOHead
            title={`${knownName} - Semua Film Franchise | Sotoy Film`}
            canonicalUrl={`${DEFAULT_BASE_URL}${buildFranchisePath(franchiseId!, knownName)}`}
          />
        ) : (
          <SEOHead title="Franchise | Sotoy Film" />
        )}
        <main className="min-h-screen bg-[#0A0A0A] text-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-8" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  // Not-found is only decided once the TMDB request finished AND the film
  // catalogue is no longer loading: the catalog fallback (films sharing the
  // collectionId) may still be about to fill an empty TMDB result.
  if (
    status === 'not-found' ||
    (status === 'ready' && !isLoadingFilms && entries.length === 0)
  ) {
    return (
      <>
        <SEOHead
          title="Franchise tidak ditemukan | Sotoy Film"
          description="Franchise atau koleksi film tidak tersedia di Sotoy Film."
          robots="noindex, follow"
        />
        <main className="min-h-screen bg-[#0A0A0A] text-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div
              className="bg-[#171717] border border-slate-800 rounded-3xl p-8 sm:py-12 text-center shadow-xl"
              role="status"
            >
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border bg-slate-900 border-slate-800 text-slate-400">
                <Layers className="w-8 h-8" />
              </div>

              <h1 className="mt-6 text-2xl sm:text-3xl font-black text-white">
                Franchise tidak ditemukan
              </h1>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                Koleksi film yang Anda cari tidak tersedia atau belum memiliki judul
                terkait di Sotoy Film.
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo('film-database')}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-sm font-bold transition-colors ${FOCUS_RING}`}
                >
                  <Database className="w-4 h-4" />
                  Jelajahi film lain
                </button>

                <button
                  type="button"
                  onClick={goBack}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-sm font-bold transition-colors ${FOCUS_RING}`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const canonicalUrl = `${DEFAULT_BASE_URL}${buildFranchisePath(franchiseId!, displayName)}`;
  const seoTitle = `${displayName} - Semua Film Franchise | Sotoy Film`;
  const seoDescription = `Daftar semua film dalam franchise ${displayName} di Sotoy Film, diurutkan berdasarkan tanggal rilis, lengkap dengan Skor Sotoy.`;
  const catalogCount = entries.filter(entry => entry.inCatalog).length;
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: DEFAULT_BASE_URL },
    { name: displayName, item: canonicalUrl },
  ]);

  // Pages with zero catalog titles only mirror TMDB data: keep them out of
  // the index only once the catalogue actually loaded (a blocked or still
  // loading Firestore SDK must never flip this page to noindex). Otherwise
  // keep the normal indexable SEO with the canonical URL.
  const thinPage =
    !isLoadingFilms && films.length > 0 && catalogCount === 0;
  const seo = thinPage
    ? {
        title: seoTitle,
        description: seoDescription,
        robots: 'noindex, follow' as const,
        schema: breadcrumbSchema,
      }
    : {
        title: seoTitle,
        description: seoDescription,
        canonicalUrl,
        type: 'website' as const,
        schema: breadcrumbSchema,
      };

  return (
    <>
      <SEOHead {...seo} />

      <main className="min-h-screen bg-[#0A0A0A] text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <button
            type="button"
            onClick={goBack}
            className={`inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 mb-6 ${FOCUS_RING}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>

          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-3">
              <Layers className="w-6 h-6 sm:w-7 sm:h-7 text-[#FF2E7E] shrink-0" />
              <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
                {displayName}
              </h1>
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                {entries.length} judul
              </span>
            </div>
            {catalogCount !== entries.length && (
              <p className="mt-2 text-sm text-slate-400">
                {catalogCount} judul tersedia di katalog Sotoy Film,{' '}
                {entries.length - catalogCount} lainnya belum terdaftar.
              </p>
            )}
          </header>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {entries.map(entry => {
              if (entry.inCatalog && entry.film) {
                return (
                  <FilmDbCard
                    key={entry.key}
                    film={entry.film}
                    sectionKey="fd_editors_pick"
                    onOpen={item => navigateTo('film-detail', { filmId: item.id })}
                  />
                );
              }

              // TMDB part that is NOT in the catalog: dimmed, non-clickable,
              // same treatment as FilmRelatedSection's "Belum ada di Sotoy".
              const posterSrc = entry.posterUrl || DEFAULT_POSTER;
              return (
                <div
                  key={entry.key}
                  title={`${entry.title} (Belum terdaftar di katalog Sotoy Film)`}
                  className="bg-[#171717] border border-slate-800/80 rounded-lg overflow-hidden opacity-65 select-none flex flex-col"
                  aria-disabled="true"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950 grayscale-[20%]">
                    <img
                      src={posterSrc}
                      alt={entry.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-2 bottom-2 bg-slate-950/90 border border-slate-700/80 rounded-lg px-1.5 py-1 text-center backdrop-blur-sm shadow">
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 leading-tight block">
                        Belum ada di Sotoy
                      </span>
                    </div>
                  </div>
                  <div className="bg-black px-2.5 py-2">
                    <h3 className="font-display font-medium text-xs sm:text-sm text-slate-400 truncate">
                      {entry.title}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {entry.yearLabel || 'TBA'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {entries.every(entry => !entry.inCatalog) && (
            <p className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Film className="w-4 h-4" />
              Belum ada judul dari franchise ini di katalog Sotoy Film.
            </p>
          )}
        </div>
      </main>
    </>
  );
};
