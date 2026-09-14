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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MainCategory, SubCategory, UserRole, UserTab } from '../../types';
import { useTranslation } from '../../i18n';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentUser,
    isLoggedIn,
    setLoginModalOpen,
    logout,
    switchRole,
    currentView,
    activeCategory,
    activeSubCategory,
    navigateTo,
    searchQuery,
    setSearchQuery,
    showToast,
    watchlist,
    ratings,
    buzzList,
    activeUserTab,
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
    if (currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin') {
      navigateTo('write-article');
    } else {
      showToast('Peran Anda saat ini tidak memiliki izin menulis artikel resmi. Ganti peran ke "Penulis Sotoy" di menu profil atas!');
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'warga_sotoy':
        return {
          bg: 'bg-cyan-500/15 border-cyan-500/40 text-[#00F0FF]',
          tag: 'Warga Sotoy',
          badgeText: 'Umum',
        };
      case 'si_paling_sotoy':
        return {
          bg: 'bg-amber-500/15 border-amber-500/40 text-[#FFD000]',
          tag: 'Si Paling Sotoy',
          badgeText: 'Critic',
        };
      case 'penulis_sotoy':
        return {
          bg: 'bg-pink-500/15 border-pink-500/40 text-[#FF2E7E]',
          tag: 'Penulis Sotoy',
          badgeText: 'Writer',
        };
      case 'admin':
        return {
          bg: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
          tag: 'Admin Sotoy',
          badgeText: 'Lead Admin',
        };
    }
  };

  const currentBadge = getRoleBadgeStyle(currentUser.role);

  return (
    <header className="sticky top-0 z-50 bg-[#0D0E15]/95 backdrop-blur-md border-b border-slate-800/80">
      {/* Top micro-bar: Role Switcher & Announcement */}
      <div className="bg-[#121324] px-4 py-1.5 border-b border-slate-800/50 text-xs hidden md:flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-bold text-[#FFD000] uppercase tracking-wider text-[10px]">
            <Star className="w-3 h-3 fill-current text-[#FFD000]" />
            Platform Pop-Culture & Film Terbuka
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[11px]">
            Beri penilaian film favoritmu dengan sistem <strong>Skor Sotoy (Bintang 1-5)</strong>
          </span>
        </div>

        {/* Quick Role Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-medium">Uji Peran Akun:</span>
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              id="role-switch-warga"
              onClick={() => switchRole('warga_sotoy')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                currentUser.role === 'warga_sotoy'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Warga Sotoy
            </button>
            <button
              id="role-switch-critic"
              onClick={() => switchRole('si_paling_sotoy')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                currentUser.role === 'si_paling_sotoy'
                  ? 'bg-[#FFD000] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Si Paling Sotoy (Critic)
            </button>
            <button
              id="role-switch-writer"
              onClick={() => switchRole('penulis_sotoy')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                currentUser.role === 'penulis_sotoy'
                  ? 'bg-[#FF2E7E] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Penulis Sotoy (Writer)
            </button>
            <button
              id="role-switch-admin"
              onClick={() => switchRole('admin')}
              className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                currentUser.role === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      </div>

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
            {/* Search Bar */}
            <div className="relative hidden md:block w-44 lg:w-56">
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari film, berita, gear..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E] transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* If NOT logged in: Show Log In Button and Critic Submission */}
            {!isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateTo('critic-submission')}
                  className="hidden md:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-[#FFD000]/40 text-[#FFD000] hover:bg-[#FFD000]/10 transition-all"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Daftar Kritikus</span>
                </button>
                <button
                  id="nav-login-btn"
                  onClick={() => setLoginModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white hover:brightness-110 shadow-md shadow-[#FF2E7E]/20 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk (Log In)</span>
                </button>
              </div>
            ) : (
              /* Comprehensive User Menu Dropdown Trigger */
              <div className="relative" ref={userMenuRef}>
                <button
                  id="role-profile-trigger"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className={`relative p-0.5 rounded-full border-2 transition-all hover:scale-105 active:scale-95 shadow-md flex items-center justify-center focus:outline-none ${
                    roleDropdownOpen
                      ? 'border-[#00F0FF] ring-2 ring-[#00F0FF]/40 shadow-cyan-500/20'
                      : 'border-slate-700 hover:border-[#00F0FF] hover:ring-2 hover:ring-[#00F0FF]/20'
                  }`}
                  title={`Menu ${currentUser.name} (${currentUser.roleTitle})`}
                  aria-label="Menu Pengguna"
                  aria-expanded={roleDropdownOpen}
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-1 ring-white/20"
                  />
                  {/* Status Indicator Badge */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0D0E15]" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-[#121324] border border-slate-700 rounded-3xl p-4 shadow-2xl z-50 animate-in fade-in duration-150">
                    {/* User Profile Header Card */}
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-11 h-11 rounded-2xl object-cover ring-2 ring-[#00F0FF] border border-white/20"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">{currentUser.name}</div>
                        <div className="text-xs text-slate-400 truncate">{currentUser.handle}</div>
                        <div className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 bg-white/5 text-slate-300">
                          {currentUser.roleTitle}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Menu Options */}
                    <div className="py-2.5 space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 py-1">
                        Menu Pengguna
                      </div>

                      {/* 1. Profil & Dashboard */}
                      <button
                        id="menu-profile-btn"
                        onClick={() => {
                          navigateTo('user-profile');
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors ${
                          currentView === 'user-profile'
                            ? 'bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/40'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-[#00F0FF] flex items-center justify-center shrink-0">
                            <UserIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold">Dashboard & Profil Saya</div>
                            <div className="text-[10px] text-slate-400">Following, followers & statistik</div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">→</span>
                      </button>

                      {/* 2. Watchlist */}
                      <button
                        id="menu-watchlist-btn"
                        onClick={() => {
                          navigateTo('user-profile', { userTab: 'watchlist' });
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors ${
                          currentView === 'user-profile' && activeUserTab === 'watchlist'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                            <Bookmark className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold">Watchlist Film Saya</div>
                            <div className="text-[10px] text-slate-400">Film yang disimpan untuk ditonton</div>
                          </div>
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {watchlist.length}
                        </span>
                      </button>

                      {/* 3. Skor & Ulasan */}
                      <button
                        id="menu-reviews-btn"
                        onClick={() => {
                          navigateTo('user-profile', { userTab: 'reviews' });
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors ${
                          currentView === 'user-profile' && activeUserTab === 'reviews'
                            ? 'bg-amber-500/20 text-[#FFD000] border border-amber-500/40'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-[#FFD000] flex items-center justify-center shrink-0">
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </div>
                          <div>
                            <div className="font-bold">Skor & Ulasan Saya</div>
                            <div className="text-[10px] text-slate-400">Arsip penilaian bintang film</div>
                          </div>
                        </div>
                        <span className="bg-amber-500/20 text-[#FFD000] font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {ratings.filter(r => r.userId === currentUser.id).length}
                        </span>
                      </button>

                      {/* 4. Buzz Komunitas */}
                      <button
                        id="menu-buzz-btn"
                        onClick={() => {
                          navigateTo('user-profile', { userTab: 'buzz' });
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors ${
                          currentView === 'user-profile' && activeUserTab === 'buzz'
                            ? 'bg-pink-500/20 text-[#FF2E7E] border border-pink-500/40'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-pink-500/20 text-[#FF2E7E] flex items-center justify-center shrink-0">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold">Diskusi Buzz Saya</div>
                            <div className="text-[10px] text-slate-400">Thread dan opini sinema</div>
                          </div>
                        </div>
                        <span className="bg-pink-500/20 text-[#FF2E7E] font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {buzzList.filter(b => b.author.id === currentUser.id).length}
                        </span>
                      </button>

                      {/* 5. Settings (Dedicated Page with Activity Centre & Privacy) */}
                      <button
                        id="menu-settings-btn"
                        onClick={() => {
                          navigateTo('settings');
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors ${
                          currentView === 'settings'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                            <Settings className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold">Pengaturan & Pusat Aktivitas</div>
                            <div className="text-[10px] text-slate-400">Foto profil, privasi, sandi & preferensi</div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">→</span>
                      </button>

                      {/* 6. Critic Submission (Only for Warga Sotoy) */}
                      {currentUser.role === 'warga_sotoy' && (
                        <button
                          onClick={() => {
                            navigateTo('critic-submission');
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full mt-2 text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors ${
                            currentView === 'critic-submission'
                              ? 'bg-[#FFD000]/20 text-[#FFD000] border border-[#FFD000]/40'
                              : 'border border-dashed border-[#FFD000]/30 hover:bg-[#FFD000]/10 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-[#FFD000]/20 text-[#FFD000] flex items-center justify-center shrink-0">
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </div>
                            <div>
                              <div className="font-bold text-[#FFD000]">Daftar Si Paling Sotoy</div>
                              <div className="text-[10px] text-slate-400">Pengajuan kritikus terverifikasi</div>
                            </div>
                          </div>
                          <span className="text-xs text-[#FFD000]">→</span>
                        </button>
                      )}

                      {/* 7. Admin Dashboard (Only for Admins) */}
                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => {
                            navigateTo('admin-critic-submissions');
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full mt-2 text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors ${
                            currentView === 'admin-critic-submissions'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : 'border border-dashed border-red-500/30 hover:bg-red-500/10 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-bold text-red-400">Admin Dashboard</div>
                              <div className="text-[10px] text-slate-400">Review pengajuan kritikus</div>
                            </div>
                          </div>
                          <span className="text-xs text-red-400">→</span>
                        </button>
                      )}
                    </div>

                    {/* Role Switcher Simulator */}
                    <div className="py-2.5 border-t border-slate-800">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
                        Ganti Peran Pengguna (Role Simulator)
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            switchRole('warga_sotoy');
                            setRoleDropdownOpen(false);
                          }}
                          className={`text-left p-2 rounded-xl text-xs transition-colors ${
                            currentUser.role === 'warga_sotoy'
                              ? 'bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/40 font-bold'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div>Warga Sotoy</div>
                          <div className="text-[9px] text-slate-500">Penonton umum</div>
                        </button>

                        <button
                          onClick={() => {
                            switchRole('si_paling_sotoy');
                            setRoleDropdownOpen(false);
                          }}
                          className={`text-left p-2 rounded-xl text-xs transition-colors ${
                            currentUser.role === 'si_paling_sotoy'
                              ? 'bg-amber-500/20 text-[#FFD000] border border-amber-500/40 font-bold'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div>Si Paling Sotoy</div>
                          <div className="text-[9px] text-slate-500">Kritikus terverifikasi</div>
                        </button>

                        <button
                          onClick={() => {
                            switchRole('penulis_sotoy');
                            setRoleDropdownOpen(false);
                          }}
                          className={`text-left p-2 rounded-xl text-xs transition-colors ${
                            currentUser.role === 'penulis_sotoy'
                              ? 'bg-pink-500/20 text-[#FF2E7E] border border-pink-500/40 font-bold'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div>Penulis Sotoy</div>
                          <div className="text-[9px] text-slate-500">Akses tulis artikel</div>
                        </button>

                        <button
                          onClick={() => {
                            switchRole('admin');
                            setRoleDropdownOpen(false);
                          }}
                          className={`text-left p-2 rounded-xl text-xs transition-colors ${
                            currentUser.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div>Admin Sotoy</div>
                          <div className="text-[9px] text-slate-500">Akses penuh</div>
                        </button>
                      </div>
                    </div>

                    {/* Logout Option */}
                    <div className="pt-2 border-t border-slate-800">
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
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#10111d] border-b border-slate-800 px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari film, berita, gear..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 pl-8 text-xs text-white"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
          </div>

          {/* User Menu Section on Mobile */}
          {isLoggedIn && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-xl object-cover ring-1 ring-[#00F0FF]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentUser.roleTitle}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="mobile-nav-profile"
                  onClick={() => {
                    navigateTo('user-profile');
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-left text-xs font-bold text-[#00F0FF] flex items-center gap-2"
                >
                  <UserIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Profil Saya</span>
                </button>

                <button
                  id="mobile-nav-watchlist"
                  onClick={() => {
                    navigateTo('user-profile', { userTab: 'watchlist' });
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-left text-xs font-bold text-emerald-300 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Bookmark className="w-3.5 h-3.5 shrink-0" />
                    <span>Watchlist</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                    {watchlist.length}
                  </span>
                </button>

                <button
                  id="mobile-nav-reviews"
                  onClick={() => {
                    navigateTo('user-profile', { userTab: 'reviews' });
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left text-xs font-bold text-[#FFD000] flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 shrink-0 fill-current" />
                    <span>Ulasan</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded-full">
                    {ratings.filter(r => r.userId === currentUser.id).length}
                  </span>
                </button>

                <button
                  id="mobile-nav-settings"
                  onClick={() => {
                    navigateTo('settings');
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-left text-xs font-bold text-purple-300 flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  <span>Pengaturan</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                navigateTo('film-database');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs font-bold text-[#FFD000] hover:bg-slate-800"
            >
              <Film className="w-4 h-4 mx-auto mb-1" />
              Film Database
            </button>
            <button
              onClick={() => {
                navigateTo('community-feed');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs font-bold text-[#FF2E7E] hover:bg-slate-800"
            >
              <MessageSquare className="w-4 h-4 mx-auto mb-1" />
              Buzz Feed
            </button>
          </div>

          {/* Mobile Auth Button */}
          {!isLoggedIn ? (
            <div className="space-y-2">
              <button
                onClick={() => {
                  setLoginModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Akun Sotoy Film</span>
              </button>
              <button
                onClick={() => {
                  navigateTo('critic-submission');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#FFD000]/40 text-[#FFD000] hover:bg-[#FFD000]/10 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Star className="w-4 h-4 fill-current" />
                <span>Daftar Jadi Si Paling Sotoy (Kritikus)</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 px-4 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar dari Akun ({currentUser.name})</span>
            </button>
          )}

          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kategori Konten
            </div>
            {categoriesConfig.map(cat => (
              <div key={cat.id} className="bg-slate-900/60 rounded-xl p-2 border border-slate-800/80">
                <button
                  onClick={() => handleCategoryClick(cat.id)}
                  className="font-bold text-sm text-white flex items-center justify-between w-full py-1"
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] text-[#FF2E7E] uppercase font-bold">Semua →</span>
                </button>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {cat.subCategories.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => handleCategoryClick(cat.id, sub.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-[#FF2E7E] hover:text-white rounded-lg text-xs text-slate-300"
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
