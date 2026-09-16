import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Article,
  FilmItem,
  BuzzPost,
  BuzzReply,
  ReactionType,
  BuzzReactions,
  UserRating,
  MainCategory,
  SubCategory,
  UserSettings,
  UserTab,
  SettingsSubPage,
  CriticSubmission,
} from '../types';
import {
  INITIAL_USERS,
  ALL_USERS_DATABASE,
  INITIAL_ARTICLES,
  INITIAL_FILMS,
  INITIAL_BUZZ,
  INITIAL_RATINGS,
} from '../data/mockData';
import { ShareData } from '../components/Modals/SocialShareModal';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export type AppView =
  | 'home'
  | 'category'
  | 'article-detail'
  | 'film-database'
  | 'film-detail'
  | 'film-recommendations'
  | 'community-feed'
  | 'buzz-detail'
  | 'write-article'
  | 'user-profile'
  | 'settings'
  | 'search'
  | 'about-us'
  | 'privacy-policy'
  | 'terms-conditions'
  | 'business-inquiries'
  | 'critic-submission'
  | 'critic-criteria'
  | 'admin-critic-submissions';

interface AppContextType {
  currentUser: User;
  isLoggedIn: boolean;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  isComposeBuzzOpen: boolean;
  setIsComposeBuzzOpen: (open: boolean) => void;
  login: (roleKey?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  articles: Article[];
  films: FilmItem[];
  buzzList: BuzzPost[];
  ratings: UserRating[];
  criticSubmissions: CriticSubmission[];
  addCriticSubmission: (sub: Omit<CriticSubmission, 'id' | 'status' | 'date'>) => Promise<boolean>;
  updateCriticSubmissionStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  watchlist: string[];
  toggleWatchlist: (filmId: string) => void;
  isFilmInWatchlist: (filmId: string) => boolean;
  savedArticles: string[];
  toggleSaveArticle: (articleId: string) => void;
  isArticleSaved: (articleId: string) => boolean;
  toggleSaveFilm: (filmId: string) => void;
  isFilmSaved: (filmId: string) => boolean;
  updateUserBio: (newBio: string) => Promise<void>;
  updateUserProfile: (updates: { name?: string; handle?: string; avatar?: string; bio?: string }) => Promise<void>;
  uploadProfilePhoto: (base64Data: string) => Promise<void>;
  userSettings: UserSettings;
  updateUserSettings: (updates: Partial<UserSettings>) => void;
  activeUserTab: UserTab;
  setActiveUserTab: (tab: UserTab) => void;
  activeSettingsTab: SettingsSubPage;
  setActiveSettingsTab: (tab: SettingsSubPage) => void;
  currentView: AppView;
  selectedArticleId: string | null;
  selectedFilmId: string | null;
  selectedBuzzId: string | null;
  activeCategory: MainCategory | null;
  activeSubCategory: SubCategory | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // User Profile Visiting system
  viewedUserId: string | null;
  setViewedUserId: (id: string | null) => void;
  viewedUser: User;
  navigateTo: (
    view: AppView,
    options?: {
      articleId?: string;
      filmId?: string;
      buzzId?: string;
      category?: MainCategory | null;
      subCategory?: SubCategory | null;
      userTab?: UserTab;
      settingsTab?: SettingsSubPage;
      userId?: string;
      buzzFeedTab?: 'for-you' | 'following' | 'saved' | 'liked' | 'trending';
      searchQuery?: string;
    }
  ) => void;
  goBack: () => void;
  // Follow / Social system
  followingIds: string[];
  followersIds: string[];
  allUsers: User[];
  toggleFollowUser: (userId: string) => void;
  isFollowing: (userId: string) => boolean;
  getUserById: (userId: string) => User | undefined;
  // Security & Account
  changeEmail: (newEmail: string) => boolean;
  changePassword: (oldPass: string, newPass: string) => boolean;
  toggleTwoFactor: () => void;
  exportUserData: () => void;
  // Social Share Modal
  shareModalData: ShareData | null;
  openShareModal: (data: ShareData) => void;
  closeShareModal: () => void;
  // Content creation
  addArticle: (newArticle: Omit<Article, 'id' | 'publishedAt' | 'views' | 'likes' | 'commentsCount'>) => Promise<boolean>;
  deleteArticle: (id: string) => Promise<void>;
  addBuzzPost: (
    content: string,
    taggedFilmId?: string,
    skorSotoy?: number,
    taggedArticleId?: string
  ) => Promise<void>;
  likeBuzzPost: (buzzId: string) => Promise<void>;
  reactToBuzzPost: (buzzId: string, reaction: ReactionType) => Promise<void>;
  addBuzzReply: (
    buzzId: string,
    content: string,
    parentId?: string,
    replyToUser?: { id: string; name: string; handle: string }
  ) => Promise<void>;
  likeBuzzReply: (buzzId: string, replyId: string) => Promise<void>;
  addFilmRating: (filmId: string, score: number, headline: string, reviewText: string) => Promise<void>;
  likeArticle: (articleId: string) => Promise<void>;
  buzzFeedTab: 'for-you' | 'following' | 'saved' | 'liked' | 'trending';
  setBuzzFeedTab: (tab: 'for-you' | 'following' | 'saved' | 'liked' | 'trending') => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState<User>(() => INITIAL_USERS.warga);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('sotoy_is_logged_in');
    return saved !== null ? saved === 'true' : true;
  });
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isComposeBuzzOpen, setIsComposeBuzzOpen] = useState(false);

  // Firestore Realtime Collections States
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('sotoy_watchlist');
    return saved ? JSON.parse(saved) : ['film-1', 'film-3'];
  });
  const [savedArticles, setSavedArticles] = useState<string[]>(() => {
    const saved = localStorage.getItem('sotoy_saved_articles');
    return saved ? JSON.parse(saved) : ['art-1', 'art-3'];
  });
  const [articles, setArticles] = useState<Article[]>([]);
  const [films, setFilms] = useState<FilmItem[]>([]);
  const [buzzList, setBuzzList] = useState<BuzzPost[]>([]);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [criticSubmissions, setCriticSubmissions] = useState<CriticSubmission[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Local Preferences States
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('watchlist');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsSubPage>('profile');
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('sotoy_user_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      favoriteGenres: ['Sci-Fi', 'Psychological Thriller', 'Indie Cinema', 'Cinema Gear'],
      autoplayTrailer: false,
      notifyReviewLikes: true,
      notifyCuratorBuzz: true,
      notifyWatchlistRelease: true,
      cinemaQuality: '1080p Full HD',
      language: 'en',
      isPrivateProfile: false,
      isWatchlistPublic: true,
      isReviewsPublic: true,
      allowTagging: 'everyone',
      twoFactorEnabled: false,
      emailNotifications: true,
      dataSharingConsent: true,
    };
  });

  const [followingIds, setFollowingIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('sotoy_following_ids');
    return saved ? JSON.parse(saved) : ['u-2', 'u-4', 'u-6'];
  });

  const [followersIds, setFollowersIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('sotoy_followers_ids');
    return saved ? JSON.parse(saved) : ['u-2', 'u-3', 'u-5'];
  });

  const [shareModalData, setShareModalData] = useState<ShareData | null>(null);

  const [currentView, setCurrentView] = useState<AppView>('home');
  const [viewHistory, setViewHistory] = useState<AppView[]>(['home']);
  const [buzzFeedTab, setBuzzFeedTab] = useState<'for-you' | 'following' | 'saved' | 'liked' | 'trending'>('for-you');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
  const [selectedBuzzId, setSelectedBuzzId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<MainCategory | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<SubCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Profile Visiting state
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const viewedUser = (viewedUserId ? allUsers.find(u => u.id === viewedUserId) : null) || currentUser;

  // Sync basic preferences and follow lists to local storage
  useEffect(() => {
    localStorage.setItem('sotoy_user_settings', JSON.stringify(userSettings));
  }, [userSettings]);

  useEffect(() => {
    localStorage.setItem('sotoy_following_ids', JSON.stringify(followingIds));
  }, [followingIds]);

  useEffect(() => {
    localStorage.setItem('sotoy_followers_ids', JSON.stringify(followersIds));
  }, [followersIds]);

  useEffect(() => {
    localStorage.setItem('sotoy_is_logged_in', String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('sotoy_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('sotoy_saved_articles', JSON.stringify(savedArticles));
  }, [savedArticles]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Bootstrap Firestore with Mock Data if empty
  useEffect(() => {
    const bootstrapData = async () => {
      try {
        const testSnap = await getDocs(collection(db, 'films'));
        if (testSnap.empty) {
          console.log('[Bootstrap] Initializing Firestore collections with mock data...');
          
          // Seed Films
          for (const item of INITIAL_FILMS) {
            try { await setDoc(doc(db, 'films', item.id), item); } catch (e) { /* ignore seed permission errors */ }
          }
          // Seed Articles
          for (const item of INITIAL_ARTICLES) {
            try { await setDoc(doc(db, 'articles', item.id), item); } catch (e) { /* ignore seed permission errors */ }
          }
          // Seed Buzz Posts
          for (const item of INITIAL_BUZZ) {
            try { await setDoc(doc(db, 'buzz', item.id), item); } catch (e) { /* ignore seed permission errors */ }
          }
          // Seed Ratings
          for (const item of INITIAL_RATINGS) {
            try { await setDoc(doc(db, 'ratings', item.id), item); } catch (e) { /* ignore seed permission errors */ }
          }
          // Seed Users database
          for (const item of ALL_USERS_DATABASE) {
            try { await setDoc(doc(db, 'users', item.id), item); } catch (e) { /* ignore seed permission errors */ }
          }
          console.log('[Bootstrap] Seeding completed.');
        }
      } catch (err) {
        console.warn('[Bootstrap] Firestore seeding skipped:', err);
      }
    };
    bootstrapData();
  }, []);

  // Initialize Real-time Firestore Sync Subscriptions
  useEffect(() => {
    const unsubFilms = onSnapshot(
      collection(db, 'films'),
      (snapshot) => {
        const items: FilmItem[] = [];
        snapshot.forEach(doc => items.push(doc.data() as FilmItem));
        if (items.length > 0) {
          const existingIds = new Set(items.map(f => f.id));
          const merged = [...items];
          for (const init of INITIAL_FILMS) {
            if (!existingIds.has(init.id)) {
              merged.push(init);
            }
          }
          setFilms(merged.sort((a, b) => (a.trendingRank || 99) - (b.trendingRank || 99)));
        } else {
          setFilms(INITIAL_FILMS);
        }
      },
      (err) => {
        console.warn('[Firestore] films subscription fallback to initial mock:', err.message);
        setFilms(INITIAL_FILMS);
      }
    );

    const unsubArticles = onSnapshot(
      collection(db, 'articles'),
      (snapshot) => {
        const items: Article[] = [];
        snapshot.forEach(doc => items.push(doc.data() as Article));
        if (items.length > 0) {
          setArticles(items.sort((a, b) => b.id.localeCompare(a.id)));
        } else {
          setArticles(INITIAL_ARTICLES);
        }
      },
      (err) => {
        console.warn('[Firestore] articles subscription fallback to initial mock:', err.message);
        setArticles(INITIAL_ARTICLES);
      }
    );

    const unsubBuzz = onSnapshot(
      collection(db, 'buzz'),
      (snapshot) => {
        const items: BuzzPost[] = [];
        snapshot.forEach(doc => items.push(doc.data() as BuzzPost));
        if (items.length > 0) {
          setBuzzList(items.sort((a, b) => b.id.localeCompare(a.id)));
        } else {
          setBuzzList(INITIAL_BUZZ);
        }
      },
      (err) => {
        console.warn('[Firestore] buzz subscription fallback to initial mock:', err.message);
        setBuzzList(INITIAL_BUZZ);
      }
    );

    const unsubRatings = onSnapshot(
      collection(db, 'ratings'),
      (snapshot) => {
        const items: UserRating[] = [];
        snapshot.forEach(doc => items.push(doc.data() as UserRating));
        if (items.length > 0) {
          setRatings(items.sort((a, b) => b.id.localeCompare(a.id)));
        } else {
          setRatings(INITIAL_RATINGS);
        }
      },
      (err) => {
        console.warn('[Firestore] ratings subscription fallback to initial mock:', err.message);
        setRatings(INITIAL_RATINGS);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const items: User[] = [];
        snapshot.forEach(doc => items.push(doc.data() as User));
        if (items.length > 0) {
          setAllUsers(items);
        } else {
          setAllUsers(ALL_USERS_DATABASE);
        }
      },
      (err) => {
        console.warn('[Firestore] users subscription fallback to initial mock:', err.message);
        setAllUsers(ALL_USERS_DATABASE);
      }
    );

    const unsubCriticSubmissions = onSnapshot(
      collection(db, 'criticSubmissions'),
      (snapshot) => {
        const items: CriticSubmission[] = [];
        snapshot.forEach(doc => items.push(doc.data() as CriticSubmission));
        setCriticSubmissions(items.sort((a, b) => b.id.localeCompare(a.id)));
      },
      (err) => {
        console.warn('[Firestore] criticSubmissions restricted or unavailable:', err.message);
      }
    );

    return () => {
      unsubFilms();
      unsubArticles();
      unsubBuzz();
      unsubRatings();
      unsubUsers();
      unsubCriticSubmissions();
    };
  }, []);

  // Initialize Firebase Auth & Real User profile sync
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const uid = fbUser.uid;
        const userDocRef = doc(db, 'users', uid);
        try {
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setCurrentUser(userSnap.data() as User);
          } else {
            // First time user registration
            const defaultUser: User = {
              id: uid,
              name: 'Warga Sotoy ' + uid.slice(0, 4),
              handle: '@warga_' + uid.slice(0, 4).toLowerCase(),
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
              role: 'warga_sotoy',
              roleTitle: 'Warga Sotoy (Penonton Santai)',
              bio: 'Cinephile baru mendarat di Sotoy Film!',
              email: fbUser.email || `warga_${uid.slice(0, 4)}@sotoyfilm.id`,
              totalReviews: 0,
              totalBuzz: 0,
              followers: [],
              following: [],
            };
            try { await setDoc(userDocRef, defaultUser); } catch (e) { /* ignore write permission */ }
            setCurrentUser(defaultUser);
          }
        } catch (err) {
          console.warn('[Auth] Error getting user profile: ', err);
        }
      } else {
        // Sign in anonymously if permitted, otherwise run as guest
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.warn('[Auth] Anonymous sign-in not enabled on Firebase project; running in client guest mode.');
        }
      }
    });
    return () => unsubAuth();
  }, []);

  // Login Simulator integrating actual Firestore synchronization
  const login = async (roleKey?: string) => {
    let targetRole: UserRole = 'warga_sotoy';
    let name = 'Budi Cinephile';
    let handle = '@budisuka_film';
    let avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
    let roleTitle = 'Warga Sotoy (Penonton Santai)';
    let bio = 'Nonton apa aja yang lagi rame. Nggak suka spoiler!';

    if (roleKey === 'critic' || roleKey === 'si_paling_sotoy') {
      targetRole = 'si_paling_sotoy';
      name = 'Rian Sinematografer';
      handle = '@riansinotoy';
      avatar = 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80';
      roleTitle = 'Si Paling Sotoy (Kritikus & Kurator)';
      bio = 'Menilai film dari sudut blocking kamera, color grade, dan pacing. 10+ tahun nonton festival.';
    } else if (roleKey === 'writer' || roleKey === 'penulis_sotoy') {
      targetRole = 'penulis_sotoy';
      name = 'Dinda Redaksi';
      handle = '@dindaredaksi';
      avatar = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80';
      roleTitle = 'Penulis Sotoy (Jurnalis Film & Pop-Culture)';
      bio = 'Editor & penulis feature di Sotoy Film. Pecinta film noir dan anime retro 90-an.';
    } else if (roleKey === 'admin') {
      targetRole = 'admin';
      name = 'Chief Admin Sotoy';
      handle = '@adminsotoy';
      avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
      roleTitle = 'Head Admin & Lead Editor';
      bio = 'Menjaga ketertiban obrolan sotoy seantero jagat perfilman.';
    }

    const uid = auth.currentUser ? auth.currentUser.uid : (localStorage.getItem('sotoy_uid') || `user-${Date.now()}`);
    localStorage.setItem('sotoy_uid', uid);

    const updatedUser: User = {
      id: uid,
      name,
      handle,
      avatar,
      role: targetRole,
      roleTitle,
      bio,
      email: `${targetRole}_${uid.slice(0, 4)}@sotoyfilm.id`,
      totalReviews: 12,
      totalBuzz: 24,
      followers: [],
      following: [],
    };

    try {
      await setDoc(doc(db, 'users', uid), updatedUser);
    } catch (err) {
      console.warn('[Firestore] User profile sync skipped:', err);
    }

    setCurrentUser(updatedUser);
    setIsLoggedIn(true);
    setLoginModalOpen(false);
    localStorage.setItem('sotoy_is_logged_in', 'true');
    localStorage.setItem('sotoy_role', roleKey || 'warga');

    if (targetRole === 'warga_sotoy') {
      navigateTo('community-feed');
      showToast(`Selamat datang, ${name}! Langsung diarahkan ke Buzz Feed.`);
    } else if (targetRole === 'si_paling_sotoy') {
      navigateTo('film-database');
      showToast(`Selamat datang, ${name}! Langsung diarahkan ke Database Film.`);
    } else {
      navigateTo('home');
      showToast(`Selamat datang, ${name}! Beranda terbuka dengan akses Menulis Artikel.`);
    }
  };

  const logout = async () => {
    setIsLoggedIn(false);
    localStorage.setItem('sotoy_is_logged_in', 'false');
    navigateTo('home');
    showToast('Anda telah beralih ke mode Pengunjung (Visitor). Beranda ditampilkan.');
  };

  const switchRole = async (role: UserRole) => {
    let targetRole: UserRole = 'warga_sotoy';
    let name = 'Budi Cinephile';
    let handle = '@budisuka_film';
    let avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
    let roleTitle = 'Warga Sotoy (Penonton Santai)';
    let bio = 'Nonton apa aja yang lagi rame. Nggak suka spoiler!';

    if (role === 'si_paling_sotoy') {
      targetRole = 'si_paling_sotoy';
      name = 'Rian Sinematografer';
      handle = '@riansinotoy';
      avatar = 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80';
      roleTitle = 'Si Paling Sotoy (Kritikus & Kurator)';
      bio = 'Menilai film dari sudut blocking kamera, color grade, dan pacing. 10+ tahun nonton festival.';
    } else if (role === 'penulis_sotoy') {
      targetRole = 'penulis_sotoy';
      name = 'Dinda Redaksi';
      handle = '@dindaredaksi';
      avatar = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80';
      roleTitle = 'Penulis Sotoy (Jurnalis Film & Pop-Culture)';
      bio = 'Editor & penulis feature di Sotoy Film. Pecinta film noir dan anime retro 90-an.';
    } else if (role === 'admin') {
      targetRole = 'admin';
      name = 'Chief Admin Sotoy';
      handle = '@adminsotoy';
      avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
      roleTitle = 'Head Admin & Lead Editor';
      bio = 'Menjaga ketertiban obrolan sotoy seantero jagat perfilman.';
    }

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      const updatedUser: User = {
        id: uid,
        name,
        handle,
        avatar,
        role: targetRole,
        roleTitle,
        bio,
        email: `${targetRole}_${uid.slice(0, 4)}@sotoyfilm.id`,
        totalReviews: 12,
        totalBuzz: 24,
        followers: [],
        following: [],
      };

      try {
        await setDoc(doc(db, 'users', uid), updatedUser);
        setCurrentUser(updatedUser);
        setIsLoggedIn(true);
        localStorage.setItem('sotoy_is_logged_in', 'true');
        localStorage.setItem('sotoy_role', role === 'si_paling_sotoy' ? 'critic' : role === 'penulis_sotoy' ? 'writer' : role === 'admin' ? 'admin' : 'warga');

        if (role === 'warga_sotoy') {
          navigateTo('community-feed');
          showToast(`Beralih ke peran: ${roleTitle} (Buzz Feed dibuka)`);
        } else if (role === 'si_paling_sotoy') {
          navigateTo('film-database');
          showToast(`Beralih ke peran: ${roleTitle} (Database Film dibuka)`);
        } else {
          navigateTo('home');
          showToast(`Beralih ke peran: ${roleTitle} (Beranda & Tombol Tulis Artikel aktif)`);
        }
      } catch (err) {
        console.error('[Firestore] Error switching user role: ', err);
      }
    }
  };

  const toggleWatchlist = (filmId: string) => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan Log In terlebih dahulu untuk menyimpan ke Daftar Tonton!');
      return;
    }
    setWatchlist(prev => {
      const exists = prev.includes(filmId);
      const updated = exists ? prev.filter(id => id !== filmId) : [...prev, filmId];
      showToast(exists ? 'Dihapus dari Daftar Tonton (Watchlist)' : 'Ditambahkan ke Daftar Tonton (Watchlist)!');
      return updated;
    });
  };

  const isFilmInWatchlist = (filmId: string) => {
    return watchlist.includes(filmId);
  };

  const toggleSaveArticle = (articleId: string) => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan Log In terlebih dahulu untuk menyimpan artikel ke Perpustakaan!');
      return;
    }
    setSavedArticles(prev => {
      const exists = prev.includes(articleId);
      const updated = exists ? prev.filter(id => id !== articleId) : [...prev, articleId];
      showToast(exists ? 'Artikel dihapus dari Perpustakaan!' : 'Artikel berhasil disimpan ke Perpustakaan!');
      return updated;
    });
  };

  const isArticleSaved = (articleId: string) => {
    return savedArticles.includes(articleId);
  };

  const toggleSaveFilm = (filmId: string) => {
    toggleWatchlist(filmId);
  };

  const isFilmSaved = (filmId: string) => {
    return isFilmInWatchlist(filmId);
  };

  const updateUserBio = async (newBio: string) => {
    if (!auth.currentUser) return;
    const updated = { ...currentUser, bio: newBio };
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), updated);
      setCurrentUser(updated);
      showToast('Bio profil kamu berhasil diperbarui!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const updateUserProfile = async (updates: { name?: string; handle?: string; avatar?: string; bio?: string }) => {
    if (!auth.currentUser) return;
    const updated = {
      ...currentUser,
      name: updates.name?.trim() ? updates.name.trim() : currentUser.name,
      handle: updates.handle?.trim() ? (updates.handle.startsWith('@') ? updates.handle.trim() : `@${updates.handle.trim()}`) : currentUser.handle,
      avatar: updates.avatar?.trim() ? updates.avatar.trim() : currentUser.avatar,
      bio: updates.bio !== undefined ? updates.bio : currentUser.bio,
    };
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), updated);
      setCurrentUser(updated);
      showToast('Profil pengguna berhasil disimpan!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const uploadProfilePhoto = async (base64Data: string) => {
    if (!auth.currentUser) return;
    const updated = { ...currentUser, avatar: base64Data };
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), updated);
      setCurrentUser(updated);
      showToast('Foto profil dari perangkat kamu berhasil diunggah!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const updateUserSettings = (updates: Partial<UserSettings>) => {
    setUserSettings(prev => ({ ...prev, ...updates }));
    showToast('Pengaturan pengguna berhasil disimpan!');
  };

  const toggleFollowUser = (targetUserId: string) => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan login terlebih dahulu untuk mengikuti sesama cinephile!');
      return;
    }

    if (targetUserId === currentUser.id) {
      showToast('Kamu tidak bisa mengikuti akunmu sendiri.');
      return;
    }

    const target = allUsers.find(u => u.id === targetUserId);
    const targetName = target ? target.name : 'Pengguna';

    setFollowingIds(prev => {
      const isAlreadyFollowing = prev.includes(targetUserId);
      if (isAlreadyFollowing) {
        showToast(`Berhenti mengikuti ${targetName}`);
        return prev.filter(id => id !== targetUserId);
      } else {
        showToast(`Sekarang kamu mengikuti ${targetName}! 🎉`);
        return [...prev, targetUserId];
      }
    });
  };

  const isFollowing = (userId: string) => {
    return followingIds.includes(userId);
  };

  const getUserById = (userId: string) => {
    return allUsers.find(u => u.id === userId);
  };

  const changeEmail = (newEmail: string): boolean => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      showToast('Format email tidak valid.');
      return false;
    }
    setCurrentUser(prev => ({ ...prev, email: trimmed }));
    showToast(`Email akun berhasil diubah menjadi ${trimmed}!`);
    return true;
  };

  const changePassword = (oldPass: string, newPass: string): boolean => {
    if (!oldPass || oldPass.length < 4) {
      showToast('Kata sandi lama salah atau tidak sesuai.');
      return false;
    }
    if (!newPass || newPass.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter.');
      return false;
    }
    showToast('Kata sandi berhasil diperbarui dengan aman!');
    return true;
  };

  const toggleTwoFactor = () => {
    setUserSettings(prev => {
      const nextVal = !prev.twoFactorEnabled;
      showToast(nextVal ? '2-Factor Authentication (2FA) diaktifkan!' : '2-Factor Authentication dinonaktifkan.');
      return { ...prev, twoFactorEnabled: nextVal };
    });
  };

  const exportUserData = () => {
    const exportData = {
      user: {
        id: currentUser.id,
        name: currentUser.name,
        handle: currentUser.handle,
        email: currentUser.email,
        role: currentUser.role,
        bio: currentUser.bio,
      },
      watchlist: watchlist.map(id => films.find(f => f.id === id)?.title || id),
      ratings: ratings.filter(r => r.userId === currentUser.id),
      buzzList: buzzList.filter(b => b.author.id === currentUser.id),
      following: followingIds,
      followers: followersIds,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sotoyfilm-data-${currentUser.handle.replace('@', '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Salinan data profil dan riwayat kamu telah diunduh (JSON)!');
  };

  const openShareModal = (data: ShareData) => {
    setShareModalData(data);
  };

  const closeShareModal = () => {
    setShareModalData(null);
  };

  const navigateTo = (
    view: AppView,
    options?: {
      articleId?: string;
      filmId?: string;
      buzzId?: string;
      category?: MainCategory | null;
      subCategory?: SubCategory | null;
      userTab?: UserTab;
      settingsTab?: SettingsSubPage;
      userId?: string;
      buzzFeedTab?: 'for-you' | 'following' | 'saved' | 'liked' | 'trending';
      searchQuery?: string;
    }
  ) => {
    setViewHistory(prev => {
      if (prev[prev.length - 1] !== view) {
        return [...prev, view];
      }
      return prev;
    });
    setCurrentView(view);
    if (options?.searchQuery !== undefined) setSearchQuery(options.searchQuery);
    if (options?.buzzFeedTab !== undefined) setBuzzFeedTab(options.buzzFeedTab);
    if (options?.articleId !== undefined) setSelectedArticleId(options.articleId);
    if (options?.filmId !== undefined) setSelectedFilmId(options.filmId);
    if (options?.buzzId !== undefined) setSelectedBuzzId(options.buzzId);
    if (options?.category !== undefined) setActiveCategory(options.category);
    if (options?.subCategory !== undefined) setActiveSubCategory(options.subCategory);
    if (options?.userTab !== undefined) setActiveUserTab(options.userTab);
    if (options?.settingsTab !== undefined) setActiveSettingsTab(options.settingsTab);
    
    if (options?.userId !== undefined) {
      setViewedUserId(options.userId);
    } else if (view === 'user-profile' && !viewedUserId) {
      setViewedUserId(currentUser.id);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setViewHistory(prev => {
      if (prev.length > 1) {
        const updated = prev.slice(0, -1);
        const targetView = updated[updated.length - 1];
        setCurrentView(targetView);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return updated;
      } else {
        setCurrentView('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return ['home'];
      }
    });
  };

  // Publish Article directly to Firestore
  const addArticle = async (newArticle: Omit<Article, 'id' | 'publishedAt' | 'views' | 'likes' | 'commentsCount'>): Promise<boolean> => {
    if (currentUser.role !== 'penulis_sotoy' && currentUser.role !== 'admin') {
      showToast('Akses ditolak: Hanya Penulis Sotoy & Admin yang dapat mempublikasikan artikel!');
      return false;
    }

    const articleId = `art-${Date.now()}`;
    const created: Article = {
      ...newArticle,
      id: articleId,
      publishedAt: 'Baru saja',
      views: 1,
      likes: 0,
      commentsCount: 0,
    };

    try {
      await setDoc(doc(db, 'articles', articleId), created);
      showToast('Artikel berhasil dipublikasikan!');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `articles/${articleId}`);
      return false;
    }
  };

  // Delete Article from Firestore
  const deleteArticle = async (id: string) => {
    if (currentUser.role !== 'admin') {
      showToast('Hanya Admin yang dapat menghapus artikel.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'articles', id));
      showToast('Artikel berhasil dihapus oleh Admin.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `articles/${id}`);
    }
  };

  // Add Buzz Post to Firestore
  const addBuzzPost = async (
    content: string,
    taggedFilmId?: string,
    skorSotoy?: number,
    taggedArticleId?: string
  ) => {
    if (!content.trim()) return;

    let taggedFilm: BuzzPost['taggedFilm'] = undefined;
    if (taggedFilmId) {
      const f = films.find(item => item.id === taggedFilmId);
      if (f) {
        taggedFilm = {
          id: f.id,
          title: f.title,
          poster: f.poster,
          year: f.year,
          skorSotoy: f.skorSotoy,
          genres: f.genres,
        };
      }
    }

    let taggedArticle: BuzzPost['taggedArticle'] = undefined;
    if (taggedArticleId) {
      const a = articles.find(item => item.id === taggedArticleId);
      if (a) {
        taggedArticle = {
          id: a.id,
          title: a.title,
          coverImage: a.coverImage,
          category: a.category,
          authorName: a.author.name,
          readTime: a.readTime,
        };
      }
    }

    const matchedTags = content.match(/#[a-zA-Z0-9_]+/g) || [];
    const cleanTags = matchedTags.map(t => t.replace('#', ''));

    const buzzId = `buzz-${Date.now()}`;
    const newBuzz: BuzzPost = {
      id: buzzId,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        handle: currentUser.handle,
        avatar: currentUser.avatar,
        role: currentUser.role,
      },
      content,
      taggedFilm,
      taggedArticle,
      skorSotoyMention: skorSotoy,
      createdAt: 'Baru saja',
      likes: 0,
      likedByMe: false,
      repliesCount: 0,
      tags: cleanTags.length > 0 ? cleanTags : ['SotoyFeed'],
      replies: [],
    };

    try {
      await setDoc(doc(db, 'buzz', buzzId), newBuzz);
      showToast('Buzz Sotoy kamu berhasil diposting!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `buzz/${buzzId}`);
    }
  };

  // Quick Reactions for Buzz Post in Firestore
  const reactToBuzzPost = async (buzzId: string, reaction: ReactionType) => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu untuk memberikan reaksi!');
      return;
    }

    const post = buzzList.find(b => b.id === buzzId);
    if (!post) return;

    const currentReactions: BuzzReactions = post.reactions || {
      heart: post.likes || 0,
      mindblown: 0,
      fire: 0,
      laugh: 0,
      clap: 0,
    };

    const prevReaction = post.myReaction;
    const updatedReactions = { ...currentReactions };

    let newReaction: ReactionType | null = reaction;

    if (prevReaction === reaction) {
      // User tapped the same reaction -> toggle off
      updatedReactions[reaction] = Math.max(0, (updatedReactions[reaction] || 0) - 1);
      newReaction = null;
    } else {
      // If user had a previous reaction, decrement old one
      if (prevReaction) {
        updatedReactions[prevReaction] = Math.max(0, (updatedReactions[prevReaction] || 0) - 1);
      }
      // Increment new reaction
      updatedReactions[reaction] = (updatedReactions[reaction] || 0) + 1;
    }

    // Compute total likes/reactions
    const totalReactions = Object.values(updatedReactions).reduce((acc, count) => acc + (count || 0), 0);

    const updatedPost: BuzzPost = {
      ...post,
      reactions: updatedReactions,
      myReaction: newReaction,
      likes: totalReactions,
      likedByMe: newReaction === 'heart',
    };

    try {
      await setDoc(doc(db, 'buzz', buzzId), updatedPost);
      const emojiMap: Record<ReactionType, string> = {
        heart: '❤️ Suka',
        mindblown: '🤯 Mind Blown',
        fire: '🔥 Hype',
        laugh: '😂 Lucu',
        clap: '👏 Mantap',
      };
      showToast(
        newReaction
          ? `Reaksi ${emojiMap[reaction]} dikirim!`
          : 'Reaksi dihapus.'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `buzz/${buzzId}`);
    }
  };

  // Like/Unlike Buzz Post in Firestore
  const likeBuzzPost = async (buzzId: string) => {
    await reactToBuzzPost(buzzId, 'heart');
  };

  // Add Reply to a Buzz Post in Firestore (Supports threaded replies & mentions)
  const addBuzzReply = async (
    buzzId: string,
    content: string,
    parentId?: string,
    replyToUser?: { id: string; name: string; handle: string }
  ) => {
    if (!content.trim()) return;
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu untuk membalas diskusi buzz!');
      return;
    }

    const post = buzzList.find(b => b.id === buzzId);
    if (!post) return;

    const newReply: BuzzReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      buzzId,
      parentId,
      replyToUser,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        handle: currentUser.handle,
        avatar: currentUser.avatar,
        role: currentUser.role,
      },
      content: content.trim(),
      createdAt: 'Baru saja',
      likes: 0,
      likedByMe: false,
    };

    const currentReplies = post.replies || [];
    const updatedReplies = [...currentReplies, newReply];
    const updatedPost = {
      ...post,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
    };

    try {
      await setDoc(doc(db, 'buzz', buzzId), updatedPost);
      showToast('Balasan kamu berhasil diposting!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `buzz/${buzzId}`);
    }
  };

  // Like a Buzz Post Reply in Firestore
  const likeBuzzReply = async (buzzId: string, replyId: string) => {
    const post = buzzList.find(b => b.id === buzzId);
    if (!post || !post.replies) return;

    const updatedReplies = post.replies.map(r => {
      if (r.id === replyId) {
        const isLiked = r.likedByMe;
        return {
          ...r,
          likes: isLiked ? r.likes - 1 : r.likes + 1,
          likedByMe: !isLiked,
        };
      }
      return r;
    });

    const updatedPost = {
      ...post,
      replies: updatedReplies,
    };

    try {
      await setDoc(doc(db, 'buzz', buzzId), updatedPost);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `buzz/${buzzId}`);
    }
  };

  // Submit Rating & Review to Firestore
  const addFilmRating = async (filmId: string, score: number, headline: string, reviewText: string) => {
    const ratingId = `rate-${Date.now()}`;
    const newRating: UserRating = {
      id: ratingId,
      filmId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userRole: currentUser.role,
      score: Math.min(5, Math.max(0.5, Number(score.toFixed(1)))),
      headline,
      reviewText,
      createdAt: 'Baru saja',
      likes: 0,
    };

    try {
      await setDoc(doc(db, 'ratings', ratingId), newRating);

      // Update average film score in Firestore
      const film = films.find(f => f.id === filmId);
      if (film) {
        const currentTotal = film.skorSotoy * film.totalVotes;
        const newVotes = film.totalVotes + 1;
        const newAverage = Number(((currentTotal + score) / newVotes).toFixed(1));
        const updatedFilm = {
          ...film,
          skorSotoy: newAverage,
          totalVotes: newVotes,
        };
        await setDoc(doc(db, 'films', filmId), updatedFilm);
      }

      showToast(`Skor Sotoy ${score.toFixed(1)}/5.0 dan ulasan kamu berhasil dikirim!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `ratings/${ratingId}`);
    }
  };

  // Like Editorial Article in Firestore
  const likeArticle = async (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;
    const updatedArticle = {
      ...article,
      likes: article.likes + 1,
    };
    try {
      await setDoc(doc(db, 'articles', articleId), updatedArticle);
      showToast('Kamu menyukai artikel ini!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `articles/${articleId}`);
    }
  };

  // Submit Critic Application to Firestore
  const addCriticSubmission = async (submission: Omit<CriticSubmission, 'id' | 'status' | 'date'>): Promise<boolean> => {
    const submissionId = `sub-${Date.now()}`;
    const created: CriticSubmission = {
      ...submission,
      id: submissionId,
      status: 'pending',
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    try {
      await setDoc(doc(db, 'criticSubmissions', submissionId), created);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `criticSubmissions/${submissionId}`);
      return false;
    }
  };

  // Update Critic Application status in Firestore & change user role to 'si_paling_sotoy' on approval
  const updateCriticSubmissionStatus = async (id: string, status: 'approved' | 'rejected') => {
    const sub = criticSubmissions.find(s => s.id === id);
    if (!sub) return;
    const updated = {
      ...sub,
      status,
    };

    try {
      await setDoc(doc(db, 'criticSubmissions', id), updated);
      
      if (status === 'approved') {
        const userDocRef = doc(db, 'users', sub.userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          const promotedUser: User = {
            ...userData,
            role: 'si_paling_sotoy',
            roleTitle: 'Si Paling Sotoy (Kritikus & Kurator)',
          };
          await setDoc(userDocRef, promotedUser);
          
          if (currentUser.id === sub.userId) {
            setCurrentUser(promotedUser);
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `criticSubmissions/${id}`);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        loginModalOpen,
        setLoginModalOpen,
        isComposeBuzzOpen,
        setIsComposeBuzzOpen,
        login,
        logout,
        switchRole,
        articles,
        films,
        buzzList,
        ratings,
        criticSubmissions,
        addCriticSubmission,
        updateCriticSubmissionStatus,
        watchlist,
        toggleWatchlist,
        isFilmInWatchlist,
        savedArticles,
        toggleSaveArticle,
        isArticleSaved,
        toggleSaveFilm,
        isFilmSaved,
        updateUserBio,
        updateUserProfile,
        uploadProfilePhoto,
        userSettings,
        updateUserSettings,
        activeUserTab,
        setActiveUserTab,
        activeSettingsTab,
        setActiveSettingsTab,
        viewedUserId,
        setViewedUserId,
        viewedUser,
        currentView,
        selectedArticleId,
        selectedFilmId,
        selectedBuzzId,
        activeCategory,
        activeSubCategory,
        searchQuery,
        setSearchQuery,
        navigateTo,
        goBack,
        followingIds,
        followersIds,
        allUsers,
        toggleFollowUser,
        isFollowing,
        getUserById,
        changeEmail,
        changePassword,
        toggleTwoFactor,
        exportUserData,
        shareModalData,
        openShareModal,
        closeShareModal,
        addArticle,
        deleteArticle,
        addBuzzPost,
        likeBuzzPost,
        reactToBuzzPost,
        addBuzzReply,
        likeBuzzReply,
        addFilmRating,
        likeArticle,
        buzzFeedTab,
        setBuzzFeedTab,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};
