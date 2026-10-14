import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Film,
  FileText,
  MessageSquare,
  Users,
  Star,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Filter,
  Check,
  UserCheck,
  UserPlus,
  Share2,
  Calendar,
  ThumbsUp,
  Tag,
  Globe,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FilmItem, Article, BuzzPost, User } from '../../types';
import { formatRelativeTime, formatFullDateTime } from '../../utils/formatRelativeTime';
import { searchTmdbFilms, TmdbSearchResultItem } from '../../utils/tmdbHelper';
import { DEFAULT_AVATAR, DEFAULT_POSTER, DEFAULT_COVER } from '../../data/mockData';
import { resolveAuthor } from '../../utils/resolveAuthor';

type SearchTab = 'all' | 'film' | 'article' | 'buzz' | 'user';

const RECENT_SEARCHES_KEY = 'sotoy_search_history';

const TRENDING_SEARCHES = [
  'Dune: Part Two',
  'Siksa Kubur',
  'Agak Laen',
  'Horor Lokal',
  'Christopher Nolan',
  'Exhuma',
  'Sony FX3',
  'Joko Anwar',
];

export const SearchPage: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    films,
    publishedArticles,
    buzzList,
    allUsers,
    usersById,
    navigateTo,
    goBack,
    currentUser,
    followingIds,
    toggleFollowUser,
    isFollowing,
    showToast,
    importAndNavigateToTmdbFilm,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // TMDB Real-time Search States
  const [tmdbSearchResults, setTmdbSearchResults] = useState<TmdbSearchResultItem[]>([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState<boolean>(false);

  // Recent searches state
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 8);
      }
    } catch {
      // ignore
    }
    return ['Dune: Part Two', 'Siksa Kubur', 'Agak Laen'];
  });

  // Sync local query with global query
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Sync recent searches with localStorage events
  useEffect(() => {
    const syncStorage = () => {
      try {
        const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 8));
        } else {
          setRecentSearches([]);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', syncStorage);
    return () => window.removeEventListener('storage', syncStorage);
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const saveToHistory = (queryText: string) => {
    const clean = queryText.trim();
    if (!clean || clean.length < 2) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const removeRecentSearch = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(item => item.toLowerCase() !== termToRemove.toLowerCase());
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchQuery(localQuery);
    saveToHistory(localQuery);
  };

  const handleSelectKeyword = (keyword: string) => {
    setLocalQuery(keyword);
    setSearchQuery(keyword);
    saveToHistory(keyword);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
    showToast('Riwayat pencarian telah dibersihkan');
  };

  // Perform search filtering
  const { matchingFilms, matchingArticles, matchingBuzz, matchingUsers } = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    if (!q) {
      return { matchingFilms: [], matchingArticles: [], matchingBuzz: [], matchingUsers: [] };
    }

    const terms = q.split(/\s+/).filter(Boolean);

    // 1. Films
    const filmResults = films.filter(film => {
      const matchTitle = film.title.toLowerCase().includes(q);
      const matchDirector = film.director.toLowerCase().includes(q);
      const matchGenre = film.genres.some(g => g.toLowerCase().includes(q));
      const matchCast = film.cast.some(c => c.toLowerCase().includes(q));
      const matchSynopsis = film.synopsis.toLowerCase().includes(q);
      const matchTerms = terms.every(
        t =>
          film.title.toLowerCase().includes(t) ||
          film.director.toLowerCase().includes(t) ||
          film.genres.some(g => g.toLowerCase().includes(t))
      );
      return matchTitle || matchDirector || matchGenre || matchCast || matchSynopsis || matchTerms;
    });

    // 2. Articles
    const articleResults = publishedArticles.filter(article => {
      const matchTitle = article.title.toLowerCase().includes(q);
      const matchAuthor = article.author.name.toLowerCase().includes(q);
      const matchCategory = article.category.toLowerCase().includes(q);
      const matchExcerpt = article.excerpt?.toLowerCase().includes(q);
      const matchTerms = terms.every(
        t =>
          article.title.toLowerCase().includes(t) ||
          article.author.name.toLowerCase().includes(t) ||
          article.category.toLowerCase().includes(t)
      );
      return matchTitle || matchAuthor || matchCategory || matchExcerpt || matchTerms;
    });

    // 3. Buzz Posts
    const buzzResults = buzzList.filter(buzz => {
      const resolvedAuthor = resolveAuthor(buzz.author, usersById) ?? buzz.author;
      const matchContent = buzz.content.toLowerCase().includes(q);
      const matchAuthor = (resolvedAuthor.name || buzz.author.name).toLowerCase().includes(q) ||
        (resolvedAuthor.handle || buzz.author.handle).toLowerCase().includes(q);
      const matchTags = buzz.tags.some(t => t.toLowerCase().includes(q));
      const matchTaggedFilm = buzz.taggedFilm?.title.toLowerCase().includes(q);
      const matchTaggedArticle = buzz.taggedArticle?.title.toLowerCase().includes(q);
      const matchTerms = terms.every(
        t =>
          buzz.content.toLowerCase().includes(t) ||
          (resolvedAuthor.name || buzz.author.name).toLowerCase().includes(t) ||
          (resolvedAuthor.handle || buzz.author.handle).toLowerCase().includes(t) ||
          buzz.tags.some(tg => tg.toLowerCase().includes(t)) ||
          buzz.taggedFilm?.title.toLowerCase().includes(t)
      );
      return matchContent || matchAuthor || matchTags || matchTaggedFilm || matchTaggedArticle || matchTerms;
    });

    // 4. Users
    const userResults = allUsers.filter(u => {
      const matchName = u.name.toLowerCase().includes(q);
      const matchHandle = u.handle.toLowerCase().includes(q);
      const matchBio = u.bio?.toLowerCase().includes(q);
      const matchRole = u.roleTitle?.toLowerCase().includes(q);
      return matchName || matchHandle || matchBio || matchRole;
    });

    return {
      matchingFilms: filmResults,
      matchingArticles: articleResults,
      matchingBuzz: buzzResults,
      matchingUsers: userResults,
    };
  }, [localQuery, films, publishedArticles, buzzList, allUsers, usersById]);

  // Real-time Search to TMDB API for global film dataset
  useEffect(() => {
    const q = localQuery.trim();
    if (!q || q.length < 2) {
      setTmdbSearchResults([]);
      setIsSearchingTmdb(false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsSearchingTmdb(true);
        const results = await searchTmdbFilms(q, 'all');
        if (!isCancelled) {
          setTmdbSearchResults(results);
        }
      } catch (err) {
        console.warn('[SearchPage] TMDB API search notice:', err);
      } finally {
        if (!isCancelled) setIsSearchingTmdb(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [localQuery]);

  // Filter out TMDB results that already match local database films
  const filteredTmdbResults = useMemo(() => {
    if (!tmdbSearchResults || tmdbSearchResults.length === 0) return [];
    const localTmdbIds = new Set(films.map(f => f.tmdbId).filter(Boolean));
    const localTitles = new Set(films.map(f => f.title.toLowerCase().trim()));

    return tmdbSearchResults.filter(item => {
      if (item.id && localTmdbIds.has(item.id)) return false;
      const title = (item.title || item.name || '').toLowerCase().trim();
      if (title && localTitles.has(title)) return false;
      return true;
    });
  }, [tmdbSearchResults, films]);

  const totalResults =
    matchingFilms.length + filteredTmdbResults.length + matchingArticles.length + matchingBuzz.length + matchingUsers.length;

  const hasQuery = localQuery.trim().length > 0;

  return (
    <div id="sotoy-search-page" className="min-h-screen pb-20 pt-4 sm:pt-6 bg-[#0A0A0A]">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        
        {/* Breadcrumb & Back Navigation Bar */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              onClick={() => navigateTo('home')}
              className="hover:text-white transition-colors"
            >
              Beranda
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-[#FF2E7E] font-bold">Pusat Pencarian</span>
          </div>

          <button
            id="search-page-back-button"
            onClick={() => goBack()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm active:scale-95"
            title="Kembali ke halaman sebelumnya"
          >
            <ArrowLeft className="w-4 h-4 text-[#FF2E7E]" />
            <span>Kembali</span>
          </button>
        </div>

        {/* Search Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#171717] via-[#1a1735] to-[#171717] border border-slate-800 p-5 sm:p-8 mb-6 shadow-2xl">
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-2xl sm:text-4xl font-black font-display text-white tracking-tight flex items-center gap-3">
              <Search className="w-7 h-7 sm:w-8 sm:h-8 text-[#FF2E7E] shrink-0" />
              <span>Cari di Sotoy Film</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
              Jelajahi basis data film, ulasan mendalam kritikus, artikel pop-culture, dan diskusikan di Buzz Komunitas.
            </p>

            {/* Main Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="mt-5 sm:mt-6">
              <div className="relative flex items-center">
                <div className="absolute left-4 pointer-events-none text-slate-400">
                  <Search className="w-5 h-5 text-[#FF2E7E]" />
                </div>
                <input
                  ref={inputRef}
                  id="search-page-main-input"
                  type="text"
                  value={localQuery}
                  onChange={e => {
                    setLocalQuery(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Ketik judul film, sutradara, artikel, atau topik buzz..."
                  className="w-full pl-12 pr-28 py-3.5 sm:py-4 rounded-2xl bg-black/60 border-2 border-slate-700/80 hover:border-[#FF2E7E]/50 focus:border-[#FF2E7E] focus:ring-4 focus:ring-[#FF2E7E]/15 text-white placeholder-slate-400 text-sm sm:text-base outline-none transition-all shadow-inner"
                />
                <div className="absolute right-3 flex items-center gap-1.5">
                  {localQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalQuery('');
                        setSearchQuery('');
                        inputRef.current?.focus();
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Hapus ketikan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white text-xs font-bold hover:brightness-110 shadow-md shadow-[#FF2E7E]/25 transition-all"
                  >
                    Cari
                  </button>
                </div>
              </div>
            </form>

            {/* Trending Quick Search Chips */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FF2E7E]" />
                <span>Trending:</span>
              </span>
              {TRENDING_SEARCHES.map(kw => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleSelectKeyword(kw)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-[#FF2E7E]/20 text-slate-300 hover:text-[#FF2E7E] border border-white/10 hover:border-[#FF2E7E]/40 transition-all font-medium"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Tabs Filter */}
        {hasQuery && (
          <div
            className="flex items-center gap-2 overflow-x-auto pb-3 pt-0.5 scrollbar-none mb-6 border-b border-slate-800 scroll-smooth touch-pan-x"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {[
              { id: 'all', label: 'Semua Hasil', count: totalResults, icon: Filter },
              { id: 'film', label: 'Film', count: matchingFilms.length + filteredTmdbResults.length, icon: Film },
              { id: 'article', label: 'Artikel & Review', count: matchingArticles.length, icon: FileText },
              { id: 'buzz', label: 'Buzz Komunitas', count: matchingBuzz.length, icon: MessageSquare },
              { id: 'user', label: 'Kritikus & Profil', count: matchingUsers.length, icon: Users },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`search-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as SearchTab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-[#FF2E7E] text-white shadow-lg shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                      : 'bg-[#171717] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* WHEN NO QUERY IS ENTERED: Show Recent Searches & Categories */}
        {!hasQuery && (
          <div className="space-y-6">
            {/* Recent Searches Panel */}
            {recentSearches.length > 0 && (
              <div className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FF2E7E]" />
                    <span>Pencarian Terakhir Kamu</span>
                  </h2>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 font-semibold"
                  >
                    <span>Hapus Riwayat</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map(term => (
                    <div
                      key={term}
                      onClick={() => handleSelectKeyword(term)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs sm:text-sm text-slate-200 hover:text-white transition-all cursor-pointer group shadow-sm hover:border-[#FF2E7E]/40"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#FF2E7E] transition-colors shrink-0" />
                      <span className="font-medium">{term}</span>
                      <button
                        type="button"
                        onClick={(e) => removeRecentSearch(term, e)}
                        className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-white/10 transition-all shrink-0 ml-0.5"
                        title={`Hapus "${term}" dari riwayat`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Browse Categories Shortcuts */}
            <div className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <h2 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center gap-2">
                <Film className="w-4 h-4 text-[#FF2E7E]" />
                <span>Jelajahi Berdasarkan Kategori</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'Film Database', desc: 'Arsip rating & ulasan', view: 'film-database', icon: Film, color: 'text-[#FF2E7E]' },
                  { name: 'Rekomendasi Film', desc: 'Pilihan kurasi redaksi', view: 'film-recommendations', icon: Sparkles, color: 'text-[#FF2E7E]' },
                  { name: 'Buzz Komunitas', desc: 'Thread & obrolan pop-culture', view: 'community-feed', icon: MessageSquare, color: 'text-[#FF2E7E]' },
                  { name: 'Daftar Kritikus', desc: 'Gabung dewan penilai', view: 'critic-submission', icon: Star, color: 'text-amber-400' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => navigateTo(item.view as any)}
                      className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-left transition-all group shadow-md"
                    >
                      <Icon className={`w-6 h-6 ${item.color} mb-2 group-hover:scale-110 transition-transform`} />
                      <div className="text-sm font-bold text-white group-hover:text-[#FF2E7E] transition-colors">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* RESULTS CONTENT */}
        {hasQuery && (
          <div className="space-y-8">
            {totalResults === 0 ? (
              /* No Results State */
              <div className="text-center py-16 px-4 bg-[#171717] border border-slate-800 rounded-3xl shadow-xl">
                <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Tidak ditemukan hasil untuk "{localQuery}"
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2">
                  Coba periksa ejaan kata kunci, gunakan sinonim lain, atau coba salah satu topik populer di atas.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setLocalQuery('');
                      setSearchQuery('');
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
                  >
                    Reset Pencarian
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 1. SEKSI FILM */}
                {(activeTab === 'all' || activeTab === 'film') && matchingFilms.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <Film className="w-5 h-5 text-[#FF2E7E]" />
                        <span>Film Terkait ({matchingFilms.length})</span>
                      </h2>
                      {activeTab === 'all' && matchingFilms.length > 3 && (
                        <button
                          onClick={() => setActiveTab('film')}
                          className="text-xs text-[#FF2E7E] hover:underline font-bold"
                        >
                          Lihat Semua Film ({matchingFilms.length}) →
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(activeTab === 'all' ? matchingFilms.slice(0, 6) : matchingFilms).map(film => (
                        <div
                          key={film.id}
                          onClick={() => navigateTo('film-detail', { filmId: film.id })}
                          className="group bg-[#171717] hover:bg-slate-850 border border-slate-800 hover:border-[#FF2E7E]/50 rounded-2xl p-3 sm:p-4 flex gap-3.5 cursor-pointer transition-all shadow-md hover:shadow-xl"
                        >
                          <img
                            src={film.poster?.trim() || DEFAULT_POSTER}
                            alt={film.title}
                            className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl object-cover ring-1 ring-white/10 shrink-0 group-hover:scale-105 transition-transform"
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-bold text-slate-400">{film.year}</span>
                                <div className="flex items-center gap-1 bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 px-2 py-0.5 rounded-md font-mono text-xs font-black">
                                  <Star className="w-3 h-3 fill-current" />
                                  <span>{film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}</span>
                                  <span className="text-[9px] text-slate-300 font-bold">Critics</span>
                                </div>
                              </div>
                              <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-2 mt-1">
                                {film.title}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                Dir. {film.director}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-1 mt-2">
                              {film.genres.slice(0, 2).map(genre => (
                                <span
                                  key={genre}
                                  className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10"
                                >
                                  {genre}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FILM & SERIES TERKAIT (Real-time Global API) */}
                {(activeTab === 'all' || activeTab === 'film') && filteredTmdbResults.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h2 className="text-base sm:text-lg font-bold text-cyan-400 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-cyan-400" />
                        <span>Film & Series Terkait ({filteredTmdbResults.length})</span>
                      </h2>
                      {isSearchingTmdb && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span>Mencari film terkait...</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(activeTab === 'all' ? filteredTmdbResults.slice(0, 6) : filteredTmdbResults).map(tmdbItem => {
                        const poster = tmdbItem.poster_path
                          ? `https://image.tmdb.org/t/p/w342${tmdbItem.poster_path}`
                          : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80';
                        const title = tmdbItem.title || tmdbItem.name || 'Judul Film';
                        const rawDate = tmdbItem.release_date || tmdbItem.first_air_date || '';
                        const year = rawDate ? rawDate.substring(0, 4) : '';

                        return (
                          <div
                            key={`tmdb-page-${tmdbItem.id}`}
                            onClick={async () => {
                              await importAndNavigateToTmdbFilm({
                                id: tmdbItem.id,
                                title,
                                media_type: tmdbItem.media_type,
                              });
                            }}
                            className="group bg-[#171717] hover:bg-slate-850 border border-cyan-900/40 hover:border-cyan-500/60 rounded-2xl p-3 sm:p-4 flex gap-3.5 cursor-pointer transition-all shadow-md hover:shadow-xl relative overflow-hidden"
                          >
                            <img
                              src={poster?.trim() || DEFAULT_POSTER}
                              alt={title}
                              className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl object-cover ring-1 ring-cyan-500/30 shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                                    Film Terkait
                                  </span>
                                  {year && <span className="text-[11px] font-bold text-slate-400">{year}</span>}
                                </div>

                                <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                                  {title}
                                </h3>

                                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                  {tmdbItem.overview || (tmdbItem.media_type === 'tv' ? 'Serial televisi' : 'Film layar lebar')}
                                </p>
                              </div>

                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                                {tmdbItem.vote_average ? (
                                  <div className="flex items-center gap-1 text-[#FF2E7E] font-mono text-xs font-bold">
                                    <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                                    <span>{tmdbItem.vote_average.toFixed(1)}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-500">Katalog Sinema</span>
                                )}
                                <span className="text-[10px] font-bold text-cyan-400 group-hover:underline flex items-center gap-0.5">
                                  <span>Lihat Detail</span>
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. SEKSI ARTIKEL */}
                {(activeTab === 'all' || activeTab === 'article') && matchingArticles.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#FF2E7E]" />
                        <span>Artikel & Review Terkait ({matchingArticles.length})</span>
                      </h2>
                      {activeTab === 'all' && matchingArticles.length > 3 && (
                        <button
                          onClick={() => setActiveTab('article')}
                          className="text-xs text-[#FF2E7E] hover:underline font-bold"
                        >
                          Lihat Semua Artikel ({matchingArticles.length}) →
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(activeTab === 'all' ? matchingArticles.slice(0, 4) : matchingArticles).map(art => (
                        <div
                          key={art.id}
                          onClick={() => navigateTo('article-detail', { articleId: art.id })}
                          className="group bg-[#171717] hover:bg-slate-850 border border-slate-800 hover:border-[#FF2E7E]/50 rounded-2xl p-4 flex gap-4 cursor-pointer transition-all shadow-md hover:shadow-xl"
                        >
                          <img
                            src={art.coverImage?.trim() || DEFAULT_COVER}
                            alt={art.title}
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover ring-1 ring-white/10 shrink-0 group-hover:scale-105 transition-transform"
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-[#FF2E7E] bg-[#FF2E7E]/15 px-2 py-0.5 rounded">
                                  {art.category}
                                </span>
                                <span className="text-[10px] text-slate-400">{art.readTime}</span>
                              </div>
                              <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-2">
                                {art.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 mt-2">
                              <img
                                src={art.author.avatar?.trim() || DEFAULT_AVATAR}
                                alt={art.author.name}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span className="text-xs text-slate-400 truncate">{art.author.name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. SEKSI BUZZ FEED */}
                {(activeTab === 'all' || activeTab === 'buzz') && matchingBuzz.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#FF2E7E]" />
                        <span>Diskusi Buzz Terkait ({matchingBuzz.length})</span>
                      </h2>
                      {activeTab === 'all' && matchingBuzz.length > 3 && (
                        <button
                          onClick={() => setActiveTab('buzz')}
                          className="text-xs text-[#FF2E7E] hover:underline font-bold"
                        >
                          Lihat Semua Buzz ({matchingBuzz.length}) →
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {(activeTab === 'all' ? matchingBuzz.slice(0, 4) : matchingBuzz).map(buzz => {
                        const resolvedAuthor = resolveAuthor(buzz.author, usersById) ?? buzz.author;
                        return (
                        <div
                          key={buzz.id}
                          onClick={() => navigateTo('buzz-detail', { buzzId: buzz.id })}
                          className="group bg-[#171717] hover:bg-slate-850 border border-slate-800 hover:border-[#FF2E7E]/50 rounded-2xl p-4 cursor-pointer transition-all shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={(resolvedAuthor.avatar || buzz.author.avatar)?.trim() || DEFAULT_AVATAR}
                              alt={resolvedAuthor.name || buzz.author.name}
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white group-hover:text-[#FF2E7E] transition-colors">
                                  {resolvedAuthor.name || buzz.author.name}
                                </span>
                                <span className="text-xs text-slate-400">@{resolvedAuthor.handle || buzz.author.handle}</span>
                                <span className="text-[10px] text-slate-500" title={formatFullDateTime(buzz.createdAt)}>• {formatRelativeTime(buzz.createdAt)}</span>
                              </div>

                              <p className="text-sm text-slate-200 mt-2 line-clamp-3 leading-relaxed">
                                {buzz.content}
                              </p>

                              {/* Tagged Film if any */}
                              {buzz.taggedFilm && (
                                <div className="mt-2.5 inline-flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs">
                                  <Film className="w-3.5 h-3.5 text-[#FF2E7E]" />
                                  <span className="font-semibold text-slate-200">{buzz.taggedFilm.title}</span>
                                  {buzz.taggedFilm.skorSotoy !== undefined && (
                                    <span className="text-[#FF2E7E] font-mono font-bold">
                                      ★ {buzz.taggedFilm.skorSotoy.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                  <span>{buzz.likes || 0}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{buzz.replies?.length || buzz.repliesCount || 0} Balasan</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. SEKSI PENGGUNA & KRITIKUS */}
                {(activeTab === 'all' || activeTab === 'user') && matchingUsers.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" />
                        <span>Kritikus & Profil Pengguna ({matchingUsers.length})</span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {matchingUsers.map(user => {
                        const followed = isFollowing(user.id);
                        const isSelf = user.id === currentUser.id;
                        return (
                          <div
                            key={user.id}
                            className="bg-[#171717] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md"
                          >
                            <div
                              onClick={() => navigateTo('user-profile', { userId: user.id })}
                              className="flex items-center gap-3 min-w-0 cursor-pointer group flex-1"
                            >
                              <img
                                src={user.avatar?.trim() || DEFAULT_AVATAR}
                                alt={user.name}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-[#FF2E7E] transition-all shrink-0"
                              />
                              <div className="min-w-0">
                                <h3 className="font-bold text-sm text-white group-hover:text-[#FF2E7E] transition-colors truncate">
                                  {user.name}
                                </h3>
                                <p className="text-xs text-slate-400 truncate">@{user.handle}</p>
                                <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                                  {user.roleTitle || 'Warga Sotoy'}
                                </span>
                              </div>
                            </div>

                            {!isSelf && (
                              <button
                                onClick={() => toggleFollowUser(user.id)}
                                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                                  followed
                                    ? 'bg-slate-800 text-slate-400 hover:bg-rose-900/30 hover:text-rose-400 border border-slate-700'
                                    : 'bg-white text-slate-950 hover:bg-slate-200'
                                }`}
                              >
                                {followed ? 'Mengikuti' : 'Ikuti'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
