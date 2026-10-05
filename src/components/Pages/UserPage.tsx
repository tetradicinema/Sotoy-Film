import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Globe,
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
  Square,
  CheckSquare,
  CheckCheck,
} from 'lucide-react';
import { useApp, GUEST_USER } from '../../context/AppContext';
import { INITIAL_FILMS, INITIAL_ARTICLES, DEFAULT_AVATAR, DEFAULT_POSTER, DEFAULT_COVER } from '../../data/mockData';
import { getRoleBadgeStyle } from '../../utils/roleStyles';
import { RoleBadge } from '../Common/RoleBadge';
import { QuickReactionBar } from '../Common/QuickReactionBar';
import { User, UserTab, UserSettings, BuzzReply, BuzzPost, UserCollection, FilmItem, Article, UserRating } from '../../types';
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
    getRatingsForUser,
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
    editBuzzPost,
    deleteBuzzPost,
    editBuzzReply,
    deleteBuzzReply,
    updateFilmRating,
    deleteFilmRating,
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
    collections,
    createCollection,
    deleteCollection,
    shareCollectionToBuzz,
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
    if (targetId && targetId !== currentUser.id && targetId !== 'guest') {
      const localFound = allUsers.find(u => u.id === targetId);
      if (localFound) {
        setFetchedUser(localFound);
      } else {
        setLoadingProfile(true);
      }
      getDoc(doc(db, 'users', targetId))
        .then(snap => {
          if (isMounted) {
            if (snap.exists()) {
              setFetchedUser(snap.data() as User);
            } else if (!localFound) {
              setFetchedUser(null);
            }
            setLoadingProfile(false);
          }
        })
        .catch(err => {
          console.warn('[UserPage] Error fetching user doc from Firestore:', err);
          if (isMounted) setLoadingProfile(false);
        });
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

  // Local state to store ratings for the viewed user profile
  const [targetUserRatings, setTargetUserRatings] = useState<UserRating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (!targetUser?.id || targetUser.id === 'guest') {
      setTargetUserRatings([]);
      setLoadingRatings(false);
      return;
    }

    if (isOwnProfile) {
      setTargetUserRatings(ratings);
      setLoadingRatings(false);
      return;
    }

    setLoadingRatings(true);
    getRatingsForUser(targetUser.id)
      .then(fetched => {
        if (isMounted) {
          setTargetUserRatings(fetched || []);
          setLoadingRatings(false);
        }
      })
      .catch(err => {
        console.warn('[UserPage] Failed to fetch ratings for target user:', err);
        if (isMounted) {
          setTargetUserRatings([]);
          setLoadingRatings(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [targetUser?.id, isOwnProfile, ratings, getRatingsForUser]);

  const rankInfo = React.useMemo(() => {
    if (!targetUser) return null;
    const list = isOwnProfile ? ratings : targetUserRatings;
    return getUserRankInRole(targetUser, allUsers, list);
  }, [targetUser, allUsers, isOwnProfile, ratings, targetUserRatings]);

  // Follow Modal State: 'followers' | 'following' | 'discover' | null
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | 'discover' | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [librarySubTab, setLibrarySubTab] = useState<'films' | 'articles' | 'collections'>('films');
  const [isCreatingInTab, setIsCreatingInTab] = useState(false);
  const [tabNewCollectionName, setTabNewCollectionName] = useState('');
  const [tabNewCollectionDesc, setTabNewCollectionDesc] = useState('');
  const [tabNewCollectionIsPublic, setTabNewCollectionIsPublic] = useState(true);

  // Inline editing state for Buzz, Replies, and Ratings
  const [editingBuzzId, setEditingBuzzId] = useState<string | null>(null);
  const [editingBuzzContent, setEditingBuzzContent] = useState<string>('');
  const [editingBuzzScore, setEditingBuzzScore] = useState<number | undefined>(undefined);

  const [editingReplyKey, setEditingReplyKey] = useState<string | null>(null);
  const [editingReplyContent, setEditingReplyContent] = useState<string>('');

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingReviewScore, setEditingReviewScore] = useState<number>(10);
  const [editingReviewHeadline, setEditingReviewHeadline] = useState<string>('');
  const [editingReviewText, setEditingReviewText] = useState<string>('');

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

  // Real-time public collections for viewed profile (when not own profile)
  const [viewedUserCollections, setViewedUserCollections] = useState<UserCollection[]>([]);

  useEffect(() => {
    if (isOwnProfile || !targetUser?.id || targetUser.id === 'guest') {
      setViewedUserCollections([]);
      return;
    }

    let isMounted = true;
    const collectionsQuery = query(
      collection(db, 'users', targetUser.id, 'collections'),
      where('isPublic', '==', true)
    );
    const unsub = onSnapshot(
      collectionsQuery,
      (snap) => {
        if (!isMounted) return;
        const list: UserCollection[] = [];
        snap.forEach(docSnap => {
          list.push(docSnap.data() as UserCollection);
        });
        setViewedUserCollections(list);
      },
      (err) => {
        console.warn('[UserPage] Error loading public collections for user:', err.message);
        if (isMounted) setViewedUserCollections([]);
      }
    );

    return () => {
      isMounted = false;
      unsub();
    };
  }, [isOwnProfile, targetUser?.id]);

  // Profile Tab List horizontal scroll edge detection & auto-scroll
  const tabListRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollEdges = useCallback(() => {
    const el = tabListRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  // Auto-scroll active tab into view when activeUserTab changes (deep links or click)
  useEffect(() => {
    const tabIdMap: Record<string, string> = {
      buzz: 'user-tab-buzz',
      replies: 'user-tab-replies',
      reviews: 'user-tab-reviews',
      watchlist: 'user-tab-watchlist',
      reposts: 'user-tab-reposts',
      articles: 'user-tab-articles',
      admin: 'user-tab-admin',
    };
    const targetId = tabIdMap[activeUserTab] || `user-tab-${activeUserTab}`;
    const activeEl = document.getElementById(targetId);
    if (activeEl) {
      activeEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
    checkScrollEdges();
  }, [activeUserTab, checkScrollEdges]);

  // Attach scroll & resize listeners for tab list edge hints
  useEffect(() => {
    const el = tabListRef.current;
    if (!el) return;

    checkScrollEdges();
    el.addEventListener('scroll', checkScrollEdges, { passive: true });
    window.addEventListener('resize', checkScrollEdges);

    return () => {
      el.removeEventListener('scroll', checkScrollEdges);
      window.removeEventListener('resize', checkScrollEdges);
    };
  }, [checkScrollEdges]);

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
  const myReviews = useMemo(() => {
    const list = isOwnProfile ? ratings : targetUserRatings;
    return list.filter(
      r => r.userId === targetUser.id || 
           (targetUser.name && r.userName && r.userName.toLowerCase() === targetUser.name.toLowerCase())
    );
  }, [isOwnProfile, ratings, targetUserRatings, targetUser.id, targetUser.name]);
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

  // Collections-based Watchlist & saved items perspective:
  // If isOwnProfile: all collections from AppContext (includes private)
  // If not own profile: viewedUserCollections filtered by isPublic !== false
  const profileCollections: UserCollection[] = isOwnProfile
    ? collections
    : viewedUserCollections.filter(c => c.isPublic !== false);

  // Extract all unique film IDs across these collections (deduplicated)
  const collectionFilmIds = useMemo(() => {
    const ids = new Set<string>();
    profileCollections.forEach(col => {
      col.items?.forEach(item => {
        if (item.itemType === 'film' && item.itemId) {
          ids.add(item.itemId);
        }
      });
    });
    return Array.from(ids);
  }, [profileCollections]);

  // Extract all unique article IDs across these collections (deduplicated)
  const collectionArticleIds = useMemo(() => {
    const ids = new Set<string>();
    profileCollections.forEach(col => {
      col.items?.forEach(item => {
        if (item.itemType === 'article' && item.itemId) {
          ids.add(item.itemId);
        }
      });
    });
    return Array.from(ids);
  }, [profileCollections]);

  const myWatchlistFilms = useMemo(() => {
    return collectionFilmIds
      .map(id => films.find(f => f.id === id) || INITIAL_FILMS.find(f => f.id === id))
      .filter((f): f is FilmItem => Boolean(f));
  }, [collectionFilmIds, films]);

  const mySavedArticles = useMemo(() => {
    return collectionArticleIds
      .map(id => articles.find(a => a.id === id) || INITIAL_ARTICLES.find(a => a.id === id))
      .filter((a): a is Article => Boolean(a));
  }, [collectionArticleIds, articles]);

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

  // Determine visibility for conditional tabs (Articles & Admin Dashboard)
  const showArticlesTab = Boolean(targetUser.role === 'penulis_sotoy' || targetUser.role === 'admin' || isWriter || isAdmin || myArticles.length > 0);
  const showAdminTab = isOwnProfile && Boolean(currentUser.role === 'admin' || currentUser.id === 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2' || (currentUser.email === 'eksposurmedia@gmail.com' && auth.currentUser?.emailVerified) || isAdmin);

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

  const handleShareCollectionToBuzz = (collectionId: string) => {
    shareCollectionToBuzz(collectionId);
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
    <div className="min-h-screen bg-[#0A0A0E] text-white py-4 sm:py-6">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-2 pb-12 space-y-6">
        
        {/* Visitor Alert Banner */}
        {!isLoggedIn && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-[#FF2E7E] flex items-center justify-center shrink-0 border border-slate-700">
                <Eye className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <h4 className="text-white font-bold text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-2">
                  <span>Mode Pengunjung (Visitor Mode)</span>
                  <span className="text-[10px] bg-slate-800 text-[#FF2E7E] px-2 py-0.5 rounded-full font-black uppercase border border-slate-700">
                    Publik
                  </span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Kamu sedang melihat profil publik <strong>{targetUser.name}</strong> ({targetUser.roleTitle}). Masuk untuk memberi Skor Sotoy, ikut berdiskusi di Buzz, dan saling follow!
                </p>
              </div>
            </div>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#FF2E7E]/25 hover:brightness-110 active:scale-95 transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk / Buat Akun</span>
            </button>
          </div>
        )}

        {/* Visiting Another User's Profile Banner (for logged in users) */}
        {isLoggedIn && !isOwnProfile && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#FF2E7E] animate-pulse" />
              <span>
                Sedang mengunjungi profil publik milik <strong className="text-white">{targetUser.name}</strong> ({targetUser.handle})
              </span>
            </div>
            <button
              onClick={() => navigateTo('user-profile', { userId: currentUser.id })}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>← Kembali ke Profil Saya</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROFILE DOSSIER HEADER (CLEAN ZINE STYLE) */}
        {/* ========================================================================= */}
        <header className="flex flex-col gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {/* Avatar & Identifiers */}
            <div className="flex items-start gap-4 sm:gap-5 min-w-0 flex-1">
              <div className="relative shrink-0">
                <img
                  src={targetUser.avatar?.trim() || DEFAULT_AVATAR}
                  alt={targetUser.name}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover p-[2px] bg-slate-900 border border-slate-700 shadow-xl"
                />
                {isOwnProfile && (
                  <button
                    onClick={() => navigateTo('settings', { settingsTab: 'profile' })}
                    className="absolute bottom-0 right-0 p-1.5 bg-[#FF2E7E] text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    title="Ganti Foto Profil"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-col pt-0.5 space-y-1.5 min-w-0 flex-1">
                {/* Name & Role Badge */}
                <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                  <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight leading-none">
                    {targetUser.name}
                  </h1>
                  <RoleBadge role={targetUser.role} size="md" />
                </div>

                {/* Handle / Username Only */}
                <div className="text-xs sm:text-sm font-mono text-slate-400">
                  {targetUser.handle}
                </div>

                {/* Linear Telemetric Row (Directly below username) */}
                <div className="pt-1 flex flex-wrap items-center gap-x-2 text-xs sm:text-sm text-slate-400">
                  <button
                    onClick={() => setFollowModalType('following')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    <strong className="font-bold text-white">{targetFollowingCount}</strong> mengikuti
                  </button>
                  <span className="opacity-40">·</span>
                  <button
                    onClick={() => setFollowModalType('followers')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    <strong className="font-bold text-white">{targetFollowersCount}</strong> pengikut
                  </button>
                  <span className="opacity-40">·</span>
                  <span>
                    <strong className="font-bold text-white">{myBuzz.length}</strong> buzz
                  </span>
                  <span className="opacity-40">·</span>
                  <span>
                    <strong className="font-bold text-white">{myReviews.length}</strong> film diulas
                  </span>

                  {isOwnProfile && (
                    <>
                      <span className="opacity-40">·</span>
                      <button
                        onClick={() => setFollowModalType('discover')}
                        className="inline-flex items-center justify-center p-1 rounded-md bg-[#FF2E7E]/15 hover:bg-[#FF2E7E]/25 text-[#FF2E7E] transition-all cursor-pointer"
                        title="Cari Teman"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex items-center gap-2 sm:self-start pt-1 flex-wrap shrink-0">
              {!isOwnProfile ? (
                <>
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
                    className={`px-5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                      isLoggedIn && isFollowing(targetUser.id)
                        ? 'bg-slate-800 text-slate-200 hover:bg-red-500/20 hover:text-red-400 border border-slate-700'
                        : 'bg-[#FF2E7E] text-white hover:brightness-110 shadow-lg shadow-[#FF2E7E]/25'
                    }`}
                  >
                    {isLoggedIn && isFollowing(targetUser.id) ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Mengikuti</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>+ Ikuti</span>
                      </>
                    )}
                  </button>

                  <button
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
                    className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#FF2E7E]" />
                    <span>Bagikan</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigateTo('settings')}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#FF2E7E]" />
                    <span>Pengaturan</span>
                  </button>

                  {showAdminTab && (
                    <button
                      onClick={() => setActiveUserTab('admin')}
                      className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin</span>
                    </button>
                  )}

                  <button
                    onClick={logout}
                    className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bio / Statement */}
          {Boolean(targetUser.bio) && (
            <div className="mt-1">
              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed max-w-[680px]">
                {targetUser.bio}
              </p>
            </div>
          )}
        </header>

        {/* ========================================================================= */}
        {/* ZINE NAVIGATION TABS */}
        {/* ========================================================================= */}
        <nav className="relative flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none pt-1 bg-[#0A0A0E] z-10 border-b border-slate-800/80">
          {[
            { id: 'buzz', label: 'Buzz', count: myBuzz.length },
            { id: 'replies', label: 'Replies', count: myReplies.length },
            { id: 'reviews', label: 'Reviews', count: myReviews.length },
            { id: 'watchlist', label: 'Watchlist', count: myWatchlistFilms.length + mySavedArticles.length },
            { id: 'reposts', label: 'Reposts', count: myReposts.length },
            ...(showArticlesTab ? [{ id: 'articles', label: 'Editorial', count: myArticles.length }] : []),
          ].map(tab => {
            const isActive = activeUserTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`user-tab-${tab.id}`}
                onClick={() => setActiveUserTab(tab.id as UserTab)}
                className={`profile-tab relative py-3 text-xs sm:text-sm font-bold transition-colors shrink-0 cursor-pointer ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-[#FF2E7E] text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </span>
                <span className={`tab-indicator absolute bottom-0 left-0 right-0 h-[2px] transition-all ${
                  isActive ? 'bg-[#FF2E7E]' : 'bg-transparent'
                }`} />
              </button>
            );
          })}
        </nav>

        {/* ========================================================================= */}
        {/* TAB 1: POSTINGAN BUZZ & OPINI SINEMA (TAB UTAMA DASHBOARD) */}
        {/* ========================================================================= */}
        {activeUserTab === 'buzz' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5 text-[#FF2E7E]" />
                  <span>{isOwnProfile ? 'Postingan Buzz & Opini Saya' : `Postingan Buzz ${targetUser.name}`}</span>
                </h3>
                <p className="text-neutral-400 text-xs mt-1">
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
                className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3.5"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={currentUser.avatar?.trim() || DEFAULT_AVATAR}
                    alt={currentUser.name}
                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-neutral-700"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-white block">Tulis Buzz & Teori Sinema Baru</span>
                    <span className="text-[11px] text-neutral-400">Suarakan opini jujurmu langsung ke feed komunitas</span>
                  </div>
                </div>

                <textarea
                  value={newBuzzContent}
                  onChange={e => setNewBuzzContent(e.target.value)}
                  placeholder={`Film apa yang baru kamu tonton atau ada plot twist yang bikin mikir, ${currentUser.name.split(' ')[0]}?`}
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF2E7E] resize-none leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Tag film dropdown */}
                    <select
                      value={newBuzzFilmId}
                      onChange={e => setNewBuzzFilmId(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-[11px] text-neutral-300 focus:outline-none focus:border-[#FF2E7E] max-w-[200px]"
                    >
                      <option value="">Tag Film (Opsional)</option>
                      {films.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.title} ({f.year})
                        </option>
                      ))}
                    </select>

                    {/* Optional score */}
                    <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-neutral-400 text-xs">
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
              <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-4">
                <MessageSquare className="w-12 h-12 text-neutral-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    {isOwnProfile ? 'Belum ada postingan Buzz' : `${targetUser.name} belum memposting Buzz`}
                  </h4>
                  <p className="text-neutral-400 text-xs max-w-sm mx-auto">
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
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3 hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          onClick={() => navigateTo('user-profile', { userId: buzz.author?.id || targetUser.id })}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <img
                            src={authorAvatar?.trim() || DEFAULT_AVATAR}
                            alt={authorName}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-neutral-700 group-hover:ring-[#FF2E7E] transition-all"
                          />
                          <div>
                            <span className="font-bold text-xs text-white block group-hover:text-[#FF2E7E] transition-colors">{authorName}</span>
                            <span className="text-[10px] text-neutral-400" title={formatFullDateTime(buzz.createdAt)}>{formatRelativeTime(buzz.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {buzz.skorSotoyMention && (
                            <div className="bg-black/60 border border-[#FF2E7E]/40 px-2.5 py-1 rounded-xl text-[#FF2E7E] font-black text-xs flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{buzz.skorSotoyMention.toFixed(1)}</span>
                            </div>
                          )}

                          {(isOwnProfile || currentUser.id === buzz.author?.id || isAdmin) && (
                            <div className="flex items-center gap-1 border-l border-neutral-800 pl-2">
                              <button
                                onClick={() => {
                                  setEditingBuzzId(buzz.id);
                                  setEditingBuzzContent(buzz.content);
                                  setEditingBuzzScore(buzz.skorSotoyMention);
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                title="Edit Buzz"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Yakin ingin menghapus Buzz ini?')) {
                                    deleteBuzzPost(buzz.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                                title="Hapus Buzz"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingBuzzId === buzz.id ? (
                        <div className="space-y-3 bg-neutral-950 p-3.5 rounded-xl border border-[#FF2E7E]/40">
                          <textarea
                            value={editingBuzzContent}
                            onChange={e => setEditingBuzzContent(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#FF2E7E] resize-none"
                            rows={3}
                          />
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1">
                              <Star className="w-3 h-3 text-[#FF2E7E] fill-current" />
                              <input
                                type="number"
                                min="1"
                                max="10"
                                step="0.1"
                                placeholder="Skor"
                                value={editingBuzzScore !== undefined ? String(editingBuzzScore) : ''}
                                onChange={e => setEditingBuzzScore(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-12 bg-transparent text-white text-xs focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingBuzzId(null)}
                                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold"
                              >
                                Batal
                              </button>
                              <button
                                onClick={async () => {
                                  const ok = await editBuzzPost(buzz.id, editingBuzzContent, editingBuzzScore);
                                  if (ok) setEditingBuzzId(null);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-neutral-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                          {buzz.content}
                        </p>
                      )}

                      <BuzzImageAttachment src={buzz.image} alt={`Foto postingan ${buzz.author.name}`} />

                      {buzz.taggedFilm && (
                        <div
                          onClick={() => navigateTo('film-detail', { filmId: buzz.taggedFilm!.id })}
                          className="p-2.5 rounded-xl bg-black/40 border border-neutral-800 flex items-center justify-between hover:border-neutral-700 cursor-pointer"
                        >
                          <span className="text-xs font-bold text-[#FF2E7E]">
                            🎬 {buzz.taggedFilm.title} ({buzz.taggedFilm.year})
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                        </div>
                      )}

                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-3 text-xs text-neutral-400 select-none">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <QuickReactionBar
                            buzzId={buzz.id}
                            reactions={buzz.reactions}
                            myReaction={buzz.myReaction}
                          />
                          <button
                            onClick={() => navigateTo('buzz-detail', { buzzId: buzz.id })}
                            className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200 transition-opacity hover:opacity-80 active:scale-95 cursor-pointer text-xs shrink-0 py-1"
                          >
                            <MessageSquare className="w-4 h-4 text-current" />
                            <span className="font-medium text-neutral-400">{buzz.repliesCount || 0}</span>
                          </button>

                          <button
                            id={`user-page-repost-${buzz.id}`}
                            onClick={() => toggleRepostBuzzPost(buzz.id)}
                            disabled={currentUser?.id === buzz.author?.id}
                            className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 text-xs shrink-0 py-1 cursor-pointer ${
                              currentUser?.id && buzz.repostedByUsers?.[currentUser.id]
                                ? 'text-emerald-400'
                                : currentUser?.id === buzz.author?.id
                                  ? 'text-neutral-600 cursor-not-allowed opacity-50'
                                  : 'text-neutral-400 hover:text-neutral-200'
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
                            <span className={`font-medium ${currentUser?.id && buzz.repostedByUsers?.[currentUser.id] ? 'text-emerald-400' : 'text-neutral-400'}`}>
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
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <CornerDownRight className="w-5 h-5 text-[#FF2E7E]" />
                  <span>{isOwnProfile ? 'Balasan & Komentar Saya' : `Balasan Diskusi ${targetUser.name}`}</span>
                </h3>
                <p className="text-neutral-400 text-xs mt-1">
                  {isOwnProfile
                    ? 'Semua tanggapan dan partisipasi kamu di thread buzz komunitas'
                    : `Semua tanggapan dan opini yang dibagikan ${targetUser.name} di thread komunitas`}
                </p>
              </div>
              <button
                onClick={() => navigateTo('community-feed')}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#FF2E7E]" />
                <span>Jelajahi Buzz Feed</span>
              </button>
            </div>

            {myReplies.length === 0 ? (
              <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-4">
                <CornerDownRight className="w-12 h-12 text-neutral-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    {isOwnProfile ? 'Belum ada balasan' : `${targetUser.name} belum membalas buzz apapun`}
                  </h4>
                  <p className="text-neutral-400 text-xs max-w-sm mx-auto">
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
                      className="bg-neutral-900 border border-neutral-800 hover:border-[#FF2E7E]/40 rounded-2xl p-5 space-y-3.5 transition-all cursor-pointer group"
                    >
                      {/* Context badge: Replying to ... */}
                      <div className="flex items-center justify-between text-xs text-neutral-400 pb-2.5 border-b border-neutral-800">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CornerDownRight className="w-3.5 h-3.5 text-[#FF2E7E] shrink-0" />
                          <span>
                            {reply.replyToUser ? (
                              <>
                                Membalas <span className="font-bold text-neutral-200">@{reply.replyToUser.handle?.replace('@', '') || reply.replyToUser.name}</span>
                              </>
                            ) : (
                              <>
                                Membalas postingan <span className="font-bold text-neutral-200">{parentPost.author?.name || 'Pengguna'}</span>
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-neutral-500" title={formatFullDateTime(reply.createdAt)}>
                            {formatRelativeTime(reply.createdAt)}
                          </span>

                          {(isOwnProfile || currentUser.id === reply.author?.id || isAdmin) && (
                            <div className="flex items-center gap-1 border-l border-neutral-800 pl-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setEditingReplyKey(`${parentPost.id}_${reply.id}`);
                                  setEditingReplyContent(reply.content);
                                }}
                                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                title="Edit Balasan"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Yakin ingin menghapus balasan ini?')) {
                                    deleteBuzzReply(parentPost.id, reply.id);
                                  }
                                }}
                                className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                                title="Hapus Balasan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Parent post snippet */}
                      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-400 line-clamp-2">
                        <span className="font-bold text-neutral-300 block mb-0.5">
                          {parentPost.author?.name}:
                        </span>
                        <span className="text-neutral-400 italic">
                          "{parentPost.content.length > 140 ? parentPost.content.slice(0, 140) + '...' : parentPost.content}"
                        </span>
                      </div>

                      {/* User's Reply Content */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={replyAuthorAvatar?.trim() || DEFAULT_AVATAR}
                            alt={replyAuthorName}
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-neutral-700"
                          />
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{replyAuthorName}</span>
                            <RoleBadge role={replyAuthorRole} size="sm" />
                          </div>
                        </div>

                        {editingReplyKey === `${parentPost.id}_${reply.id}` ? (
                          <div className="space-y-3 bg-neutral-950 p-3.5 rounded-xl border border-[#FF2E7E]/40" onClick={e => e.stopPropagation()}>
                            <textarea
                              value={editingReplyContent}
                              onChange={e => setEditingReplyContent(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#FF2E7E] resize-none"
                              rows={2}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingReplyKey(null)}
                                className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold"
                              >
                                Batal
                              </button>
                              <button
                                onClick={async () => {
                                  const ok = await editBuzzReply(parentPost.id, reply.id, editingReplyContent);
                                  if (ok) setEditingReplyKey(null);
                                }}
                                className="px-3 py-1 rounded-lg bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-neutral-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line pl-1">
                            {reply.content}
                          </p>
                        )}
                      </div>

                      {/* Reply Footer: Likes count and View thread button */}
                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                        <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                          <Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-500" />
                          <span>{reply.likes || 0} Suka</span>
                        </div>

                        <span className="text-neutral-400 group-hover:text-[#FF2E7E] transition-colors flex items-center gap-1 font-semibold text-xs">
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
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <Repeat2 className="w-5 h-5 text-emerald-400" />
                  <span>{isOwnProfile ? 'Postingan yang Saya Repost' : `Repost ${targetUser.name}`}</span>
                </h3>
                <p className="text-neutral-400 text-xs mt-1">
                  {isOwnProfile
                    ? 'Arsip semua buzz menarik dari kurator lain yang kamu bagikan ulang ke profilmu'
                    : `Postingan buzz dari komunitas yang di-repost oleh ${targetUser.name}`}
                </p>
              </div>
              <button
                onClick={() => navigateTo('community-feed')}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Jelajahi Buzz Feed</span>
              </button>
            </div>

            {myReposts.length === 0 ? (
              <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-4">
                <Repeat2 className="w-12 h-12 text-neutral-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    {isOwnProfile ? 'Belum ada postingan yang di-repost' : `${targetUser.name} belum me-repost apapun`}
                  </h4>
                  <p className="text-neutral-400 text-xs max-w-sm mx-auto">
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
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3 hover:border-neutral-700 transition-colors"
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
                            src={authorAvatar?.trim() || DEFAULT_AVATAR}
                            alt={authorName}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-neutral-700 group-hover:ring-[#FF2E7E] transition-all"
                          />
                          <div>
                            <span className="font-bold text-xs text-white block group-hover:text-[#FF2E7E] transition-colors">{authorName}</span>
                            <span className="text-[10px] text-neutral-400" title={formatFullDateTime(buzz.createdAt)}>{formatRelativeTime(buzz.createdAt)}</span>
                          </div>
                        </div>
                        {buzz.skorSotoyMention && (
                          <div className="bg-black/60 border border-[#FF2E7E]/40 px-2.5 py-1 rounded-xl text-[#FF2E7E] font-black text-xs flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{buzz.skorSotoyMention.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-neutral-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                        {buzz.content}
                      </p>

                      <BuzzImageAttachment src={buzz.image} alt={`Foto postingan ${buzz.author?.name}`} />

                      {buzz.taggedFilm && (
                        <div
                          onClick={() => navigateTo('film-detail', { filmId: buzz.taggedFilm!.id })}
                          className="p-2.5 rounded-xl bg-black/40 border border-neutral-800 flex items-center justify-between hover:border-neutral-700 cursor-pointer"
                        >
                          <span className="text-xs font-bold text-[#FF2E7E]">
                            🎬 {buzz.taggedFilm.title} ({buzz.taggedFilm.year})
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                        </div>
                      )}

                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-3 text-xs text-neutral-400 select-none">
                        <div className="flex items-center gap-4 sm:gap-6">
                          <QuickReactionBar
                            buzzId={buzz.id}
                            reactions={buzz.reactions}
                            myReaction={buzz.myReaction}
                          />
                          <button
                            onClick={() => navigateTo('buzz-detail', { buzzId: buzz.id })}
                            className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200 transition-opacity hover:opacity-80 active:scale-95 cursor-pointer text-xs shrink-0 py-1"
                          >
                            <MessageSquare className="w-4 h-4 text-current" />
                            <span className="font-medium text-neutral-400">{buzz.repliesCount || 0}</span>
                          </button>

                          <button
                            id={`repost-tab-action-${buzz.id}`}
                            onClick={() => toggleRepostBuzzPost(buzz.id)}
                            disabled={currentUser?.id === buzz.author?.id}
                            className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 text-xs shrink-0 py-1 cursor-pointer ${
                              currentUser?.id && buzz.repostedByUsers?.[currentUser.id]
                                ? 'text-emerald-400'
                                : currentUser?.id === buzz.author?.id
                                  ? 'text-neutral-600 cursor-not-allowed opacity-50'
                                  : 'text-neutral-400 hover:text-neutral-200'
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
                            <span className={`font-medium ${currentUser?.id && buzz.repostedByUsers?.[currentUser.id] ? 'text-emerald-400' : 'text-neutral-400'}`}>
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
        {/* TAB 2: PERPUSTAKAAN & WATCHLIST (COLLECTIONS, FILMS & ARTICLES) */}
        {/* ========================================================================= */}
        {activeUserTab === 'watchlist' && (
          <div className="bg-[#171A1F] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <Bookmark className="w-5 h-5 text-[#FF2E7E]" />
                  <span>
                    {isOwnProfile ? 'Watchlist & Koleksi Saya' : `Watchlist & Koleksi ${targetUser.name}`}
                  </span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {isOwnProfile
                    ? 'Daftar tontonan film, artikel tersimpan, dan playlist koleksi pribadimu.'
                    : `Daftar film dan koleksi publik yang dibagikan oleh ${targetUser.name}.`}
                </p>
              </div>
            </div>

            {/* Sub-Tabs: Film, Artikel, Koleksi + Bulk action controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-850">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                <button
                  id="watchlist-subtab-films"
                  onClick={() => setLibrarySubTab('films')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    librarySubTab === 'films'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Film ({myWatchlistFilms.length})</span>
                </button>

                <button
                  id="watchlist-subtab-articles"
                  onClick={() => setLibrarySubTab('articles')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    librarySubTab === 'articles'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Artikel ({mySavedArticles.length})</span>
                </button>

                <button
                  id="watchlist-subtab-collections"
                  onClick={() => setLibrarySubTab('collections')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    librarySubTab === 'collections'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Koleksi ({profileCollections.length})</span>
                </button>
              </div>

              {/* Bulk Actions for Films (when on films tab & is own profile) */}
              {isOwnProfile && librarySubTab === 'films' && myWatchlistFilms.length > 0 && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {!isFilmSelectMode ? (
                    <button
                      id="watchlist-select-mode-btn"
                      onClick={() => setIsFilmSelectMode(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[#FF2E7E]" />
                      <span>Mode Pilih</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleSelectAllFilms}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition-colors"
                      >
                        {selectedFilmIds.length === myWatchlistFilms.length ? 'Batal Semua' : 'Pilih Semua'}
                      </button>
                      <button
                        onClick={handleExecuteBulkDeleteFilms}
                        disabled={selectedFilmIds.length === 0 || isBulkDeleting}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-bold transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus ({selectedFilmIds.length})</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsFilmSelectMode(false);
                          setSelectedFilmIds([]);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-400 hover:text-white"
                      >
                        Selesai
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bulk Actions for Articles (when on articles tab & is own profile) */}
              {isOwnProfile && librarySubTab === 'articles' && mySavedArticles.length > 0 && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {!isArticleSelectMode ? (
                    <button
                      onClick={() => setIsArticleSelectMode(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[#FF2E7E]" />
                      <span>Mode Pilih</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleSelectAllArticles}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition-colors"
                      >
                        {selectedArticleIds.length === mySavedArticles.length ? 'Batal Semua' : 'Pilih Semua'}
                      </button>
                      <button
                        onClick={handleExecuteBulkDeleteArticles}
                        disabled={selectedArticleIds.length === 0 || isBulkDeleting}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-bold transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus ({selectedArticleIds.length})</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsArticleSelectMode(false);
                          setSelectedArticleIds([]);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-400 hover:text-white"
                      >
                        Selesai
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TAB CONTENT: FILMS */}
            {librarySubTab === 'films' && (
              myWatchlistFilms.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-4 max-w-md mx-auto p-6">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mx-auto border border-slate-700/50">
                    <Bookmark className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-white text-base">
                      {isOwnProfile ? 'Watchlist Film Masih Kosong' : `${targetUser.name} belum memiliki film di watchlist publik`}
                    </h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {isOwnProfile
                        ? 'Simpan film dari database ke dalam koleksi atau watchlist untuk ditonton nanti.'
                        : 'Belum ada film yang dibagikan dalam koleksi publik pengguna ini.'}
                    </p>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => navigateTo('film-database')}
                      className="px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#E0246F] text-white font-bold text-xs transition-colors shadow-md shadow-[#FF2E7E]/20"
                    >
                      Jelajahi Database Film
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {myWatchlistFilms.map(film => {
                    const isSelected = selectedFilmIds.includes(film.id);

                    return (
                      <div
                        key={film.id}
                        id={`watchlist-film-card-${film.id}`}
                        onClick={() => {
                          if (isFilmSelectMode) {
                            handleToggleFilmSelection(film.id);
                          } else {
                            navigateTo('film-detail', { filmId: film.id });
                          }
                        }}
                        className={`bg-[#171A1F] border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col group shadow-lg cursor-pointer ${
                          isSelected
                            ? 'border-[#FF2E7E] ring-2 ring-[#FF2E7E]/40'
                            : 'border-white/10 hover:border-[#FF2E7E]/60 hover:-translate-y-1'
                        }`}
                      >
                        {/* Poster */}
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0E1013]">
                          {film.poster?.trim() ? (
                            <img
                              src={film.poster.trim()}
                              alt={film.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                              <Film className="w-10 h-10" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#171A1F] via-transparent to-transparent opacity-80" />

                          {/* Skor Sotoy Badge */}
                          <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-[#FFD000]/30 text-[#FFD000] text-[10px] font-black flex items-center gap-1 shadow-md">
                            <Star className="w-3 h-3 fill-current text-[#FFD000]" />
                            <span>{film.criticsSkorSotoy ? film.criticsSkorSotoy.toFixed(1) : film.skorSotoy.toFixed(1)}</span>
                          </div>

                          {/* Selection Checkbox or Remove Button */}
                          {isFilmSelectMode ? (
                            <div className="absolute top-2 right-2">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/40'
                                    : 'bg-black/70 text-slate-400 border border-white/20'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          ) : (
                            isOwnProfile && (
                              <button
                                type="button"
                                title="Hapus dari Watchlist"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await removeBulkFromWatchlist([film.id]);
                                }}
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/70 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}

                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-slate-300">
                            <span className="bg-slate-900/90 px-1.5 py-0.5 rounded uppercase text-[9px]">
                              {film.type}
                            </span>
                            <span>{film.year}</span>
                          </div>
                        </div>

                        {/* Info Body */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-display font-bold text-xs text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-1 mb-0.5">
                              {film.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 line-clamp-1">
                              {film.director}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* TAB CONTENT: ARTICLES */}
            {librarySubTab === 'articles' && (
              mySavedArticles.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-4 max-w-md mx-auto p-6">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mx-auto border border-slate-700/50">
                    <BookOpen className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-white text-base">
                      {isOwnProfile ? 'Belum Ada Artikel Tersimpan' : `${targetUser.name} belum menyimpan artikel publik`}
                    </h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {isOwnProfile
                        ? 'Simpan artikel analisis, wawancara, dan berita film favoritmu ke perpustakaan.'
                        : 'Tidak ada artikel yang tersimpan dalam koleksi publik pengguna ini.'}
                    </p>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => navigateTo('category')}
                      className="px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#E0246F] text-white font-bold text-xs transition-colors shadow-md shadow-[#FF2E7E]/20"
                    >
                      Jelajahi Editorial
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mySavedArticles.map(article => {
                    const isSelected = selectedArticleIds.includes(article.id);

                    return (
                      <div
                        key={article.id}
                        id={`saved-article-card-${article.id}`}
                        onClick={() => {
                          if (isArticleSelectMode) {
                            handleToggleArticleSelection(article.id);
                          } else {
                            navigateTo('article-detail', { articleId: article.id });
                          }
                        }}
                        className={`bg-[#171A1F] border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col group shadow-lg cursor-pointer ${
                          isSelected
                            ? 'border-[#FF2E7E] ring-2 ring-[#FF2E7E]/40'
                            : 'border-white/10 hover:border-[#FF2E7E]/60 hover:-translate-y-0.5'
                        }`}
                      >
                        {/* Cover Image */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0E1013]">
                          {article.coverImage?.trim() ? (
                            <img
                              src={article.coverImage.trim()}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                              <FileText className="w-10 h-10" />
                            </div>
                          )}
                          <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-[#FF2E7E] border border-[#FF2E7E]/30 uppercase">
                            {article.category}
                          </div>

                          {isArticleSelectMode ? (
                            <div className="absolute top-2.5 right-2.5">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/40'
                                    : 'bg-black/70 text-slate-400 border border-white/20'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          ) : (
                            isOwnProfile && (
                              <button
                                type="button"
                                title="Hapus dari Artikel Tersimpan"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await removeBulkFromSavedArticles([article.id]);
                                }}
                                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-black/70 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                          <h4 className="font-display font-bold text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-2">
                            {article.title}
                          </h4>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                            <span>{article.author.name}</span>
                            <span>{formatRelativeTime(article.publishedAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* TAB CONTENT: COLLECTIONS */}
            {librarySubTab === 'collections' && (
              !isOwnProfile && profileCollections.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-4 max-w-md mx-auto p-6">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mx-auto border border-slate-700/50">
                    <Layers className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-white text-base">
                      Belum Ada Koleksi Publik
                    </h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {targetUser.name} belum membagikan playlist atau koleksi publik apa pun.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* "+ Buat Koleksi Baru" Card for Owner */}
                  {isOwnProfile && (
                    <div className="bg-slate-900/60 hover:bg-slate-900 border border-dashed border-slate-800 hover:border-[#FF2E7E]/50 rounded-2xl p-5 flex flex-col justify-between min-h-[260px] transition-all group">
                      {!isCreatingInTab ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center cursor-pointer py-8" onClick={() => setIsCreatingInTab(true)}>
                          <div className="w-12 h-12 bg-[#FF2E7E]/10 group-hover:bg-[#FF2E7E]/20 rounded-full flex items-center justify-center text-[#FF2E7E] transition-all mb-3 border border-[#FF2E7E]/20">
                            <Plus className="w-6 h-6" />
                          </div>
                          <h4 className="font-display font-bold text-sm text-white group-hover:text-[#FF2E7E] transition-colors">
                            Buat Koleksi Baru
                          </h4>
                          <p className="text-slate-400 text-[11px] mt-1 max-w-[180px]">
                            Buat playlist baru dan campur film dengan artikel sesukamu.
                          </p>
                        </div>
                      ) : (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!tabNewCollectionName.trim()) {
                              showToast('Nama koleksi wajib diisi.', 'error');
                              return;
                            }
                            const colId = await createCollection(tabNewCollectionName, tabNewCollectionDesc, tabNewCollectionIsPublic);
                            if (colId) {
                              setTabNewCollectionName('');
                              setTabNewCollectionDesc('');
                              setTabNewCollectionIsPublic(true);
                              setIsCreatingInTab(false);
                            }
                          }}
                          className="space-y-3 flex-1 flex flex-col justify-between"
                        >
                          <div className="space-y-2.5">
                            <h4 className="font-display font-bold text-xs text-slate-300 uppercase tracking-wider">
                              Buat Koleksi Baru
                            </h4>
                            <input
                              type="text"
                              placeholder="Nama koleksi (cth: Sci-Fi Favorit)..."
                              value={tabNewCollectionName}
                              onChange={e => setTabNewCollectionName(e.target.value)}
                              maxLength={40}
                              className="w-full px-3 py-1.5 text-xs bg-slate-850 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FF2E7E]"
                              autoFocus
                            />
                            <textarea
                              placeholder="Deskripsi singkat (opsional)..."
                              value={tabNewCollectionDesc}
                              onChange={e => setTabNewCollectionDesc(e.target.value)}
                              maxLength={100}
                              rows={2}
                              className="w-full px-3 py-1.5 text-xs bg-slate-850 border border-slate-800 rounded-xl text-white resize-none focus:outline-none focus:border-[#FF2E7E]"
                            />

                            {/* Public/Private Toggle Switch matching SettingsPage */}
                            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                  {tabNewCollectionIsPublic ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                                  <span>{tabNewCollectionIsPublic ? 'Koleksi Publik' : 'Koleksi Privat'}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {tabNewCollectionIsPublic ? 'Dapat dilihat publik di profil' : 'Hanya kamu yang dapat melihat'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTabNewCollectionIsPublic(prev => !prev)}
                                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                                  tabNewCollectionIsPublic ? 'bg-emerald-500' : 'bg-slate-800'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full bg-black transition-transform ${
                                    tabNewCollectionIsPublic ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end text-[11px] pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingInTab(false);
                                setTabNewCollectionName('');
                                setTabNewCollectionDesc('');
                                setTabNewCollectionIsPublic(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-lg bg-[#FF2E7E] hover:bg-[#E0246F] text-white font-bold transition-colors"
                            >
                              Simpan
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Collections List */}
                  {profileCollections.map((col) => {
                    const imageUrls: string[] = [];
                    col.items.slice(0, 4).forEach((item) => {
                      if (item.itemType === 'film') {
                        const f = films.find(x => x.id === item.itemId) || INITIAL_FILMS.find(x => x.id === item.itemId);
                        if (f?.poster?.trim()) imageUrls.push(f.poster.trim());
                      } else {
                        const a = articles.find(x => x.id === item.itemId) || INITIAL_ARTICLES.find(x => x.id === item.itemId);
                        if (a?.coverImage?.trim()) imageUrls.push(a.coverImage.trim());
                      }
                    });

                    return (
                      <div
                        key={col.id}
                        id={`collection-card-${col.id}`}
                        className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-all flex flex-col group shadow-lg min-h-[260px] cursor-pointer"
                        onClick={() => navigateTo('collection-detail', { userId: targetUser.id, collectionId: col.id })}
                      >
                        {/* Collage Cover preview */}
                        <div className="relative aspect-[16/10] bg-slate-950 flex overflow-hidden">
                          {imageUrls.length === 0 ? (
                            <div className="w-full h-full bg-slate-900/80 flex flex-col items-center justify-center border-b border-slate-800">
                              <Layers className="w-8 h-8 text-slate-700" />
                              <span className="text-[10px] text-slate-600 mt-1">Belum ada item</span>
                            </div>
                          ) : imageUrls.length === 1 ? (
                            <img src={imageUrls[0]} alt="" className="w-full h-full object-cover border-b border-slate-800" />
                          ) : imageUrls.length === 2 ? (
                            <div className="w-full h-full grid grid-cols-2 gap-0.5 border-b border-slate-800">
                              <img src={imageUrls[0]} alt="" className="w-full h-full object-cover" />
                              <img src={imageUrls[1]} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : imageUrls.length === 3 ? (
                            <div className="w-full h-full grid grid-cols-3 gap-0.5 border-b border-slate-800">
                              <img src={imageUrls[0]} alt="" className="w-full h-full object-cover col-span-2" />
                              <div className="grid grid-rows-2 gap-0.5">
                                <img src={imageUrls[1]} alt="" className="w-full h-full object-cover" />
                                <img src={imageUrls[2]} alt="" className="w-full h-full object-cover" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 border-b border-slate-800">
                              <img src={imageUrls[0]} alt="" className="w-full h-full object-cover" />
                              <img src={imageUrls[1]} alt="" className="w-full h-full object-cover" />
                              <img src={imageUrls[2]} alt="" className="w-full h-full object-cover" />
                              <img src={imageUrls[3]} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-slate-300 border border-white/10 flex items-center gap-1">
                            <span>{col.items.length} item</span>
                          </div>

                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            {col.isDefault && (
                              <div className="bg-[#FF2E7E] text-white px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
                                Utama
                              </div>
                            )}
                            <div className="bg-black/70 backdrop-blur-sm text-slate-300 px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-white/10">
                              {col.isPublic ? (
                                <>
                                  <Globe className="w-2.5 h-2.5 text-emerald-400" />
                                  <span className="text-emerald-400">Publik</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                                  <span className="text-amber-400">Privat</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Info Body */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                          <div>
                            <h4 className="font-display font-black text-sm text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-1 leading-snug">
                              {col.name}
                            </h4>
                            {col.description && (
                              <p className="text-slate-400 text-xs line-clamp-2 mt-1">
                                {col.description}
                              </p>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => shareCollectionToBuzz(col.id)}
                              className="text-slate-400 hover:text-[#FF2E7E] p-1.5 rounded-lg bg-slate-800/50 hover:bg-[#FF2E7E]/10 border border-slate-800 hover:border-[#FF2E7E]/30 transition-all text-xs font-bold flex items-center gap-1.5"
                              title="Bagikan ke Buzz"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[10px]">Bagikan</span>
                            </button>

                            {isOwnProfile && !col.isDefault && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Apakah Anda yakin ingin menghapus koleksi "${col.name}"?`)) {
                                    await deleteCollection(col.id);
                                  }
                                }}
                                className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg bg-slate-800/50 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                                title="Hapus Koleksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SKOR & ULASAN SAYA */}
        {/* ========================================================================= */}
        {activeUserTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2.5">
                  <Star className="w-5 h-5 text-[#FF2E7E] fill-current" />
                  <span>{isOwnProfile ? 'Kumpulan Ulasan & Skor Sotoy Saya' : `Ulasan & Skor Sinema ${targetUser.name}`}</span>
                </h3>
                <p className="text-neutral-400 text-xs mt-1">
                  {isOwnProfile
                    ? 'Arsip semua film yang sudah kamu tonton dan nilai dengan skor jujur'
                    : `Arsip semua film yang sudah ditonton dan dinilai oleh ${targetUser.name}`}
                </p>
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => navigateTo('film-database')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white font-black text-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Nilai Film Lainnya</span>
                </button>
              )}
            </div>

            {loadingRatings ? (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-400 space-y-3">
                <Loader2 className="w-8 h-8 text-[#FF2E7E] animate-spin" />
                <p className="text-xs font-bold">Memuat ulasan dan skor film...</p>
              </div>
            ) : myReviews.length === 0 ? (
              <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-4">
                <Star className="w-12 h-12 text-neutral-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-white text-base">
                    {isOwnProfile ? 'Kamu belum menulis ulasan' : `${targetUser.name} belum menulis ulasan`}
                  </h4>
                  <p className="text-neutral-400 text-xs max-w-sm mx-auto">
                    {isOwnProfile
                      ? 'Kunjungi halaman detail film favoritmu dan klik tombol "Beri Skor Sotoy" untuk meninggalkan ulasan pertamamu.'
                      : 'Pengguna ini belum mempublikasikan skor atau ulasan film apa pun.'}
                  </p>
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => navigateTo('film-database')}
                    className="px-5 py-2.5 rounded-xl bg-[#FF2E7E] text-white font-black text-xs"
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
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3.5 hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {targetFilm?.poster?.trim() ? (
                            <img
                              src={targetFilm.poster.trim()}
                              alt={targetFilm.title}
                              className="w-12 h-16 object-cover rounded-xl border border-neutral-700 shrink-0"
                            />
                          ) : null}
                          <div>
                            <h4
                              onClick={() => targetFilm && navigateTo('film-detail', { filmId: targetFilm.id })}
                              className="font-display font-black text-base text-white hover:text-[#FF2E7E] cursor-pointer"
                            >
                              {targetFilm ? targetFilm.title : 'Film Terkait'}
                            </h4>
                            {targetFilm && (
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {targetFilm.year} • {targetFilm.director}
                              </p>
                            )}
                            <span className="text-[11px] text-neutral-500 block mt-0.5" title={formatFullDateTime(rev.createdAt)}>
                              Diulas {formatRelativeTime(rev.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-start sm:self-auto">
                          <div className="w-11 h-11 rounded-full bg-neutral-950 border border-[#FF2E7E]/40 flex flex-col items-center justify-center text-[#FF2E7E] font-black text-sm shrink-0 shadow-inner">
                            <span className="leading-none">{rev.score.toFixed(1)}</span>
                          </div>

                          {(isOwnProfile || currentUser.id === rev.userId || isAdmin) && (
                            <div className="flex items-center gap-1 border-l border-neutral-800 pl-2">
                              <button
                                onClick={() => {
                                  setEditingReviewId(rev.id);
                                  setEditingReviewScore(rev.score);
                                  setEditingReviewHeadline(rev.headline || '');
                                  setEditingReviewText(rev.reviewText || '');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 font-bold text-xs flex items-center gap-1 transition-colors"
                                title="Edit Skor & Ulasan"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Yakin ingin menghapus ulasan ini?')) {
                                    deleteFilmRating(rev.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                                title="Hapus Ulasan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingReviewId === rev.id ? (
                        <div className="space-y-3 bg-neutral-950 p-4 rounded-xl border border-[#FF2E7E]/40">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-neutral-300">Skor Sotoy (1-10):</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              step="0.1"
                              value={editingReviewScore}
                              onChange={e => setEditingReviewScore(parseFloat(e.target.value) || 10)}
                              className="w-20 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#FF2E7E]"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Headline ulasan..."
                            value={editingReviewHeadline}
                            onChange={e => setEditingReviewHeadline(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#FF2E7E]"
                          />
                          <textarea
                            placeholder="Tulis ulasan jujurmu..."
                            value={editingReviewText}
                            onChange={e => setEditingReviewText(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#FF2E7E] resize-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingReviewId(null)}
                              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold"
                            >
                              Batal
                            </button>
                            <button
                              onClick={async () => {
                                await updateFilmRating(rev.id, {
                                  score: editingReviewScore,
                                  headline: editingReviewHeadline,
                                  reviewText: editingReviewText,
                                });
                                setEditingReviewId(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold"
                            >
                              Simpan Ulasan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 pt-1">
                          <h5 className="font-display font-bold text-sm text-white">
                            "{rev.headline}"
                          </h5>
                          {Boolean(rev.reviewText && rev.reviewText.trim()) && (
                            <p className="text-neutral-200 text-xs sm:text-sm leading-relaxed">
                              {rev.reviewText}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 flex-wrap gap-2">
                        <span className="flex items-center gap-1 text-[#FF2E7E]">
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          {rev.likes} Warga menyukai ulasan ini
                        </span>

                        <div className="flex items-center gap-3">
                          <button
                            id={`user-share-review-${rev.id}-btn`}
                            onClick={() => {
                              openShareModal({
                                title: `Rating ${targetFilm?.title || 'Film'} - ${rev.score.toFixed(1)}/10.0 oleh ${targetUser.name}`,
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
                                meta: targetFilm ? `${targetFilm.title} (${targetFilm.year}) • Skor: ${rev.score.toFixed(1)}/10.0` : `Skor: ${rev.score.toFixed(1)}/10.0`,
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
                      {art.coverImage?.trim() ? (
                        <img
                          src={art.coverImage.trim()}
                          alt={art.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                          <FileText className="w-12 h-12" />
                        </div>
                      )}
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
                            src={u.avatar?.trim() || DEFAULT_AVATAR}
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
