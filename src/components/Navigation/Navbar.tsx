import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Film,
  Sparkles,
  MessageSquare,
  PenSquare,
  ChevronDown,
  Search,
  LogIn,
  User as UserIcon,
  Home,
  Tv,
  Camera,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRoleBadgeStyle } from '../../utils/roleStyles';
import { RoleBadge } from '../Common/RoleBadge';
import { MainCategory, SubCategory } from '../../types';
import { useTranslation } from '../../i18n';
import { GlobalSearchBar } from './GlobalSearchBar';
import { NotificationBell } from '../Common/NotificationBell';
import { DEFAULT_AVATAR } from '../../data/mockData';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentUser,
    isLoggedIn,
    isAdmin,
    isWriter,
    isCritic,
    setLoginModalOpen,
    logout,
    currentView,
    activeCategory,
    activeSubCategory,
    navigateTo,
    showToast,
    watchlist,
    savedArticles,
    activeUserTab,
  } = useApp();

  const [activeDropdown, setActiveDropdown] = useState<MainCategory | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<MainCategory | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const categoryDrawerRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile category drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDrawerRef.current &&
        !categoryDrawerRef.current.contains(event.target as Node)
      ) {
        setCategoryMenuOpen(false);
      }
    };
    if (categoryMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [categoryMenuOpen]);

  // Close mobile category drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && categoryMenuOpen) {
        setCategoryMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [categoryMenuOpen]);

  // Lock body scroll when mobile category drawer is open
  useEffect(() => {
    if (categoryMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [categoryMenuOpen]);

  // Auto-expand current active category when opening drawer if on category view
  useEffect(() => {
    if (categoryMenuOpen && currentView === 'category' && activeCategory) {
      setExpandedMobileCategory(activeCategory);
    }
  }, [categoryMenuOpen, currentView, activeCategory]);

  const categoriesConfig: {
    id: MainCategory;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    subCategories: { id: SubCategory; label: string }[];
  }[] = [
    {
      id: 'movies',
      name: t('nav.movies', 'Movies'),
      icon: Film,
      subCategories: [
        { id: 'news', label: 'News' },
        { id: 'lists', label: 'Lists' },
        { id: 'reviews', label: 'Reviews' },
      ],
    },
    {
      id: 'series',
      name: t('nav.series', 'Series'),
      icon: Tv,
      subCategories: [
        { id: 'news', label: 'News' },
        { id: 'lists', label: 'Lists' },
        { id: 'reviews', label: 'Reviews' },
      ],
    },
    {
      id: 'anime',
      name: t('nav.anime', 'Anime'),
      icon: Sparkles,
      subCategories: [
        { id: 'news', label: 'News' },
        { id: 'lists', label: 'Lists' },
      ],
    },
    {
      id: 'cinema-gear',
      name: t('nav.cinemaGear', 'Cinema Gear'),
      icon: Camera,
      subCategories: [
        { id: 'gear-news', label: 'Gear News' },
        { id: 'gear-reviews', label: 'Gear Reviews' },
      ],
    },
    {
      id: 'film-studies',
      name: t('nav.filmStudies', 'Film Studies'),
      icon: BookOpen,
      subCategories: [
        { id: 'producing', label: 'Producing' },
        { id: 'directing', label: 'Directing' },
        { id: 'cinematography', label: 'Cinematography' },
        { id: 'lighting', label: 'Lighting' },
        { id: 'post-production', label: 'Post-Production' },
      ],
    },
  ];

  const handleCategoryClick = (cat: MainCategory, subCat?: SubCategory) => {
    setActiveDropdown(null);
    navigateTo('category', { category: cat, subCategory: subCat || null });
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Main Navbar Bar */}
      <div className="bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-6">
          <div className="flex items-center justify-between h-16 gap-2 lg:gap-3 xl:gap-4">
            {/* Brand Logo Section & Mobile Category Drawer Trigger */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 pr-1">
              {/* Hamburger Button for Category Drawer (visible only below lg) */}
              <button
                id="mobile-category-hamburger-btn"
                type="button"
                onClick={() => {
                  setCategoryMenuOpen(prev => !prev);
                  setRoleDropdownOpen(false);
                }}
                aria-label="Menu Kategori"
                aria-expanded={categoryMenuOpen}
                className="lg:hidden flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF2E7E]/40"
              >
                <Menu className="w-5 h-5 text-slate-200" />
              </button>

              {/* Brand Logo */}
              <div
                id="brand-logo"
                onClick={() => navigateTo('home')}
                className="flex items-center cursor-pointer group shrink-0 select-none transition-transform active:scale-95 p-2 -m-2"
              >
                <img
                  src="/sotoy-logo-full.png"
                  alt="Sotoy Film — Pop-Culture & Cinema"
                  loading="eager"
                  fetchPriority="high"
                  className="h-14 md:h-[68px] w-auto -my-2 object-contain transition-all duration-300 group-hover:scale-[1.015] group-hover:opacity-90"
                />
              </div>
            </div>

            {/* Desktop Category Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0">
              {categoriesConfig.map(cat => {
                const isSelected = activeCategory === cat.id && currentView === 'category';

                return (
                  <div
                    key={cat.id}
                    className="relative group"
                    onMouseEnter={() => setActiveDropdown(cat.id)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <button
                      id={`nav-cat-${cat.id}`}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'text-white bg-white/[0.08] border border-white/15'
                          : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:rotate-180" />
                    </button>

                    {/* Dropdown Menu for Subcategories */}
                    {activeDropdown === cat.id && (
                      <div className="absolute left-0 top-full pt-1.5 w-52 z-50">
                        <div className="bg-[#171717] border border-white/10 rounded-xl p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                            Sub-Kategori {cat.name}
                          </div>
                          <div className="py-1 space-y-0.5">
                            {cat.subCategories.map(sub => (
                              <button
                                key={sub.id}
                                id={`subnav-${cat.id}-${sub.id}`}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleCategoryClick(cat.id, sub.id);
                                }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                  activeCategory === cat.id && activeSubCategory === sub.id
                                    ? 'bg-[#FF2E7E] text-white font-semibold'
                                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                                }`}
                              >
                                <span>{sub.label}</span>
                                <span className="text-[10px] text-slate-400 group-hover:text-slate-200">
                                  →
                                </span>
                              </button>
                            ))}
                          </div>
                          <div className="pt-1.5 border-t border-white/[0.08] mt-1">
                            <button
                              onClick={() => handleCategoryClick(cat.id)}
                              className="w-full text-center text-xs font-semibold text-[#FF2E7E] hover:underline py-1 cursor-pointer"
                            >
                              Buka Halaman Utama {cat.name}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Direct Feature Links */}
            <div className="hidden xl:flex items-center gap-1 border-l border-white/[0.08] pl-2 xl:pl-3 shrink-0">
              <button
                id="nav-film-database"
                onClick={() => navigateTo('film-database')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentView === 'film-database' || currentView === 'film-detail'
                    ? 'bg-[#FF2E7E] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>{t('nav.filmDatabase', 'Film Database')}</span>
              </button>

              <button
                id="nav-buzz"
                onClick={() => navigateTo('community-feed')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentView === 'community-feed'
                    ? 'bg-[#FF2E7E] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>{t('nav.buzzFeed', 'Buzz Feed')}</span>
              </button>

              <button
                id="nav-guide"
                onClick={() => navigateTo('faq-guide')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentView === 'faq-guide'
                    ? 'bg-[#FF2E7E] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>Panduan</span>
              </button>
            </div>

            {/* Right Controls: Search & User Profile */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Real-time Global Search Bar (Desktop) */}
              <div className="hidden md:block w-36 sm:w-44 lg:w-48 xl:w-56 shrink-0 transition-all">
                <GlobalSearchBar
                  placeholder="Cari film, artikel..."
                />
              </div>

            {/* Global Notification Bell */}
            {isLoggedIn && (
              <NotificationBell mode="global" />
            )}

            {!(isAdmin || currentUser.role === 'admin') && (isWriter || currentUser.role === 'penulis_sotoy' || currentUser.id === '0PCmaBvJrzeaQgpf3sSTC4mnsh02') && (
              <button
                id="navbar-writer-mode-pill"
                onClick={() => navigateTo('writer-dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all border shadow-sm ${
                  currentView === 'writer-dashboard'
                    ? 'bg-[#FF2E7E] text-white border-[#FF2E7E]'
                    : 'bg-[#FF2E7E]/10 text-[#FF2E7E] border-[#FF2E7E]/30 hover:bg-[#FF2E7E] hover:text-white'
                }`}
                title="Dasbor CMS Penulis"
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">DASBOR PENULIS</span>
              </button>
            )}

            {/* Unified Menu Trigger: Circular Profile Photo Avatar Button */}
            <div className="relative" ref={userMenuRef}>
              <button
                id="role-profile-trigger"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`relative p-0.5 rounded-full border-2 transition-all hover:scale-105 active:scale-95 flex items-center justify-center focus:outline-none ${
                  roleDropdownOpen
                    ? 'border-[#FF2E7E] ring-2 ring-[#FF2E7E]/30'
                    : 'border-white/20 hover:border-[#FF2E7E]'
                }`}
                title={isLoggedIn ? `Menu Navigasi & Akun (${currentUser.name})` : 'Menu Navigasi & Masuk Akun'}
                aria-label="Menu Utama & Akun"
                aria-expanded={roleDropdownOpen}
              >
                {isLoggedIn ? (
                  <img
                    src={currentUser.avatar?.trim() || DEFAULT_AVATAR}
                    alt={currentUser.name}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-1 ring-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171717] border border-white/10 flex items-center justify-center text-slate-300 font-bold text-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                {/* Semantic online status indicator */}
                {isLoggedIn && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0A0A0A]" />
                )}
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-[#171717] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto scrollbar-thin">
                  {/* User Profile Header / Login Banner */}
                  {isLoggedIn ? (
                    <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
                      <img
                        src={currentUser.avatar?.trim() || DEFAULT_AVATAR}
                        alt={currentUser.name}
                        className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/20 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate">{currentUser.name}</div>
                        <div className="text-xs text-slate-400 truncate">{currentUser.handle}</div>
                        <div className="mt-1">
                          <RoleBadge role={currentUser.role} size="sm" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pb-3 border-b border-white/[0.08] space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <Sparkles className="w-4 h-4 text-[#FF2E7E]" />
                        <span>Selamat Datang di Sotoy Film</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Masuk akun untuk berdiskusi, simpan watchlist, dan berikan review film.
                      </p>
                      <button
                        onClick={() => {
                          setLoginModalOpen(true);
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Masuk / Daftar Akun</span>
                      </button>
                    </div>
                  )}

                  {/* Section 1: Navigasi Situs Utama */}
                  <div className="py-2.5 space-y-0.5 border-b border-white/[0.08]">
                    <div className="text-slate-400 text-xs font-semibold px-1 mb-1">
                      Navigasi Utama
                    </div>

                    <button
                      onClick={() => {
                        navigateTo('home');
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                        currentView === 'home'
                          ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold border border-[#FF2E7E]/30'
                          : 'hover:bg-white/[0.05] text-slate-200'
                      }`}
                    >
                      <Home className="w-4 h-4 text-slate-400" />
                      <span>Beranda</span>
                    </button>

                    <button
                      onClick={() => {
                        navigateTo('film-database');
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                        currentView === 'film-database'
                          ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold border border-[#FF2E7E]/30'
                          : 'hover:bg-white/[0.05] text-slate-200'
                      }`}
                    >
                      <Film className="w-4 h-4 text-slate-400" />
                      <span>Film Database</span>
                    </button>

                    <button
                      onClick={() => {
                        navigateTo('community-feed');
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                        currentView === 'community-feed'
                          ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold border border-[#FF2E7E]/30'
                          : 'hover:bg-white/[0.05] text-slate-200'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <span>Komunitas</span>
                    </button>

                    <button
                      onClick={() => {
                        navigateTo('film-recommendations');
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                        currentView === 'film-recommendations'
                          ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold border border-[#FF2E7E]/30'
                          : 'hover:bg-white/[0.05] text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-slate-400" />
                      <span>Rekomendasi</span>
                    </button>

                    <button
                      onClick={() => {
                        navigateTo('search');
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                        currentView === 'search'
                          ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold border border-[#FF2E7E]/30'
                          : 'hover:bg-white/[0.05] text-slate-200'
                      }`}
                    >
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>Cari</span>
                    </button>
                  </div>

                  {/* Section 2: Menu Pengguna (Jika Logged In) */}
                  {isLoggedIn && (
                    <div className="py-2.5 space-y-0.5 border-b border-white/[0.08]">
                      <div className="text-slate-400 text-xs font-semibold px-1 mb-1">
                        Fitur Akun Saya
                      </div>

                      <button
                        id="menu-profile-btn"
                        onClick={() => {
                          navigateTo('user-profile', { userId: currentUser.id, userTab: 'buzz' });
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          currentView === 'user-profile' && activeUserTab === 'buzz'
                            ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold border border-[#FF2E7E]/30'
                            : 'hover:bg-white/[0.05] text-slate-200'
                        }`}
                      >
                        <span>Profil</span>
                        <span className="text-xs text-slate-500">→</span>
                      </button>

                      <button
                        id="menu-watchlist-btn"
                        onClick={() => {
                          navigateTo('user-profile', { userId: currentUser.id, userTab: 'watchlist' });
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          currentView === 'user-profile' && activeUserTab === 'watchlist'
                            ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold border border-[#FF2E7E]/30'
                            : 'hover:bg-white/[0.05] text-slate-200'
                        }`}
                      >
                        <span>Watchlist</span>
                        <span className="bg-white/10 text-slate-300 font-mono tabular-nums text-[11px] px-2 py-0.5 rounded-md">
                          {watchlist.length + savedArticles.length}
                        </span>
                      </button>

                      <button
                        id="menu-settings-btn"
                        onClick={() => {
                          navigateTo('settings');
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          currentView === 'settings'
                            ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold border border-[#FF2E7E]/30'
                            : 'hover:bg-white/[0.05] text-slate-200'
                        }`}
                      >
                        <span>Pengaturan</span>
                        <span className="text-xs text-slate-500">→</span>
                      </button>

                      {currentUser.role === 'warga_sotoy' && (
                        <button
                          onClick={() => {
                            navigateTo('critic-submission');
                            setRoleDropdownOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-lg text-xs flex items-center justify-between border border-dashed border-white/20 hover:bg-white/[0.05] text-slate-300 font-semibold transition-colors"
                        >
                          <span>Daftar Si Paling Sotoy</span>
                          <span>→</span>
                        </button>
                      )}

                      {(currentUser.role === 'si_paling_sotoy' || isCritic) && (
                        <div className="pt-1.5 border-t border-white/[0.08] mt-1.5">
                          <button
                            id="menu-critic-dashboard-btn"
                            onClick={() => {
                              navigateTo('critic-dashboard');
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              currentView === 'critic-dashboard'
                                ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 font-semibold'
                                : 'hover:bg-white/[0.05] text-slate-200 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>Dasbor Kritikus</span>
                              <RoleBadge role="si_paling_sotoy" size="xs" showTooltip={false} />
                            </div>
                            <span className="text-xs text-slate-400">→</span>
                          </button>
                        </div>
                      )}

                      {(currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin' || isWriter || isAdmin || currentUser.id === '0PCmaBvJrzeaQgpf3sSTC4mnsh02') && (
                        <div className="pt-1.5 border-t border-white/[0.08] mt-1.5 space-y-1">
                          <div className="text-slate-400 text-xs font-semibold px-1 mb-1 flex items-center justify-between">
                            <span>CMS Artikel</span>
                            <RoleBadge role={currentUser.role === 'admin' ? 'admin' : 'penulis_sotoy'} size="xs" showTooltip={false} />
                          </div>
                          {(currentUser.role === 'admin' || currentUser.role === 'penulis_sotoy') && (
                            <button
                              id="menu-writer-dashboard-btn"
                              onClick={() => {
                                navigateTo('writer-dashboard');
                                setRoleDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                currentView === 'writer-dashboard'
                                  ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 font-semibold'
                                  : 'hover:bg-white/[0.05] text-slate-200'
                              }`}
                            >
                              <span>Workspace Penulis</span>
                              <span className="text-xs text-slate-400">→</span>
                            </button>
                          )}
                          <button
                            id="menu-cms-page-btn"
                            onClick={() => {
                              navigateTo('cms');
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              currentView === 'cms' || currentView === 'cms-workspace'
                                ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 font-semibold'
                                : 'hover:bg-white/[0.05] text-slate-200'
                            }`}
                          >
                            <span>Halaman CMS</span>
                            <span className="text-xs text-slate-400">→</span>
                          </button>
                          <button
                            id="menu-write-article-btn"
                            onClick={() => {
                              navigateTo('write-article');
                              setRoleDropdownOpen(false);
                            }}
                            className="w-full text-left p-2 rounded-lg text-xs flex items-center justify-between hover:bg-white/[0.05] text-slate-200 transition-colors"
                          >
                            <span>Tulis Artikel Baru</span>
                            <span className="text-xs text-slate-400">→</span>
                          </button>
                        </div>
                      )}

                      {(currentUser.role === 'admin' || isAdmin) && (
                        <div className="pt-1.5 border-t border-white/[0.08] mt-1.5 space-y-1">
                          <div className="text-slate-400 text-xs font-semibold px-1 mb-1 flex items-center justify-between">
                            <span>Admin</span>
                            <RoleBadge role="admin" size="xs" showTooltip={false} />
                          </div>
                          <Link
                            to="/admin"
                            id="menu-admin-dashboard-btn"
                            onClick={() => setRoleDropdownOpen(false)}
                            className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              currentView === 'admin-dashboard'
                                ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 font-semibold'
                                : 'hover:bg-white/[0.05] text-slate-200'
                            }`}
                          >
                            <span>Admin Dashboard</span>
                            <span className="text-xs text-slate-400">→</span>
                          </Link>
                          <Link
                            to="/admin/homepage"
                            id="menu-admin-homepage-sections-btn"
                            onClick={() => setRoleDropdownOpen(false)}
                            className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              currentView === 'admin-homepage-sections' || location.pathname === '/admin/homepage' || location.pathname === '/admin/beranda'
                                ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 font-semibold'
                                : 'hover:bg-white/[0.05] text-slate-200'
                            }`}
                          >
                            <span>Seksi Beranda</span>
                            <span className="text-xs text-slate-400">→</span>
                          </Link>
                          <Link
                            to="/admin/cms"
                            id="menu-admin-full-cms-btn"
                            onClick={() => setRoleDropdownOpen(false)}
                            className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              currentView === 'cms' || currentView === 'cms-workspace'
                                ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 font-semibold'
                                : 'hover:bg-white/[0.05] text-slate-200'
                            }`}
                          >
                            <span>CMS Manager</span>
                            <span className="text-xs text-slate-400">→</span>
                          </Link>
                          <Link
                            to="/admin/submissions"
                            id="menu-admin-critics-btn"
                            onClick={() => setRoleDropdownOpen(false)}
                            className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              currentView === 'admin-critic-submissions'
                                ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 font-semibold'
                                : 'hover:bg-white/[0.05] text-slate-200'
                            }`}
                          >
                            <span>Verifikasi Kritikus</span>
                            <span className="text-xs text-slate-400">→</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 4: Semantic Logout Option */}
                  {isLoggedIn && (
                    <div className="pt-2">
                      <button
                        id="dropdown-logout-btn"
                        onClick={() => {
                          logout();
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 flex items-center justify-between font-semibold transition-colors"
                      >
                        <span>Keluar</span>
                        <span className="text-xs text-red-400/70">→</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
        </div>
      </div>

      {/* Mobile / Tablet Category Drawer */}
      {categoryMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* Semi-transparent dark overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setCategoryMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div
            ref={categoryDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Kategori Artikel"
            className="fixed inset-y-0 left-0 w-80 max-w-[85vw] h-full h-[100dvh] bg-[#171717] border-r border-white/10 shadow-2xl flex flex-col z-[61] animate-in slide-in-from-left duration-200 overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#0A0A0A] pt-[max(0.75rem,env(safe-area-inset-top))] min-h-[56px] w-full">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-[#FF2E7E]/10 border border-[#FF2E7E]/25 flex items-center justify-center text-[#FF2E7E] shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-black text-sm text-white tracking-wide truncate leading-tight">
                    Sotoy Navigasi
                  </h2>
                  <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                    Cari & Jelajahi Konten Film
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="close-mobile-category-drawer-btn"
                onClick={() => setCategoryMenuOpen(false)}
                className="shrink-0 flex items-center justify-center min-w-[36px] min-h-[36px] w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer ml-2"
                aria-label="Tutup menu kategori"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Navigation & Search Section */}
            <div className="shrink-0 p-3 space-y-2.5 border-b border-white/[0.08] bg-[#0A0A0A]/60">
              {/* Global Search Bar in Drawer */}
              <div className="w-full">
                <GlobalSearchBar
                  isMobile={true}
                  onItemSelect={() => setCategoryMenuOpen(false)}
                  placeholder="Cari film, artikel, buzz..."
                />
              </div>

              {/* Main Feature Shortcuts (Film DB & Buzz Feed) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="mobile-drawer-film-db-btn"
                  onClick={() => {
                    navigateTo('film-database');
                    setCategoryMenuOpen(false);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    currentView === 'film-database' || currentView === 'film-detail'
                      ? 'bg-[#FF2E7E] text-white border-[#FF2E7E] shadow-md shadow-[#FF2E7E]/20'
                      : 'text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-white/10'
                  }`}
                >
                  <Film className="w-4 h-4 text-[#FF2E7E]" />
                  <span>Film DB</span>
                </button>
                <button
                  type="button"
                  id="mobile-drawer-buzz-btn"
                  onClick={() => {
                    navigateTo('community-feed');
                    setCategoryMenuOpen(false);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    currentView === 'community-feed'
                      ? 'bg-[#FF2E7E] text-white border-[#FF2E7E] shadow-md shadow-[#FF2E7E]/20'
                      : 'text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-white/10'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-[#FF2E7E]" />
                  <span>Buzz Feed</span>
                </button>
              </div>
            </div>

            {/* Accordion Category List */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-800 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <span>Kategori Artikel</span>
              </div>
              {categoriesConfig.map(cat => {
                const CatIcon = cat.icon;
                const isCategorySelected = activeCategory === cat.id && currentView === 'category';
                const isExpanded = expandedMobileCategory === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`rounded-xl border transition-colors overflow-hidden ${
                      isCategorySelected
                        ? 'border-[#FF2E7E]/40 bg-[#FF2E7E]/[0.06]'
                        : isExpanded
                        ? 'border-white/15 bg-white/[0.03]'
                        : 'border-white/[0.06] bg-slate-900/40 hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Category Header Row */}
                    <div className="flex items-center justify-between p-1 gap-1">
                      {/* Tapping category name navigates directly to main category page */}
                      <button
                        type="button"
                        id={`mobile-drawer-cat-${cat.id}`}
                        onClick={() => {
                          handleCategoryClick(cat.id);
                          setCategoryMenuOpen(false);
                        }}
                        className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors min-h-[42px] cursor-pointer ${
                          isCategorySelected
                            ? 'text-[#FF2E7E] font-bold'
                            : 'text-slate-200 hover:text-white'
                        }`}
                      >
                        <CatIcon className={`w-4 h-4 shrink-0 ${isCategorySelected ? 'text-[#FF2E7E]' : 'text-slate-400'}`} />
                        <span className="text-xs font-semibold">{cat.name}</span>
                      </button>

                      {/* Separate chevron/caret button toggles subcategories accordion */}
                      {cat.subCategories && cat.subCategories.length > 0 && (
                        <button
                          type="button"
                          id={`mobile-drawer-toggle-${cat.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedMobileCategory(prev => prev === cat.id ? null : cat.id);
                          }}
                          aria-label={`Buka sub-kategori ${cat.name}`}
                          aria-expanded={isExpanded}
                          className="flex items-center justify-center min-w-[42px] min-h-[42px] w-10 h-10 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-[#FF2E7E]' : ''
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Subcategories List (Indented accordion content) */}
                    {isExpanded && cat.subCategories && cat.subCategories.length > 0 && (
                      <div className="px-2 pb-2 pt-0.5 space-y-1 border-t border-white/[0.06] bg-black/20">
                        <div className="pt-1.5 pb-0.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Sub-Kategori {cat.name}
                        </div>
                        {cat.subCategories.map(sub => {
                          const isSubSelected =
                            activeCategory === cat.id &&
                            activeSubCategory === sub.id &&
                            currentView === 'category';

                          return (
                            <button
                              key={sub.id}
                              type="button"
                              id={`mobile-drawer-subnav-${cat.id}-${sub.id}`}
                              onClick={() => {
                                handleCategoryClick(cat.id, sub.id);
                                setCategoryMenuOpen(false);
                              }}
                              className={`w-full text-left pl-4 pr-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors min-h-[36px] cursor-pointer ${
                                isSubSelected
                                  ? 'bg-[#FF2E7E] text-white font-semibold shadow-sm'
                                  : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSubSelected ? 'bg-white' : 'bg-slate-500'}`} />
                                <span>{sub.label}</span>
                              </span>
                              <span className="text-[10px] text-slate-400">→</span>
                            </button>
                          );
                        })}

                        {/* View all in this category shortcut */}
                        <button
                          type="button"
                          onClick={() => {
                            handleCategoryClick(cat.id);
                            setCategoryMenuOpen(false);
                          }}
                          className="w-full text-left pl-4 pr-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#FF2E7E] hover:underline"
                        >
                          Buka Semua {cat.name} →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
