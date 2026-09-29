import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import {
  User as UserIcon,
  Star,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  FileText,
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
  Trophy,
  Info,
  Layers,
  Camera,
  Users,
  UserCheck,
  UserPlus,
  Plus,
  X,
  Search,
  Loader2,
  Repeat2,
  CornerDownRight,
  MoreHorizontal,
  Square,
  CheckSquare,
  CheckCheck,
} from 'lucide-react';
import { useApp, GUEST_USER } from '../../context/AppContext';
import { getRoleBadgeStyle } from '../../utils/roleStyles';
import { RoleBadge } from '../Common/RoleBadge';
import { QuickReactionBar } from '../Common/QuickReactionBar';
import { User, UserTab, UserSettings, BuzzReply, BuzzPost } from '../../types';
import { StarRating } from '../Common/StarRating';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { formatRelativeTime, formatFullDateTime } from '../../utils/formatRelativeTime';
import { BuzzImageAttachment } from '../Buzz/BuzzImageAttachment';
import { getUserRankInRole } from '../../utils/leaderboard';
import { SotoyScoreSparkline } from '../Common/SotoyScoreSparkline';

const AdminDashboard = React.lazy(() =>
  import('../Admin/AdminDashboard').then(m => ({ default: m.AdminDashboard }))
);

export const UserPage: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    isWriter,
    isLoggedIn,
    setLoginModalOpen,
    logout,
    ratings,
    buzzList,
    films,
    articles,
    watchlist,
    toggleWatchlist,
    removeBulkFromWatchlist,
    savedArticles,
    toggleSaveArticle,
    removeBulkFromSavedArticles,
    activeUserTab,
    setActiveUserTab,
    userSettings,
    updateUserSettings,
    updateUserProfile,
    addBuzzPost,
    likeBuzzPost,
    toggleRepostBuzzPost,
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

  // Support URL param for user profile /user/:id
  const { id: routeUserId } = useParams<{ id?: string }>();
  const effectiveUserId = routeUserId || viewedUserId;

  useEffect(() => {
    if (routeUserId && routeUserId !== viewedUserId) {
      setViewedUserId(routeUserId);
    }
  }, [routeUserId, viewedUserId, setViewedUserId]);

  // Firestore fetched target profile state
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const targetId = effectiveUserId;
    if (targetId && targetId !== currentUser.id) {
      const localFound = allUsers.find(u => u.id === targetId);
      if (localFound) {
        setFetchedUser(localFound);
      } else {
        setLoadingProfile(true);
        getDoc(doc(db, 'users', targetId))
          .then(snap => {
            if (isMounted) {
              if (snap.exists()) {
                setFetchedUser(snap.data() as User);
              } else {
                setFetchedUser(null);
              }
              setLoadingProfile(false);
            }
          })
          .catch(err => {
            console.warn('[UserPage] Error fetching user doc from Firestore:', err);
            if (isMounted) setLoadingProfile(false);
          });
      }
    } else {
      setFetchedUser(null);
      setLoadingProfile(false);
    }
    return () => {
      isMounted = false;
    };
  }, [effectiveUserId, allUsers, currentUser.id]);

  // Determine which user profile is being visited
  const targetUser: User = (viewedUserId && viewedUserId !== currentUser.id)
    ? (fetchedUser || allUsers.find(u => u.id === viewedUserId) || {
        id: viewedUserId,
        name: 'Pengguna Sotoy',
        handle: `@user_${viewedUserId.slice(0, 5)}`,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        role: 'warga_sotoy',
        roleTitle: 'Warga Sotoy',
        bio: 'Penggemar sinema di komunitas Sotoy Film.',
        totalReviews: 0,
        totalBuzz: 0,
        followers: [],
        following: [],
        followersCount: 0,
        followingCount: 0,
        hasFinishedOnboarding: true,
      })
    : (isLoggedIn ? currentUser : GUEST_USER);

  const isOwnProfile = isLoggedIn && currentUser.id === targetUser.id;

  const rankInfo = React.useMemo(() => {
    if (!targetUser) return null;
    return getUserRankInRole(targetUser, allUsers, ratings);
  }, [targetUser, allUsers, ratings]);

  // Follow Modal State: 'followers' | 'following' | 'discover' | null
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | 'discover' | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [librarySubTab, setLibrarySubTab] = useState<'films' | 'articles'>('films');

  // Real-time follow lists for viewed profile (when not own profile)
  const [viewedFollowersIds, setViewedFollowersIds] = useState<string[]>([]);
  const [viewedFollowingIds, setViewedFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOwnProfile || !targetUser?.id || targetUser.id === 'guest') {
      setViewedFollowersIds([]);
      setViewedFollowingIds([]);
      return;
    }

    const followersQuery = query(
      collection(db, 'follows'),
      where('followingId', '==', targetUser.id)
    );
    const unsubFollowers = onSnapshot(
      followersQuery,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.followerId) ids.push(data.followerId);
        });
        setViewedFollowersIds(ids);
      },
      (err) => {
        console.error('[UserPage] Error subscribing to viewed user followers:', err);
      }
    );

    const followingQuery = query(
      collection(db, 'follows'),
      where('followerId', '==', targetUser.id)
    );
    const unsubFollowing = onSnapshot(
      followingQuery,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.followingId) ids.push(data.followingId);
        });
        setViewedFollowingIds(ids);
      },
      (err) => {
        console.error('[UserPage] Error subscribing to viewed user following:', err);
      }
    );

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [isOwnProfile, targetUser?.id]);

  // Overflow / 'Lainnya' tabs dropdown state
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  // Ensure activeUserTab defaults away from legacy 'community' or 'media' tab
  useEffect(() => {
    if ((activeUserTab as string) === 'community' || (activeUserTab as string) === 'media') {
      setActiveUserTab('buzz');
    }
  }, [activeUserTab, setActiveUserTab]);

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
  const myBuzz = buzzList.filter(
    b => b.author.id === targetUser.id || 
         (targetUser.handle && b.author.handle && b.author.handle.toLowerCase() === targetUser.handle.toLowerCase())
  );
  const myReviews = ratings.filter(
    r => r.userId === targetUser.id || 
         (targetUser.name && r.userName && r.userName.toLowerCase() === targetUser.name.toLowerCase())
  );
  const myArticles = articles.filter(a => a.author.id === targetUser.id || a.author.name === targetUser.name);

  // Derived lists for Replies and Reposts
  const myReplies = React.useMemo(() => {
    const list: { reply: BuzzReply; parentPost: BuzzPost }[] = [];
    buzzList.forEach(post => {
      if (Array.isArray(post.replies)) {
        post.replies.forEach(rep => {
          const isMatch = rep.author?.id === targetUser.id || 
            (targetUser.handle && rep.author?.handle && rep.author.handle.toLowerCase() === targetUser.handle.toLowerCase());
          if (isMatch) {
            list.push({ reply: rep, parentPost: post });
          }
        });
      }
    });
    return list.sort((a, b) => new Date(b.reply.createdAt).getTime() - new Date(a.reply.createdAt).getTime());
  }, [buzzList, targetUser.id, targetUser.handle]);

  const myReposts = React.useMemo(() => {
    return buzzList
      .filter(post => post.repostedByUsers && targetUser.id in post.repostedByUsers)
      .sort((a, b) => {
        const timeA = new Date(a.repostedByUsers?.[targetUser.id] || a.createdAt).getTime();
        const timeB = new Date(b.repostedByUsers?.[targetUser.id] || b.createdAt).getTime();
        return timeB - timeA;
      });
  }, [buzzList, targetUser.id]);

  // Watchlist & saved items perspective:
  // If viewing own profile, use currentUser's state; if viewing another user, use targetUser.watchlist
  const targetWatchlistIds = isOwnProfile
    ? watchlist
    : (targetUser.watchlist && targetUser.watchlist.length > 0
        ? targetUser.watchlist
        : myReviews.map(r => r.filmId));
  const targetSavedArticleIds = isOwnProfile
    ? savedArticles
    : (targetUser.savedArticles || []);

  const myWatchlistFilms = films.filter(f => targetWatchlistIds.includes(f.id));
  const mySavedArticles = articles.filter(a => targetSavedArticleIds.includes(a.id));

  // Bulk Selection States for Watchlist & Saved Articles
  const [selectedFilmIds, setSelectedFilmIds] = useState<string[]>([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [isFilmSelectMode, setIsFilmSelectMode] = useState(false);
  const [isArticleSelectMode, setIsArticleSelectMode] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Clear selections when switching library subtab, active tab, or user
  useEffect(() => {
    setSelectedFilmIds([]);
    setSelectedArticleIds([]);
    setIsFilmSelectMode(false);
    setIsArticleSelectMode(false);
  }, [librarySubTab, activeUserTab, effectiveUserId]);

  const handleToggleFilmSelection = (filmId: string) => {
    setSelectedFilmIds(prev =>
      prev.includes(filmId) ? prev.filter(id => id !== filmId) : [...prev, filmId]
    );
  };

  const handleToggleSelectAllFilms = () => {
    if (selectedFilmIds.length === myWatchlistFilms.length) {
      setSelectedFilmIds([]);
    } else {
      setSelectedFilmIds(myWatchlistFilms.map(f => f.id));
    }
  };

  const handleExecuteBulkDeleteFilms = async () => {
    if (selectedFilmIds.length === 0 || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      await removeBulkFromWatchlist(selectedFilmIds);
      setSelectedFilmIds([]);
      setIsFilmSelectMode(false);
    } catch (err) {
      console.error('Error bulk deleting films:', err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleToggleArticleSelection = (articleId: string) => {
    setSelectedArticleIds(prev =>
      prev.includes(articleId) ? prev.filter(id => id !== articleId) : [...prev, articleId]
    );
  };

  const handleToggleSelectAllArticles = () => {
    if (selectedArticleIds.length === mySavedArticles.length) {
      setSelectedArticleIds([]);
    } else {
      setSelectedArticleIds(mySavedArticles.map(a => a.id));
    }
  };

  const handleExecuteBulkDeleteArticles = async () => {
    if (selectedArticleIds.length === 0 || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      await removeBulkFromSavedArticles(selectedArticleIds);
      setSelectedArticleIds([]);
      setIsArticleSelectMode(false);
    } catch (err) {
      console.error('Error bulk deleting articles:', err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Determine visibility for secondary tabs in overflow menu
  const showArticlesTab = Boolean(targetUser.role === 'penulis_sotoy' || targetUser.role === 'admin' || isWriter || isAdmin || myArticles.length > 0);
  const showAdminTab = isOwnProfile && Boolean(currentUser.role === 'admin' || currentUser.id === 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2' || (currentUser.email === 'eksposurmedia@gmail.com' && auth.currentUser?.emailVerified) || isAdmin);
  const isSecondaryActive = activeUserTab === 'reposts' || activeUserTab === 'articles' || activeUserTab === 'admin';

  // Compute stats for the target user
  const averageScore = myReviews.length > 0
    ? (myReviews.reduce((acc, curr) => acc + curr.score, 0) / myReviews.length).toFixed(1)
    : '-';

  // Target user follower & following counts (derived from real Firestore follows docs)
  const targetFollowersCount = isOwnProfile
    ? followersIds.length
    : viewedFollowersIds.length;
  const targetFollowingCount = isOwnProfile
    ? followingIds.length
    : viewedFollowingIds.length;

  const handlePostDashboardBuzz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuzzContent.trim()) return;
    addBuzzPost(newBuzzContent, newBuzzFilmId || undefined, newBuzzScore);
    setNewBuzzContent('');
    setNewBuzzFilmId('');
    setNewBuzzScore(undefined);
    showToast('Buzz berhasil diposting ke Feed Komunitas!');
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
    const style = getRoleBadgeStyle(targetUser.role);
    return {
      border: style.border,
      badgeBg: style.badge,
      accent: style.color,
      roleName: style.name,
      badgeText: targetUser.role === 'si_paling_sotoy' ? 'Top Critic' : style.name.split(' ').pop() || 'Warga',
    };
  };

  const roleTheme = getRoleTheme();

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Visitor Alert Banner */}
        {!isLoggedIn && (
          <div className="bg-gradient-to-r from-blue-950/60 via-purple-950/50 to-slate-900 border border-[#FF2E7E]/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-[#FF2E7E] flex items-center justify-center shrink-0 border border-cyan-500/30">
                <Eye className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <h4 className="text-white font-bold text-sm flex items-center justify-center sm:justify-start gap-2">
                  <span>Mode Pengunjung (Visitor Mode)</span>
                  <span className="text-[10px] bg-cyan-500/20 text-[#FF2E7E] px-2 py-0.5 rounded-full font-black uppercase">
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
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#FF2E7E]/25 hover:brightness-110 active:scale-95 transition-all shrink-0 flex items-center justify-center gap-2"
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
              <span className="w-2 h-2 rounded-full bg-[#FF2E7E] animate-pulse" />
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
        <div className="bg-[#171A1F] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          {/* Header Banner Background */}
          <div className="h-36 sm:h-44 bg-gradient-to-r from-[#191a32] via-[#2a1b32] to-[#171A1F] relative overflow-hidden">
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
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700/80 hover:border-[#FF2E7E] flex items-center gap-1.5 transition-all shadow-md backdrop-blur-sm"
                title="Bagikan Profil ke Instagram Stories, Feed, atau WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5 text-[#FF2E7E]" />
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
                      : 'bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white hover:brightness-110'
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
                  {(currentUser.role === 'admin' || currentUser.id === 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2' || (currentUser.email === 'eksposurmedia@gmail.com' && auth.currentUser?.emailVerified) || isAdmin) && (
                    <button
                      id="user-header-admin-btn"
                      onClick={() => setActiveUserTab('admin')}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/50 flex items-center gap-1.5 transition-all shadow-md backdrop-blur-sm animate-pulse"
                      title="Buka Dasbor Kontrol Admin"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Dasbor Admin</span>
                      <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.2 rounded font-black">ADMIN</span>
                    </button>
                  )}
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
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-[#171A1F] border-2 border-white/20 shadow-2xl bg-slate-900"
                  />
                  {isOwnProfile && (
                    <button
                      onClick={() => navigateTo('settings', { settingsTab: 'profile' })}
                      className="absolute bottom-1 right-1 p-1.5 bg-[#FF2E7E] text-black font-black rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
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
                    <RoleBadge role={targetUser.role} size="md" />
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
                      className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#FF2E7E]/50 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors group"
                      title="Lihat Pengikut"
                    >
                      <span className="font-black text-[#FF2E7E] group-hover:scale-110 transition-transform">
                        {targetFollowersCount}
                      </span>
                      <span className="text-slate-400 text-[11px]">Pengikut (Followers)</span>
                    </button>

                    <button
                      id="btn-dashboard-following"
                      onClick={() => setFollowModalType('following')}
                      className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#FF2E7E]/50 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors group"
                      title="Lihat Akun yang Diikuti"
                    >
                      <span className="font-black text-[#FF2E7E] group-hover:scale-110 transition-transform">
                        {targetFollowingCount}
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
                  <Settings className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  <span>Pengaturan & Privasi</span>
                </button>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div
                onClick={() => setActiveUserTab('buzz')}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center cursor-pointer hover:border-[#FF2E7E] transition-colors"
              >
                <div className="font-display font-black text-xl text-[#FF2E7E]">
                  {myBuzz.length}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                  Postingan Buzz
                </div>
              </div>

              <div
                onClick={() => setActiveUserTab('reviews')}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center cursor-pointer hover:border-[#FF2E7E] transition-colors"
              >
                <div className="font-display font-black text-xl text-[#FF2E7E]">
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
                onClick={() => setActiveUserTab('reviews')}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center cursor-pointer hover:border-[#FF2E7E] transition-colors"
              >
                <div className="font-display font-black text-xl text-[#FF2E7E]">
                  ★ {averageScore}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                  Rata-rata Skor Diberi
                </div>
              </div>
            </div>

            {/* Leaderboard Rank Widget (Only for Warga & Kritikus) */}
            {rankInfo && (
              <div className="mt-4 bg-[#171A1F] border border-[#FF2E7E]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg relative overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] flex items-center justify-center shrink-0 shadow-md">
                    <Trophy className="w-5 h-5 text-[#FF2E7E]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-[#FF2E7E]">
                        Peringkat #{rankInfo.rank}
                      </span>
                      <span className="text-slate-500 text-[10px]">•</span>
                      <span className="text-xs text-slate-300 font-bold">
                        {targetUser.role === 'si_paling_sotoy' ? 'Leaderboard Kritikus' : 'Leaderboard Warga'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <Flame className="w-3.5 h-3.5 text-[#FF2E7E] fill-[#FF2E7E]" />
                      <span className="font-bold text-white">{rankInfo.score} Poin Leaderboard</span>
                      <span className="text-slate-500 text-[10px]">({rankInfo.totalReviews} ulasan, {rankInfo.helpfulVotes} suka)</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigateTo('panduan-leaderboard')}
                  className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 hover:border-[#FF2E7E] transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Info className="w-3.5 h-3.5 text-[#FF2E7E]" />
                  <span>Lihat Panduan</span>
                </button>
              </div>
            )}

            {/* Monthly Progression Sotoy Score Sparkline Chart */}
            <SotoyScoreSparkline user={targetUser} ratings={ratings} className="mt-4" />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN USER NAVIGATION TABS (PRIMARY + OVERFLOW 'LAINNYA') */}
        {/* ========================================================================= */}
        <div className={`user-profile-tab-wrapper ${moreMenuOpen ? 'dropdown-open' : ''}`}>
          <div
            className={`user-profile-tab-list flex items-stretch gap-2 pb-2 border-b border-slate-800 w-full scrollbar-none flex-nowrap scroll-smooth touch-pan-x ${
              moreMenuOpen ? 'dropdown-open overflow-visible' : 'overflow-x-auto md:overflow-visible'
            }`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* TAB 1: BUZZ (TAB UTAMA DASHBOARD) */}
            <button
              id="user-tab-buzz"
              onClick={() => setActiveUserTab('buzz')}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap active:scale-95 ${
                activeUserTab === 'buzz'
                  ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Buzz ({myBuzz.length})</span>
            </button>

            {/* TAB 2: REPLIES (BALASAN) */}
            <button
              id="user-tab-replies"
              onClick={() => setActiveUserTab('replies')}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap active:scale-95 ${
                activeUserTab === 'replies'
                  ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <CornerDownRight className="w-4 h-4" />
              <span>Replies ({myReplies.length})</span>
            </button>

            {/* TAB 3: SKOR & ULASAN */}
            <button
              id="user-tab-reviews"
              onClick={() => setActiveUserTab('reviews')}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap active:scale-95 ${
                activeUserTab === 'reviews'
                  ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>Skor ({myReviews.length})</span>
            </button>

            {/* TAB 4: WATCHLIST & PERPUSTAKAAN */}
            <button
              id="user-tab-watchlist"
              onClick={() => setActiveUserTab('watchlist')}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap active:scale-95 ${
                activeUserTab === 'watchlist'
                  ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Watchlist ({myWatchlistFilms.length + mySavedArticles.length})</span>
            </button>

            {/* TAB 5: LAINNYA OVERFLOW MENU (REPOSTS, ARTIKEL, ADMIN) */}
            <div className="relative shrink-0 flex items-stretch" ref={moreMenuRef}>
              <button
                id="user-tab-more"
                onClick={() => setMoreMenuOpen(prev => !prev)}
                className={`min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap active:scale-95 ${
                  isSecondaryActive || moreMenuOpen
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
                aria-expanded={moreMenuOpen}
                aria-haspopup="true"
                title="Menu Tab Lainnya"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span>Lainnya</span>
                {isSecondaryActive && (
                  <span className="w-2 h-2 rounded-full bg-white ring-2 ring-[#FF2E7E]" />
                )}
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 sm:w-60 bg-[#171A1F] border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Secondary Tab: Reposts */}
                  <button
                    id="user-tab-reposts"
                    onClick={() => {
                      setActiveUserTab('reposts');
                      setMoreMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors min-h-[40px] cursor-pointer ${
                      activeUserTab === 'reposts'
                        ? 'bg-[#FF2E7E] text-white'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Repeat2 className="w-3.5 h-3.5" />
                      <span>Reposts</span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      activeUserTab === 'reposts' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {myReposts.length}
                    </span>
                  </button>

                  {/* Secondary Tab: Articles (if writer/admin or has articles) */}
                  {showArticlesTab && (
                    <button
                      id="user-tab-articles"
                      onClick={() => {
                        setActiveUserTab('articles');
                        setMoreMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors min-h-[40px] cursor-pointer ${
                        activeUserTab === 'articles'
                          ? 'bg-[#FF2E7E] text-white'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <PenSquare className="w-3.5 h-3.5" />
                        <span>Artikel Ditulis</span>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        activeUserTab === 'articles' ? 'bg-white/20 text-white' : 'bg-pink-500/20 text-pink-300'
                      }`}>
                        {myArticles.length}
                      </span>
                    </button>
                  )}

                  {/* Secondary Tab: Admin Dashboard (when admin) */}
                  {showAdminTab && (
                    <button
                      id="user-tab-admin"
                      onClick={() => {
                        setActiveUserTab('admin');
                        setMoreMenuOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors min-h-[40px] cursor-pointer ${
                        activeUserTab === 'admin'
                          ? 'bg-[#FF2E7E] text-white'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Dasbor Admin</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        activeUserTab === 'admin' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        ADMIN
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: POSTINGAN BUZZ & OPINI SINEMA (TAB UTAMA DASHBOARD) */}
        {/* ========================================================================= */}
        {activeUserTab === 'buzz' && (
          <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5 text-[#FF2E7E]" />
                  <span>{isOwnProfile ? 'Postingan Buzz & Opini Saya' : `Postingan Buzz ${targetUser.name}`}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {isOwnProfile
                    ? 'Arsip thread obrolan, opini film, dan teori sinema yang pernah kamu posting'
                    : `Arsip thread opini, ulasan cepat, dan diskusi sinema yang diposting oleh ${targetUser.name}`}
                </p>
              </div>
              <button
                onClick={() => navigateTo('community-feed')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white font-black text-xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Buka Buzz Feed Komunitas</span>
              </button>
            </div>

            {/* Quick Buzz Composer directly inside Dashboard for own profile */}
            {isOwnProfile && (
              <form
                onSubmit={handlePostDashboardBuzz}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-inner"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-white block">Tulis Buzz & Teori Sinema Baru</span>
                    <span className="text-[11px] text-slate-400">Suarakan opini jujurmu langsung ke feed komunitas</span>
                  </div>
                </div>

                <textarea
                  value={newBuzzContent}
                  onChange={e => setNewBuzzContent(e.target.value)}
                  placeholder={`Film apa yang baru kamu tonton atau ada plot twist yang bikin mikir, ${currentUser.name.split(' ')[0]}?`}
                  rows={3}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Tag film dropdown */}
                    <select
                      value={newBuzzFilmId}
                      onChange={e => setNewBuzzFilmId(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-[#FF2E7E] max-w-[200px]"
                    >
                      <option value="">Tag Film (Opsional)</option>
                      {films.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.title} ({f.year})
                        </option>
                      ))}
                    </select>

                    {/* Optional score */}
                    <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-400 text-xs">
                      <Star className="w-3 h-3 text-[#FF2E7E] fill-current" />
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        placeholder="Skor"
                        value={newBuzzScore !== undefined ? String(newBuzzScore) : ''}
                        onChange={e => setNewBuzzScore(e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="w-12 bg-transparent text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!newBuzzContent.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 self-end sm:self-auto"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Buzz</span>
                  </button>
                </div>
              </form>
            )}

            {myBuzz.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    {isOwnProfile ? 'Belum ada postingan Buzz' : `${targetUser.name} belum memposting Buzz`}
                  </h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    {isOwnProfile
                      ? 'Bagikan pemikiran, teori plot twist, atau impresi film pertama kamu sekarang.'
                      : 'Pengguna ini belum membagikan opini atau diskusi film di komunitas.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {myBuzz.map(buzz => {
                  const authorAvatar = buzz.author?.avatar || targetUser.avatar;
                  const authorName = buzz.author?.name || targetUser.name;

                  return (
                    <div
                      key={buzz.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          onClick={() => navigateTo('user-profile', { userId: buzz.author?.id || targetUser.id })}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <img
                            src={authorAvatar}
                            alt={authorName}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-700 group-hover:ring-[#FF2E7E] transition-all"
                          />
                          <div>
                            <span className="font-bold text-xs text-white block group-hover:text-[#FF2E7E] transition-colors">{authorName}</span>
                            <span className="text-[10px] text-slate-400" title={formatFullDateTime(buzz.createdAt)}>{formatRelativeTime(buzz.createdAt)}</span>
                          </div>
                        </div>
                        {buzz.skorSotoyMention && (
                          <div className="bg-black/60 border border-[#FF2E7E]/40 px-2.5 py-1 rounded-xl text-[#FF2E7E] font-black text-xs flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{buzz.skorSotoyMention.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                        {buzz.content}
                      </p>

                      <BuzzImageAttachment src={buzz.image} alt={`Foto postingan ${buzz.author.name}`} />

                      {buzz.taggedFilm && (
                        <div
                          onClick={() => navigateTo('film-detail', { filmId: buzz.taggedFilm!.id })}
                          className="p-2.5 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between hover:border-slate-700 cursor-pointer"
                        >
                          <span className="text-xs font-bold text-[#FF2E7E]">
                            🎬 {buzz.taggedFilm.title} ({buzz.taggedFilm.year})
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 select-none">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <QuickReactionBar
                            buzzId={buzz.id}
                            reactions={buzz.reactions}
                            myReaction={buzz.myReaction}
                          />
                          <button
                            onClick={() => navigateTo('buzz-detail', { buzzId: buzz.id })}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-opacity hover:opacity-80 active:scale-95 cursor-pointer text-xs shrink-0 py-1"
                          >
                            <MessageSquare className="w-4 h-4 text-current" />
                            <span className="font-medium text-slate-400">{buzz.repliesCount || 0}</span>
                          </button>

                          <button
                            id={`user-page-repost-${buzz.id}`}
                            onClick={() => toggleRepostBuzzPost(buzz.id)}
                            disabled={currentUser?.id === buzz.author?.id}
                            className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 text-xs shrink-0 py-1 cursor-pointer ${
                              currentUser?.id && buzz.repostedByUsers?.[currentUser.id]
                                ? 'text-emerald-400'
                                : currentUser?.id === buzz.author?.id
                                  ? 'text-slate-600 cursor-not-allowed opacity-50'
                                  : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title={
                              currentUser?.id === buzz.author?.id
                                ? 'Kamu tidak bisa me-repost postinganmu sendiri'
                                : currentUser?.id && buzz.repostedByUsers?.[currentUser.id]
                                  ? 'Batalkan Repost'
                                  : 'Repost — akan muncul di feed pengikutmu'
                            }
                          >
                            <Repeat2 className={`w-4 h-4 ${currentUser?.id && buzz.repostedByUsers?.[currentUser.id] ? 'stroke-[2.2]' : ''}`} />
                            <span className={`font-medium ${currentUser?.id && buzz.repostedByUsers?.[currentUser.id] ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {buzz.repostsCount || 0}
                            </span>
                          </button>
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
        {/* TAB 2: REPLIES & BALASAN DISKUSI */}
        {/* ========================================================================= */}
        {activeUserTab === 'replies' && (
          <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <CornerDownRight className="w-5 h-5 text-[#FF2E7E]" />
                  <span>{isOwnProfile ? 'Balasan & Komentar Saya' : `Balasan Diskusi ${targetUser.name}`}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {isOwnProfile
                    ? 'Semua tanggapan dan partisipasi kamu di thread buzz komunitas'
                    : `Semua tanggapan dan opini yang dibagikan ${targetUser.name} di thread komunitas`}
                </p>
              </div>
              <button
                onClick={() => navigateTo('community-feed')}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#FF2E7E]" />
                <span>Jelajahi Buzz Feed</span>
              </button>
            </div>

            {myReplies.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                <CornerDownRight className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    {isOwnProfile ? 'Belum ada balasan' : `${targetUser.name} belum membalas buzz apapun`}
                  </h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    {isOwnProfile
                      ? 'Ikuti diskusi seru di komunitas dan berikan tanggapanmu terhadap opini film lainnya.'
                      : 'Pengguna ini belum memberikan komentar atau tanggapan di diskusi manapun.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {myReplies.map(({ reply, parentPost }) => {
                  const replyAuthorAvatar = reply.author?.avatar || targetUser.avatar;
                  const replyAuthorName = reply.author?.name || targetUser.name;
                  const replyAuthorRole = reply.author?.role || targetUser.role;

                  return (
                    <div
                      key={reply.id}
                      onClick={() => navigateTo('buzz-detail', { buzzId: parentPost.id })}
                      className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 space-y-3.5 transition-all cursor-pointer group"
                    >
                      {/* Context badge: Replying to ... */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pb-2.5 border-b border-slate-800/60">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CornerDownRight className="w-3.5 h-3.5 text-[#FF2E7E] shrink-0" />
                          <span>
                            {reply.replyToUser ? (
                              <>
                                Membalas <span className="font-bold text-slate-200">@{reply.replyToUser.handle?.replace('@', '') || reply.replyToUser.name}</span>
                              </>
                            ) : (
                              <>
                                Membalas postingan <span className="font-bold text-slate-200">{parentPost.author?.name || 'Pengguna'}</span>
                              </>
                            )}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500" title={formatFullDateTime(reply.createdAt)}>
                          {formatRelativeTime(reply.createdAt)}
                        </span>
                      </div>

                      {/* Parent post snippet */}
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 line-clamp-2">
                        <span className="font-bold text-slate-300 block mb-0.5">
                          {parentPost.author?.name}:
                        </span>
                        <span className="text-slate-400 italic">
                          "{parentPost.content.length > 140 ? parentPost.content.slice(0, 140) + '...' : parentPost.content}"
                        </span>
                      </div>

                      {/* User's Reply Content */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={replyAuthorAvatar}
                            alt={replyAuthorName}
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700"
                          />
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{replyAuthorName}</span>
                            <RoleBadge role={replyAuthorRole} size="sm" />
                          </div>
                        </div>

                        <p className="text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line pl-1">
                          {reply.content}
                        </p>
                      </div>

                      {/* Reply Footer: Likes count and View thread button */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                          <Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-500" />
                          <span>{reply.likes || 0} Suka</span>
                        </div>

                        <span className="text-slate-400 group-hover:text-[#FF2E7E] transition-colors flex items-center gap-1 font-semibold text-xs">
                          <span>Lihat di Utas Lengkap</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REPOSTS */}
        {/* ========================================================================= */}
        {activeUserTab === 'reposts' && (
          <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <Repeat2 className="w-5 h-5 text-emerald-400" />
                  <span>{isOwnProfile ? 'Postingan yang Saya Repost' : `Repost ${targetUser.name}`}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {isOwnProfile
                    ? 'Arsip semua buzz menarik dari kurator lain yang kamu bagikan ulang ke profilmu'
                    : `Postingan buzz dari komunitas yang di-repost oleh ${targetUser.name}`}
                </p>
              </div>
              <button
                onClick={() => navigateTo('community-feed')}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Jelajahi Buzz Feed</span>
              </button>
            </div>

            {myReposts.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                <Repeat2 className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    {isOwnProfile ? 'Belum ada postingan yang di-repost' : `${targetUser.name} belum me-repost apapun`}
                  </h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    {isOwnProfile
                      ? 'Temukan opini film atau teori menarik di Buzz Feed dan tekan tombol Repost untuk membagikannya di sini.'
                      : 'Pengguna ini belum me-repost opini atau diskusi buzz dari kurator lain.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {myReposts.map(buzz => {
                  const authorAvatar = buzz.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
                  const authorName = buzz.author?.name || 'Pengguna Sotoy';

                  return (
                    <div
                      key={`repost-${buzz.id}`}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors"
                    >
                      {/* Repost Header Indicator */}
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 font-bold mb-1 pl-0.5">
                        <Repeat2 className="w-3.5 h-3.5" />
                        <span>Direpost oleh {isOwnProfile ? 'kamu' : targetUser.name}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div
                          onClick={() => navigateTo('user-profile', { userId: buzz.author?.id || targetUser.id })}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <img
                            src={authorAvatar}
                            alt={authorName}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-700 group-hover:ring-[#FF2E7E] transition-all"
                          />
                          <div>
                            <span className="font-bold text-xs text-white block group-hover:text-[#FF2E7E] transition-colors">{authorName}</span>
                            <span className="text-[10px] text-slate-400" title={formatFullDateTime(buzz.createdAt)}>{formatRelativeTime(buzz.createdAt)}</span>
                          </div>
                        </div>
                        {buzz.skorSotoyMention && (
                          <div className="bg-black/60 border border-[#FF2E7E]/40 px-2.5 py-1 rounded-xl text-[#FF2E7E] font-black text-xs flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{buzz.skorSotoyMention.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                        {buzz.content}
                      </p>

                      <BuzzImageAttachment src={buzz.image} alt={`Foto postingan ${buzz.author?.name}`} />

                      {buzz.taggedFilm && (
                        <div
                          onClick={() => navigateTo('film-detail', { filmId: buzz.taggedFilm!.id })}
                          className="p-2.5 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between hover:border-slate-700 cursor-pointer"
                        >
                          <span className="text-xs font-bold text-[#FF2E7E]">
                            🎬 {buzz.taggedFilm.title} ({buzz.taggedFilm.year})
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400 select-none">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <QuickReactionBar
                            buzzId={buzz.id}
                            reactions={buzz.reactions}
                            myReaction={buzz.myReaction}
                          />
                          <button
                            onClick={() => navigateTo('buzz-detail', { buzzId: buzz.id })}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-opacity hover:opacity-80 active:scale-95 cursor-pointer text-xs shrink-0 py-1"
                          >
                            <MessageSquare className="w-4 h-4 text-current" />
                            <span className="font-medium text-slate-400">{buzz.repliesCount || 0}</span>
                          </button>

                          <button
                            id={`repost-tab-action-${buzz.id}`}
                            onClick={() => toggleRepostBuzzPost(buzz.id)}
                            disabled={currentUser?.id === buzz.author?.id}
                            className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 text-xs shrink-0 py-1 cursor-pointer ${
                              currentUser?.id && buzz.repostedByUsers?.[currentUser.id]
                                ? 'text-emerald-400'
                                : currentUser?.id === buzz.author?.id
                                  ? 'text-slate-600 cursor-not-allowed opacity-50'
                                  : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title={
                              currentUser?.id === buzz.author?.id
                                ? 'Kamu tidak bisa me-repost postinganmu sendiri'
                                : currentUser?.id && buzz.repostedByUsers?.[currentUser.id]
                                  ? 'Batalkan Repost'
                                  : 'Repost — akan muncul di feed pengikutmu'
                            }
                          >
                            <Repeat2 className={`w-4 h-4 ${currentUser?.id && buzz.repostedByUsers?.[currentUser.id] ? 'stroke-[2.2]' : ''}`} />
                            <span className={`font-medium ${currentUser?.id && buzz.repostedByUsers?.[currentUser.id] ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {buzz.repostsCount || 0}
                            </span>
                          </button>
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
        {/* TAB 2: PERPUSTAKAAN SAYA (LIBRARY - FILMS & ARTICLES) */}
        {/* ========================================================================= */}
        {activeUserTab === 'watchlist' && (
          <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <Bookmark className="w-5 h-5 text-emerald-400" />
                  <span>
                    {isOwnProfile ? 'Perpustakaan & Bookmark' : `Watchlist & Koleksi ${targetUser.name}`} ({myWatchlistFilms.length + mySavedArticles.length})
                  </span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {isOwnProfile
                    ? 'Koleksi film tontonan dan artikel favorit yang kamu simpan untuk dibaca dan dirujuk kapan saja.'
                    : `Koleksi film pilihan dan artikel yang disimpan oleh ${targetUser.name}.`}
                </p>
              </div>

              {/* Sub-tab switcher & Manage button */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
                  <button
                    id="library-subtab-films"
                    onClick={() => setLibrarySubTab('films')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      librarySubTab === 'films'
                        ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Film Tersimpan ({myWatchlistFilms.length})</span>
                  </button>
                  <button
                    id="library-subtab-articles"
                    onClick={() => setLibrarySubTab('articles')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      librarySubTab === 'articles'
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-[#FF2E7E] border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Artikel Tersimpan ({mySavedArticles.length})</span>
                  </button>
                </div>

                {isOwnProfile && librarySubTab === 'films' && myWatchlistFilms.length > 0 && (
                  <button
                    id="toggle-manage-watchlist-btn"
                    onClick={() => {
                      setIsFilmSelectMode(prev => !prev);
                      if (isFilmSelectMode) setSelectedFilmIds([]);
                    }}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-sm ${
                      isFilmSelectMode || selectedFilmIds.length > 0
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20 font-black'
                        : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                    }`}
                    title={isFilmSelectMode ? 'Matikan Mode Kelola' : 'Aktifkan Mode Kelola Pilihan'}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{isFilmSelectMode || selectedFilmIds.length > 0 ? 'Mode Kelola Aktif' : 'Pilih Banyak'}</span>
                  </button>
                )}

                {isOwnProfile && librarySubTab === 'articles' && mySavedArticles.length > 0 && (
                  <button
                    id="toggle-manage-saved-articles-btn"
                    onClick={() => {
                      setIsArticleSelectMode(prev => !prev);
                      if (isArticleSelectMode) setSelectedArticleIds([]);
                    }}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-sm ${
                      isArticleSelectMode || selectedArticleIds.length > 0
                        ? 'bg-[#FF2E7E] text-slate-950 border-pink-400 shadow-[#FF2E7E]/20 font-black'
                        : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                    }`}
                    title={isArticleSelectMode ? 'Matikan Mode Kelola' : 'Aktifkan Mode Kelola Pilihan'}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{isArticleSelectMode || selectedArticleIds.length > 0 ? 'Mode Kelola Aktif' : 'Pilih Banyak'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* FILMS SUB-TAB CONTENT */}
            {librarySubTab === 'films' && (
              myWatchlistFilms.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                  <Film className="w-12 h-12 text-slate-600 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-white text-base">
                      {isOwnProfile ? 'Belum Ada Film Tersimpan' : `${targetUser.name} Belum Menyimpan Film`}
                    </h4>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto">
                      {isOwnProfile
                        ? 'Jelajahi Database Film atau Rekomendasi Film untuk menemukan tontonan menarik dan klik "+ Simpan ke Library".'
                        : 'Pengguna ini belum menambahkan film apa pun ke daftar tontonan mereka.'}
                    </p>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => navigateTo('film-database')}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all"
                    >
                      Jelajahi Database Film
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Film Bulk Action Toolbar */}
                  {isOwnProfile && (isFilmSelectMode || selectedFilmIds.length > 0) && (
                    <div className="bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleToggleSelectAllFilms}
                          className="flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 hover:bg-slate-700 transition-all"
                        >
                          {selectedFilmIds.length === myWatchlistFilms.length && myWatchlistFilms.length > 0 ? (
                            <>
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                              <span>Batal Pilih Semua</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-4 h-4 text-slate-400" />
                              <span>Pilih Semua ({myWatchlistFilms.length})</span>
                            </>
                          )}
                        </button>
                        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/40">
                            {selectedFilmIds.length}
                          </span>
                          <span>dari {myWatchlistFilms.length} film dipilih</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <button
                          disabled={selectedFilmIds.length === 0 || isBulkDeleting}
                          onClick={handleExecuteBulkDeleteFilms}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                            selectedFilmIds.length === 0 || isBulkDeleting
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/25 active:scale-95'
                          }`}
                        >
                          {isBulkDeleting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Menghapus...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus Terpilih ({selectedFilmIds.length})</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsFilmSelectMode(false);
                            setSelectedFilmIds([]);
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center gap-1"
                          title="Tutup Mode Kelola"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Selesai</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {myWatchlistFilms.map(film => {
                      const isSelected = selectedFilmIds.includes(film.id);
                      return (
                        <div
                          key={film.id}
                          id={`watchlist-card-${film.id}`}
                          onClick={isFilmSelectMode ? () => handleToggleFilmSelection(film.id) : undefined}
                          className={`bg-slate-900/90 border rounded-2xl overflow-hidden transition-all flex flex-col group shadow-lg ${
                            isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-slate-900 shadow-emerald-500/10 cursor-pointer'
                              : isFilmSelectMode
                              ? 'border-slate-800 hover:border-slate-700 cursor-pointer'
                              : 'border-slate-800 hover:border-emerald-500/50'
                          }`}
                        >
                          <div className="aspect-video w-full overflow-hidden relative bg-slate-800">
                            <img
                              src={film.backdrop || film.poster}
                              alt={film.title}
                              className={`w-full h-full object-cover transition-transform duration-500 ${
                                isSelected ? 'scale-105 brightness-95' : 'group-hover:scale-105'
                              }`}
                            />

                            {/* Checkbox for selection */}
                            {isOwnProfile && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!isFilmSelectMode) setIsFilmSelectMode(true);
                                  handleToggleFilmSelection(film.id);
                                }}
                                className={`absolute top-2 left-2 z-20 p-1.5 rounded-lg backdrop-blur-md transition-all ${
                                  isSelected
                                    ? 'bg-emerald-500 text-slate-950 shadow-lg scale-105'
                                    : isFilmSelectMode
                                    ? 'bg-black/80 hover:bg-black text-slate-300 border border-slate-700'
                                    : 'bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/20 opacity-0 group-hover:opacity-100'
                                }`}
                                title={isSelected ? 'Batalkan Pilihan' : 'Pilih Film'}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-slate-950 stroke-[3]" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            <div
                              className={`absolute top-2 bg-black/80 px-2 py-0.5 rounded text-[11px] font-bold text-[#FF2E7E] border border-[#FF2E7E]/40 flex items-center gap-1 transition-all z-10 ${
                                isOwnProfile && (isFilmSelectMode || isSelected)
                                  ? 'left-11'
                                  : isOwnProfile
                                  ? 'left-2 group-hover:left-11'
                                  : 'left-2'
                              }`}
                            >
                              <Star className="w-3 h-3 fill-current" />
                              <span>{film.skorSotoy.toFixed(1)}</span>
                            </div>

                            {isOwnProfile ? (
                              !isFilmSelectMode && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleWatchlist(film.id);
                                  }}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white shadow transition-all"
                                  title="Hapus dari Library"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            ) : (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleWatchlist(film.id);
                                }}
                                className={`absolute top-2 right-2 p-1.5 rounded-lg shadow transition-colors ${
                                  watchlist.includes(film.id)
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-black/70 hover:bg-emerald-600 text-white'
                                }`}
                                title={watchlist.includes(film.id) ? 'Tersimpan di Watchlist Saya' : 'Simpan ke Watchlist Saya'}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${watchlist.includes(film.id) ? 'fill-current' : ''}`} />
                              </button>
                            )}
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
                                <Tv className="w-3 h-3 text-[#FF2E7E]" />
                                <span>{film.whereToWatch[0]?.platform || 'Bioskop'}</span>
                              </div>
                              <button
                                onClick={e => {
                                  if (isFilmSelectMode) {
                                    e.stopPropagation();
                                  }
                                  navigateTo('film-detail', { filmId: film.id });
                                }}
                                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                              >
                                <span>Buka Detail Film</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}

            {/* ARTICLES SUB-TAB CONTENT */}
            {librarySubTab === 'articles' && (
              mySavedArticles.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-white text-base">
                      {isOwnProfile ? 'Belum Ada Artikel Tersimpan' : `${targetUser.name} Belum Menyimpan Artikel`}
                    </h4>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto">
                      {isOwnProfile
                        ? 'Jelajahi ulasan & artikel editorial menarik, lalu klik "+ Simpan ke Library" untuk membacanya nanti.'
                        : 'Pengguna ini belum menyimpan artikel editorial apa pun.'}
                    </p>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => navigateTo('home')}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all"
                    >
                      Jelajahi Beranda Artikel
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Article Bulk Action Toolbar */}
                  {isOwnProfile && (isArticleSelectMode || selectedArticleIds.length > 0) && (
                    <div className="bg-slate-900/95 border border-[#FF2E7E]/40 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleToggleSelectAllArticles}
                          className="flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 hover:bg-slate-700 transition-all"
                        >
                          {selectedArticleIds.length === mySavedArticles.length && mySavedArticles.length > 0 ? (
                            <>
                              <CheckSquare className="w-4 h-4 text-[#FF2E7E]" />
                              <span>Batal Pilih Semua</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-4 h-4 text-slate-400" />
                              <span>Pilih Semua ({mySavedArticles.length})</span>
                            </>
                          )}
                        </button>
                        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#FF2E7E]/20 text-[#FF2E7E] font-mono font-bold text-xs border border-[#FF2E7E]/40">
                            {selectedArticleIds.length}
                          </span>
                          <span>dari {mySavedArticles.length} artikel dipilih</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <button
                          disabled={selectedArticleIds.length === 0 || isBulkDeleting}
                          onClick={handleExecuteBulkDeleteArticles}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                            selectedArticleIds.length === 0 || isBulkDeleting
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/25 active:scale-95'
                          }`}
                        >
                          {isBulkDeleting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Menghapus...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus Terpilih ({selectedArticleIds.length})</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsArticleSelectMode(false);
                            setSelectedArticleIds([]);
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center gap-1"
                          title="Tutup Mode Kelola"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Selesai</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {mySavedArticles.map(article => {
                      const isSelected = selectedArticleIds.includes(article.id);
                      return (
                        <div
                          key={article.id}
                          id={`saved-article-card-${article.id}`}
                          onClick={isArticleSelectMode ? () => handleToggleArticleSelection(article.id) : undefined}
                          className={`bg-slate-900/90 border rounded-2xl overflow-hidden transition-all flex flex-col group shadow-lg ${
                            isSelected
                              ? 'border-[#FF2E7E] ring-2 ring-[#FF2E7E]/40 bg-slate-900 shadow-[#FF2E7E]/10 cursor-pointer'
                              : isArticleSelectMode
                              ? 'border-slate-800 hover:border-slate-700 cursor-pointer'
                              : 'border-slate-800 hover:border-cyan-500/50'
                          }`}
                        >
                          <div className="aspect-video w-full overflow-hidden relative bg-slate-800">
                            <img
                              src={article.coverImage}
                              alt={article.title}
                              className={`w-full h-full object-cover transition-transform duration-500 ${
                                isSelected ? 'scale-105 brightness-95' : 'group-hover:scale-105'
                              }`}
                            />

                            {/* Checkbox for selection */}
                            {isOwnProfile && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!isArticleSelectMode) setIsArticleSelectMode(true);
                                  handleToggleArticleSelection(article.id);
                                }}
                                className={`absolute top-2 left-2 z-20 p-1.5 rounded-lg backdrop-blur-md transition-all ${
                                  isSelected
                                    ? 'bg-[#FF2E7E] text-slate-950 shadow-lg scale-105'
                                    : isArticleSelectMode
                                    ? 'bg-black/80 hover:bg-black text-slate-300 border border-slate-700'
                                    : 'bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/20 opacity-0 group-hover:opacity-100'
                                }`}
                                title={isSelected ? 'Batalkan Pilihan' : 'Pilih Artikel'}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-slate-950 stroke-[3]" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            <div
                              className={`absolute top-2 bg-black/80 px-2.5 py-1 rounded text-[10px] font-bold text-[#FF2E7E] uppercase border border-[#FF2E7E]/30 transition-all z-10 ${
                                isOwnProfile && (isArticleSelectMode || isSelected)
                                  ? 'left-11'
                                  : isOwnProfile
                                  ? 'left-2 group-hover:left-11'
                                  : 'left-2'
                              }`}
                            >
                              {article.category}
                            </div>

                            {isOwnProfile ? (
                              !isArticleSelectMode && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleSaveArticle(article.id);
                                  }}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white shadow transition-all"
                                  title="Hapus dari Library"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            ) : (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleSaveArticle(article.id);
                                }}
                                className={`absolute top-2 right-2 p-1.5 rounded-lg shadow transition-colors ${
                                  savedArticles.includes(article.id)
                                    ? 'bg-[#FF2E7E] text-slate-950'
                                    : 'bg-black/70 hover:bg-[#FF2E7E] hover:text-slate-950 text-white'
                                }`}
                                title={savedArticles.includes(article.id) ? 'Tersimpan di Baca Nanti' : 'Simpan ke Baca Nanti'}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${savedArticles.includes(article.id) ? 'fill-current' : ''}`} />
                              </button>
                            )}
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1.5">
                                <span className="text-[#FF2E7E] font-bold">{article.author.name}</span>
                                <span>•</span>
                                <span>{article.readTime}</span>
                              </div>
                              <h4 className="font-display font-black text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-2 leading-snug">
                                {article.title}
                              </h4>
                              <p className="text-slate-400 text-xs line-clamp-2 mt-1.5">
                                {article.excerpt}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                              <span className="text-[10px] text-slate-500">{article.publishedAt}</span>
                              <button
                                onClick={e => {
                                  if (isArticleSelectMode) {
                                    e.stopPropagation();
                                  }
                                  navigateTo('article-detail', { articleId: article.id });
                                }}
                                className="text-xs font-bold text-[#FF2E7E] hover:underline flex items-center gap-1"
                              >
                                <span>Baca Artikel</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SKOR & ULASAN SAYA */}
        {/* ========================================================================= */}
        {activeUserTab === 'reviews' && (
          <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <Star className="w-5 h-5 text-[#FF2E7E] fill-current" />
                  <span>{isOwnProfile ? 'Kumpulan Ulasan & Skor Sotoy Saya' : `Ulasan & Skor Sinema ${targetUser.name}`}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {isOwnProfile
                    ? 'Arsip semua film yang sudah kamu tonton dan nilai dengan skor jujur'
                    : `Arsip semua film yang sudah ditonton dan dinilai oleh ${targetUser.name}`}
                </p>
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => navigateTo('film-database')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-slate-950 font-black text-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Nilai Film Lainnya</span>
                </button>
              )}
            </div>

            {myReviews.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                <Star className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    {isOwnProfile ? 'Kamu belum menulis ulasan' : `${targetUser.name} belum menulis ulasan`}
                  </h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    {isOwnProfile
                      ? 'Kunjungi halaman detail film favoritmu dan klik tombol "Beri Skor Sotoy" untuk meninggalkan ulasan pertamamu.'
                      : 'Pengguna ini belum mempublikasikan skor atau ulasan film apa pun.'}
                  </p>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => navigateTo('film-database')}
                    className="px-5 py-2.5 rounded-xl bg-[#FF2E7E] text-slate-950 font-black text-xs"
                  >
                    Beri Nilai Film Pertama
                  </button>
                )}
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
                              className="font-display font-black text-sm text-white hover:text-[#FF2E7E] cursor-pointer"
                            >
                              {targetFilm ? targetFilm.title : 'Film Terkait'}
                            </h4>
                            <span className="text-[11px] text-slate-400" title={formatFullDateTime(rev.createdAt)}>
                              Diulas {formatRelativeTime(rev.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="bg-black/60 border border-[#FF2E7E]/40 px-3 py-1.5 rounded-xl text-[#FF2E7E] font-black text-sm flex items-center gap-1.5 self-start sm:self-auto">
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
                            <Share2 className="w-3 h-3 text-[#FF2E7E]" />
                            <span>Bagikan</span>
                          </button>

                          {targetFilm && (
                            <button
                              onClick={() => navigateTo('film-detail', { filmId: targetFilm.id })}
                              className="text-[#FF2E7E] hover:underline flex items-center gap-1 font-bold"
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
        {/* TAB: ARTIKEL EDITORIAL DITERBITKAN */}
        {/* ========================================================================= */}
        {activeUserTab === 'articles' && (
          <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
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
                    className="px-3.5 py-1.5 bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white text-xs font-black rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
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
                      <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm text-[10px] uppercase font-black text-[#FF2E7E] px-2.5 py-0.5 rounded-md border border-[#FF2E7E]/30">
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
                        <span className="text-[#FF2E7E] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
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
        {/* ADMIN DASHBOARD (KHUSUS ADMIN USER VIEW) */}
        {/* ========================================================================= */}
        {activeUserTab === 'admin' && (isOwnProfile && (currentUser.role === 'admin' || currentUser.id === 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2' || (currentUser.email === 'eksposurmedia@gmail.com' && auth.currentUser?.emailVerified) || isAdmin)) && (
          <div className="pt-2">
            <React.Suspense fallback={
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#FF2E7E] animate-spin" />
                <p className="text-xs text-slate-400 font-bold">Memuat Dasbor Admin...</p>
              </div>
            }>
              <AdminDashboard />
            </React.Suspense>
          </div>
        )}



        {/* ========================================================================= */}
        {/* FOLLOWERS / FOLLOWING / DISCOVER INTERACTIVE MODAL */}
        {/* ========================================================================= */}
        {followModalType !== null && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#171A1F] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg text-white">
                      {followModalType === 'followers' && (isOwnProfile ? `Pengikut Kamu (${followersIds.length})` : `Pengikut ${targetUser.name} (${targetFollowersCount})`)}
                      {followModalType === 'following' && (isOwnProfile ? `Sedang Kamu Ikuti (${followingIds.length})` : `Diikuti oleh ${targetUser.name} (${targetFollowingCount})`)}
                      {followModalType === 'discover' && 'Temukan Cinephile Baru'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {followModalType === 'followers' && (isOwnProfile ? 'Daftar penonton & kurator yang mengikuti akunmu' : `Daftar penonton yang mengikuti ${targetUser.name}`)}
                      {followModalType === 'following' && (isOwnProfile ? 'Daftar kurator yang postingannya muncul di feed kamu' : `Daftar kurator yang diikuti oleh ${targetUser.name}`)}
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
              </div>

              {/* Users List inside modal */}
              <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1">
                {(() => {
                  let targetList: User[] = [];
                  if (followModalType === 'followers') {
                    const ids = isOwnProfile ? followersIds : viewedFollowersIds;
                    targetList = ids
                      .map(id => allUsers.find(u => u.id === id))
                      .filter((u): u is User => Boolean(u));
                  } else if (followModalType === 'following') {
                    const ids = isOwnProfile ? followingIds : viewedFollowingIds;
                    targetList = ids
                      .map(id => allUsers.find(u => u.id === id))
                      .filter((u): u is User => Boolean(u));
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
                              <span className="text-[#FF2E7E]">{u.roleTitle}</span>
                            </div>
                          </div>
                        </div>

                        {!isSelf && (
                          <button
                            onClick={() => toggleFollowUser(u.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              following
                                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-red-500/20 hover:text-red-400'
                                : 'bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white shadow-sm hover:brightness-110 active:scale-95'
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
