import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Sparkles,
  MessageSquare,
  PenSquare,
  ChevronDown,
  Search,
  Menu,
  X,
  Shield,
  Star,
  Tv,
  Camera,
  BookOpen,
  Award,
  Clapperboard,
  LogIn,
  LogOut,
  User as UserIcon,
  Activity,
  Bookmark,
  Settings,
  Sliders,
  ShieldCheck,
  Home,
  Users,
  Heart,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRoleStyle } from '../../utils/roleStyles';
import { MainCategory, SubCategory, UserRole, UserTab } from '../../types';
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
    searchQuery,
    setSearchQuery,
    showToast,
    watchlist,
    savedArticles,
    ratings,
    buzzList,
    activeUserTab,
    buzzFeedTab,
    setBuzzFeedTab,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<MainCategory | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
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
    setMobileMenuOpen(false);
    navigateTo('category', { category: cat, subCategory: subCat || null });
  };

  const handleWriteArticleClick = () => {
    if (currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin' || currentUser.id === '0PCmaBvJrzeaQgpf3sSTC4mnsh02' || isWriter) {
      navigateTo('write-article');
    } else {
      showToast('Peran Anda saat ini tidak memiliki izin menulis artikel resmi.');
    }
  };

  const roleStyle = getRoleStyle(currentUser.role);

  return (
    <header className="sticky top-0 z-50 bg-[#0D0E15]/95 backdrop-blur-md border-b border-slate-800/80">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div
            id="brand-logo"
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF2E7E] via-[#FFD000] to-[#00F0FF] p-0.5 shadow-lg shadow-[#FF2E7E]/20 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-[#0D0E15] rounded-[10px] flex items-center justify-center">
                <Clapperboard className="w-5 h-5 text-[#FFD000] group-hover:rotate-6 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-display font-black text-xl tracking-tight text-white group-hover:text-[#FFD000] transition-colors">
                  SOTOY
                </span>
                <span className="font-display font-black text-xl tracking-tight text-[#FF2E7E]">
                  FILM
                </span>
              </div>
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block -mt-1">
                Pop-Culture & Cinema
              </span>
            </div>
          </div>

          {/* Desktop Category Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {categoriesConfig.map(cat => {
              const Icon = cat.icon;
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
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                      isSelected
                        ? 'text-white bg-slate-800/80 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:rotate-180" />
                  </button>

                  {/* Dropdown Menu for Subcategories */}
                  {activeDropdown === cat.id && (
                    <div className="absolute left-0 top-full pt-1.5 w-56 z-50">
                      <div className="bg-[#151624] border border-slate-700/80 rounded-2xl p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
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
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                                activeCategory === cat.id && activeSubCategory === sub.id
                                  ? 'bg-[#FF2E7E] text-white'
                                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                              }`}
                            >
                              <span>{sub.label}</span>
                              <span className="text-[10px] text-slate-400 group-hover:text-slate-200 uppercase">
                                Page →
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="pt-1.5 border-t border-slate-800 mt-1">
                          <button
                            onClick={() => handleCategoryClick(cat.id)}
                            className="w-full text-center text-[11px] font-bold text-[#00F0FF] hover:underline py-1"
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
          <div className="hidden xl:flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <button
              id="nav-film-database"
              onClick={() => navigateTo('film-database')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                currentView === 'film-database' || currentView === 'film-detail'
                  ? 'bg-[#FFD000] text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-[#FFD000] hover:bg-slate-800/40'
              }`}
            >
              <span>{t('nav.filmDatabase', 'Film Database')}</span>
            </button>

            <button
              id="nav-buzz"
              onClick={() => navigateTo('community-feed')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                currentView === 'community-feed'
                  ? 'bg-[#FF2E7E] text-white font-black shadow-md'
                  : 'text-slate-300 hover:text-[#FF2E7E] hover:bg-slate-800/40'
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
                className={`relative p-0.5 rounded-full border-2 transition-all hover:scale-105 active:scale-95 shadow-md flex items-center justify-center focus:outline-none ${
                  roleDropdownOpen
                    ? 'border-[#00F0FF] ring-2 ring-[#00F0FF]/40 shadow-cyan-500/20'
                    : 'border-slate-700 hover:border-[#00F0FF] hover:ring-2 hover:ring-[#00F0FF]/20'
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
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#FF2E7E] to-[#00F0FF] flex items-center justify-center text-white font-bold text-xs shadow-inner">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                {/* Status Indicator Badge */}
                {isLoggedIn && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0D0E15]" />
                )}
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-[#121324] border border-slate-700 rounded-3xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto scrollbar-thin">
                  {/* User Profile Header / Login Banner */}
                  {isLoggedIn ? (
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-11 h-11 rounded-2xl object-cover ring-2 ring-[#00F0FF] border border-white/20 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">{currentUser.name}</div>
                        <div className="text-xs text-slate-400 truncate">{currentUser.handle}</div>
                        <div className={`mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${roleStyle.badge}`}>
                          {roleStyle.name.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pb-3 border-b border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Sparkles className="w-4 h-4 text-[#FF2E7E]" />
                        <span>Selamat Datang di Sotoy Film</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Masuk akun untuk berdiskusi, simpan watchlist, dan berikan review film.
                      </p>
                      <button
                        onClick={() => {
                          setLoginModalOpen(true);
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-md"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Masuk / Daftar Akun</span>
                      </button>
                    </div>
                  )}

                  {/* Section 1: Navigasi Situs Utama */}
                  <div className="py-2.5 space-y-1 border-b border-slate-800">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1">
                      Navigasi Utama
                    </div>

                    <button
                      onClick={() => {
                        navigateTo('home');
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                        currentView === 'home'
                          ? 'bg-[#FF2E7E]/20 text-[#FF2E7E] font-bold border border-[#FF2E7E]/30'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <Home className="w-4 h-4 text-[#FF2E7E]" />
                      <span>Beranda Utama</span>
                    </button>

                    <button
                      onClick={() => {
                        navigateTo('film-database');
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                        currentView === 'film-database'
                          ? 'bg-[#FFD000]/20 text-[#FFD000] font-bold border border-[#FFD000]/30'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <Film className="w-4 h-4 text-[#FFD000]" />
                      <span>Database Film</span>
                    </button>

                    <button
                      onClick={() => {
                        navigateTo('community-feed');
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                        currentView === 'community-feed'
                          ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold border border-[#00F0FF]/30'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-[#00F0FF]" />
                      <span>Buzz Komunitas</span>
                    </button>

                    <button
                      onClick={() => {
                        navigateTo('film-recommendations');
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                        currentView === 'film-recommendations'
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Rekomendasi Film AI</span>
                    </button>

                    <button
                      onClick={() => {
                        navigateTo('search');
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                        currentView === 'search'
                          ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <Search className="w-4 h-4 text-pink-400" />
                      <span>Pencarian Lengkap</span>
                    </button>
                  </div>

                  {/* Section 2: Menu Pengguna (Jika Logged In) */}
                  {isLoggedIn && (
                    <div className="py-2.5 space-y-1 border-b border-slate-800">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1">
                        Fitur Akun Saya
                      </div>

                      <button
                        id="menu-profile-btn"
                        onClick={() => {
                          navigateTo('user-profile', { userId: currentUser.id, userTab: 'buzz' });
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          currentView === 'user-profile' && activeUserTab === 'buzz'
                            ? 'bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/40 font-bold'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <UserIcon className="w-4 h-4 text-[#00F0FF]" />
                          <span>Profil & Dashboard</span>
                        </div>
                        <span className="text-xs text-slate-500">→</span>
                      </button>

                      <button
                        id="menu-watchlist-btn"
                        onClick={() => {
                          navigateTo('user-profile', { userId: currentUser.id, userTab: 'watchlist' });
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          currentView === 'user-profile' && activeUserTab === 'watchlist'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Bookmark className="w-4 h-4 text-emerald-400" />
                          <span>Perpustakaan & Watchlist</span>
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {watchlist.length + savedArticles.length}
                        </span>
                      </button>

                      <button
                        id="menu-reviews-btn"
                        onClick={() => {
                          navigateTo('user-profile', { userId: currentUser.id, userTab: 'reviews' });
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-xl text-xs flex items-center justify-between hover:bg-slate-800 text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Star className="w-4 h-4 text-[#FFD000] fill-current" />
                          <span>Skor & Review Saya</span>
                        </div>
                        <span className="bg-amber-500/20 text-[#FFD000] font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {ratings.filter(r => r.userId === currentUser.id).length}
                        </span>
                      </button>

                      <button
                        id="menu-settings-btn"
                        onClick={() => {
                          navigateTo('settings');
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          currentView === 'settings'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Settings className="w-4 h-4 text-purple-400" />
                          <span>Pengaturan Akun</span>
                        </div>
                        <span className="text-xs text-slate-500">→</span>
                      </button>

                      {currentUser.role === 'warga_sotoy' && (
                        <button
                          onClick={() => {
                            navigateTo('critic-submission');
                            setRoleDropdownOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-xl text-xs flex items-center justify-between border border-dashed border-[#FFD000]/30 hover:bg-[#FFD000]/10 text-[#FFD000] font-bold transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Star className="w-4 h-4 fill-current text-[#FFD000]" />
                            <span>Daftar Si Paling Sotoy</span>
                          </div>
                          <span>→</span>
                        </button>
                      )}

                      {(currentUser.role === 'si_paling_sotoy' || isCritic) && (
                        <div className="pt-1.5 border-t border-slate-800/50 mt-1.5 space-y-1">
                          <div className={`text-[9px] font-black uppercase tracking-widest ${getRoleStyle('si_paling_sotoy').text} px-1 mb-1 flex items-center justify-between`}>
                            <span>Ruang Kritikus</span>
                            <span className="bg-[#FFD000] text-slate-950 px-1.5 py-0.2 rounded text-[8px] font-black">TOP CRITIC</span>
                          </div>
                          <button
                            id="menu-critic-dashboard-btn"
                            onClick={() => {
                              navigateTo('critic-dashboard');
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                              currentView === 'critic-dashboard'
                                ? 'bg-amber-500/20 text-[#FFD000] border border-amber-500/50 font-bold'
                                : 'hover:bg-amber-500/10 text-[#FFD000] font-bold border border-amber-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Award className="w-4 h-4 text-[#FFD000]" />
                              <span>Dasbor Kritikus & Workspace</span>
                            </div>
                            <span className="text-xs text-[#FFD000]">→</span>
                          </button>
                        </div>
                      )}

                      {(currentUser.role === 'penulis_sotoy' || currentUser.id === '0PCmaBvJrzeaQgpf3sSTC4mnsh02' || isWriter) && (
                        <div className="pt-1.5 border-t border-slate-800/50 mt-1.5 space-y-1">
                          <div className={`text-[9px] font-black uppercase tracking-widest ${getRoleStyle('penulis_sotoy').text} px-1 mb-1 flex items-center justify-between`}>
                            <span>Ruang Penulis</span>
                            <span className="bg-[#FF2E7E] text-white px-1.5 py-0.2 rounded text-[8px] font-black">WRITER</span>
                          </div>
                          <button
                            id="menu-writer-dashboard-btn"
                            onClick={() => {
                              navigateTo('writer-dashboard');
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                              currentView === 'writer-dashboard'
                                ? 'bg-pink-500/20 text-[#FF2E7E] border border-pink-500/50 font-bold'
                                : 'hover:bg-pink-500/10 text-[#FF2E7E] font-bold border border-pink-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <PenSquare className="w-4 h-4 text-[#FF2E7E]" />
                              <span>Dasbor Penulis & Workspace</span>
                            </div>
                            <span className="text-xs text-[#FF2E7E]">→</span>
                          </button>
                          <button
                            id="menu-write-article-btn"
                            onClick={() => {
                              navigateTo('write-article');
                              setRoleDropdownOpen(false);
                            }}
                            className="w-full text-left p-2 rounded-xl text-xs flex items-center justify-between hover:bg-slate-800 text-slate-200 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <BookOpen className="w-4 h-4 text-emerald-400" />
                              <span>+ Tulis Artikel Baru</span>
                            </div>
                            <span className="text-xs text-slate-400">→</span>
                          </button>
                        </div>
                      )}

                      {(currentUser.role === 'admin' || isAdmin) && (
                        <div className="pt-1.5 border-t border-slate-800/50 mt-1.5 space-y-1">
                          <div className={`text-[9px] font-black uppercase tracking-widest ${getRoleStyle('admin').text} px-1 mb-1 flex items-center justify-between`}>
                            <span>Akses Admin Panel</span>
                            <span className="bg-purple-600 text-white px-1.5 py-0.2 rounded text-[8px] font-black">ADMIN</span>
                          </div>
                          <button
                            id="menu-admin-dashboard-btn"
                            onClick={() => {
                              navigateTo('admin-dashboard');
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                              currentView === 'admin-dashboard'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold'
                                : 'hover:bg-purple-500/10 text-purple-300 font-bold border border-purple-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <ShieldCheck className="w-4 h-4 text-purple-400" />
                              <span>Dasbor Admin & Berkas</span>
                            </div>
                            <span className="text-xs text-purple-300">→</span>
                          </button>
                          <button
                            id="menu-admin-critics-btn"
                            onClick={() => {
                              navigateTo('admin-critic-submissions');
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                              currentView === 'admin-critic-submissions'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/50 font-bold'
                                : 'hover:bg-red-500/10 text-red-400 font-bold border border-red-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <ShieldCheck className="w-4 h-4 text-red-400" />
                              <span>Verifikasi Kritikus Film</span>
                            </div>
                            <span className="text-xs text-red-400">→</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 3: Role Switcher Simulator (if logged in) removed */}
                  {/* Section 4: Logout Option */}
                  {isLoggedIn && (
                    <div className="pt-2">
                      <button
                        id="dropdown-logout-btn"
                        onClick={() => {
                          logout();
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 font-bold transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar (Log Out)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
