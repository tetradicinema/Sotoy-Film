import React, { useState, useMemo, useRef } from 'react';
import {
  Clock,
  Share2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ChevronDown,
  Star,
  Film,
  Tv,
  Sparkles,
  SlidersHorizontal,
  Flame,
  Camera,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDynamicArticleAuthor } from '../../hooks/useDynamicArticleAuthor';
import { MainCategory, Article, FilmItem } from '../../types';
import { resolveConfigArticles } from '../../utils/homepageConfigHelper';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { EditorialSidebar } from '../Common/EditorialSidebar';
import {
  ContentCategoryMobileMenu,
  CATEGORY_OPTIONS,
} from './ContentCategoryMobileMenu';

interface HomeCategoryArticleItemProps {
  article: Article;
  navigateTo: (view: any, params?: any) => void;
  openShareModal: (data: any) => void;
}

const HomeCategoryArticleItem: React.FC<HomeCategoryArticleItemProps> = ({ article, navigateTo, openShareModal }) => {
  const author = useDynamicArticleAuthor(article.authorId, article.author);

  return (
    <article
      id={`cat-article-item-${article.id}`}
      onClick={() => navigateTo('article-detail', { articleId: article.id })}
      className="bg-[#171717] border border-white/[0.08] hover:border-white/20 rounded-3xl p-5 flex flex-col sm:flex-row gap-5 group cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-black/50"
    >
      {/* Article Thumbnail */}
      <div className="sm:w-56 h-44 sm:h-auto rounded-2xl overflow-hidden shrink-0 relative bg-slate-900">
        <img
          src={article.coverImage || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent opacity-40 sm:hidden" />
      </div>

      {/* Article Content */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
            <span className="text-[#FF2E7E] font-semibold uppercase tracking-wider text-[11px]">
              {article.category}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="capitalize">{article.subCategory}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-[11px]">{article.publishedAt}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{article.readTime}</span>
            </span>
          </div>

          <h3 className="font-display font-bold text-base sm:text-lg text-white group-hover:text-white transition-colors leading-snug mb-2">
            {article.title}
          </h3>

          <p className="text-slate-400 text-xs sm:text-[13px] line-clamp-2 leading-relaxed">
            {article.excerpt}
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.08] text-xs text-slate-400">
          {author.loading ? (
            <div className="flex items-center gap-2 animate-pulse">
              <div className="w-6 h-6 rounded-full bg-slate-800" />
              <div className="h-3 w-24 bg-slate-800 rounded" />
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigateTo('user-profile', { userId: author.id });
              }}
              className="flex items-center gap-2 cursor-pointer group/author hover:text-white transition-colors"
              title={`Kunjungi profil ${author.displayName || author.name}`}
            >
              <img
                src={author.avatarURL || author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                alt={author.displayName || author.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 group-hover/author:ring-[#FF2E7E] transition-all"
              />
              <span className="text-slate-300 font-medium text-xs group-hover/author:text-white transition-colors truncate max-w-[130px]">
                {author.displayName || author.name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              id={`share-article-btn-${article.id}`}
              onClick={(e) => {
                e.stopPropagation();
                openShareModal({
                  title: article.title,
                  url: window.location.href,
                  text: article.excerpt,
                  tags: article.tags,
                  image: article.coverImage,
                  imageUrl: article.coverImage,
                  type: 'article',
                  category: article.category,
                  authorName: author.displayName || author.name,
                  authorAvatar: author.avatarURL || author.avatar,
                  meta: `${article.category.toUpperCase()} · ${author.displayName || author.name} (${article.readTime})`,
                });
              }}
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
              title="Bagikan Artikel"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <span className="text-[#FF2E7E] font-semibold text-xs group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              <span>Baca Pembahasan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};


// -------------------------------------------------------------
// SKELETON COMPONENT LOADERS
// -------------------------------------------------------------

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

const Section2Skeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="p-6 rounded-3xl bg-[#171717] border border-white/[0.04] grid grid-cols-1 sm:grid-cols-12 gap-6">
      <div className="sm:col-span-5 h-48 bg-slate-800 rounded-2xl" />
      <div className="sm:col-span-7 space-y-3 justify-center flex flex-col">
        <div className="h-3 w-32 bg-slate-800 rounded" />
        <div className="h-6 w-3/4 bg-slate-800 rounded" />
        <div className="h-3 w-full bg-slate-800/60 rounded" />
      </div>
    </div>
  </div>
);

const Section3Skeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
    {[1, 2].map((col) => (
      <div key={col} className="space-y-3">
        <div className="h-4 w-36 bg-slate-800/80 rounded mb-2" />
        {[1, 2, 3].map((item) => (
          <div key={item} className="p-4 rounded-2xl bg-[#171717] border border-white/[0.04] flex gap-3.5">
            <div className="w-24 h-24 bg-slate-800 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-800 rounded" />
              <div className="h-3 w-5/6 bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const Section4Skeleton: React.FC = () => (
  <div className="bg-[#171717] rounded-3xl border border-white/[0.04] divide-y divide-white/[0.04] animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="p-3.5 flex items-center gap-3.5">
        <div className="w-12 h-12 bg-slate-800 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-28 bg-slate-800/70 rounded" />
          <div className="h-3.5 w-3/4 bg-slate-800 rounded" />
        </div>
      </div>
    ))}
  </div>
);

const Section5Skeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="p-6 rounded-3xl bg-[#171717] border border-white/[0.04] grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-5 h-48 bg-slate-800 rounded-2xl" />
      <div className="md:col-span-7 space-y-3 flex flex-col justify-center">
        <div className="h-3 w-28 bg-slate-800 rounded" />
        <div className="h-6 w-5/6 bg-slate-800 rounded" />
        <div className="h-3 w-full bg-slate-800/60 rounded" />
      </div>
    </div>
  </div>
);

// -------------------------------------------------------------
// EMPTY STATE COMPONENT INDICATOR
// -------------------------------------------------------------

const SectionEmptyState: React.FC<{ icon: React.ReactNode; message: string; submessage?: string }> = ({
  icon,
  message,
  submessage,
}) => (
  <div className="p-8 sm:p-10 text-center rounded-3xl bg-[#171717]/80 border border-white/[0.06] flex flex-col items-center justify-center space-y-2.5">
    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-slate-500 mb-1">
      {icon}
    </div>
    <p className="text-xs sm:text-sm font-semibold text-slate-300">{message}</p>
    {submessage && <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{submessage}</p>}
  </div>
);

export const HomeCategorySection: React.FC = () => {
  const {
    films,
    publishedArticles,
    isLoadingArticles,
    navigateTo,
    openShareModal,
    homepageSectionsConfig,
  } = useApp();

  const [selectedCategoryTab, setSelectedCategoryTab] = useState<MainCategory | 'all'>('all');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // SECTION 1: Tab state for mobile/tablet responsive view
  const [mediaListTab, setMediaListTab] = useState<'movie' | 'series' | 'anime'>('movie');

  // Carousel ref for Section 2 (Cinema Gear)
  const gearScrollRef = useRef<HTMLDivElement>(null);

  const scrollGear = (direction: 'left' | 'right') => {
    if (gearScrollRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      gearScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // -------------------------------------------------------------
  // DATA MEMOS FOR THE 5 NEW BLOCKS
  // -------------------------------------------------------------

  // Section 1: Curated list articles (movies, series, anime)
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

  // Section 2: Cinema gear articles (~4-6 items)
  const defaultGearArticles = useMemo(() => {
    return publishedArticles
      .filter((a) => a.category === 'cinema-gear')
      .slice(0, 6);
  }, [publishedArticles]);

  const gearArticles = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.cinema_gear_articles,
      defaultGearArticles
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.cinema_gear_articles, defaultGearArticles]);

  // Section 3: Honest reviews (split movies vs series)
  const defaultMovieReviews = useMemo(() => {
    return publishedArticles
      .filter(
        (a) =>
          a.category === 'movies' &&
          (a.subCategory === 'reviews' || a.tags?.some((t) => t.toLowerCase().includes('review')))
      )
      .slice(0, 4);
  }, [publishedArticles]);

  const movieReviews = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.reviews_movie,
      defaultMovieReviews
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.reviews_movie, defaultMovieReviews]);

  const defaultSeriesReviews = useMemo(() => {
    return publishedArticles
      .filter(
        (a) =>
          a.category === 'series' &&
          (a.subCategory === 'reviews' || a.tags?.some((t) => t.toLowerCase().includes('review')))
      )
      .slice(0, 4);
  }, [publishedArticles]);

  const seriesReviews = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.reviews_series,
      defaultSeriesReviews
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.reviews_series, defaultSeriesReviews]);

  // Section 4: Anime news (compact ticker)
  const defaultAnimeNews = useMemo(() => {
    const newsOnly = publishedArticles.filter(
      (a) =>
        a.category === 'anime' &&
        (a.subCategory === 'news' || a.tags?.some((t) => t.toLowerCase().includes('news')))
    );
    if (newsOnly.length >= 3) return newsOnly.slice(0, 5);
    // Fallback to all anime articles if news specific is sparse
    return publishedArticles.filter((a) => a.category === 'anime').slice(0, 5);
  }, [publishedArticles]);

  const animeNews = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.anime_news,
      defaultAnimeNews
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.anime_news, defaultAnimeNews]);

  // Section 5: Film studies (editorial, 2-3 long-form essays)
  const defaultFilmStudiesArticles = useMemo(() => {
    return publishedArticles
      .filter((a) => a.category === 'film-studies')
      .slice(0, 3);
  }, [publishedArticles]);

  const filmStudiesArticles = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.film_studies,
      defaultFilmStudiesArticles
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.film_studies, defaultFilmStudiesArticles]);

  // SubCategory label translator for film studies
  const getFilmStudiesLabel = (sub: string) => {
    switch (sub) {
      case 'cinematography':
        return 'Sinematografi';
      case 'directing':
        return 'Penyutradaraan';
      case 'producing':
        return 'Produksi & Industri';
      case 'lighting':
        return 'Tata Cahaya';
      case 'post-production':
        return 'Pascaproduksi';
      default:
        return 'Kajian Sinema';
    }
  };

  // Compute article count per category for drawer display
  const categoryCounts = useMemo(() => {
    const counts: Record<MainCategory | 'all', number> = {
      all: publishedArticles.length,
      movies: 0,
      series: 0,
      anime: 0,
      'cinema-gear': 0,
      'film-studies': 0,
    };
    for (const art of publishedArticles) {
      if (art.category && counts[art.category as MainCategory] !== undefined) {
        counts[art.category as MainCategory]++;
      }
    }
    return counts;
  }, [publishedArticles]);

  const currentCategoryOption = CATEGORY_OPTIONS.find((c) => c.id === selectedCategoryTab);
  const currentCategoryLabel = currentCategoryOption ? currentCategoryOption.label : 'Semua Artikel';

  // Filter articles based on tab for bottom Explore section
  const filteredArticles = selectedCategoryTab === 'all'
    ? publishedArticles
    : publishedArticles.filter((a) => a.category === selectedCategoryTab);

  // Helper renderer for curated list articles in Section 1
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
    <section id="category-articles-section" className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main 2-Column Layout: Left Content (8 cols), Right Sidebar (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* MAIN COLUMN (8 Columns) - Houses the 5 New Blocks + Explore Categories */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* ============================================================== */}
            {/* SECTION 1: MOVIE / SERIES / ANIME LISTS                        */}
            {/* ============================================================== */}
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


            {/* ============================================================== */}
            {/* SECTION 2: CINEMA GEAR ARTICLES (INTERACTIVE CAROUSEL)        */}
            {/* ============================================================== */}
            <section id="home-cinema-gear-section" aria-labelledby="heading-cinema-gear">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-4 pb-3 border-b border-white/[0.08]">
                <div>
                  <h2 id="heading-cinema-gear" className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                    {homepageSectionsConfig?.sections?.cinema_gear_articles?.title?.trim() || 'Cinema Gear & Filmmaking Tech'}
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-[13px] mt-1">
                    Ulasan mendalam kamera sinema, lensa anamorphic, lighting rig, dan panduan perangkat produksi film independen.
                  </p>
                </div>

                {/* Carousel Controls */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => scrollGear('left')}
                    className="p-2 rounded-xl bg-black/40 hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
                    aria-label="Geser ke kiri"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollGear('right')}
                    className="p-2 rounded-xl bg-black/40 hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
                    aria-label="Geser ke kanan"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isLoadingArticles ? (
                <Section2Skeleton />
              ) : gearArticles.length === 0 ? (
                <SectionEmptyState
                  icon={<Camera className="w-5 h-5 text-slate-500" />}
                  message="Belum ada artikel cinema gear"
                  submessage="Ulasan kamera sinema, lensa, dan perangkat produksi akan segera dipublikasikan."
                />
              ) : (
                <div className="space-y-4">
                  {/* Featured Large Asymmetric Card */}
                  {gearArticles[0] && (
                    <article
                      onClick={() => navigateTo('article-detail', { articleId: gearArticles[0].id })}
                      className="group relative rounded-3xl bg-[#171717] border border-white/[0.08] hover:border-white/20 p-5 sm:p-6 overflow-hidden cursor-pointer transition-all shadow-lg hover:shadow-2xl"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                        <div className="sm:col-span-5 aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 relative">
                          <img
                            src={gearArticles[0].coverImage || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'}
                            alt={gearArticles[0].title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-bold text-white border border-white/10">
                            Sorotan Gear
                          </div>
                        </div>

                        <div className="sm:col-span-7 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                              <span className="text-[#FF2E7E] font-semibold">{gearArticles[0].subCategory}</span>
                              <span className="text-slate-600">·</span>
                              <span>{gearArticles[0].publishedAt}</span>
                              <span className="text-slate-600">·</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{gearArticles[0].readTime}</span>
                              </span>
                            </div>

                            <h3 className="font-display font-bold text-lg sm:text-xl text-white group-hover:text-white leading-snug mb-2">
                              {gearArticles[0].title}
                            </h3>

                            <p className="text-slate-400 text-xs sm:text-[13px] line-clamp-3 leading-relaxed mb-4">
                              {gearArticles[0].excerpt}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
                            <span className="text-slate-400 text-[11px]">Oleh {gearArticles[0].author?.name || 'Redaksi'}</span>
                            <span className="text-[#FF2E7E] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              <span>Bedah Spesifikasi</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  )}

                  {/* Horizontal Snap Strip for remaining gear items */}
                  {gearArticles.length > 1 && (
                    <div
                      ref={gearScrollRef}
                      className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 pt-1 scrollbar-none"
                    >
                      {gearArticles.slice(1).map((article) => (
                        <div
                          key={article.id}
                          onClick={() => navigateTo('article-detail', { articleId: article.id })}
                          className="snap-start min-w-[240px] sm:min-w-[270px] max-w-[270px] p-4 rounded-2xl bg-[#171717] border border-white/[0.08] hover:border-white/20 group cursor-pointer transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-900 mb-3 relative">
                              <img
                                src={article.coverImage || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
                              <span className="text-[#FF2E7E] font-medium">{article.subCategory}</span>
                              <span className="text-slate-600">·</span>
                              <span>{article.readTime}</span>
                            </div>
                            <h4 className="font-display font-bold text-sm text-white group-hover:text-white line-clamp-2 leading-snug mb-1">
                              {article.title}
                            </h4>
                          </div>

                          <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 truncate max-w-[150px]">{article.publishedAt}</span>
                            <span className="text-[#FF2E7E] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              <span>Detail</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>


            {/* ============================================================== */}
            {/* SECTION 3: HONEST REVIEWS (2 COLUMNS: MOVIE VS SERIES)        */}
            {/* ============================================================== */}
            <section id="home-honest-reviews-section" aria-labelledby="heading-honest-reviews">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08]">
                <div>
                  <h2 id="heading-honest-reviews" className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                    Honest Reviews: Movies & Series
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-[13px] mt-1">
                    Ulasan jujur, mendalam, dan objektif dari redaksi untuk rilisan layar lebar serta serial streaming terbaru.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Movie Reviews */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1.5 text-xs text-slate-300 font-semibold border-b border-white/[0.04]">
                    <span>{homepageSectionsConfig?.sections?.reviews_movie?.title?.trim() || 'Review Film Bioskop'}</span>
                    <span className="text-[11px] font-mono text-slate-500">{movieReviews.length} ulasan</span>
                  </div>

                  {isLoadingArticles ? (
                    <Section3Skeleton />
                  ) : movieReviews.length === 0 ? (
                    <SectionEmptyState
                      icon={<Film className="w-4 h-4 text-slate-500" />}
                      message="Belum ada ulasan film"
                    />
                  ) : (
                    <div className="space-y-3">
                      {movieReviews.map((article) => (
                        <article
                          key={article.id}
                          onClick={() => navigateTo('article-detail', { articleId: article.id })}
                          className="p-3.5 sm:p-4 rounded-2xl bg-[#171717] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group flex flex-col sm:flex-row gap-3.5"
                        >
                          {/* Article Thumbnail */}
                          <div className="w-full sm:w-24 sm:h-24 aspect-[16/10] sm:aspect-square rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-white/[0.08]">
                            <img
                              src={article.coverImage || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80'}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                                <span className="text-[#FF2E7E] font-semibold">Verdict Film</span>
                                <span className="text-slate-600">·</span>
                                <span>{article.readTime}</span>
                              </div>

                              <h4 className="font-display font-bold text-sm text-white group-hover:text-white leading-snug mb-1.5 line-clamp-2">
                                {article.title}
                              </h4>

                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                "{article.excerpt}"
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/[0.06] text-[11px] text-slate-400">
                              <span className="truncate max-w-[110px]">{article.author?.name || 'Redaksi'}</span>
                              <span className="text-[#FF2E7E] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
                                <span>Baca Ulasan</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                {/* Column 2: Series Reviews */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1.5 text-xs text-slate-300 font-semibold border-b border-white/[0.04]">
                    <span>{homepageSectionsConfig?.sections?.reviews_series?.title?.trim() || 'Review Serial Streaming'}</span>
                    <span className="text-[11px] font-mono text-slate-500">{seriesReviews.length} ulasan</span>
                  </div>

                  {isLoadingArticles ? (
                    <Section3Skeleton />
                  ) : seriesReviews.length === 0 ? (
                    <SectionEmptyState
                      icon={<Tv className="w-4 h-4 text-slate-500" />}
                      message="Belum ada ulasan serial"
                    />
                  ) : (
                    <div className="space-y-3">
                      {seriesReviews.map((article) => (
                        <article
                          key={article.id}
                          onClick={() => navigateTo('article-detail', { articleId: article.id })}
                          className="p-3.5 sm:p-4 rounded-2xl bg-[#171717] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group flex flex-col sm:flex-row gap-3.5"
                        >
                          {/* Article Thumbnail */}
                          <div className="w-full sm:w-24 sm:h-24 aspect-[16/10] sm:aspect-square rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-white/[0.08]">
                            <img
                              src={article.coverImage || 'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=300&q=80'}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                                <span className="text-[#FF2E7E] font-semibold">Verdict Serial</span>
                                <span className="text-slate-600">·</span>
                                <span>{article.readTime}</span>
                              </div>

                              <h4 className="font-display font-bold text-sm text-white group-hover:text-white leading-snug mb-1.5 line-clamp-2">
                                {article.title}
                              </h4>

                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                "{article.excerpt}"
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/[0.06] text-[11px] text-slate-400">
                              <span className="truncate max-w-[110px]">{article.author?.name || 'Redaksi'}</span>
                              <span className="text-[#FF2E7E] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
                                <span>Baca Ulasan</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>


            {/* ============================================================== */}
            {/* SECTION 4: ANIME NEWS (COMPACT TICKER / WIRE STYLE)           */}
            {/* ============================================================== */}
            <section id="home-anime-news-ticker" aria-labelledby="heading-anime-news">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08]">
                <div>
                  <h2 id="heading-anime-news" className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                    {homepageSectionsConfig?.sections?.anime_news?.title?.trim() || 'Anime News & Season Updates'}
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-[13px] mt-1">
                    Warta terkini seputar jadwal tayang musim baru, adaptasi manga, dan kabar resmi dari studio animasi Jepang.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-500 self-start sm:self-auto">
                  News Wire ({animeNews.length})
                </span>
              </div>

              {isLoadingArticles ? (
                <Section4Skeleton />
              ) : animeNews.length === 0 ? (
                <SectionEmptyState
                  icon={<Sparkles className="w-5 h-5 text-slate-500" />}
                  message="Belum ada kabar anime terbaru"
                  submessage="Update jadwal tayang dan kabar terkini anime akan segera diperbarui."
                />
              ) : (
                <div className="bg-[#171717] rounded-3xl border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
                  {animeNews.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => navigateTo('article-detail', { articleId: article.id })}
                      className="p-3 sm:p-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                        {/* Article Thumbnail */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-white/[0.08]">
                          <img
                            src={article.coverImage || 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=160&q=80'}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-mono text-slate-400">
                              {article.publishedAt}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF2E7E]" />
                            <span className="text-[10px] uppercase font-bold text-[#FF2E7E] tracking-wider">
                              {article.subCategory || 'Anime Wire'}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-white transition-colors truncate">
                            {article.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-slate-400 group-hover:text-[#FF2E7E] transition-colors text-xs">
                        <span className="hidden sm:inline text-[11px] font-mono text-slate-500">
                          {article.readTime}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>


            {/* ============================================================== */}
            {/* SECTION 5: FILM STUDIES (MAGAZINE / ESSAY LONG-FORM)          */}
            {/* ============================================================== */}
            <section id="home-film-studies-section" aria-labelledby="heading-film-studies">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08]">
                <div>
                  <h2 id="heading-film-studies" className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                    {homepageSectionsConfig?.sections?.film_studies?.title?.trim() || 'Film Studies & Cinematic Essays'}
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-[13px] mt-1">
                    Kajian mendalam seputar teori montase, dramaturgi penyutradaraan, tata sinematografi, dan analisis visual.
                  </p>
                </div>
              </div>

              {isLoadingArticles ? (
                <Section5Skeleton />
              ) : filmStudiesArticles.length === 0 ? (
                <SectionEmptyState
                  icon={<BookOpen className="w-5 h-5 text-slate-500" />}
                  message="Belum ada esai kajian sinema"
                  submessage="Analisis sinematografi, teori montase, dan esai sinematik mendalam akan segera dirilis."
                />
              ) : (
                <div className="space-y-4">
                  {/* Primary Editorial Long-form Lead with Article Cover Image */}
                  {filmStudiesArticles[0] && (
                    <article
                      onClick={() => navigateTo('article-detail', { articleId: filmStudiesArticles[0].id })}
                      className="group p-5 sm:p-7 rounded-3xl bg-[#171717] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer shadow-lg hover:shadow-2xl relative overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Article Image */}
                        <div className="md:col-span-5 aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 border border-white/[0.08]">
                          <img
                            src={filmStudiesArticles[0].coverImage || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80'}
                            alt={filmStudiesArticles[0].title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        <div className="md:col-span-7 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2.5">
                              <span className="text-[#FF2E7E] font-semibold">
                                {getFilmStudiesLabel(filmStudiesArticles[0].subCategory)}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span>{filmStudiesArticles[0].publishedAt}</span>
                              <span className="text-slate-600">·</span>
                              <span>{filmStudiesArticles[0].readTime}</span>
                            </div>

                            <h3 className="font-display font-bold text-xl sm:text-2xl text-white group-hover:text-white leading-tight mb-3">
                              {filmStudiesArticles[0].title}
                            </h3>

                            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4 font-serif italic line-clamp-3">
                              "{filmStudiesArticles[0].excerpt}"
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-white/[0.08] text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                              <img
                                src={filmStudiesArticles[0].author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                                alt={filmStudiesArticles[0].author?.name || 'Penulis'}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <span className="text-slate-300 font-medium">
                                {filmStudiesArticles[0].author?.name || 'Redaksi Sotoy'}
                              </span>
                            </div>

                            <span className="text-[#FF2E7E] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              <span>Baca Esai Lengkap</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  )}

                  {/* Secondary Essay Cards with Article Cover Images */}
                  {filmStudiesArticles.length > 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filmStudiesArticles.slice(1).map((article) => (
                        <article
                          key={article.id}
                          onClick={() => navigateTo('article-detail', { articleId: article.id })}
                          className="group p-4 sm:p-5 rounded-2xl bg-[#171717] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            {/* Article Image */}
                            <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-900 border border-white/[0.08] mb-3">
                              <img
                                src={article.coverImage || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80'}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1.5">
                              <span className="text-[#FF2E7E] font-medium">
                                {getFilmStudiesLabel(article.subCategory)}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span>{article.readTime}</span>
                            </div>

                            <h4 className="font-display font-bold text-sm sm:text-base text-white group-hover:text-white leading-snug mb-2 line-clamp-2">
                              {article.title}
                            </h4>

                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                              {article.excerpt}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                            <span>{article.author?.name || 'Redaksi'}</span>
                            <span className="text-[#FF2E7E] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[11px]">
                              <span>Baca</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>


            {/* ============================================================== */}
            {/* EXISTING EXPLORE CATEGORIES & ARCHIVES CONTENT                 */}
            {/* ============================================================== */}
            <div id="explore-categories-container" className="pt-8 border-t border-white/[0.08] space-y-6">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-slate-300 rounded-full inline-block" />
                    <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                      Explore Categories & Archives
                    </h2>
                  </div>
                  <p className="text-slate-400 text-xs sm:text-[13px] mt-1 ml-3.5">
                    Ulasan film, bedah serial, anime musim ini, eksplorasi cinema gear, dan kajian sinematik.
                  </p>
                </div>

                {selectedCategoryTab !== 'all' && (
                  <button
                    onClick={() => navigateTo('category', { category: selectedCategoryTab })}
                    className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>Arsip Lengkap {selectedCategoryTab}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Desktop Category Filter Tabs Bar (Cohesive Segmented Control) */}
              <div className="hidden lg:flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/[0.08] overflow-x-auto scrollbar-none">
                {CATEGORY_OPTIONS.map((cat) => {
                  const isCatActive = selectedCategoryTab === cat.id;
                  const buttonIdMap: Record<string, string> = {
                    all: 'filter-cat-all',
                    movies: 'filter-cat-movies',
                    series: 'filter-cat-series',
                    anime: 'filter-cat-anime',
                    'cinema-gear': 'filter-cat-gear',
                    'film-studies': 'filter-cat-studies',
                  };

                  return (
                    <button
                      key={cat.id}
                      id={buttonIdMap[cat.id]}
                      onClick={() => setSelectedCategoryTab(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                        isCatActive
                          ? 'bg-white/[0.12] text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Category Trigger Button (Threads-style Drawer Opener) */}
              <div className="lg:hidden flex items-center justify-between gap-3">
                <button
                  id="mobile-category-drawer-trigger"
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/[0.10] active:border-white/20 text-xs font-semibold text-white transition-all active:scale-[0.98] min-h-[44px]"
                  aria-haspopup="dialog"
                  aria-expanded={isMobileDrawerOpen}
                  aria-label="Pilih Kategori Konten"
                >
                  <span className="text-slate-400 font-normal">Kategori:</span>
                  <span className="font-bold text-white">{currentCategoryLabel}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </button>

                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {filteredArticles.length} artikel
                </span>
              </div>

              {/* Articles List */}
              <div className="space-y-4">
                {filteredArticles.slice(0, 7).map((article) => (
                  <HomeCategoryArticleItem
                    key={article.id}
                    article={article}
                    navigateTo={navigateTo}
                    openShareModal={openShareModal}
                  />
                ))}
              </div>

              {/* In-feed Ad Banner Slot */}
              <AdBannerSlot variant="infeed" />
            </div>

          </div>

          {/* RIGHT SIDEBAR (4 Columns) - Sticky positioning as user scrolls */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 self-start space-y-6">
            <EditorialSidebar />
          </div>
        </div>
      </div>

      {/* Mobile Content Category Drawer Menu (Threads-style) */}
      <ContentCategoryMobileMenu
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        selectedCategory={selectedCategoryTab}
        onSelectCategory={(cat) => setSelectedCategoryTab(cat)}
        categoryCounts={categoryCounts}
      />
    </section>
  );
};
