import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  CornerDownLeft,
  Layers,
  ChevronRight,
  Database,
  Trash2,
  Check,
  Award,
  Globe,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRoleBadgeStyle } from '../../utils/roleStyles';
import { RoleBadge } from '../Common/RoleBadge';
import { FilmItem, Article, BuzzPost, User } from '../../types';
import { searchTmdbFilms, TmdbSearchResultItem } from '../../utils/tmdbHelper';
import { DEFAULT_AVATAR, DEFAULT_POSTER, DEFAULT_COVER } from '../../data/mockData';

interface GlobalSearchBarProps {
  isMobile?: boolean;
  onItemSelect?: () => void;
  className?: string;
  placeholder?: string;
}

export type SearchCategory = 'all' | 'film' | 'article' | 'buzz' | 'user';

interface SearchResultItem {
  id: string;
  type: 'film' | 'article' | 'buzz' | 'user';
  data: FilmItem | Article | BuzzPost | User;
}

interface FirestoreAutocompleteSuggestion {
  id: string;
  title: string;
  type: 'film' | 'article';
  subtitle: string;
  extra?: string;
}

const RECENT_SEARCHES_KEY = 'sotoy_search_history';

const TRENDING_KEYWORDS = [
  'Dune: Part Two',
  'Siksa Kubur',
  'Sony FX3',
  'Shōgun',
  'Chainsaw Man',
  'Exhuma',
  'Christopher Nolan',
  'Film Studies',
];

// Helper to escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Text highlighter component
export const HighlightText: React.FC<{ text: string; query: string; className?: string }> = ({
  text,
  query,
  className = '',
}) => {
  if (!text) return null;
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const terms = query
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 0)
    .map(t => escapeRegExp(t));

  if (terms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${terms.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-[#FF2E7E]/30 text-[#FF2E7E] font-black rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  isMobile = false,
  onItemSelect,
  className = '',
  placeholder = 'Cari film, artikel, buzz, atau kritikus...',
}) => {
  const { films, publishedArticles, buzzList, allUsers, navigateTo, searchQuery, setSearchQuery, importAndNavigateToTmdbFilm } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // TMDB Real-Time Search States
  const [tmdbSearchResults, setTmdbSearchResults] = useState<TmdbSearchResultItem[]>([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState<boolean>(false);

  // Firestore Real-time Autocomplete States
  const [firestoreSuggestions, setFirestoreSuggestions] = useState<FirestoreAutocompleteSuggestion[]>([]);
  const [isSearchingFirestore, setIsSearchingFirestore] = useState<boolean>(false);

  // Recent Searches State (Last 5 searches)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 5);
        }
      }
    } catch (e) {
      // Ignore localStorage parse error
    }
    return ['Dune: Part Two', 'Siksa Kubur', 'Sony FX3'];
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Helper to persist search query into recent searches history (max 5 items)
  const addToRecentSearches = (queryText: string) => {
    const clean = queryText.trim();
    if (!clean || clean.length < 2) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        /* ignore storage quota */
      }
      return updated;
    });
  };

  // Helper to remove an individual query from history
  const removeRecentSearch = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== itemToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        /* ignore */
      }
      return updated;
    });
  };

  // Helper to clear all recent searches
  const clearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      /* ignore */
    }
  };

  // Global hotkey: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Instant in-memory Autocomplete suggestions from context catalog (0 Firestore reads)
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setFirestoreSuggestions([]);
      setIsSearchingFirestore(false);
      return;
    }

    const suggestions: FirestoreAutocompleteSuggestion[] = [];

    // Filter matching films from in-memory catalog
    films
      .filter(f =>
        f.title?.toLowerCase().includes(q) ||
        f.director?.toLowerCase().includes(q) ||
        f.genres?.some(g => g.toLowerCase().includes(q))
      )
      .slice(0, 4)
      .forEach(data => {
        suggestions.push({
          id: data.id,
          title: data.title,
          type: 'film',
          subtitle: `${data.year} • Dir. ${data.director}`,
          extra: `★ ${(data.skorSotoy || 4.0).toFixed(1)}`,
        });
      });

    // Filter matching articles from in-memory catalog
    publishedArticles
      .filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.author?.name?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .forEach(data => {
        suggestions.push({
          id: data.id,
          title: data.title,
          type: 'article',
          subtitle: `${data.category} • Oleh ${data.author?.name || 'Redaksi'}`,
          extra: data.readTime,
        });
      });

    setFirestoreSuggestions(suggestions.slice(0, 6));
    setIsSearchingFirestore(false);
  }, [searchQuery, films, publishedArticles]);

  // Real-time Search to TMDB API for global film dataset
  useEffect(() => {
    const q = searchQuery.trim();
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
        console.warn('[GlobalSearchBar] TMDB API search error:', err);
      } finally {
        if (!isCancelled) setIsSearchingTmdb(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

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

  // Real-time filtering logic across all categories
  const { matchingFilms, matchingArticles, matchingBuzz, matchingUsers } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return { matchingFilms: [], matchingArticles: [], matchingBuzz: [], matchingUsers: [] };
    }

    const terms = q.split(/\s+/).filter(Boolean);

    // 1. Filter Films
    const filmResults = films
      .filter(film => {
        const matchTitle = film.title.toLowerCase().includes(q);
        const matchOriginal = film.originalTitle?.toLowerCase().includes(q);
        const matchDirector = film.director.toLowerCase().includes(q);
        const matchGenres = film.genres.some(g => g.toLowerCase().includes(q));
        const matchCast = film.cast.some(c => c.toLowerCase().includes(q));
        const matchSynopsis = film.synopsis.toLowerCase().includes(q);
        const matchYear = film.year.toString().includes(q);

        const allTerms = terms.every(
          t =>
            film.title.toLowerCase().includes(t) ||
            film.director.toLowerCase().includes(t) ||
            film.genres.some(g => g.toLowerCase().includes(t)) ||
            film.cast.some(c => c.toLowerCase().includes(t))
        );

        return matchTitle || matchOriginal || matchDirector || matchGenres || matchCast || matchSynopsis || matchYear || allTerms;
      })
      .sort((a, b) => {
        const aExact = a.title.toLowerCase() === q;
        const bExact = b.title.toLowerCase() === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = a.title.toLowerCase().startsWith(q);
        const bStarts = b.title.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return b.skorSotoy - a.skorSotoy;
      });

    // 2. Filter Articles
    const articleResults = publishedArticles
      .filter(art => {
        const matchTitle = art.title.toLowerCase().includes(q);
        const matchExcerpt = art.excerpt.toLowerCase().includes(q);
        const matchContent = art.content.toLowerCase().includes(q);
        const matchCategory = art.category.toLowerCase().includes(q) || art.subCategory.toLowerCase().includes(q);
        const matchTags = art.tags.some(t => t.toLowerCase().includes(q));
        const matchAuthor = art.author.name.toLowerCase().includes(q);

        const allTerms = terms.every(
          t =>
            art.title.toLowerCase().includes(t) ||
            art.category.toLowerCase().includes(t) ||
            art.tags.some(tg => tg.toLowerCase().includes(t)) ||
            art.author.name.toLowerCase().includes(t)
        );

        return matchTitle || matchExcerpt || matchContent || matchCategory || matchTags || matchAuthor || allTerms;
      })
      .sort((a, b) => {
        const aStarts = a.title.toLowerCase().startsWith(q);
        const bStarts = b.title.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return b.views - a.views;
      });

    // 3. Filter Buzz Posts
    const buzzResults = buzzList
      .filter(buzz => {
        const matchContent = buzz.content.toLowerCase().includes(q);
        const matchAuthor = buzz.author.name.toLowerCase().includes(q) || buzz.author.handle.toLowerCase().includes(q);
        const matchTags = buzz.tags.some(t => t.toLowerCase().includes(q));
        const matchTaggedFilm = buzz.taggedFilm?.title.toLowerCase().includes(q);
        const matchTaggedArticle = buzz.taggedArticle?.title.toLowerCase().includes(q);

        const allTerms = terms.every(
          t =>
            buzz.content.toLowerCase().includes(t) ||
            buzz.author.name.toLowerCase().includes(t) ||
            buzz.tags.some(tg => tg.toLowerCase().includes(t)) ||
            buzz.taggedFilm?.title.toLowerCase().includes(t)
        );

        return matchContent || matchAuthor || matchTags || matchTaggedFilm || matchTaggedArticle || allTerms;
      })
      .sort((a, b) => (b.likes || 0) - (a.likes || 0));

    // 4. Filter Users (Profil Kritikus & Warga Sotoy)
    const userResults = allUsers
      .filter(u => {
        const matchName = u.name.toLowerCase().includes(q);
        const matchHandle = u.handle.toLowerCase().includes(q);
        const matchBio = u.bio?.toLowerCase().includes(q);
        const matchRole = u.roleTitle?.toLowerCase().includes(q);
        return matchName || matchHandle || matchBio || matchRole;
      })
      .sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0));

    return {
      matchingFilms: filmResults,
      matchingArticles: articleResults,
      matchingBuzz: buzzResults,
      matchingUsers: userResults,
    };
  }, [searchQuery, films, publishedArticles, buzzList, allUsers]);

  const totalResultsCount =
    matchingFilms.length + filteredTmdbResults.length + matchingArticles.length + matchingBuzz.length + matchingUsers.length;

  // Flatten currently visible results based on activeCategory for keyboard arrow navigation
  const visibleFlattenedList: SearchResultItem[] = useMemo(() => {
    if (!searchQuery.trim()) return [];

    if (activeCategory === 'film') {
      return matchingFilms.map(f => ({ id: `film-${f.id}`, type: 'film' as const, data: f }));
    }
    if (activeCategory === 'article') {
      return matchingArticles.map(a => ({ id: `article-${a.id}`, type: 'article' as const, data: a }));
    }
    if (activeCategory === 'buzz') {
      return matchingBuzz.map(b => ({ id: `buzz-${b.id}`, type: 'buzz' as const, data: b }));
    }
    if (activeCategory === 'user') {
      return matchingUsers.map(u => ({ id: `user-${u.id}`, type: 'user' as const, data: u }));
    }

    // Category === 'all': combine top results from each scope
    const combined: SearchResultItem[] = [];
    matchingFilms.slice(0, 3).forEach(f => combined.push({ id: `film-${f.id}`, type: 'film', data: f }));
    matchingArticles.slice(0, 3).forEach(a => combined.push({ id: `article-${a.id}`, type: 'article', data: a }));
    matchingBuzz.slice(0, 2).forEach(b => combined.push({ id: `buzz-${b.id}`, type: 'buzz', data: b }));
    matchingUsers.slice(0, 2).forEach(u => combined.push({ id: `user-${u.id}`, type: 'user', data: u }));
    return combined;
  }, [searchQuery, activeCategory, matchingFilms, matchingArticles, matchingBuzz, matchingUsers]);

  // Reset keyboard selected index when query or category changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery, activeCategory]);

  // Handle item selection navigation
  const handleSelectResult = (item: SearchResultItem) => {
    let itemTitle = searchQuery.trim();
    if (!itemTitle) {
      if ('title' in item.data) {
        itemTitle = item.data.title;
      } else if ('name' in item.data) {
        itemTitle = item.data.name;
      } else if ('content' in item.data) {
        itemTitle = item.data.content.slice(0, 30);
      }
    }
    if (itemTitle) {
      addToRecentSearches(itemTitle);
    }
    setIsOpen(false);
    onItemSelect?.();

    if (item.type === 'film') {
      navigateTo('film-detail', { filmId: item.data.id });
    } else if (item.type === 'article') {
      navigateTo('article-detail', { articleId: item.data.id });
    } else if (item.type === 'buzz') {
      navigateTo('buzz-detail', { buzzId: item.data.id });
    } else if (item.type === 'user') {
      navigateTo('user-profile', { userId: item.data.id });
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < visibleFlattenedList.length) {
        handleSelectResult(visibleFlattenedList[selectedIndex]);
      } else if (searchQuery.trim()) {
        addToRecentSearches(searchQuery.trim());
        setIsOpen(false);
        onItemSelect?.();
        navigateTo('search', { searchQuery: searchQuery.trim() });
      } else if (visibleFlattenedList.length > 0) {
        handleSelectResult(visibleFlattenedList[0]);
      }
      return;
    }

    if (visibleFlattenedList.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < visibleFlattenedList.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : visibleFlattenedList.length - 1));
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleApplyKeyword = (kw: string) => {
    setSearchQuery(kw);
    addToRecentSearches(kw);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div
      ref={containerRef}
      id={isMobile ? 'global-search-container-mobile' : 'global-search-container-desktop'}
      className={`relative ${className}`}
    >
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={isMobile ? 'global-search-input-mobile' : 'global-search-input'}
          type="text"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="global-search-dropdown"
          className={`w-full bg-[#171717] border text-xs text-white placeholder-slate-400 rounded-full pl-9 pr-14 py-2 transition-all shadow-inner focus:outline-none ${
            isOpen
              ? 'border-[#FF2E7E] ring-2 ring-[#FF2E7E]/20 bg-[#171717]'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        />

        {/* Search Icon */}
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />

        {/* Right side controls (Clear and Shortcut Badge) */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {hasQuery && (
            <button
              id={isMobile ? 'clear-search-btn-mobile' : 'clear-search-btn'}
              onClick={handleClear}
              type="button"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Hapus pencarian"
              aria-label="Hapus kata kunci pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {!isMobile && (
            <kbd
              className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/80 rounded select-none pointer-events-none"
              title="Shortcut: Cmd+K / Ctrl+K"
            >
              <span className="text-[11px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Real-time Global Search Dropdown Overlay */}
      {isOpen && (
        <div
          id="global-search-dropdown"
          className={`bg-[#171717] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 ${
            isMobile
              ? 'mt-2 w-full max-h-[75vh] flex flex-col'
              : 'absolute left-0 lg:left-auto lg:right-0 top-full mt-2 w-[340px] sm:w-[460px] md:w-[540px] lg:w-[620px] max-h-[80vh] flex flex-col'
          }`}
        >
          {/* Header Bar with Category Filters (Film, Article, Buzz, User, Semua) */}
          <div className="p-3 bg-[#171717] border-b border-slate-800/90 space-y-2.5">
            {/* Category Filter Scope Toggles */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-nowrap py-0.5">
                {/* 1. All Scope */}
                <button
                  id="search-scope-all"
                  onClick={() => setActiveCategory('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeCategory === 'all'
                      ? 'bg-white text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title="Cari di semua kategori"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Semua</span>
                  {hasQuery && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-slate-950 font-black">
                      {totalResultsCount}
                    </span>
                  )}
                </button>

                {/* 2. Film Scope */}
                <button
                  id="search-scope-film"
                  onClick={() => setActiveCategory('film')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeCategory === 'film'
                      ? 'bg-[#FF2E7E] text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title="Filter hanya Film & Series"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Film</span>
                  {hasQuery && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-slate-950 font-black">
                      {matchingFilms.length + filteredTmdbResults.length}
                    </span>
                  )}
                </button>

                {/* 3. Article Scope */}
                <button
                  id="search-scope-article"
                  onClick={() => setActiveCategory('article')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeCategory === 'article'
                      ? 'bg-[#FF2E7E] text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title="Filter hanya Artikel & Berita"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Article</span>
                  {hasQuery && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-slate-950 font-black">
                      {matchingArticles.length}
                    </span>
                  )}
                </button>

                {/* 4. Buzz Scope */}
                <button
                  id="search-scope-buzz"
                  onClick={() => setActiveCategory('buzz')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeCategory === 'buzz'
                      ? 'bg-[#FF2E7E] text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title="Filter hanya Buzz Komunitas"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Buzz</span>
                  {hasQuery && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-black">
                      {matchingBuzz.length}
                    </span>
                  )}
                </button>

                {/* 5. User Scope */}
                <button
                  id="search-scope-user"
                  onClick={() => setActiveCategory('user')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeCategory === 'user'
                      ? 'bg-[#FF2E7E] text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title="Filter profil Kritikus & Pengguna"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>User</span>
                  {hasQuery && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-black">
                      {matchingUsers.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* REAL-TIME AUTOCOMPLETE DROPDOWN SUGGESTIONS (Films & Articles as user types) */}
            {hasQuery && firestoreSuggestions.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#FF2E7E]" />
                    <span>Saran Cepat Autocomplete</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {firestoreSuggestions.map(sugg => (
                    <button
                      key={`${sugg.type}-${sugg.id}`}
                      id={`autocomplete-sugg-${sugg.id}`}
                      onClick={() => {
                        addToRecentSearches(sugg.title);
                        setIsOpen(false);
                        onItemSelect?.();
                        if (sugg.type === 'film') {
                          navigateTo('film-detail', { filmId: sugg.id });
                        } else {
                          navigateTo('article-detail', { articleId: sugg.id });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-[#FF2E7E] text-slate-200 hover:text-white text-xs font-semibold transition-all group max-w-full truncate"
                      title={`Buka ${sugg.title}`}
                    >
                      {sugg.type === 'film' ? (
                        <Film className="w-3 h-3 text-[#FF2E7E] shrink-0" />
                      ) : (
                        <FileText className="w-3 h-3 text-[#FF2E7E] shrink-0" />
                      )}
                      <span className="truncate">{sugg.title}</span>
                      {sugg.extra && (
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-300 shrink-0">
                          {sugg.extra}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Results Content */}
          <div ref={listRef} className="overflow-y-auto p-3 space-y-4 flex-1 scrollbar-thin scrollbar-thumb-slate-800">
            {!hasQuery ? (
              /* ================= ZERO QUERY: RECENT SEARCHES (LAST 5) & TRENDING KEYWORDS ================= */
              <div className="space-y-4 py-1">
                {/* 1. LAST 5 USER SEARCHES */}
                {recentSearches.length > 0 && (
                  <div id="recent-searches-block" className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <div className="flex items-center gap-1.5 text-[#FF2E7E]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pencarian Terakhir (5 Terakhir)</span>
                      </div>
                      <button
                        onClick={clearAllRecentSearches}
                        className="text-[10px] font-bold text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                        title="Hapus seluruh riwayat pencarian"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus Semua</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      {recentSearches.map((item, idx) => (
                        <div
                          key={`recent-${idx}-${item}`}
                          onClick={() => handleApplyKeyword(item)}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#FF2E7E] transition-colors shrink-0" />
                            <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                              {item}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={e => removeRecentSearch(item, e)}
                              className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 transition-colors"
                              title="Hapus dari riwayat"
                              aria-label={`Hapus ${item} dari riwayat`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. TRENDING TOPICS PEKAN INI */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#FF2E7E]" />
                    <span>Topik Hangat Pekan Ini</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TRENDING_KEYWORDS.map(kw => (
                      <button
                        key={kw}
                        onClick={() => handleApplyKeyword(kw)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#FF2E7E] text-slate-300 hover:text-white text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                      >
                        <Search className="w-3 h-3 text-slate-500" />
                        <span>{kw}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. QUICK NAVIGATION SHORTCUTS */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                    Pintasan Cepat Direktori
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onItemSelect?.();
                        navigateTo('film-database');
                      }}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-[#FF2E7E] hover:bg-slate-800/50 flex items-center justify-between text-left transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center">
                          <Film className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-[#FF2E7E] transition-colors">
                            Database Film
                          </div>
                          <div className="text-[10px] text-slate-400">Katalog skor & ulasan</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>

                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onItemSelect?.();
                        navigateTo('community-feed');
                      }}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-[#FF2E7E] hover:bg-slate-800/50 flex items-center justify-between text-left transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#FF2E7E]/10 text-[#FF2E7E] flex items-center justify-center">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-[#FF2E7E] transition-colors">
                            Buzz Komunitas
                          </div>
                          <div className="text-[10px] text-slate-400">Diskusi & opini penonton</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            ) : totalResultsCount === 0 ? (
              /* ================= NO RESULTS EMPTY STATE ================= */
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6 opacity-60" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-white">
                    Tidak ada hasil untuk "{searchQuery}"
                  </h4>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                    Coba ganti filter kategori atau gunakan kata kunci lain seperti nama sutradara, judul film, artikel, atau username.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  {activeCategory !== 'all' && (
                    <button
                      onClick={() => setActiveCategory('all')}
                      className="text-xs font-bold text-[#FF2E7E] hover:underline"
                    >
                      Buka Semua Kategori
                    </button>
                  )}
                  <button
                    onClick={handleClear}
                    className="text-xs font-bold text-[#FF2E7E] hover:underline"
                  >
                    Hapus Kata Kunci
                  </button>
                </div>
              </div>
            ) : (
              /* ================= REAL-TIME RESULTS LIST ================= */
              <div className="space-y-4">
                {/* 1. FILMS SECTION */}
                {(activeCategory === 'all' || activeCategory === 'film') && matchingFilms.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF2E7E]">
                        <Film className="w-3.5 h-3.5" />
                        <span>Film & Tayangan ({matchingFilms.length})</span>
                      </div>
                      {activeCategory === 'all' && matchingFilms.length > 3 && (
                        <button
                          onClick={() => setActiveCategory('film')}
                          className="text-[11px] font-bold text-[#FF2E7E] hover:underline"
                        >
                          Lihat semua film ({matchingFilms.length}) →
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {(activeCategory === 'all' ? matchingFilms.slice(0, 3) : matchingFilms).map(film => {
                        const isSelected =
                          visibleFlattenedList[selectedIndex]?.type === 'film' &&
                          visibleFlattenedList[selectedIndex]?.data.id === film.id;

                        return (
                          <div
                            key={film.id}
                            id={`search-result-film-${film.id}`}
                            onClick={() => handleSelectResult({ id: `film-${film.id}`, type: 'film', data: film })}
                            className={`p-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#FF2E7E]/15 to-transparent border border-[#FF2E7E] shadow-md'
                                : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            {/* Film Thumbnail Poster */}
                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0 relative border border-white/10">
                              <img
                                src={film.poster?.trim() || DEFAULT_POSTER}
                                alt={film.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>

                            {/* Film Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-display font-bold text-xs sm:text-sm text-white truncate">
                                  <HighlightText text={film.title} query={searchQuery} />
                                </h5>
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {film.type}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                <HighlightText text={film.director} query={searchQuery} /> • {film.year}
                                {film.duration ? ` • ${film.duration}` : ''}
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-medium text-[#FF2E7E] flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-current" />
                                  <span>{film.skorSotoy.toFixed(1)}</span>
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {film.genres.slice(0, 2).join(', ')}
                                </span>
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* FILM & SERIES TERKAIT (Real-time Global Results) */}
                {(activeCategory === 'all' || activeCategory === 'film') && filteredTmdbResults.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-cyan-400">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Film & Series Terkait ({filteredTmdbResults.length})</span>
                      </div>
                      {isSearchingTmdb && (
                        <span className="text-[10px] text-slate-400 animate-pulse">Mencari...</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {(activeCategory === 'all' ? filteredTmdbResults.slice(0, 3) : filteredTmdbResults).map(tmdbItem => {
                        const poster = tmdbItem.poster_path
                          ? `https://image.tmdb.org/t/p/w185${tmdbItem.poster_path}`
                          : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
                        const title = tmdbItem.title || tmdbItem.name || 'Judul Film';
                        const rawDate = tmdbItem.release_date || tmdbItem.first_air_date || '';
                        const year = rawDate ? rawDate.substring(0, 4) : '';

                        return (
                          <div
                            key={`tmdb-${tmdbItem.id}`}
                            id={`search-result-tmdb-${tmdbItem.id}`}
                            onClick={async () => {
                              addToRecentSearches(title);
                              setIsOpen(false);
                              onItemSelect?.();
                              await importAndNavigateToTmdbFilm({
                                id: tmdbItem.id,
                                title,
                                media_type: tmdbItem.media_type,
                              });
                            }}
                            className="p-2 rounded-xl flex items-center gap-3 cursor-pointer bg-slate-900/80 hover:bg-slate-800 border border-cyan-900/40 hover:border-cyan-500/60 transition-all group"
                          >
                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0 relative border border-cyan-500/30">
                              <img
                                src={poster?.trim() || DEFAULT_POSTER}
                                alt={title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-cyan-300 truncate">
                                  <HighlightText text={title} query={searchQuery} />
                                </h5>
                                <span className="text-[8px] uppercase font-black px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                                  Film Terkait
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {year ? `${year} • ` : ''}{tmdbItem.media_type === 'tv' ? 'Series TV' : 'Film'}
                              </div>

                              {tmdbItem.vote_average ? (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400 font-bold">
                                  <Star className="w-3 h-3 fill-current text-amber-400" />
                                  <span>{tmdbItem.vote_average.toFixed(1)}</span>
                                  <span className="text-[9px] text-slate-400 font-normal">(Rating Global)</span>
                                </div>
                              ) : null}
                            </div>

                            <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. ARTICLES SECTION */}
                {(activeCategory === 'all' || activeCategory === 'article') && matchingArticles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF2E7E]">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Artikel & Berita ({matchingArticles.length})</span>
                      </div>
                      {activeCategory === 'all' && matchingArticles.length > 3 && (
                        <button
                          onClick={() => setActiveCategory('article')}
                          className="text-[11px] font-bold text-[#FF2E7E] hover:underline"
                        >
                          Lihat semua artikel ({matchingArticles.length}) →
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {(activeCategory === 'all' ? matchingArticles.slice(0, 3) : matchingArticles).map(art => {
                        const isSelected =
                          visibleFlattenedList[selectedIndex]?.type === 'article' &&
                          visibleFlattenedList[selectedIndex]?.data.id === art.id;

                        return (
                          <div
                            key={art.id}
                            id={`search-result-article-${art.id}`}
                            onClick={() => handleSelectResult({ id: `article-${art.id}`, type: 'article', data: art })}
                            className={`p-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#FF2E7E]/15 to-transparent border border-[#FF2E7E] shadow-md'
                                : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            {/* Article Image Thumbnail */}
                            <div className="w-14 h-11 rounded-lg overflow-hidden bg-slate-800 shrink-0 relative border border-white/10">
                              <img
                                src={art.coverImage?.trim() || DEFAULT_COVER}
                                alt={art.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>

                            {/* Article Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  {art.category}
                                </span>
                                <span className="text-[10px] text-slate-500">{art.readTime}</span>
                              </div>

                              <h5 className="font-display font-bold text-xs text-white truncate mt-0.5">
                                <HighlightText text={art.title} query={searchQuery} />
                              </h5>

                              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                Ditulis oleh <HighlightText text={art.author.name} query={searchQuery} />
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. BUZZ COMMUNITY POSTS SECTION */}
                {(activeCategory === 'all' || activeCategory === 'buzz') && matchingBuzz.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF2E7E]">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Buzz Komunitas ({matchingBuzz.length})</span>
                      </div>
                      {activeCategory === 'all' && matchingBuzz.length > 2 && (
                        <button
                          onClick={() => setActiveCategory('buzz')}
                          className="text-[11px] font-bold text-[#FF2E7E] hover:underline"
                        >
                          Lihat semua buzz ({matchingBuzz.length}) →
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {(activeCategory === 'all' ? matchingBuzz.slice(0, 2) : matchingBuzz).map(buzz => {
                        const isSelected =
                          visibleFlattenedList[selectedIndex]?.type === 'buzz' &&
                          visibleFlattenedList[selectedIndex]?.data.id === buzz.id;

                        return (
                          <div
                            key={buzz.id}
                            id={`search-result-buzz-${buzz.id}`}
                            onClick={() => handleSelectResult({ id: `buzz-${buzz.id}`, type: 'buzz', data: buzz })}
                            className={`p-2.5 rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#FF2E7E]/15 to-transparent border border-[#FF2E7E] shadow-md'
                                : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            {/* Author Avatar */}
                            <img
                              src={buzz.author.avatar?.trim() || DEFAULT_AVATAR}
                              alt={buzz.author.name}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-[#FF2E7E]/40 shrink-0 mt-0.5"
                            />

                            {/* Buzz Content */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white truncate">
                                  <HighlightText text={buzz.author.name} query={searchQuery} />
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {buzz.author.handle}
                                </span>
                                {buzz.taggedFilm && (
                                  <span className="text-[9px] bg-amber-500/10 text-[#FF2E7E] border border-amber-500/20 px-1.5 py-0.2 rounded font-medium truncate max-w-[140px]">
                                    🎬 {buzz.taggedFilm.title}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                                <HighlightText text={buzz.content} query={searchQuery} />
                              </p>

                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-medium">
                                <span>❤️ {buzz.likes || 0}</span>
                                <span>💬 {buzz.repliesCount || 0}</span>
                                {buzz.tags && buzz.tags.length > 0 && (
                                  <span className="text-slate-400">#{buzz.tags[0]}</span>
                                )}
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 self-center" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. USERS SECTION (PROFIL KRITIKUS & WARGA SOTOY) */}
                {(activeCategory === 'all' || activeCategory === 'user') && matchingUsers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF2E7E]">
                        <Users className="w-3.5 h-3.5" />
                        <span>Kritikus & Pengguna ({matchingUsers.length})</span>
                      </div>
                      {activeCategory === 'all' && matchingUsers.length > 2 && (
                        <button
                          onClick={() => setActiveCategory('user')}
                          className="text-[11px] font-bold text-[#FF2E7E] hover:underline"
                        >
                          Lihat semua ({matchingUsers.length}) →
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {(activeCategory === 'all' ? matchingUsers.slice(0, 2) : matchingUsers).map(user => {
                        const isSelected =
                          visibleFlattenedList[selectedIndex]?.type === 'user' &&
                          visibleFlattenedList[selectedIndex]?.data.id === user.id;

                        return (
                          <div
                            key={user.id}
                            id={`search-result-user-${user.id}`}
                            onClick={() => handleSelectResult({ id: `user-${user.id}`, type: 'user', data: user })}
                            className={`p-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#FF2E7E]/15 to-transparent border border-[#FF2E7E] shadow-md'
                                : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            {/* User Avatar */}
                            <img
                              src={user.avatar?.trim() || DEFAULT_AVATAR}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF2E7E]/40 shrink-0"
                            />

                            {/* User Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-display font-bold text-xs sm:text-sm text-white truncate">
                                  <HighlightText text={user.name} query={searchQuery} />
                                </h5>
                                <RoleBadge role={user.role} size="xs" />
                              </div>

                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                <HighlightText text={user.handle} query={searchQuery} />
                                {user.bio ? ` • ${user.bio}` : ''}
                              </div>

                              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                                <span>{user.totalReviews || 0} review film</span>
                                <span>•</span>
                                <span>{user.totalBuzz || 0} buzz</span>
                                {user.followersCount !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span>{user.followersCount} pengikut</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="p-2.5 bg-[#171717] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3 text-slate-400" />
                <span>Tekan <kbd className="font-mono text-[10px] text-slate-300 bg-slate-800 px-1 rounded">Enter</kbd> untuk buka</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onItemSelect?.();
                  navigateTo('search', { searchQuery });
                }}
                className="font-bold text-[#FF2E7E] hover:underline"
              >
                Halaman Cari Lengkap →
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onItemSelect?.();
                  navigateTo('film-database');
                }}
                className="font-bold text-[#FF2E7E] hover:underline"
              >
                Film →
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onItemSelect?.();
                  navigateTo('community-feed');
                }}
                className="font-bold text-[#FF2E7E] hover:underline"
              >
                Buzz →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
