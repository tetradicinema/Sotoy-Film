import React, { useState } from 'react';
import {
  User as UserIcon,
  Star,
  MessageSquare,
  Bookmark,
  Award,
  Shield,
  PenSquare,
  Sparkles,
  Heart,
  Send,
  Trash2,
  ExternalLink,
  Edit3,
  Check,
  CheckCircle2,
  Film,
  Lock,
  LogOut,
  LogIn,
  Activity,
  Settings,
  Clock,
  Tv,
  Eye,
  Sliders,
  Bell,
  Play,
  Share2,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Flame,
  Layers,
  Camera,
  Users,
  UserCheck,
  UserPlus,
  Plus,
  X,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserTab, UserSettings } from '../../types';
import { StarRating } from '../Common/StarRating';
import { AdBannerSlot } from '../Common/AdBannerSlot';

export const UserPage: React.FC = () => {
  const {
    currentUser,
    isLoggedIn,
    setLoginModalOpen,
    logout,
    switchRole,
    ratings,
    buzzList,
    films,
    articles,
    watchlist,
    toggleWatchlist,
    activeUserTab,
    setActiveUserTab,
    userSettings,
    updateUserSettings,
    updateUserProfile,
    addBuzzPost,
    likeBuzzPost,
    navigateTo,
    showToast,
    followingIds,
    followersIds,
    allUsers,
    toggleFollowUser,
    isFollowing,
    openShareModal,
    viewedUser,
    viewedUserId,
    setViewedUserId,
  } = useApp();

  // Determine which user profile is being visited
  const targetUser = (viewedUserId ? allUsers.find(u => u.id === viewedUserId) : (isLoggedIn ? currentUser : (allUsers[1] || allUsers[0]))) || currentUser;
  const isOwnProfile = isLoggedIn && currentUser.id === targetUser.id;

  // Follow Modal State: 'followers' | 'following' | 'discover' | null
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | 'discover' | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [communityFilter, setCommunityFilter] = useState<'all' | 'following' | 'followers'>('all');
  const [communitySearch, setCommunitySearch] = useState('');

  // Settings local form state
  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    handle: currentUser.handle,
    bio: currentUser.bio,
    avatar: currentUser.avatar,
  });

  const [settingsForm, setSettingsForm] = useState<UserSettings>(userSettings);

  // Quick buzz composer inside dashboard
  const [newBuzzContent, setNewBuzzContent] = useState('');
  const [newBuzzScore, setNewBuzzScore] = useState<number | undefined>(undefined);
  const [newBuzzFilmId, setNewBuzzFilmId] = useState<string>('');

  // Preset avatars for film cinephiles
  const cinematicAvatars = [
    { label: 'Director Auteur', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' },
    { label: 'Cinematographer', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80' },
    { label: 'Neo-Noir Lead', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
    { label: 'Sci-Fi Explorer', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80' },
    { label: 'Screenwriter', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
  ];

  const availableGenres = [
    'Sci-Fi',
    'Psychological Thriller',
    'Neo-Noir',
    'Anime',
    'Cinema Gear & Optics',
    'Drama & Auteur',
    'Horror & Gore',
    'Action & Martial Arts',
    'Documentary & Film Studies',
  ];

  // Filter content authored by the viewed/target user
  const myBuzz = buzzList.filter(b => b.author.id === targetUser.id);
  const myReviews = ratings.filter(r => r.userId === targetUser.id);
  const myArticles = articles.filter(a => a.author.id === targetUser.id || a.author.name === targetUser.name);
  const myWatchlistFilms = films.filter(f => watchlist.includes(f.id));

  // Compute stats for the target user
  const averageScore = myReviews.length > 0
    ? (myReviews.reduce((acc, curr) => acc + curr.score, 0) / myReviews.length).toFixed(1)
    : '4.8';

  const handlePostDashboardBuzz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuzzContent.trim()) return;
    addBuzzPost(newBuzzContent, newBuzzFilmId || undefined, newBuzzScore);
    setNewBuzzContent('');
    setNewBuzzFilmId('');
    setNewBuzzScore(undefined);
    showToast('Buzz berhasil diposting dari Pusat Aktivitas!');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(profileForm);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserSettings(settingsForm);
  };

  const toggleGenrePreference = (genre: string) => {
    setSettingsForm(prev => {
      const exists = prev.favoriteGenres.includes(genre);
      return {
        ...prev,
        favoriteGenres: exists
          ? prev.favoriteGenres.filter(g => g !== genre)
          : [...prev.favoriteGenres, genre],
      };
    });
  };

  const getRoleTheme = () => {
    switch (targetUser.role) {
      case 'warga_sotoy':
        return {
          border: 'border-cyan-500/40',
          badgeBg: 'bg-cyan-500/20 text-[#00F0FF] border-cyan-500/50',
          accent: '#00F0FF',
          roleName: 'Warga Sotoy',
          badgeText: 'Penonton Umum',
        };
      case 'si_paling_sotoy':
        return {
          border: 'border-amber-500/40',
          badgeBg: 'bg-amber-500/20 text-[#FFD000] border-amber-500/50',
          accent: '#FFD000',
          roleName: 'Si Paling Sotoy',
          badgeText: 'Kritikus Terverifikasi',
        };
      case 'penulis_sotoy':
        return {
          border: 'border-pink-500/40',
          badgeBg: 'bg-pink-500/20 text-[#FF2E7E] border-pink-500/50',
          accent: '#FF2E7E',
          roleName: 'Penulis Sotoy',
          badgeText: 'Jurnalis & Redaksi',
        };
      case 'admin':
        return {
          border: 'border-purple-500/40',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
          accent: '#a855f7',
          roleName: 'Admin Sotoy',
          badgeText: 'Pengelola Platform',
        };
    }
  };

  const roleTheme = getRoleTheme();

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Visitor Alert Banner */}
        {!isLoggedIn && (
          <div className="bg-gradient-to-r from-blue-950/60 via-purple-950/50 to-slate-900 border border-[#00F0FF]/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-[#00F0FF] flex items-center justify-center shrink-0 border border-cyan-500/30">
                <Eye className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <h4 className="text-white font-bold text-sm flex items-center justify-center sm:justify-start gap-2">
                  <span>Mode Pengunjung (Visitor Mode)</span>
                  <span className="text-[10px] bg-cyan-500/20 text-[#00F0FF] px-2 py-0.5 rounded-full font-black uppercase">
                    Publik
                  </span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Kamu sedang melihat profil publik <strong>{targetUser.name}</strong> ({targetUser.roleTitle}). Masuk untuk memberi Skor Sotoy, ikut berdiskusi di Buzz, dan saling follow sesama cinephile!
                </p>
              </div>
            </div>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#FF2E7E]/25 hover:brightness-110 active:scale-95 transition-all shrink-0 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk / Buat Akun</span>
            </button>
          </div>
        )}

        {/* Visiting Another User's Profile Banner (for logged in users) */}
        {isLoggedIn && !isOwnProfile && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
              <span>
                Sedang mengunjungi profil publik milik <strong className="text-white">{targetUser.name}</strong> ({targetUser.handle})
              </span>
            </div>
            <button
              onClick={() => navigateTo('user-profile', { userId: currentUser.id })}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span>← Kembali ke Profil Saya</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* USER PROFILE HEADER BANNER */}
        {/* ========================================================================= */}
        <div className="bg-[#121324] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          {/* Header Banner Background */}
          <div className="h-36 sm:h-44 bg-gradient-to-r from-[#191a32] via-[#2a1b32] to-[#121324] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#FF2E7E]/20 via-transparent to-transparent" />
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
              {/* Share Profile Button (IG, WA, X) */}
              <button
                id="user-header-share-btn"
                onClick={() => {
                  openShareModal({
                    title: `Profil Sinema ${targetUser.name} (${targetUser.handle})`,
                    text: targetUser.bio || `Cek kurasi film, ulasan, dan Skor Sotoy oleh ${targetUser.name} di Sotoy Film!`,
                    image: targetUser.avatar,
                    imageUrl: targetUser.avatar,
                    authorAvatar: targetUser.avatar,
                    url: window.location.href,
                    type: 'buzz',
                    authorName: targetUser.name,
                    meta: `${targetUser.roleTitle} di Sotoy Film`,
                  });
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700/80 hover:border-[#00F0FF] flex items-center gap-1.5 transition-all shadow-md backdrop-blur-sm"
                title="Bagikan Profil ke Instagram Stories, Feed, atau WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span className="hidden sm:inline">Bagikan Profil</span>
                <span className="sm:hidden">Share</span>
              </button>

              {/* Follow Button on Profile Banner if visiting someone else */}
              {!isOwnProfile && (
                <button
                  id="user-header-follow-btn"
                  onClick={() => {
                    if (!isLoggedIn) {
                      setLoginModalOpen(true);
                      showToast(`Silakan masuk untuk mengikuti ${targetUser.name}!`);
                      return;
                    }
                    toggleFollowUser(targetUser.id);
                  }}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md backdrop-blur-sm ${
                    isLoggedIn && isFollowing(targetUser.id)
                      ? 'bg-slate-900/90 text-slate-300 border border-slate-700 hover:bg-red-500/20 hover:text-red-400'
                      : 'bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white hover:brightness-110'
                  }`}
                >
                  {isLoggedIn && isFollowing(targetUser.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mengikuti</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Ikuti</span>
                    </>
                  )}
                </button>
              )}

              {/* Own Profile Actions */}
              {isOwnProfile && (
                <>
                  <button
                    id="user-header-settings-btn"
                    onClick={() => navigateTo('settings')}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold border border-purple-400/40 flex items-center gap-1.5 transition-all shadow-md backdrop-blur-sm"
                    title="Buka Halaman Pengaturan & Privasi"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pengaturan</span>
                  </button>
                  <button
                    id="user-header-logout-btn"
                    onClick={logout}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-red-500/20 hover:text-red-400 text-slate-300 text-xs font-bold border border-slate-700/60 flex items-center gap-1.5 transition-colors backdrop-blur-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* User Info Strip */}
          <div className="px-4 sm:px-8 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-20 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3.5 sm:gap-4">
                <div className="relative group self-start">
                  <img
                    src={targetUser.avatar}
                    alt={targetUser.name}
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-[#121324] border-2 border-white/20 shadow-2xl bg-slate-900"
                  />
                  {isOwnProfile && (
                    <button
                      onClick={() => navigateTo('settings', { settingsTab: 'profile' })}
                      className="absolute bottom-1 right-1 p-1.5 bg-[#00F0FF] text-black font-black rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                      title="Ganti Foto Profil dari Perangkat di Settings"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
                      {targetUser.name}
                    </h1>
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${roleTheme.badgeBg}`}>
                      {roleTheme.roleName}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs font-medium flex items-center gap-2">
                    <span>{targetUser.handle}</span>
                    <span>•</span>
                    <span>{targetUser.roleTitle}</span>
                  </div>

                  {/* Following & Followers counts */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      id="btn-dashboard-followers"
                      onClick={() => setFollowModalType('followers')}
                      className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#00F0FF]/50 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors group"
                      title="Lihat Pengikut"
                    >
                      <span className="font-black text-[#00F0FF] group-hover:scale-110 transition-transform">
                        {targetUser.followersCount ?? followersIds.length}
                      </span>
                      <span className="text-slate-400 text-[11px]">Pengikut (Followers)</span>
                    </button>

                    <button
                      id="btn-dashboard-following"
                      onClick={() => setFollowModalType('following')}
                      className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#00F0FF]/50 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors group"
                      title="Lihat Akun yang Diikuti"
                    >
                      <span className="font-black text-[#00F0FF] group-hover:scale-110 transition-transform">
                        {targetUser.followingCount ?? followingIds.length}
                      </span>
                      <span className="text-slate-400 text-[11px]">Mengikuti (Following)</span>
                    </button>

                    {isOwnProfile && (
                      <button
                        id="btn-dashboard-discover"
                        onClick={() => setFollowModalType('discover')}
                        className="px-2.5 py-1 rounded-xl bg-pink-500/15 border border-pink-500/40 text-[11px] font-bold text-pink-300 hover:text-white flex items-center gap-1.5 transition-colors"
                        title="Temukan Cinephile untuk Saling Follow"
                      >
                        <Sparkles className="w-3 h-3 text-[#FF2E7E]" />
                        <span>+ Temukan Teman</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Role Switcher Simulator (Only for own profile) */}
              {isOwnProfile && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 px-2">
                    Uji Peran:
                  </span>
                  <button
                    onClick={() => switchRole('warga_sotoy')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                      currentUser.role === 'warga_sotoy'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Warga
                  </button>
                  <button
                    onClick={() => switchRole('si_paling_sotoy')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                      currentUser.role === 'si_paling_sotoy'
                        ? 'bg-[#FFD000] text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Si Paling Sotoy
                  </button>
                  <button
                    onClick={() => switchRole('penulis_sotoy')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                      currentUser.role === 'penulis_sotoy'
                        ? 'bg-[#FF2E7E] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Penulis
                  </button>
                  <button
                    onClick={() => switchRole('admin')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                      currentUser.role === 'admin'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              )}
            </div>

            {/* Bio Strip */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Filosofi Sinema / Bio:</span>
                <p className="text-slate-200 text-xs sm:text-sm italic">
                  "{targetUser.bio || 'Penikmat dan kurator film di komunitas Sotoy Film.'}"
                </p>
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => navigateTo('settings')}
                  className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Settings className="w-3.5 h-3.5 text-[#00F0FF]" />
                  <span>Pengaturan & Privasi</span>
                </button>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div
                onClick={() => setActiveUserTab('reviews')}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center cursor-pointer hover:border-[#FFD000] transition-colors"
              >
                <div className="font-display font-black text-xl text-[#FFD000]">
                  {myReviews.length}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                  Ulasan & Rating
                </div>
              </div>

              <div
                onClick={() => setActiveUserTab('watchlist')}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center cursor-pointer hover:border-emerald-500 transition-colors"
              >
                <div className="font-display font-black text-xl text-emerald-400">
                  {myWatchlistFilms.length}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                  Watchlist Film
                </div>
              </div>

              <div
                onClick={() => setActiveUserTab(myArticles.length > 0 ? 'articles' : 'buzz')}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center cursor-pointer hover:border-[#FF2E7E] transition-colors"
              >
                <div className="font-display font-black text-xl text-[#FF2E7E]">
                  {myArticles.length > 0 ? myArticles.length : myBuzz.length}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                  {myArticles.length > 0 ? 'Artikel Editorial' : 'Postingan Buzz'}
                </div>
              </div>

              <div
                onClick={() => setActiveUserTab('activity')}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center cursor-pointer hover:border-[#00F0FF] transition-colors"
              >
                <div className="font-display font-black text-xl text-[#00F0FF]">
                  ★ {averageScore}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                  Rata-rata Skor Diberi
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN USER NAVIGATION TABS */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800 flex-nowrap">
          {/* Activity Centre only for own profile */}
          {isOwnProfile && (
            <button
              id="user-tab-activity"
              onClick={() => setActiveUserTab('activity')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeUserTab === 'activity'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-[#00F0FF] border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Pusat Aktivitas</span>
            </button>
          )}

          <button
            id="user-tab-reviews"
            onClick={() => setActiveUserTab('reviews')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeUserTab === 'reviews'
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-[#FFD000] border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Skor & Ulasan ({myReviews.length})</span>
          </button>

          <button
            id="user-tab-buzz"
            onClick={() => setActiveUserTab('buzz')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeUserTab === 'buzz'
                ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-[#FF2E7E] border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Buzz & Opini ({myBuzz.length})</span>
          </button>

          {/* Editorial Articles tab - shows if user has articles or is writer/admin */}
          {(myArticles.length > 0 || targetUser.role === 'penulis_sotoy' || targetUser.role === 'admin') && (
            <button
              id="user-tab-articles"
              onClick={() => setActiveUserTab('articles')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeUserTab === 'articles'
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <PenSquare className="w-4 h-4" />
              <span>Artikel Editorial ({myArticles.length})</span>
            </button>
          )}

          <button
            id="user-tab-watchlist"
            onClick={() => setActiveUserTab('watchlist')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeUserTab === 'watchlist'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>{isOwnProfile ? 'Watchlist Saya' : 'Watchlist Kurasi'} ({myWatchlistFilms.length})</span>
          </button>

          <button
            id="user-tab-community"
            onClick={() => setActiveUserTab('community')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeUserTab === 'community'
                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-[#00F0FF] border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Komunitas Cinephile</span>
          </button>

          {isOwnProfile && (
            <button
              id="user-tab-settings"
              onClick={() => navigateTo('settings')}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 text-slate-300 bg-slate-900/60 hover:bg-purple-950/40 hover:text-purple-300 border border-slate-800 hover:border-purple-500/40"
            >
              <Settings className="w-4 h-4 text-purple-400" />
              <span>Pengaturan & Privasi</span>
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ACTIVITY CENTRE (PUSAT AKTIVITAS PENGGUNA) */}
        {/* ========================================================================= */}
        {activeUserTab === 'activity' && (
          <div className="space-y-8">
            {/* Top Grid: Cinephile Level + Quick Buzz Post */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Cinephile Level & Badges Card */}
              <div className="lg:col-span-5 bg-[#121324] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#FFD000]" />
                    <span>Tingkat Ke-sotoy-an Kurator</span>
                  </h3>
                  <span className="bg-[#FFD000]/20 text-[#FFD000] border border-[#FFD000]/40 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    Level 3: Cinephile Auteur
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Progress Menuju "Si Paling Kritikus"</span>
                    <span className="font-bold text-white">780 / 1,000 XP</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-[#FFD000] via-[#FF8008] to-[#FF2E7E] h-full rounded-full w-[78%]" />
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    Tips: Berikan ulasan pada 2 film lagi atau bagikan 3 thread buzz untuk menaikkan lencana kurasimu.
                  </p>
                </div>

                {/* Badges Collection */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Koleksi Lencana Penghargaan:
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center shrink-0">
                        <Flame className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-white">Early Reviewer</div>
                        <div className="text-[9px] text-slate-400">Rating di minggu pertama</div>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#FFD000]/20 text-[#FFD000] flex items-center justify-center shrink-0">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-white">Optics Nerd</div>
                        <div className="text-[9px] text-slate-400">Pecinta anamorphic lens</div>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center shrink-0">
                        <Film className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-white">Watchlist Hunter</div>
                        <div className="text-[9px] text-slate-400">Menyimpan &gt;10 film</div>
                      </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-white">Teori Liar</div>
                        <div className="text-[9px] text-slate-400">Buzz trending minggu ini</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Genre Preferences in Activity */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-400 text-[10px] uppercase">Preferensi Genre Pilihan:</span>
                    <button
                      onClick={() => setActiveUserTab('settings')}
                      className="text-[#00F0FF] text-[11px] hover:underline"
                    >
                      Ubah
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {userSettings.favoriteGenres.map(g => (
                      <span
                        key={g}
                        className="bg-slate-900 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-800"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Buzz Composer Column */}
              <div className="lg:col-span-7 bg-[#121324] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#FF2E7E]" />
                    <span>Kirim Buzz / Teori Sinema Cepat</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Dipublikasikan ke Komunitas Feed
                  </span>
                </div>

                <form onSubmit={handlePostDashboardBuzz} className="space-y-3">
                  <textarea
                    rows={3}
                    value={newBuzzContent}
                    onChange={e => setNewBuzzContent(e.target.value)}
                    placeholder="Lagi mikirin apa tentang sinema hari ini? Tulis pendapat sotoy kamu..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Tautkan Film (Opsional):
                      </label>
                      <select
                        value={newBuzzFilmId}
                        onChange={e => setNewBuzzFilmId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF2E7E]"
                      >
                        <option value="">Pilih Film dari Database...</option>
                        {films.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.title} ({f.year})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Beri Skor Cepat (Opsional):
                      </label>
                      <select
                        value={newBuzzScore || ''}
                        onChange={e => setNewBuzzScore(e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF2E7E]"
                      >
                        <option value="">Tanpa Skor</option>
                        <option value="5.0">★ 5.0 (Masterpiece Mutlak)</option>
                        <option value="4.5">★ 4.5 (Luar Biasa Keren)</option>
                        <option value="4.0">★ 4.0 (Sangat Bagus)</option>
                        <option value="3.5">★ 3.5 (Layak Ditonton)</option>
                        <option value="3.0">★ 3.0 (Cukup Oke)</option>
                        <option value="2.0">★ 2.0 (Kurang Sotoy)</option>
                        <option value="1.0">★ 1.0 (Skip Saja)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      Postingan akan ditandai dengan badge {currentUser.roleTitle}.
                    </span>
                    <button
                      type="submit"
                      disabled={!newBuzzContent.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-[#FF2E7E]/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim ke Buzz Feed</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Timeline Aktivitas Terbaru */}
            <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#00F0FF]" />
                    <span>Riwayat Aktivitas Kamu Terbaru</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Catatan interaksi rating, watchlist, dan opini yang baru kamu lakukan
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  Live Log
                </span>
              </div>

              <div className="space-y-4">
                {/* Simulated Recent Activities */}
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-[#FFD000]/20 text-[#FFD000] flex items-center justify-center shrink-0 border border-[#FFD000]/30">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        Memberi Skor Sotoy ★ 4.9 untuk film Dune: Part Two
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">1 jam lalu</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                      "Sinematografi Greig Fraser luar biasa, tata suara Dolby Atmos bergetar..."
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        Menyimpan Shōgun ke Daftar Tontonan (Watchlist)
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">Kemarin</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Platform tonton: Disney+ Hotstar / FX
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center shrink-0 border border-[#FF2E7E]/30">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        Membuat postingan Buzz tentang rasio IMAX 70mm
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">2 hari lalu</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Mendapatkan 14 suka dan 5 tanggapan dari Warga Sotoy lainnya.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: WATCHLIST SAYA (DAFTAR TONTONAN) */}
        {/* ========================================================================= */}
        {activeUserTab === 'watchlist' && (
          <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <Bookmark className="w-5 h-5 text-emerald-400" />
                  <span>Daftar Tontonan (Watchlist Saya)</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Koleksi film yang ingin kamu tonton lengkap dengan platform tayang resminya
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full self-start sm:self-auto">
                {myWatchlistFilms.length} Film Tersimpan
              </span>
            </div>

            {myWatchlistFilms.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                <Bookmark className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    Watchlist kamu masih kosong
                  </h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    Jelajahi Database Film atau Rekomendasi Film untuk menemukan tontonan menarik dan klik "+ Tambah ke Watchlist".
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('film-database')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20"
                >
                  Jelajahi Database Film
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {myWatchlistFilms.map(film => (
                  <div
                    key={film.id}
                    id={`watchlist-card-${film.id}`}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all flex flex-col group shadow-lg"
                  >
                    <div className="aspect-video w-full overflow-hidden relative bg-slate-800">
                      <img
                        src={film.backdrop || film.poster}
                        alt={film.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[11px] font-bold text-[#FFD000] border border-[#FFD000]/40 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{film.skorSotoy.toFixed(1)}</span>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          toggleWatchlist(film.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white shadow"
                        title="Hapus dari Watchlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                          {film.year} • {film.duration || 'Standar Bioskop'}
                        </div>
                        <h4 className="font-display font-black text-sm text-white group-hover:text-emerald-300 transition-colors">
                          {film.title}
                        </h4>
                        <p className="text-slate-400 text-xs line-clamp-2 mt-1">
                          {film.synopsis}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Tv className="w-3 h-3 text-[#00F0FF]" />
                          <span>{film.whereToWatch[0]?.platform || 'Bioskop'}</span>
                        </div>
                        <button
                          onClick={() => navigateTo('film-detail', { filmId: film.id })}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <span>Buka Detail Film</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SKOR & ULASAN SAYA */}
        {/* ========================================================================= */}
        {activeUserTab === 'reviews' && (
          <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <Star className="w-5 h-5 text-[#FFD000] fill-current" />
                  <span>Kumpulan Ulasan & Skor Sotoy Saya</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Arsip semua film yang sudah kamu tonton dan nilai dengan skor jujur
                </p>
              </div>
              <button
                onClick={() => navigateTo('film-database')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFD000] to-[#FF8008] text-slate-950 font-black text-xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Nilai Film Lainnya</span>
              </button>
            </div>

            {myReviews.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                <Star className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    Kamu belum menulis ulasan
                  </h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    Kunjungi halaman detail film favoritmu dan klik tombol "Beri Skor Sotoy" untuk meninggalkan ulasan pertamamu.
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('film-database')}
                  className="px-5 py-2.5 rounded-xl bg-[#FFD000] text-slate-950 font-black text-xs"
                >
                  Beri Nilai Film Pertama
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myReviews.map(rev => {
                  const targetFilm = films.find(f => f.id === rev.filmId);
                  return (
                    <div
                      key={rev.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {targetFilm?.poster && (
                            <img
                              src={targetFilm.poster}
                              alt={targetFilm.title}
                              className="w-10 h-14 object-cover rounded-lg border border-slate-700"
                            />
                          )}
                          <div>
                            <h4
                              onClick={() => targetFilm && navigateTo('film-detail', { filmId: targetFilm.id })}
                              className="font-display font-black text-sm text-white hover:text-[#00F0FF] cursor-pointer"
                            >
                              {targetFilm ? targetFilm.title : 'Film Terkait'}
                            </h4>
                            <span className="text-[11px] text-slate-400">
                              Diulas pada {rev.createdAt}
                            </span>
                          </div>
                        </div>

                        <div className="bg-black/60 border border-[#FFD000]/40 px-3 py-1.5 rounded-xl text-[#FFD000] font-black text-sm flex items-center gap-1.5 self-start sm:self-auto">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{rev.score.toFixed(1)}</span>
                          <span className="text-slate-500 text-xs">/ 5.0</span>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <h5 className="font-display font-bold text-sm text-white">
                          "{rev.headline}"
                        </h5>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                          {rev.reviewText}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                        <span className="flex items-center gap-1 text-[#FF2E7E]">
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          {rev.likes} Warga menyukai ulasan ini
                        </span>

                        <div className="flex items-center gap-3">
                          <button
                            id={`user-share-review-${rev.id}-btn`}
                            onClick={() => {
                              openShareModal({
                                title: `Rating ${targetFilm?.title || 'Film'} - ${rev.score.toFixed(1)}/5.0 oleh ${targetUser.name}`,
                                text: rev.reviewText,
                                headline: rev.headline,
                                url: window.location.href,
                                type: 'film',
                                image: targetFilm?.poster,
                                filmTitle: targetFilm?.title || 'Film Sinema',
                                filmYear: targetFilm?.year,
                                filmPoster: targetFilm?.poster,
                                filmBackdrop: targetFilm?.backdrop,
                                filmGenres: targetFilm?.genres,
                                rating: rev.score,
                                reviewerName: targetUser.name,
                                reviewerAvatar: targetUser.avatar,
                                reviewerRole: targetUser.roleTitle,
                                meta: targetFilm ? `${targetFilm.title} (${targetFilm.year}) • Skor: ${rev.score.toFixed(1)}/5.0` : `Skor: ${rev.score.toFixed(1)}/5.0`,
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-[#FF2E7E]/20 text-slate-300 hover:text-white border border-slate-700 hover:border-[#FF2E7E]/40 font-bold text-xs flex items-center gap-1.5 transition-colors"
                            title="Bagikan Skor & Ulasan ke Instagram / Sosmed"
                          >
                            <Share2 className="w-3 h-3 text-[#00F0FF]" />
                            <span>Bagikan</span>
                          </button>

                          {targetFilm && (
                            <button
                              onClick={() => navigateTo('film-detail', { filmId: targetFilm.id })}
                              className="text-[#00F0FF] hover:underline flex items-center gap-1 font-bold"
                            >
                              <span>Detail Film</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: BUZZ & DISKUSI SAYA */}
        {/* ========================================================================= */}
        {activeUserTab === 'buzz' && (
          <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5 text-[#FF2E7E]" />
                  <span>Postingan Buzz & Opini Komunitas Saya</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Arsip semua thread obrolan dan teori sinema yang pernah kamu posting
                </p>
              </div>
              <button
                onClick={() => navigateTo('community-feed')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white font-black text-xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Buka Buzz Feed Komunitas</span>
              </button>
            </div>

            {myBuzz.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    Belum ada postingan Buzz
                  </h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    Bagikan pemikiran, teori plot twist, atau impresi film pertama kamu sekarang.
                  </p>
                </div>
                <button
                  onClick={() => setActiveUserTab('activity')}
                  className="px-5 py-2.5 rounded-xl bg-[#FF2E7E] text-white font-black text-xs"
                >
                  Tulis Buzz dari Activity Centre
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myBuzz.map(buzz => (
                  <div
                    key={buzz.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name}
                          className="w-8 h-8 rounded-xl object-cover"
                        />
                        <div>
                          <span className="font-bold text-xs text-white block">{currentUser.name}</span>
                          <span className="text-[10px] text-slate-400">{buzz.createdAt}</span>
                        </div>
                      </div>
                      {buzz.skorSotoyMention && (
                        <div className="bg-black/60 border border-[#FFD000]/40 px-2.5 py-1 rounded-xl text-[#FFD000] font-black text-xs flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{buzz.skorSotoyMention.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                      {buzz.content}
                    </p>

                    {buzz.taggedFilm && (
                      <div
                        onClick={() => navigateTo('film-detail', { filmId: buzz.taggedFilm!.id })}
                        className="p-2.5 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between hover:border-slate-700 cursor-pointer"
                      >
                        <span className="text-xs font-bold text-[#00F0FF]">
                          🎬 {buzz.taggedFilm.title} ({buzz.taggedFilm.year})
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-[#FF2E7E]">
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        {buzz.likes} Suka
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {buzz.repliesCount} Balasan
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: ARTIKEL EDITORIAL DITERBITKAN */}
        {/* ========================================================================= */}
        {activeUserTab === 'articles' && (
          <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <PenSquare className="w-5 h-5 text-[#FF2E7E]" />
                  <span>Artikel Editorial {isOwnProfile ? 'Saya' : targetUser.name}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Koleksi ulasan editorial, tinjauan sinematografi, dan tulisan kurasi di Sotoy Film.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-bold rounded-xl">
                  {myArticles.length} Artikel
                </span>
                {isOwnProfile && (targetUser.role === 'penulis_sotoy' || targetUser.role === 'admin') && (
                  <button
                    onClick={() => {
                      showToast('Editor artikel siap! Silakan buat draf artikel barumu.');
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white text-xs font-black rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tulis Artikel Baru</span>
                  </button>
                )}
              </div>
            </div>

            {myArticles.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                  <PenSquare className="w-6 h-6" />
                </div>
                <h4 className="text-white font-bold text-sm">Belum Ada Artikel Diterbitkan</h4>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  {isOwnProfile
                    ? 'Kamu belum menerbitkan artikel editorial di Sotoy Film.'
                    : `${targetUser.name} belum menerbitkan artikel editorial.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {myArticles.map(art => (
                  <div
                    key={art.id}
                    onClick={() => navigateTo('article-detail', { articleId: art.id })}
                    className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-pink-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all flex flex-col shadow-lg"
                  >
                    <div className="relative aspect-video overflow-hidden bg-slate-950">
                      <img
                        src={art.coverImage}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm text-[10px] uppercase font-black text-[#00F0FF] px-2.5 py-0.5 rounded-md border border-[#00F0FF]/30">
                        {art.category}
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-sm text-[10px] text-slate-300 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#FF2E7E]" />
                        <span>{art.readTime}</span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <h4 className="font-display font-black text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-2 leading-snug">
                          {art.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {art.excerpt}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{art.publishedAt}</span>
                        <span className="text-[#00F0FF] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          <span>Baca Artikel</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: JARINGAN CINEPHILE (SALING FOLLOW) */}
        {/* ========================================================================= */}
        {activeUserTab === 'community' && (
          <div className="space-y-6">
            {/* Header & Description */}
            <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-[#00F0FF]" />
                  <span>Jaringan Komunitas & Saling Follow</span>
                </h3>
                <p className="text-slate-400 text-xs">
                  Temukan sesama penikmat film, kurator sotoy, dan kritikus sinema. Saling follow untuk bertukar sudut pandang ulasan.
                </p>
              </div>

              {/* Quick stats pills */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  onClick={() => setFollowModalType('followers')}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-[#00F0FF] font-black">{followersIds.length}</span>
                  <span>Pengikut</span>
                </button>
                <button
                  onClick={() => setFollowModalType('following')}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-[#FF2E7E] font-black">{followingIds.length}</span>
                  <span>Mengikuti</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => setCommunityFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    communityFilter === 'all'
                      ? 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-[#00F0FF] border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua Kurator ({allUsers.length})
                </button>
                <button
                  onClick={() => setCommunityFilter('following')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    communityFilter === 'following'
                      ? 'bg-gradient-to-r from-pink-500/30 to-rose-500/30 text-[#FF2E7E] border border-pink-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sedang Diikuti ({followingIds.length})
                </button>
                <button
                  onClick={() => setCommunityFilter('followers')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    communityFilter === 'followers'
                      ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-[#FFD000] border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pengikut ({followersIds.length})
                </button>
              </div>

              {/* Search user */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kurator, nama, @handle..."
                  value={communitySearch}
                  onChange={e => setCommunitySearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
            </div>

            {/* Users Grid */}
            {(() => {
              const baseList = allUsers.filter(u => {
                if (communityFilter === 'following') return followingIds.includes(u.id);
                if (communityFilter === 'followers') return followersIds.includes(u.id);
                return true;
              });

              const filtered = baseList.filter(u =>
                u.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
                u.handle.toLowerCase().includes(communitySearch.toLowerCase()) ||
                u.bio.toLowerCase().includes(communitySearch.toLowerCase()) ||
                u.roleTitle.toLowerCase().includes(communitySearch.toLowerCase())
              );

              if (filtered.length === 0) {
                return (
                  <div className="bg-[#121324] border border-slate-800 rounded-3xl p-10 text-center space-y-3">
                    <Users className="w-10 h-10 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-white">Tidak Ada Kurator Ditemukan</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {communityFilter === 'following'
                        ? 'Kamu belum mengikuti siapapun. Jelajahi daftar kurator dan klik "+ Ikuti" untuk mulai membangun jaringan sinemamu.'
                        : 'Tidak ada kurator yang cocok dengan pencarian kata kunci tersebut.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(u => {
                    const isSelf = u.id === currentUser.id;
                    const following = isFollowing(u.id);

                    return (
                      <div
                        key={u.id}
                        className="bg-[#121324] border border-slate-800 hover:border-[#00F0FF]/40 rounded-2xl p-4 transition-all flex flex-col justify-between gap-4 shadow-lg group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div
                              onClick={() => navigateTo('user-profile', { userId: u.id })}
                              className="flex items-center gap-3 cursor-pointer"
                              title={`Kunjungi profil ${u.name}`}
                            >
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-700 group-hover:ring-[#00F0FF] transition-all"
                              />
                              <div>
                                <div className="text-sm font-bold text-white group-hover:text-[#00F0FF] transition-colors flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isSelf && (
                                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">
                                      Kamu
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400">{u.handle}</div>
                              </div>
                            </div>
                          </div>

                          <div className="inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-300">
                            {u.roleTitle}
                          </div>

                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {u.bio || 'Penikmat sinema aktif di Sotoy Film.'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>
                              <b className="text-white">{u.followersCount ?? u.followers?.length ?? 12}</b> Pengikut
                            </span>
                            <span>•</span>
                            <span>
                              <b className="text-white">{u.totalReviews}</b> Ulasan
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => navigateTo('user-profile', { userId: u.id })}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition-colors"
                              title="Buka halaman profil"
                            >
                              Lihat
                            </button>

                            {!isSelf && (
                              <button
                                onClick={() => {
                                  if (!isLoggedIn) {
                                    setLoginModalOpen(true);
                                    showToast(`Silakan masuk untuk mengikuti ${u.name}!`);
                                    return;
                                  }
                                  toggleFollowUser(u.id);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  following
                                    ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-red-500/20 hover:text-red-400'
                                    : 'bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white shadow-md hover:brightness-110 active:scale-95'
                                }`}
                              >
                                {following ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Mengikuti</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>+ Ikuti</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: PUSAT PENGATURAN AKUN & PRIVASI PORTAL */}
        {/* ========================================================================= */}
        {activeUserTab === 'settings' && (
          <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Halaman Khusus Tersendiri</span>
                </div>
                <h3 className="font-display font-black text-2xl text-white">
                  Pusat Pengaturan, Keamanan & Privasi
                </h3>
                <p className="text-slate-400 text-xs max-w-xl">
                  Seluruh pengaturan profil, upload foto dari perangkat, Pusat Aktivitas, ganti password email, privasi publik/privat, dan preferensi sinema kini memiliki halaman mandiri.
                </p>
              </div>

              <button
                onClick={() => navigateTo('settings')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 via-[#FF2E7E] to-[#FF8008] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shrink-0"
              >
                <Settings className="w-4 h-4" />
                <span>Buka Pengaturan Lengkap</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick access sub-pages cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                onClick={() => navigateTo('settings', { settingsTab: 'profile' })}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-[#00F0FF] flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#00F0FF] transition-colors flex items-center justify-between">
                  <span>Profil & Foto Device</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-[11px] text-slate-400">
                  Unggah foto profil langsung dari HP/laptop, ubah nama lengkap, handle, dan bio kurator.
                </p>
              </div>

              <div
                onClick={() => navigateTo('settings', { settingsTab: 'activity' })}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-[#FFD000] flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#FFD000] transition-colors flex items-center justify-between">
                  <span>Pusat Aktivitas (XP)</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-[11px] text-slate-400">
                  Cek lencana kurasi, poin ke-sotoy-an, riwayat rating, dan aktivitas akun secara mendalam.
                </p>
              </div>

              <div
                onClick={() => navigateTo('settings', { settingsTab: 'security' })}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-red-500/50 hover:bg-slate-900 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors flex items-center justify-between">
                  <span>Keamanan & Password</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-[11px] text-slate-400">
                  Ganti kata sandi, perbarui alamat email akun, aktifkan 2FA, dan pantau log sesi aktif.
                </p>
              </div>

              <div
                onClick={() => navigateTo('settings', { settingsTab: 'privacy' })}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>Privasi & Data</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-[11px] text-slate-400">
                  Atur visibilitas profil (publik/privat), privasi daftar watchlist, dan ekspor arsip data GDPR.
                </p>
              </div>

              <div
                onClick={() => navigateTo('settings', { settingsTab: 'preferences' })}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors flex items-center justify-between">
                  <span>Preferensi Sinema</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-[11px] text-slate-400">
                  Pilih genre kesukaanmu, pengaturan autoplay trailer film, dan resolusi streaming default.
                </p>
              </div>

              <div
                onClick={() => navigateTo('settings', { settingsTab: 'notifications' })}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition-all cursor-pointer group space-y-2"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center justify-between">
                  <span>Notifikasi</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </h4>
                <p className="text-[11px] text-slate-400">
                  Atur notifikasi suka ulasan, balasan buzz kurator, dan pengingat rilis bioskop watchlist.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FOLLOWERS / FOLLOWING / DISCOVER INTERACTIVE MODAL */}
        {/* ========================================================================= */}
        {followModalType !== null && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#121324] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg text-white">
                      {followModalType === 'followers' && `Pengikut Kamu (${followersIds.length})`}
                      {followModalType === 'following' && `Sedang Kamu Ikuti (${followingIds.length})`}
                      {followModalType === 'discover' && 'Temukan Cinephile Baru'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {followModalType === 'followers' && 'Daftar penonton & kurator yang mengikuti akunmu'}
                      {followModalType === 'following' && 'Daftar kurator yang postingannya muncul di feed kamu'}
                      {followModalType === 'discover' && 'Ikuti kurator lain untuk memperluas referensi sinema'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFollowModalType(null);
                    setModalSearchQuery('');
                  }}
                  className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Inside Modal */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari dalam daftar ini..."
                  value={modalSearchQuery}
                  onChange={e => setModalSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              {/* Users List inside modal */}
              <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1">
                {(() => {
                  let targetList = allUsers;
                  if (followModalType === 'followers') {
                    targetList = allUsers.filter(u => followersIds.includes(u.id));
                  } else if (followModalType === 'following') {
                    targetList = allUsers.filter(u => followingIds.includes(u.id));
                  } else {
                    targetList = allUsers.filter(u => u.id !== currentUser.id);
                  }

                  const filtered = targetList.filter(u =>
                    u.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                    u.handle.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                    u.roleTitle.toLowerCase().includes(modalSearchQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Tidak ada pengguna yang ditemukan dalam kategori ini.
                      </div>
                    );
                  }

                  return filtered.map(u => {
                    const isSelf = u.id === currentUser.id;
                    const following = isFollowing(u.id);

                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-800"
                          />
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded font-bold">
                                  Kamu
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>{u.handle}</span>
                              <span>•</span>
                              <span className="text-[#00F0FF]">{u.roleTitle}</span>
                            </div>
                          </div>
                        </div>

                        {!isSelf && (
                          <button
                            onClick={() => toggleFollowUser(u.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              following
                                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-red-500/20 hover:text-red-400'
                                : 'bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white shadow-sm hover:brightness-110 active:scale-95'
                            }`}
                          >
                            {following ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Mengikuti</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3" />
                                <span>+ Ikuti</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Global Bottom Banner Slot */}
        <AdBannerSlot variant="leaderboard" />
      </div>
    </div>
  );
};
