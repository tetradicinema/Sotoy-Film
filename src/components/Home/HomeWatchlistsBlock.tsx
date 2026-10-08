import React, { useState, useMemo } from 'react';
import { Clock, Film } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Article } from '../../types';
import { resolveConfigArticles } from '../../utils/homepageConfigHelper';
import { SectionEmptyState } from './HomeSectionCommon';

const Section1Skeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
    {[1, 2, 3].map((col) => (
      <div key={col} className="space-y-2">
        <div className="h-4 w-28 bg-slate-800/80 rounded mb-2" />
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#171717] border border-white/[0.04]">
            <div className="w-5 h-4 bg-slate-800 rounded shrink-0" />
            <div className="w-11 h-14 bg-slate-800 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-800 rounded w-5/6" />
              <div className="h-2.5 bg-slate-800/60 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

export const HomeWatchlistsBlock: React.FC = () => {
  const {
    publishedArticles,
    isLoadingArticles,
    navigateTo,
    homepageSectionsConfig,
  } = useApp();

  // Tab state for mobile/tablet responsive view
  const [mediaListTab, setMediaListTab] = useState<'movie' | 'series' | 'anime'>('movie');

  // Curated list articles (movies, series, anime)
  const defaultMovieListsArticles = useMemo(() => {
    const lists = publishedArticles.filter(
      (a) =>
        a.category === 'movies' &&
        (a.subCategory === 'lists' || a.tags?.some((t) => t.toLowerCase().includes('list') || t.toLowerCase().includes('rekomendasi')))
    );
    if (lists.length > 0) return lists.slice(0, 5);
    return publishedArticles.filter((a) => a.category === 'movies').slice(0, 5);
  }, [publishedArticles]);

  const movieListsArticles = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.movie_list,
      defaultMovieListsArticles
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.movie_list, defaultMovieListsArticles]);

  const defaultSeriesListsArticles = useMemo(() => {
    const lists = publishedArticles.filter(
      (a) =>
        a.category === 'series' &&
        (a.subCategory === 'lists' || a.tags?.some((t) => t.toLowerCase().includes('list') || t.toLowerCase().includes('rekomendasi')))
    );
    if (lists.length > 0) return lists.slice(0, 5);
    return publishedArticles.filter((a) => a.category === 'series').slice(0, 5);
  }, [publishedArticles]);

  const seriesListsArticles = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.series_list,
      defaultSeriesListsArticles
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.series_list, defaultSeriesListsArticles]);

  const defaultAnimeListsArticles = useMemo(() => {
    const lists = publishedArticles.filter(
      (a) =>
        a.category === 'anime' &&
        (a.subCategory === 'lists' || a.tags?.some((t) => t.toLowerCase().includes('list') || t.toLowerCase().includes('rekomendasi')))
    );
    if (lists.length > 0) return lists.slice(0, 5);
    return publishedArticles.filter((a) => a.category === 'anime').slice(0, 5);
  }, [publishedArticles]);

  const animeListsArticles = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.anime_list,
      defaultAnimeListsArticles
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.anime_list, defaultAnimeListsArticles]);

  const renderCuratedArticleList = (items: Article[]) => {
    if (items.length === 0) {
      return (
        <SectionEmptyState
          icon={<Film className="w-5 h-5 text-slate-500" />}
          message="Belum ada daftar kurasi"
          submessage="Koleksi artikel daftar pilihan redaksi akan segera hadir."
        />
      );
    }

    return (
      <div className="space-y-2">
        {items.map((article, index) => (
          <article
            key={article.id}
            onClick={() => navigateTo('article-detail', { articleId: article.id })}
            className="group flex items-center gap-3 p-2.5 rounded-2xl bg-[#171717] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/20 transition-all cursor-pointer"
          >
            {/* Rank Number */}
            <span className="w-5 text-center font-mono font-bold text-xs text-slate-500 group-hover:text-[#FF2E7E] transition-colors shrink-0">
              0{index + 1}
            </span>

            {/* Poster / Article Cover Thumbnail */}
            <img
              src={article.coverImage || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=140&q=80'}
              alt={article.title}
              className="w-11 h-14 rounded-xl object-cover shrink-0 bg-slate-900 border border-white/[0.08] group-hover:scale-105 transition-transform duration-300"
            />

            {/* Title & Metadata */}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white group-hover:text-white line-clamp-2 leading-snug">
                {article.title}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                <span className="truncate max-w-[90px]">{article.author?.name || 'Redaksi'}</span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-0.5 shrink-0">
                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                  <span>{article.readTime}</span>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <section id="home-community-ranked-lists" aria-labelledby="heading-ranked-lists">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08]">
        <div>
          <h2 id="heading-ranked-lists" className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
            Curated Watchlists: Movies, Series & Anime
          </h2>
          <p className="text-slate-400 text-xs sm:text-[13px] mt-1">
            Koleksi kurasi daftar film terbaik, serial pilihan untuk maraton, dan anime rekomendasi yang dirangkum oleh redaksi.
          </p>
        </div>

        {/* Mobile/Tablet Tabbed Switcher */}
        <div className="flex md:hidden items-center p-1 bg-black/40 rounded-xl border border-white/[0.08] text-xs self-start mt-2 sm:mt-0">
          <button
            type="button"
            onClick={() => setMediaListTab('movie')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              mediaListTab === 'movie'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {homepageSectionsConfig?.sections?.movie_list?.title?.trim() || 'Movie Lists'} ({movieListsArticles.length})
          </button>
          <button
            type="button"
            onClick={() => setMediaListTab('series')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              mediaListTab === 'series'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {homepageSectionsConfig?.sections?.series_list?.title?.trim() || 'Series Lists'} ({seriesListsArticles.length})
          </button>
          <button
            type="button"
            onClick={() => setMediaListTab('anime')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              mediaListTab === 'anime'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {homepageSectionsConfig?.sections?.anime_list?.title?.trim() || 'Anime Lists'} ({animeListsArticles.length})
          </button>
        </div>
      </div>

      {isLoadingArticles ? (
        <Section1Skeleton />
      ) : (
        <>
          {/* Desktop 3-Column View */}
          <div className="hidden md:grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 text-xs text-slate-300 font-semibold border-b border-white/[0.04]">
                <span>{homepageSectionsConfig?.sections?.movie_list?.title?.trim() || 'Movie Lists'}</span>
                <span className="text-[11px] font-mono text-slate-500">{movieListsArticles.length} artikel</span>
              </div>
              {renderCuratedArticleList(movieListsArticles)}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 text-xs text-slate-300 font-semibold border-b border-white/[0.04]">
                <span>{homepageSectionsConfig?.sections?.series_list?.title?.trim() || 'Series Lists'}</span>
                <span className="text-[11px] font-mono text-slate-500">{seriesListsArticles.length} artikel</span>
              </div>
              {renderCuratedArticleList(seriesListsArticles)}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 text-xs text-slate-300 font-semibold border-b border-white/[0.04]">
                <span>{homepageSectionsConfig?.sections?.anime_list?.title?.trim() || 'Anime Lists'}</span>
                <span className="text-[11px] font-mono text-slate-500">{animeListsArticles.length} artikel</span>
              </div>
              {renderCuratedArticleList(animeListsArticles)}
            </div>
          </div>

          {/* Mobile/Tablet Single Column Tabbed Content */}
          <div className="md:hidden">
            {mediaListTab === 'movie' && renderCuratedArticleList(movieListsArticles)}
            {mediaListTab === 'series' && renderCuratedArticleList(seriesListsArticles)}
            {mediaListTab === 'anime' && renderCuratedArticleList(animeListsArticles)}
          </div>
        </>
      )}
    </section>
  );
};
