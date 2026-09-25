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
  ChevronRight,
  LogOut,
  Bookmark,
  Settings,
  FileText,
  Shield,
  Award,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRoleBadgeStyle } from '../../utils/roleStyles';
import { RoleBadge } from '../Common/RoleBadge';
import { MainCategory, SubCategory } from '../../types';
import { useTranslation } from '../../i18n';
import { GlobalSearchBar } from './GlobalSearchBar';
import { NotificationBell } from '../Common/NotificationBell';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileCategories, setExpandedMobileCategories] = useState<Record<string, boolean>>({});
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Handle escape key to close menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setRoleDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <header className="sticky top-0 z-50 bg-[#0E1013]/95 backdrop-blur-md border-b border-white/[0.08]">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Mobile 3-Line Hamburger Menu Button & Brand Logo */}
          <div className="flex items-center gap-2">
            {/* Mobile Hamburger Button (Button garis 3) */}
            <button
              id="mobile-menu-toggle-btn"
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF2E7E]/50"
              aria-label="Buka Menu Navigasi"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Brand Logo */}
            <div
              id="brand-logo"
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigateTo('home');
              }}
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
          <nav className="hidden lg:flex items-center gap-1">
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
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isSelected
                        ? 'text-white bg-white/[0.08] border border-white/15'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:rotate-180" />
                  </button>

                  {/* Dropdown Menu for Subcategories */}
                  {activeDropdown === cat.id && (
                    <div className="absolute left-0 top-full pt-1.5 w-56 z-50">
                      <div className="bg-[#171A1F] border border-white/10 rounded-xl p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
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
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
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
                            className="w-full text-center text-xs font-semibold text-[#FF2E7E] hover:underline py-1"
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
          <div className="hidden xl:flex items-center gap-1.5 border-l border-white/[0.08] pl-3">
            <button
              id="nav-film-database"
              onClick={() => navigateTo('film-database')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'community-feed'
                  ? 'bg-[#FF2E7E] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span>{t('nav.buzzFeed', 'Buzz Feed')}</span>
            </button>
          </div>

          {/* Right Controls: Search & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-time Global Search Bar (Desktop) */}
            <div className="hidden md:block w-48 sm:w-56 lg:w-72 xl:w-80">
              <GlobalSearchBar
                placeholder="Cari film, artikel, buzz..."
              />
            </div>

            {/* Global Notification Bell */}
            {isLoggedIn && (
              <NotificationBell mode="global" />
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
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-1 ring-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171A1F] border border-white/10 flex items-center justify-center text-slate-300 font-bold text-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                {/* Semantic online status indicator */}
                {isLoggedIn && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0E1013]" />
                )}
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-[#171A1F] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto scrollbar-thin">
                  {/* User Profile Header / Login Banner */}
                  {isLoggedIn ? (
                    <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
                      <img
                        src={currentUser.avatar}
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

      {/* Mobile Hidden Menu Drawer (Menu Garis 3) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[70]">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div
            id="mobile-drawer-menu"
            className="fixed inset-y-0 left-0 w-[86%] max-w-sm bg-[#121418] border-r border-white/10 shadow-2xl flex flex-col z-[71] overflow-hidden animate-in slide-in-from-left duration-300"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08] bg-[#0E1013]/90">
              <div
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigateTo('home');
                }}
                className="flex items-center cursor-pointer select-none"
              >
                <img
                  src="/sotoy-logo-full.png"
                  alt="Sotoy Film"
                  className="h-9 w-auto object-contain"
                />
              </div>

              <button
                id="mobile-menu-close-btn"
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors focus:outline-none"
                aria-label="Tutup Menu Navigasi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Search Bar inside Drawer */}
            <div className="p-3 border-b border-white/[0.08] bg-[#171A1F]/50">
              <GlobalSearchBar
                isMobile={true}
                placeholder="Cari film, artikel, buzz..."
                onItemSelect={() => setIsMobileMenuOpen(false)}
              />
            </div>

            {/* Scrollable Navigation Body */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
              {/* Quick Navigation Links */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                  Menu Utama
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigateTo('home');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'home'
                        ? 'bg-[#FF2E7E] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Home className="w-4 h-4 shrink-0" />
                    <span>Beranda</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigateTo('film-database');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'film-database' || currentView === 'film-detail'
                        ? 'bg-[#FF2E7E] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Film className="w-4 h-4 shrink-0" />
                    <span>Film Database</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigateTo('community-feed');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'community-feed'
                        ? 'bg-[#FF2E7E] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>Buzz Komunitas</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigateTo('film-recommendations');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'film-recommendations'
                        ? 'bg-[#FF2E7E] text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Rekomendasi Film</span>
                  </button>
                </div>
              </div>

              {/* Categories & Subcategories (Accordion) */}
              <div className="border-t border-white/[0.08] pt-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center justify-between">
                  <span>Kategori Konten</span>
                  <span className="text-[10px] text-slate-500 font-normal">Pilih & Jelajahi</span>
                </div>
                <div className="space-y-1">
                  {categoriesConfig.map(cat => {
                    const isExpanded = !!expandedMobileCategories[cat.id];
                    const isSelected = activeCategory === cat.id && currentView === 'category';
                    const CatIcon = cat.icon;

                    return (
                      <div key={cat.id} className="rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              handleCategoryClick(cat.id);
                            }}
                            className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-left transition-colors ${
                              isSelected
                                ? 'text-[#FF2E7E]'
                                : 'text-slate-200 hover:text-white'
                            }`}
                          >
                            <CatIcon className={`w-4 h-4 ${isSelected ? 'text-[#FF2E7E]' : 'text-slate-400'}`} />
                            <span>{cat.name}</span>
                          </button>

                          {cat.subCategories.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedMobileCategories(prev => ({
                                  ...prev,
                                  [cat.id]: !prev[cat.id],
                                }));
                              }}
                              className="px-2.5 py-2.5 text-slate-400 hover:text-white transition-colors"
                              aria-label={`Toggle subkategori ${cat.name}`}
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-[#FF2E7E]' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Collapsible Subcategories */}
                        {isExpanded && cat.subCategories.length > 0 && (
                          <div className="px-3 pb-2 pt-0.5 space-y-1 bg-black/20 border-t border-white/[0.04]">
                            {cat.subCategories.map(sub => (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  handleCategoryClick(cat.id, sub.id);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                  activeCategory === cat.id && activeSubCategory === sub.id
                                    ? 'bg-[#FF2E7E]/20 text-[#FF2E7E] font-semibold'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                }`}
                              >
                                <span>{sub.label}</span>
                                <ChevronRight className="w-3 h-3 opacity-60" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User Account / Membership Section */}
              <div className="border-t border-white/[0.08] pt-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                  Akun & Preferensi
                </div>

                {isLoggedIn ? (
                  <div className="space-y-2">
                    {/* User Card */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/20 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{currentUser.handle}</div>
                        <div className="mt-1">
                          <RoleBadge role={currentUser.role} size="sm" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          navigateTo('user-profile', { userId: currentUser.id, userTab: 'buzz' });
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                          currentView === 'user-profile' && activeUserTab === 'buzz'
                            ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold'
                            : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          <span>Profil Saya</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>

                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          navigateTo('user-profile', { userId: currentUser.id, userTab: 'watchlist' });
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                          currentView === 'user-profile' && activeUserTab === 'watchlist'
                            ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold'
                            : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Bookmark className="w-4 h-4 text-slate-400" />
                          <span>Watchlist</span>
                        </div>
                        <span className="bg-white/10 text-slate-300 font-mono tabular-nums text-[10px] px-2 py-0.5 rounded-md">
                          {watchlist.length + savedArticles.length}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          navigateTo('settings');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                          currentView === 'settings'
                            ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold'
                            : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>Pengaturan</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>

                      {(currentUser.role === 'si_paling_sotoy' || isCritic) && (
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            navigateTo('critic-dashboard');
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                            currentView === 'critic-dashboard'
                              ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold'
                              : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Award className="w-4 h-4 text-amber-400" />
                            <span>Dasbor Kritikus</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      )}

                      {(currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin' || isWriter || isAdmin || currentUser.id === '0PCmaBvJrzeaQgpf3sSTC4mnsh02') && (
                        <div className="pt-2 border-t border-white/[0.06] space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                            CMS & Kepenulisan
                          </div>
                          <button
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              navigateTo('writer-dashboard');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                              currentView === 'writer-dashboard'
                                ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold'
                                : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <PenSquare className="w-4 h-4 text-[#FF2E7E]" />
                              <span>Dasbor Penulis</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          <button
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              navigateTo('cms');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                              currentView === 'cms' || currentView === 'cms-workspace'
                                ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold'
                                : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <span>Halaman CMS</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        </div>
                      )}

                      {(currentUser.role === 'admin' || isAdmin) && (
                        <div className="pt-2 border-t border-white/[0.06] space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                            Admin Panel
                          </div>
                          <Link
                            to="/admin"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                              currentView === 'admin-dashboard'
                                ? 'bg-[#FF2E7E]/15 text-[#FF2E7E] font-semibold'
                                : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Shield className="w-4 h-4 text-[#FF2E7E]" />
                              <span>Admin Dashboard</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </Link>
                        </div>
                      )}

                      {/* Logout Button */}
                      <button
                        onClick={() => {
                          logout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors mt-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <LogOut className="w-4 h-4" />
                          <span>Keluar dari Akun</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#1E232B] to-[#14171C] border border-white/10 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Sparkles className="w-4 h-4 text-[#FF2E7E]" />
                      <span>Masuk ke Sotoy Film</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Bergabung bersama komunitas sinema: review film, buat daftar watchlist, dan diskusi buzz film terbaru.
                    </p>
                    <button
                      onClick={() => {
                        setLoginModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-[#FF2E7E]/20"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Masuk / Daftar Akun</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-4 py-3 border-t border-white/[0.08] bg-[#0E1013]/90 text-[11px] text-slate-400 text-center flex items-center justify-between">
              <span>Sotoy Film</span>
              <span className="text-[10px] text-slate-400">Pop-Culture & Cinema</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
