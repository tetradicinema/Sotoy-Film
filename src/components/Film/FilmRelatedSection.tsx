import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { FilmItem } from '../../types';
import { buildRelatedFilms, type RelatedFilmEntry } from '../../utils/relatedFilms';
import { fetchTmdbCollection, type TmdbCollectionPart } from '../../utils/tmdbHelper';
import { buildFranchisePath } from '../../utils/franchiseHelpers';
import { DEFAULT_POSTER } from '../../data/mockData';

interface FilmRelatedSectionProps {
  film: FilmItem;
  allFilms: FilmItem[];
  onHasRelatedChange?: (hasRelated: boolean) => void;
}

export const FilmRelatedSection: React.FC<FilmRelatedSectionProps> = ({
  film,
  allFilms,
  onHasRelatedChange,
}) => {
  const [started, setStarted] = useState(false);
  const [tmdbParts, setTmdbParts] = useState<TmdbCollectionPart[] | null>(null);

  const sectionRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Lazy load TMDB collection parts when section is within 300px of viewport
  useEffect(() => {
    if (started) return;
    const node = sectionRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  // Fetch TMDB collection once observer fires
  useEffect(() => {
    if (!started || !film.collectionId) return;
    let cancelled = false;

    fetchTmdbCollection(film.collectionId).then(res => {
      if (!cancelled && res && Array.isArray(res.parts)) {
        setTmdbParts(res.parts);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [started, film.collectionId]);

  // Build related films list
  const relatedFilms = useMemo(() => {
    return buildRelatedFilms(film, allFilms, tmdbParts || undefined);
  }, [film, allFilms, tmdbParts]);

  const hasRelated = relatedFilms.length > 1;

  // Notify parent of visibility for "Terkait" quick jump chip
  useEffect(() => {
    onHasRelatedChange?.(hasRelated);
  }, [hasRelated, onHasRelatedChange]);

  // Horizontal scroll buttons
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // If there are no related films and no collectionId to query, render nothing
  if (!hasRelated && !film.collectionId) {
    return null;
  }

  // If we only have the current film but haven't queried TMDB collection yet,
  // render an invisible sentinel so the IntersectionObserver can fire
  if (!hasRelated && film.collectionId && !started) {
    return (
      <section
        ref={sectionRef}
        id="section-related"
        className="h-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      />
    );
  }

  // After fetch or if only 1 film exists, render nothing
  if (!hasRelated) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="section-related"
      className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="font-display font-black text-lg sm:text-xl text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FF2E7E]" />
            <span>Seri / Franchise</span>
          </h2>
          {film.collectionName ? (
            film.collectionId ? (
              <Link
                to={buildFranchisePath(film.collectionId, film.collectionName)}
                title={`Lihat semua judul di ${film.collectionName}`}
                className="group/name inline-flex items-baseline gap-2 text-slate-400 text-xs sm:text-sm mt-0.5 font-medium truncate max-w-md sm:max-w-xl hover:text-[#FF2E7E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E7E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717] rounded"
              >
                <span className="truncate">{film.collectionName}</span>
                <span className="shrink-0 text-[11px] font-bold text-[#FF2E7E] whitespace-nowrap">
                  Lihat semua →
                </span>
              </Link>
            ) : (
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5 font-medium truncate max-w-md sm:max-w-xl">
                {film.collectionName}
              </p>
            )
          ) : (
            <p className="text-slate-400 text-xs mt-0.5">
              Film sekuel, prekuel, dan semesta sinematik terkait {film.title}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
            {relatedFilms.length} Film
          </span>
          <div className="hidden sm:flex items-center gap-1 ml-1">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#FF2E7E] text-slate-400 hover:text-white transition-colors"
              aria-label="Gulir ke kiri"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-[#FF2E7E] text-slate-400 hover:text-white transition-colors"
              aria-label="Gulir ke kanan"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Row */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 pt-1 scrollbar-none scroll-smooth -mx-1 px-1"
      >
        {relatedFilms.map(item => {
          const posterSrc = item.posterUrl || DEFAULT_POSTER;

          // Case 1: Current Film (highlighted, NOT a link)
          if (item.isCurrent) {
            return (
              <div
                key={item.key}
                id={`related-card-${item.key}`}
                className="w-32 sm:w-36 shrink-0 flex flex-col group select-none"
              >
                <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-950 relative border-2 border-[#FF2E7E] shadow-[0_0_20px_rgba(255,46,126,0.35)] ring-2 ring-[#FF2E7E]/30">
                  <img
                    src={posterSrc}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-[#FF2E7E] text-white text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-md tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 fill-current" />
                    <span>Sedang Dilihat</span>
                  </div>
                </div>
                <div className="pt-2">
                  <h3 className="font-bold text-xs sm:text-sm text-[#FF2E7E] truncate font-display">
                    {item.title}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    {item.year || 'TBA'}
                  </p>
                </div>
              </div>
            );
          }

          // Case 2: In-Catalog Film (links via react-router Link with real anchor to /film/{slug})
          if (item.inCatalog && item.film) {
            const filmSlug = item.film.slug || item.film.id;
            return (
              <Link
                key={item.key}
                id={`related-card-${item.key}`}
                to={`/film/${filmSlug}`}
                className="w-32 sm:w-36 shrink-0 flex flex-col group cursor-pointer focus:outline-none"
                title={`Buka detail film ${item.title}`}
              >
                <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-800 group-hover:border-[#FF2E7E] group-hover:shadow-[0_0_15px_rgba(255,46,126,0.25)] group-hover:scale-[1.025] transition-all duration-300">
                  <img
                    src={posterSrc}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="pt-2">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-200 group-hover:text-[#FF2E7E] transition-colors truncate font-display">
                    {item.title}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    {item.year || 'TBA'}
                  </p>
                </div>
              </Link>
            );
          }

          // Case 3: TMDB Collection Part NOT in Catalog (dimmed, "Belum ada di Sotoy", NO link)
          return (
            <div
              key={item.key}
              id={`related-card-${item.key}`}
              className="w-32 sm:w-36 shrink-0 flex flex-col opacity-65 hover:opacity-85 transition-opacity select-none"
              title={`${item.title} (Belum terdaftar di katalog Sotoy Film)`}
            >
              <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-800/80 grayscale-[20%]">
                <img
                  src={posterSrc}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-1.5 bottom-1.5 bg-slate-950/90 border border-slate-700/80 rounded-lg px-1.5 py-1 text-center backdrop-blur-sm shadow">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 leading-tight block">
                    Belum ada di Sotoy
                  </span>
                </div>
              </div>
              <div className="pt-2">
                <h3 className="font-medium text-xs sm:text-sm text-slate-400 truncate">
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {item.year || 'TBA'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
