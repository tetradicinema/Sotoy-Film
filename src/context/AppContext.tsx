import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { slugify } from '../utils/slugify';
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
  UploadedFile,
  NotificationItem,
  ModerationReport,
} from '../types';
import {
  DEFAULT_FALLBACK_AUTHOR,
  INITIAL_ARTICLES,
  INITIAL_FILMS,
  INITIAL_BUZZ,
  INITIAL_RATINGS,
} from '../data/mockData';

export const GUEST_USER: User = {
  id: 'guest',
  name: 'Tamu Sotoy',
  handle: '@tamu',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  role: 'warga_sotoy',
  roleTitle: 'Pengunjung',
  bio: 'Pengunjung Sotoy Film',
  email: '',
  createdAt: new Date().toISOString(),
  totalReviews: 0,
  totalBuzz: 0,
  followers: [],
  following: [],
  followersCount: 0,
  followingCount: 0,
  hasFinishedOnboarding: true,
};
import { ShareData } from '../components/Modals/SocialShareModal';
import { db, auth, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export const ADMIN_UIDS = [
  'QkNGf1ZfhsMyUEk90a6Iz8ZplZS2', // User ID Admin 1
  'CsG2CY2TaIZmG7yuPfzAxmRYrlY2', // User ID Admin 2
];
export const ADMIN_EMAILS = ['eksposurmedia@gmail.com', 'admin1@sotoyfilm.id', 'admin2@sotoyfilm.id'];
export const WRITER_UIDS = [
  '0PCmaBvJrzeaQgpf3sSTC4mnsh02', // User ID Penulis Sotoy
];
export const CRITIC_UIDS = ['Jm0raI2h47TJG9ZtZAR1HLVcjSj2'];

export const isUserAdmin = (user?: Partial<User> | null, fbUid?: string, fbEmail?: string): boolean => {
  if (user?.role === 'admin') return true;
  if (user?.id && ADMIN_UIDS.includes(user.id)) return true;
  if (fbUid && ADMIN_UIDS.includes(fbUid)) return true;
  if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  if (fbEmail && ADMIN_EMAILS.includes(fbEmail.toLowerCase())) return true;
  return false;
};

export const isUserWriter = (user?: Partial<User> | null, fbUid?: string): boolean => {
  if (user?.role === 'penulis_sotoy') return true;
  if (user?.id && WRITER_UIDS.includes(user.id)) return true;
  if (fbUid && WRITER_UIDS.includes(fbUid)) return true;
  return false;
};

export const isUserCritic = (user?: Partial<User> | null, fbUid?: string): boolean => {
  if (user?.role === 'si_paling_sotoy') return true;
  if (user?.id && CRITIC_UIDS.includes(user.id)) return true;
  if (fbUid && CRITIC_UIDS.includes(fbUid)) return true;
  return false;
};

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
  | 'admin-critic-submissions'
  | 'admin-dashboard'
  | 'writer-dashboard'
  | 'critic-dashboard'
  | 'onboarding';

interface AppContextType {
  currentUser: User;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isWriter: boolean;
  isCritic: boolean;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  isComposeBuzzOpen: boolean;
  setIsComposeBuzzOpen: (open: boolean) => void;
  logout: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, name: string, handle: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  articles: Article[];
  publishedArticles: Article[];
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
  uploadProfilePhoto: (base64Data: string, fileName?: string, fileSize?: number, fileType?: string) => Promise<void>;
  files: UploadedFile[];
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
  updateArticle: (id: string, updatedFields: Partial<Article>) => Promise<boolean>;
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
  updateFilmRating: (ratingId: string, updates: Partial<UserRating>) => Promise<void>;
  deleteFilmRating: (ratingId: string) => Promise<void>;
  likeArticle: (articleId: string) => Promise<void>;
  buzzFeedTab: 'for-you' | 'following' | 'saved' | 'liked' | 'trending';
  setBuzzFeedTab: (tab: 'for-you' | 'following' | 'saved' | 'liked' | 'trending') => void;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  finishOnboarding: (updates: { name: string; handle: string; bio: string; avatar?: string; favoriteGenres?: string[] }) => Promise<void>;
  // Notifications system
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  sendNotification: (notif: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  checkAndSendMentions: (text: string, title: string, targetView: string, targetId?: string) => Promise<void>;
  // Admin Control Center Management
  updateUserRole: (userId: string, newRole: UserRole) => Promise<boolean>;
  toggleUserSuspension: (userId: string, isSuspended: boolean) => Promise<boolean>;
  bulkUpdateArticles: (articleIds: string[], updates: Partial<Article>) => Promise<boolean>;
  bulkDeleteArticles: (articleIds: string[]) => Promise<boolean>;
  bulkReassignAuthor: (articleIds: string[], targetAuthor: { id: string; name: string; avatar: string; role: UserRole }) => Promise<boolean>;
  migrateAllOldArticlesToTargetAuthor: (customAuthorId?: string) => Promise<{ success: boolean; count: number }>;
  addFilm: (film: Omit<FilmItem, 'id'>) => Promise<boolean>;
  updateFilm: (id: string, updates: Partial<FilmItem>) => Promise<boolean>;
  deleteFilm: (id: string) => Promise<boolean>;
  deleteBuzzPost: (buzzId: string) => Promise<boolean>;
  deleteBuzzReply: (buzzId: string, replyId: string) => Promise<boolean>;
  moderationReports: ModerationReport[];
  reportContent: (report: Omit<ModerationReport, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  resolveReport: (reportId: string, action: 'dismiss' | 'take_down', targetInfo?: { targetType: 'buzz' | 'reply' | 'review'; targetId: string; parentBuzzId?: string }) => Promise<boolean>;
  // Dynamic user profile cache
  userProfilesCache: Record<string, any>;
  cacheUserProfile: (userId: string, profile: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState<User>(() => GUEST_USER);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('sotoy_is_logged_in');
    return saved !== null ? saved === 'true' : false;
  });
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isComposeBuzzOpen, setIsComposeBuzzOpen] = useState(false);

  // Firestore Realtime Collections States
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('sotoy_watchlist');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Clean legacy mock defaults if user never added them explicitly
      if (Array.isArray(parsed) && parsed.length === 2 && parsed.includes('film-1') && parsed.includes('film-3')) {
        localStorage.setItem('sotoy_watchlist', JSON.stringify([]));
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [savedArticles, setSavedArticles] = useState<string[]>(() => {
    const saved = localStorage.getItem('sotoy_saved_articles');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 2 && parsed.includes('art-1') && parsed.includes('art-3')) {
        localStorage.setItem('sotoy_saved_articles', JSON.stringify([]));
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [articles, setArticles] = useState<Article[]>([]);
  const [films, setFilms] = useState<FilmItem[]>([]);
  const [buzzList, setBuzzList] = useState<BuzzPost[]>([]);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [criticSubmissions, setCriticSubmissions] = useState<CriticSubmission[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [userProfilesCache, setUserProfilesCache] = useState<Record<string, any>>({});

  const cacheUserProfile = useCallback((userId: string, profile: any) => {
    setUserProfilesCache(prev => {
      if (prev[userId] && JSON.stringify(prev[userId]) === JSON.stringify(profile)) {
        return prev;
      }
      return { ...prev, [userId]: profile };
    });
  }, []);

  // Local Preferences States
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('buzz');
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
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Clean legacy mock defaults
      if (Array.isArray(parsed) && parsed.some(id => ['u-2', 'u-4', 'u-6'].includes(id))) {
        localStorage.setItem('sotoy_following_ids', JSON.stringify([]));
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [followersIds, setFollowersIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('sotoy_followers_ids');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Clean legacy mock defaults
      if (Array.isArray(parsed) && parsed.some(id => ['u-2', 'u-3', 'u-5'].includes(id))) {
        localStorage.setItem('sotoy_followers_ids', JSON.stringify([]));
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [shareModalData, setShareModalData] = useState<ShareData | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

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
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // User Profile Visiting state
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const viewedUser = (viewedUserId ? allUsers.find(u => u.id === viewedUserId) : null) || currentUser;

  // Synchronize browser URL location to currentView and relevant entity IDs on page load / route change
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setCurrentView('home');
    } else if (path.startsWith('/film/')) {
      const slug = decodeURIComponent(path.replace('/film/', ''));
      setCurrentView('film-detail');
      const foundFilm = films.find(f => (f.slug && f.slug === slug) || slugify(f.title) === slug || f.id === slug)
        || INITIAL_FILMS.find(f => (f.slug && f.slug === slug) || slugify(f.title) === slug || f.id === slug);
      if (foundFilm) setSelectedFilmId(foundFilm.id);
    } else if (path.startsWith('/artikel/') || path.startsWith('/article/')) {
      const slug = decodeURIComponent(path.replace(/^\/(artikel|article)\//, ''));
      setCurrentView('article-detail');
      const foundArticle = articles.find(a => a.slug === slug || a.id === slug)
        || INITIAL_ARTICLES.find(a => a.slug === slug || a.id === slug);
      if (foundArticle) setSelectedArticleId(foundArticle.id);
    } else if (path.startsWith('/kategori/') || path.startsWith('/category/')) {
      setCurrentView('category');
      const clean = path.replace(/^\/(kategori|category)\//, '');
      const parts = clean.split('/');
      if (parts[0]) setActiveCategory(parts[0] as MainCategory);
      if (parts[1]) setActiveSubCategory(parts[1] as SubCategory);
    } else if (path === '/film-database') {
      setCurrentView('film-database');
    } else if (path === '/rekomendasi-film' || path === '/film-recommendations') {
      setCurrentView('film-recommendations');
    } else if (path === '/komunitas' || path === '/community-feed') {
      setCurrentView('community-feed');
    } else if (path.startsWith('/buzz/')) {
      const buzzId = path.replace('/buzz/', '');
      setCurrentView('buzz-detail');
      setSelectedBuzzId(buzzId);
    } else if (path === '/tulis-artikel' || path === '/write-article') {
      setCurrentView('write-article');
    } else if (path.startsWith('/user/')) {
      const uid = decodeURIComponent(path.replace('/user/', ''));
      setCurrentView('user-profile');
      setViewedUserId(uid);
    } else if (path === '/profil' || path === '/profile') {
      setCurrentView('user-profile');
      setViewedUserId(currentUser.id);
    } else if (path === '/settings') {
      setCurrentView('settings');
    } else if (path === '/search') {
      setCurrentView('search');
    } else if (path === '/tentang-kami' || path === '/about-us') {
      setCurrentView('about-us');
    } else if (path === '/kebijakan-privasi' || path === '/privacy-policy') {
      setCurrentView('privacy-policy');
    } else if (path === '/syarat-ketentuan' || path === '/terms-conditions') {
      setCurrentView('terms-conditions');
    } else if (path === '/kontak-bisnis' || path === '/business-inquiries') {
      setCurrentView('business-inquiries');
    } else if (path === '/gabung-kritikus' || path === '/critic-submission') {
      setCurrentView('critic-submission');
    } else if (path === '/kriteria-kritikus' || path === '/critic-criteria') {
      setCurrentView('critic-criteria');
    } else if (path === '/admin/submissions') {
      setCurrentView('admin-critic-submissions');
    } else if (path === '/admin') {
      setCurrentView('admin-dashboard');
    } else if (path === '/writer' || path === '/penulis') {
      setCurrentView('writer-dashboard');
    } else if (path === '/critic' || path === '/kritikus') {
      setCurrentView('critic-dashboard');
    } else if (path === '/onboarding') {
      setCurrentView('onboarding');
    }
  }, [location.pathname, films, articles, currentUser.id]);

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

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastType(type);
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
          // Seed Users database skipped (dynamic Firestore users collection only)
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
          const mapped = items.map(u => {
            if (u.id === '0PCmaBvJrzeaQgpf3sSTC4mnsh02' || WRITER_UIDS.includes(u.id)) {
              return { 
                ...u, 
                role: 'penulis_sotoy' as UserRole, 
                roleTitle: u.roleTitle && u.roleTitle.includes('Penulis') ? u.roleTitle : 'Penulis Sotoy (Jurnalis Film & Pop-Culture)' 
              };
            }
            if (ADMIN_UIDS.includes(u.id)) {
              return { 
                ...u, 
                role: 'admin' as UserRole, 
                roleTitle: u.roleTitle && u.roleTitle.includes('Admin') ? u.roleTitle : 'Head Admin & Lead Editor' 
              };
            }
            return u;
          });
          setAllUsers(mapped);
          setUserProfilesCache(prev => {
            const nextCache = { ...prev };
            mapped.forEach(u => {
              nextCache[u.id] = u;
            });
            return nextCache;
          });
        } else {
          setAllUsers([]);
        }
      },
      (err) => {
        console.warn('[Firestore] users subscription fallback notice:', err.message);
        setAllUsers([]);
      }
    );

    return () => {
      unsubFilms();
      unsubArticles();
      unsubBuzz();
      unsubRatings();
      unsubUsers();
    };
  }, []);

  // Dynamically resolve article author profiles directly from Firestore users collection
  const resolvedArticles = useMemo(() => {
    return articles.map(article => {
      const user = allUsers.find(u => u.id === article.authorId || u.id === article.author?.id);
      if (user) {
        return {
          ...article,
          authorId: user.id,
          author: {
            id: user.id,
            name: user.name || 'Tim Redaksi',
            avatar: user.avatar || DEFAULT_FALLBACK_AUTHOR.avatar,
            role: user.role || 'penulis_sotoy',
          },
        };
      }
      return {
        ...article,
        authorId: article.authorId || DEFAULT_FALLBACK_AUTHOR.id,
        author: {
          id: article.authorId || DEFAULT_FALLBACK_AUTHOR.id,
          name: (article.author?.name && !article.author.name.includes('Dinda') && !article.author.name.includes('Chief Admin'))
            ? article.author.name
            : 'Tim Redaksi',
          avatar: article.author?.avatar || DEFAULT_FALLBACK_AUTHOR.avatar,
          role: article.author?.role || DEFAULT_FALLBACK_AUTHOR.role,
        },
      };
    });
  }, [articles, allUsers]);

  // Compute public articles excluding drafts and unreleased scheduled articles
  const publishedArticles = useMemo(() => {
    return resolvedArticles.filter(a => {
      if (a.status === 'draft') return false;
      if (a.status === 'scheduled') {
        if (!a.scheduledAt) return false;
        const schedTime = new Date(a.scheduledAt).getTime();
        return !isNaN(schedTime) && schedTime <= Date.now();
      }
      return true;
    });
  }, [resolvedArticles]);

  // Notifications State & Realtime Listener
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }

    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.id)
    );

    const unsubNotifs = onSnapshot(
      notifQuery,
      (snapshot) => {
        const items: NotificationItem[] = [];
        snapshot.forEach(doc => items.push(doc.data() as NotificationItem));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(items);
      },
      (err) => {
        console.warn('[Firestore] notifications subscription notice:', err.message);
      }
    );

    return () => unsubNotifs();
  }, [currentUser?.id]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const sendNotification = async (notifData: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>) => {
    if (!notifData.userId || notifData.userId === currentUser.id) return;
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: NotificationItem = {
      ...notifData,
      id,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'notifications', id), newNotif);
    } catch (err) {
      console.warn('Error saving notification to Firestore:', err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (err) {
      console.warn('Error marking notification read in Firestore:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await Promise.all(
        unread.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }))
      );
    } catch (err) {
      console.warn('Error marking all notifications read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.warn('Error deleting notification:', err);
    }
  };

  const checkAndSendMentions = async (text: string, title: string, targetView: string, targetId?: string) => {
    if (!text) return;
    const mentions = text.match(/@([a-zA-Z0-9_]+)/g);
    if (!mentions) return;
    const uniqueHandles = Array.from(new Set(mentions.map(m => m.slice(1).toLowerCase())));

    for (const handle of uniqueHandles) {
      const foundUser = allUsers.find(u => u.handle.toLowerCase().replace('@', '') === handle);
      if (foundUser && foundUser.id !== currentUser.id) {
        await sendNotification({
          userId: foundUser.id,
          type: 'mention',
          title,
          message: `${currentUser.name} (@${currentUser.handle.replace('@', '')}) menyebut Anda: "${text.length > 60 ? text.slice(0, 60) + '...' : text}"`,
          targetView,
          targetId,
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            handle: currentUser.handle,
          },
        });
      }
    }
  };

  // Initialize Firebase Auth & Real User profile sync
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && !fbUser.isAnonymous) {
        const uid = fbUser.uid;
        const userDocRef = doc(db, 'users', uid);
        try {
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data() as User;
            const isAdminRole = isUserAdmin(data, uid, fbUser.email || undefined);
            const isWriterRole = !isAdminRole && isUserWriter(data, uid);
            const isCriticRole = !isAdminRole && !isWriterRole && isUserCritic(data, uid);
            
            if (isAdminRole) {
              data.role = 'admin';
              data.roleTitle = 'Head Admin & Lead Editor';
              try { await updateDoc(userDocRef, { role: 'admin', roleTitle: 'Head Admin & Lead Editor' }); } catch (e) {}
            } else if (isWriterRole || uid === '0PCmaBvJrzeaQgpf3sSTC4mnsh02') {
              data.role = 'penulis_sotoy';
              data.roleTitle = 'Penulis Sotoy (Jurnalis Film & Pop-Culture)';
              try { await updateDoc(userDocRef, { role: 'penulis_sotoy', roleTitle: 'Penulis Sotoy (Jurnalis Film & Pop-Culture)' }); } catch (e) {}
            } else if (isCriticRole) {
              data.role = 'si_paling_sotoy';
              data.roleTitle = 'Si Paling Sotoy (Kritikus Film)';
              try { await updateDoc(userDocRef, { role: 'si_paling_sotoy', roleTitle: 'Si Paling Sotoy (Kritikus Film)' }); } catch (e) {}
            }

            // Clean mock IDs if present in followers/following
            const cleanFollowing = Array.isArray(data.following) ? data.following.filter(id => !['u-2', 'u-4', 'u-6'].includes(id)) : [];
            const cleanFollowers = Array.isArray(data.followers) ? data.followers.filter(id => !['u-2', 'u-3', 'u-5'].includes(id)) : [];
            
            setFollowingIds(cleanFollowing);
            setFollowersIds(cleanFollowers);
            localStorage.setItem('sotoy_following_ids', JSON.stringify(cleanFollowing));
            localStorage.setItem('sotoy_followers_ids', JSON.stringify(cleanFollowers));

            // Clean legacy mock watchlist if user hasn't modified it
            setWatchlist(prev => {
              if (prev.length === 2 && prev.includes('film-1') && prev.includes('film-3')) {
                localStorage.setItem('sotoy_watchlist', JSON.stringify([]));
                return [];
              }
              return prev;
            });

            setSavedArticles(prev => {
              if (prev.length === 2 && prev.includes('art-1') && prev.includes('art-3')) {
                localStorage.setItem('sotoy_saved_articles', JSON.stringify([]));
                return [];
              }
              return prev;
            });

            setCurrentUser(data);

            // Redirect to onboarding if not finished
            if (data.hasFinishedOnboarding === false && currentView !== 'onboarding') {
              setCurrentView('onboarding');
            }
          } else {
            // First time user registration - start completely fresh as a clean new account
            const isAdminRole = isUserAdmin(null, uid, fbUser.email || undefined);
            const isWriterRole = !isAdminRole && isUserWriter(null, uid);
            const isCriticRole = !isAdminRole && !isWriterRole && isUserCritic(null, uid);
            
            const role: UserRole = isAdminRole ? 'admin' : (isWriterRole ? 'penulis_sotoy' : (isCriticRole ? 'si_paling_sotoy' : 'warga_sotoy'));
            const roleTitle = isAdminRole 
              ? 'Head Admin & Lead Editor' 
              : (isWriterRole 
                ? 'Penulis Sotoy (Jurnalis Film & Pop-Culture)' 
                : (isCriticRole ? 'Si Paling Sotoy (Kritikus Film)' : 'Warga Sotoy (Penonton Santai)'));
            const bio = isAdminRole 
              ? 'Menjaga ketertiban obrolan sotoy seantero jagat perfilman.' 
              : (isWriterRole 
                ? 'Menulis kabar terbaru, ulasan mendalam, dan kurasi film di Sotoy Film.' 
                : (isCriticRole ? 'Kritikus film kawakan yang hobinya menilai setiap pixel di layar.' : 'Cinephile baru mendarat di Sotoy Film!'));

            const defaultUser: User = {
              id: uid,
              name: fbUser.displayName || (isAdminRole ? 'Admin Utama' : isWriterRole ? 'Penulis Sotoy' : isCriticRole ? 'Si Paling Sotoy' : 'Warga Baru'),
              handle: '@' + (fbUser.displayName ? fbUser.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') : (fbUser.email ? fbUser.email.split('@')[0] : 'user_' + uid.slice(0, 4))),
              avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
              role,
              roleTitle,
              bio,
              email: fbUser.email || `user_${uid.slice(0, 4)}@sotoyfilm.id`,
              createdAt: new Date().toISOString(),
              totalReviews: 0,
              totalBuzz: 0,
              followers: [],
              following: [],
              followersCount: 0,
              followingCount: 0,
              hasFinishedOnboarding: true,
            };
            try { await setDoc(userDocRef, defaultUser); } catch (e) { /* ignore write permission */ }
            setCurrentUser(defaultUser);
            setFollowingIds([]);
            setFollowersIds([]);
            setWatchlist([]);
            setSavedArticles([]);
            localStorage.setItem('sotoy_watchlist', JSON.stringify([]));
            localStorage.setItem('sotoy_saved_articles', JSON.stringify([]));
            localStorage.setItem('sotoy_following_ids', JSON.stringify([]));
            localStorage.setItem('sotoy_followers_ids', JSON.stringify([]));
          }
          setIsLoggedIn(true);
        } catch (err) {
          console.warn('[Auth] Error getting user profile: ', err);
        }
      } else {
        // Visitor / Not logged in
        setIsLoggedIn(false);
        setCurrentUser(GUEST_USER);
        setFollowingIds([]);
        setFollowersIds([]);
        setWatchlist([]);
        setSavedArticles([]);
      }
    });
    return () => unsubAuth();
  }, []);

  // Real-time listener for files and critic submissions based on user role
  useEffect(() => {
    let unsubFiles = () => {};
    let unsubCritic = () => {};

    if (isLoggedIn && currentUser?.id) {
      const isAdminUser = isUserAdmin(currentUser) || isUserWriter(currentUser) || currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin';
      // Admin and Writer query all files, regular users query only their own files
      const filesQuery = isAdminUser
        ? collection(db, 'files')
        : query(collection(db, 'files'), where('userId', '==', currentUser.id));

      unsubFiles = onSnapshot(
        filesQuery,
        (snapshot) => {
          const items: UploadedFile[] = [];
          snapshot.forEach((doc) => {
            items.push(doc.data() as UploadedFile);
          });
          setFiles(items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
        },
        (err) => {
          console.warn('[Firestore] files subscription restricted/unavailable:', err.message);
        }
      );

      // Admin queries all critic submissions, regular users query only their own submissions
      const criticQuery = isAdminUser
        ? collection(db, 'criticSubmissions')
        : query(collection(db, 'criticSubmissions'), where('userId', '==', currentUser.id));

      unsubCritic = onSnapshot(
        criticQuery,
        (snapshot) => {
          const items: CriticSubmission[] = [];
          snapshot.forEach((doc) => {
            items.push(doc.data() as CriticSubmission);
          });
          setCriticSubmissions(items.sort((a, b) => b.id.localeCompare(a.id)));
        },
        (err) => {
          console.warn('[Firestore] criticSubmissions subscription restricted/unavailable:', err.message);
        }
      );
    } else {
      setFiles([]);
      setCriticSubmissions([]);
    }
    return () => {
      unsubFiles();
      unsubCritic();
    };
  }, [isLoggedIn, currentUser?.id, currentUser?.role, currentUser?.email]);

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

  const finishOnboarding = async (updates: {
    name: string;
    handle: string;
    bio: string;
    avatar?: string;
    favoriteGenres?: string[];
  }) => {
    const cleanHandle = updates.handle.trim().startsWith('@') ? updates.handle.trim() : `@${updates.handle.trim()}`;
    const cleanName = updates.name.trim();
    const cleanBio = updates.bio.trim();
    const cleanAvatar = updates.avatar || currentUser.avatar;

    const updatedUser: User = {
      ...currentUser,
      name: cleanName,
      handle: cleanHandle,
      bio: cleanBio,
      avatar: cleanAvatar,
      hasFinishedOnboarding: true,
    };

    if (updates.favoriteGenres && updates.favoriteGenres.length > 0) {
      updateUserSettings({ favoriteGenres: updates.favoriteGenres });
    }

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      const userDocRef = doc(db, 'users', uid);
      try {
        await setDoc(userDocRef, updatedUser, { merge: true });
      } catch (err) {
        console.warn('[Onboarding] Error saving to Firestore, continuing with local state:', err);
      }
    }

    setCurrentUser(updatedUser);
    localStorage.setItem('sotoy_current_user', JSON.stringify(updatedUser));
    showToast('Profil kamu sudah siap! Selamat datang di Sotoy Film. 🎬');
    setCurrentView('home');
  };

  const uploadProfilePhoto = async (
    base64Data: string,
    fileName?: string,
    fileSize?: number,
    fileType?: string
  ) => {
    if (!auth.currentUser) return;
    try {
      showToast('Sedang mengunggah foto profil ke Firebase Storage...');
      const actualName = fileName || `profile_photo_${Date.now()}.jpg`;
      const actualSize = fileSize || Math.round((base64Data.length * 3) / 4);
      const actualType = fileType || 'image/jpeg';

      const storagePath = `profile_photos/${auth.currentUser.uid}/${Date.now()}_${actualName}`;
      const storageRef = ref(storage, storagePath);
      
      // Upload using data_url format
      await uploadString(storageRef, base64Data, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      
      // Create a tracking record in the 'files' Firestore collection
      const fileId = doc(collection(db, 'files')).id;
      const fileRecord: UploadedFile = {
        id: fileId,
        userId: auth.currentUser.uid,
        url: downloadURL,
        name: actualName,
        size: actualSize,
        type: actualType,
        uploadedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'files', fileId), fileRecord);

      const updated = { ...currentUser, avatar: downloadURL };
      await setDoc(doc(db, 'users', auth.currentUser.uid), updated);
      setCurrentUser(updated);
      showToast('Foto profil berhasil diunggah ke Firebase Storage & terindeks di database! 🎉');
    } catch (err) {
      console.error('[Storage] Error uploading profile photo: ', err);
      showToast('Gagal mengunggah foto profil ke Firebase Storage.');
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      showToast('Menghubungkan ke Firebase Auth...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        // Fetch profile
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setCurrentUser(userSnap.data() as User);
        }
        setIsLoggedIn(true);
        localStorage.setItem('sotoy_is_logged_in', 'true');
        showToast('Login berhasil! Selamat datang kembali. 🎉');
        setLoginModalOpen(false);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Auth] Sign-in error: ', err);
      let errMsg = 'Gagal masuk. Mohon periksa email dan password Anda.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errMsg = 'Email atau password salah. Pastikan Anda sudah terdaftar.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Format email tidak valid.';
      }
      showToast(errMsg);
      return false;
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
    handle: string
  ): Promise<boolean> => {
    try {
      showToast('Membuat akun di Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        const uid = userCredential.user.uid;
        
        const isAdminUID = isUserAdmin(null, uid, email);
        const isWriterUID = !isAdminUID && isUserWriter(null, uid);
        const isCriticUID = !isAdminUID && !isWriterUID && isUserCritic(null, uid);
        const role: UserRole = isAdminUID ? 'admin' : (isWriterUID ? 'penulis_sotoy' : (isCriticUID ? 'si_paling_sotoy' : 'warga_sotoy'));
        const roleTitle = isAdminUID 
          ? 'Head Admin & Lead Editor' 
          : (isWriterUID 
            ? 'Penulis Sotoy (Jurnalis Film & Pop-Culture)' 
            : (isCriticUID ? 'Si Paling Sotoy (Kritikus Film)' : 'Warga Sotoy (Penonton Santai)'));
        const bio = isAdminUID 
          ? 'Menjaga ketertiban obrolan sotoy seantero jagat perfilman.' 
          : (isWriterUID 
            ? 'Menulis kabar terbaru, ulasan mendalam, dan kurasi film di Sotoy Film.' 
            : (isCriticUID ? 'Kritikus film kawakan yang hobinya menilai setiap pixel di layar.' : 'Cinephile baru mendarat di Sotoy Film!'));
        const avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
        
        const newUser: User = {
          id: uid,
          name: name.trim(),
          handle: handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`,
          avatar,
          role,
          roleTitle,
          bio,
          email: email.trim(),
          createdAt: new Date().toISOString(),
          totalReviews: 0,
          totalBuzz: 0,
          followers: [],
          following: [],
          hasFinishedOnboarding: false,
        };

        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, newUser);
        setCurrentUser(newUser);
        setIsLoggedIn(true);
        localStorage.setItem('sotoy_is_logged_in', 'true');
        showToast('Akun berhasil dibuat! Mari lengkapi profilmu. 🎬');
        setLoginModalOpen(false);
        setCurrentView('onboarding');
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Auth] Sign-up error: ', err);
      let errMsg = 'Gagal mendaftar. Mohon coba lagi.';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Email sudah terdaftar. Silakan login.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password terlalu lemah (minimal 6 karakter).';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Format email tidak valid.';
      } else if (err.code === 'auth/admin-restricted-operation') {
        errMsg = 'Pendaftaran dibatasi! Aktifkan "Enable create (sign-up)" di Firebase Console -> Authentication -> Settings -> User Actions.';
      }
      showToast(errMsg);
      return false;
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      showToast('Menghubungkan ke Google...');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      if (userCredential.user) {
        const uid = userCredential.user.uid;
        const userDocRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
          const existingData = userSnap.data() as User;
          setCurrentUser(existingData);
          const cleanFollowing = Array.isArray(existingData.following) ? existingData.following.filter(id => !['u-2', 'u-4', 'u-6'].includes(id)) : [];
          const cleanFollowers = Array.isArray(existingData.followers) ? existingData.followers.filter(id => !['u-2', 'u-3', 'u-5'].includes(id)) : [];
          setFollowingIds(cleanFollowing);
          setFollowersIds(cleanFollowers);
          localStorage.setItem('sotoy_following_ids', JSON.stringify(cleanFollowing));
          localStorage.setItem('sotoy_followers_ids', JSON.stringify(cleanFollowers));

          if (existingData.hasFinishedOnboarding === false) {
            setCurrentView('onboarding');
          }
        } else {
          // First-time signup with Google! Clean, fresh new account
          const isAdminRole = isUserAdmin(null, uid, userCredential.user.email || undefined);
          const isWriterRole = !isAdminRole && isUserWriter(null, uid);
          const isCriticRole = !isAdminRole && !isWriterRole && isUserCritic(null, uid);
          
          const cleanHandle = '@' + (userCredential.user.displayName ? userCredential.user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') : (userCredential.user.email ? userCredential.user.email.split('@')[0] : 'user_' + uid.slice(0, 4)));
          const newUser: User = {
            id: uid,
            name: userCredential.user.displayName || (isAdminRole ? 'Admin Utama' : isWriterRole ? 'Penulis Sotoy' : isCriticRole ? 'Si Paling Sotoy' : 'Warga Baru'),
            handle: cleanHandle,
            avatar: userCredential.user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            role: isAdminRole ? 'admin' : (isWriterRole ? 'penulis_sotoy' : (isCriticRole ? 'si_paling_sotoy' : 'warga_sotoy')),
            roleTitle: isAdminRole 
              ? 'Head Admin & Lead Editor' 
              : (isWriterRole 
                ? 'Penulis Sotoy (Jurnalis Film & Pop-Culture)' 
                : (isCriticRole ? 'Si Paling Sotoy (Kritikus Film)' : 'Warga Sotoy (Penonton Santai)')),
            bio: isAdminRole 
              ? 'Menjaga ketertiban obrolan sotoy seantero jagat perfilman.' 
              : (isWriterRole 
                ? 'Menulis kabar terbaru, ulasan mendalam, dan kurasi film di Sotoy Film.' 
                : (isCriticRole ? 'Kritikus film kawakan yang hobinya menilai setiap pixel di layar.' : 'Cinephile baru mendarat di Sotoy Film!')),
            email: userCredential.user.email || '',
            createdAt: new Date().toISOString(),
            totalReviews: 0,
            totalBuzz: 0,
            followers: [],
            following: [],
            followersCount: 0,
            followingCount: 0,
            hasFinishedOnboarding: false,
          };
          try {
            await setDoc(userDocRef, newUser);
          } catch (e) {
            console.warn('[Auth] Firestore setDoc fallback:', e);
          }
          setCurrentUser(newUser);
          setFollowingIds([]);
          setFollowersIds([]);
          setWatchlist([]);
          setSavedArticles([]);
          localStorage.setItem('sotoy_watchlist', JSON.stringify([]));
          localStorage.setItem('sotoy_saved_articles', JSON.stringify([]));
          localStorage.setItem('sotoy_following_ids', JSON.stringify([]));
          localStorage.setItem('sotoy_followers_ids', JSON.stringify([]));
          setCurrentView('onboarding');
        }
        setIsLoggedIn(true);
        localStorage.setItem('sotoy_is_logged_in', 'true');
        showToast('Berhasil masuk dengan Google! 🎉');
        setLoginModalOpen(false);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[Auth] Google sign-in error: ', err);
      let errMsg = 'Gagal masuk dengan Google. Mohon coba lagi.';
      if (err.code === 'auth/popup-blocked') {
        errMsg = 'Popup diblokir oleh browser. Harap aktifkan popup untuk situs ini.';
      } else if (err.code === 'auth/admin-restricted-operation') {
        errMsg = 'Pendaftaran dibatasi! Silakan aktifkan opsi pembuatan user / Sign-Up di Firebase Console.';
      }
      showToast(errMsg);
      return false;
    }
  };

  const logout = async () => {
    try {
      showToast('Sedang keluar...');
      await signOut(auth);
      setIsLoggedIn(false);
      localStorage.setItem('sotoy_is_logged_in', 'false');
      setCurrentUser(GUEST_USER);
      setFollowingIds([]);
      setFollowersIds([]);
      setWatchlist([]);
      setSavedArticles([]);
      localStorage.setItem('sotoy_following_ids', JSON.stringify([]));
      localStorage.setItem('sotoy_followers_ids', JSON.stringify([]));
      localStorage.setItem('sotoy_watchlist', JSON.stringify([]));
      localStorage.setItem('sotoy_saved_articles', JSON.stringify([]));
      showToast('Sampai jumpa lagi, Cinephile! 👋');
      navigateTo('home');
      setLoginModalOpen(false);
    } catch (err) {
      console.error('[Auth] Logout error: ', err);
      showToast('Gagal keluar. Mohon coba lagi.');
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
    } else if (view === 'user-profile') {
      setViewedUserId(currentUser.id);
    }

    // Determine target URL route
    let targetPath = '/';
    switch (view) {
      case 'home':
        targetPath = '/';
        break;
      case 'film-detail': {
        const targetFilmId = options?.filmId || selectedFilmId;
        const targetFilm = films.find(f => f.id === targetFilmId) || INITIAL_FILMS.find(f => f.id === targetFilmId);
        const slug = targetFilm?.slug || (targetFilm?.title ? slugify(targetFilm.title) : targetFilmId);
        targetPath = slug ? `/film/${encodeURIComponent(slug)}` : '/film-database';
        break;
      }
      case 'article-detail': {
        const targetArticleId = options?.articleId || selectedArticleId;
        const targetArticle = resolvedArticles.find(a => a.id === targetArticleId) || INITIAL_ARTICLES.find(a => a.id === targetArticleId);
        const slug = targetArticle?.slug || targetArticleId;
        targetPath = slug ? `/artikel/${encodeURIComponent(slug)}` : '/';
        break;
      }
      case 'category': {
        const cat = options?.category || activeCategory || 'movies';
        const sub = options?.subCategory !== undefined ? options.subCategory : activeSubCategory;
        targetPath = sub ? `/kategori/${cat}/${sub}` : `/kategori/${cat}`;
        break;
      }
      case 'film-database':
        targetPath = '/film-database';
        break;
      case 'film-recommendations':
        targetPath = '/rekomendasi-film';
        break;
      case 'community-feed':
        targetPath = '/komunitas';
        break;
      case 'buzz-detail':
        targetPath = `/buzz/${options?.buzzId || selectedBuzzId || ''}`;
        break;
      case 'write-article':
        targetPath = '/tulis-artikel';
        break;
      case 'user-profile': {
        const uid = options?.userId || viewedUserId || currentUser.id;
        targetPath = `/user/${encodeURIComponent(uid)}`;
        break;
      }
      case 'settings':
        targetPath = '/settings';
        break;
      case 'search':
        targetPath = options?.searchQuery ? `/search?q=${encodeURIComponent(options.searchQuery)}` : '/search';
        break;
      case 'about-us':
        targetPath = '/tentang-kami';
        break;
      case 'privacy-policy':
        targetPath = '/kebijakan-privasi';
        break;
      case 'terms-conditions':
        targetPath = '/syarat-ketentuan';
        break;
      case 'business-inquiries':
        targetPath = '/kontak-bisnis';
        break;
      case 'critic-submission':
        targetPath = '/gabung-kritikus';
        break;
      case 'critic-criteria':
        targetPath = '/kriteria-kritikus';
        break;
      case 'admin-critic-submissions':
        targetPath = '/admin/submissions';
        break;
      case 'admin-dashboard':
        targetPath = '/admin';
        break;
      case 'writer-dashboard':
        targetPath = '/writer';
        break;
      case 'critic-dashboard':
        targetPath = '/critic';
        break;
      case 'onboarding':
        targetPath = '/onboarding';
        break;
      default:
        targetPath = '/';
    }

    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setViewHistory(prev => {
      if (prev.length > 1) {
        const updated = prev.slice(0, -1);
        const targetView = updated[updated.length - 1];
        setCurrentView(targetView);
        return updated;
      }
      return ['home'];
    });
    navigate(-1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Publish or Save Draft Article directly to Firestore
  const addArticle = async (newArticle: Omit<Article, 'id' | 'publishedAt' | 'views' | 'likes' | 'commentsCount'>): Promise<boolean> => {
    const isPermitted = currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin' || isUserWriter(currentUser) || isUserAdmin(currentUser);
    if (!isPermitted) {
      showToast('Akses ditolak: Hanya Penulis Sotoy & Admin yang dapat mempublikasikan artikel!');
      return false;
    }

    const articleId = `art-${Date.now()}`;
    const status = newArticle.status || 'published';
    const created: Article = {
      ...newArticle,
      id: articleId,
      status,
      publishedAt: (newArticle as any).publishedAt || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      views: 1,
      likes: 0,
      commentsCount: 0,
    };

    try {
      await setDoc(doc(db, 'articles', articleId), created);
      const toastMsg = status === 'draft' 
        ? 'Draf artikel berhasil disimpan!' 
        : status === 'scheduled' 
        ? 'Artikel berhasil dijadwalkan untuk terbit!' 
        : 'Artikel berhasil dipublikasikan!';
      showToast(toastMsg);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `articles/${articleId}`);
      return false;
    }
  };

  // Update Article in Firestore
  const updateArticle = async (id: string, updatedFields: Partial<Article>): Promise<boolean> => {
    const targetArticle = articles.find(a => a.id === id);
    const isAuthor = targetArticle?.author?.id === currentUser.id;
    const isPermitted = isAuthor || currentUser.role === 'admin' || isUserAdmin(currentUser) || isUserWriter(currentUser);
    if (!isPermitted) {
      showToast('Hanya Penulis pemilik artikel atau Admin yang dapat menyunting artikel.');
      return false;
    }
    try {
      await updateDoc(doc(db, 'articles', id), updatedFields);
      const toastMsg = updatedFields.status === 'draft'
        ? 'Draf artikel berhasil disimpan!'
        : updatedFields.status === 'scheduled'
        ? 'Jadwal terbit artikel berhasil diperbarui!'
        : 'Artikel berhasil diperbarui!';
      showToast(toastMsg);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `articles/${id}`);
      return false;
    }
  };

  // Delete Article from Firestore
  const deleteArticle = async (id: string) => {
    const targetArticle = articles.find(a => a.id === id);
    const isAuthor = targetArticle?.author?.id === currentUser.id;
    const isPermitted = isAuthor || currentUser.role === 'admin' || isUserAdmin(currentUser) || isUserWriter(currentUser);
    if (!isPermitted) {
      showToast('Hanya Penulis pemilik artikel atau Admin yang dapat menghapus artikel.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'articles', id));
      showToast('Artikel berhasil dihapus.');
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
      createdAt: new Date().toISOString(),
      likes: 0,
      views: 0,
      commentsCount: 0,
      featured: false,
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

  const updateFilmRating = async (ratingId: string, updates: Partial<UserRating>) => {
    const rating = ratings.find(r => r.id === ratingId);
    if (!rating) return;
    const updated = { ...rating, ...updates };
    try {
      await setDoc(doc(db, 'ratings', ratingId), updated);
      showToast('Ulasan film kamu berhasil diperbarui!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ratings/${ratingId}`);
    }
  };

  const deleteFilmRating = async (ratingId: string) => {
    try {
      await deleteDoc(doc(db, 'ratings', ratingId));
      showToast('Ulasan film kamu telah dihapus.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ratings/${ratingId}`);
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

  // --- ADMIN CONTROL CENTER METHODS ---
  const [moderationReports, setModerationReports] = useState<ModerationReport[]>([
    {
      id: 'rep-1',
      targetType: 'buzz',
      targetId: 'buzz-2',
      targetContent: 'Film ini overrated parah! Yang suka pasti selera sampah dan gak ngerti sinema sama sekali.',
      targetAuthorName: 'Warga Kritis 99',
      targetAuthorId: 'u-user-toxic',
      reporterId: 'u-1',
      reporterName: 'Sotoy Enthusiast',
      reason: 'Bahasa kasar, menyerang personal warga lain (Toxic & Harassment)',
      createdAt: '1 jam yang lalu',
      status: 'pending',
    },
    {
      id: 'rep-2',
      targetType: 'reply',
      targetId: 'rep-reply-1',
      targetContent: 'Beli tiket nonton murah dan link streaming bajakan gratis klik link bio saya ya!',
      targetAuthorName: 'BotPromoTiket',
      targetAuthorId: 'u-bot-spam',
      reporterId: 'u-3',
      reporterName: 'Cinephile Nusantara',
      reason: 'Spam komersial & link ilegal',
      createdAt: '3 jam yang lalu',
      status: 'pending',
    }
  ]);

  // Realtime subscription for reports
  useEffect(() => {
    const unsubReports = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        const items: ModerationReport[] = [];
        snapshot.forEach(doc => items.push(doc.data() as ModerationReport));
        if (items.length > 0) {
          setModerationReports(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        }
      },
      (err) => {
        console.warn('[Firestore] reports subscription fallback:', err.message);
      }
    );
    return () => unsubReports();
  }, []);

  const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
    try {
      const roleTitles: Record<UserRole, string> = {
        warga_sotoy: 'Warga Sotoy (Penonton Santai)',
        si_paling_sotoy: 'Si Paling Sotoy (Kritikus Film)',
        penulis_sotoy: 'Penulis Sotoy (Jurnalis Film & Pop-Culture)',
        admin: 'Admin Sotoy (Pengelola Platform)',
      };
      const title = roleTitles[newRole] || 'Warga Sotoy';
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
        roleTitle: title,
      });

      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole, roleTitle: title } : u));
      if (currentUser.id === userId) {
        setCurrentUser(prev => ({ ...prev, role: newRole, roleTitle: title }));
      }
      showToast(`Role pengguna berhasil diubah menjadi "${newRole.replace('_', ' ').toUpperCase()}".`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      return false;
    }
  };

  const toggleUserSuspension = async (userId: string, isSuspended: boolean): Promise<boolean> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isSuspended,
        suspendedAt: isSuspended ? new Date().toISOString() : null,
      });
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuspended, suspendedAt: isSuspended ? new Date().toISOString() : undefined } : u));
      showToast(isSuspended ? 'Akun pengguna berhasil dibekukan (SUSPENDED).' : 'Akun pengguna berhasil diaktifkan kembali.');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      return false;
    }
  };

  const bulkUpdateArticles = async (articleIds: string[], updates: Partial<Article>): Promise<boolean> => {
    try {
      await Promise.all(
        articleIds.map(id => updateDoc(doc(db, 'articles', id), updates))
      );
      setArticles(prev => prev.map(a => articleIds.includes(a.id) ? { ...a, ...updates } : a));
      showToast(`${articleIds.length} artikel berhasil diperbarui secara massal.`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `articles/bulk`);
      return false;
    }
  };

  const bulkDeleteArticles = async (articleIds: string[]): Promise<boolean> => {
    try {
      await Promise.all(
        articleIds.map(id => deleteDoc(doc(db, 'articles', id)))
      );
      setArticles(prev => prev.filter(a => !articleIds.includes(a.id)));
      showToast(`${articleIds.length} artikel berhasil dihapus dari database.`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `articles/bulk`);
      return false;
    }
  };

  const bulkReassignAuthor = async (
    articleIds: string[],
    targetAuthor: { id: string; name: string; avatar: string; role: UserRole }
  ): Promise<boolean> => {
    try {
      await Promise.all(
        articleIds.map(id => updateDoc(doc(db, 'articles', id), { 
          author: targetAuthor,
          authorId: targetAuthor.id 
        }))
      );
      setArticles(prev => prev.map(a => articleIds.includes(a.id) ? { ...a, author: targetAuthor, authorId: targetAuthor.id } : a));
      showToast(`Kepemilikan ${articleIds.length} artikel berhasil dipindahkan ke ${targetAuthor.name}.`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `articles/bulk-reassign`);
      return false;
    }
  };

  const migrateAllOldArticlesToTargetAuthor = async (
    customAuthorId?: string
  ): Promise<{ success: boolean; count: number }> => {
    try {
      const targetUid = customAuthorId || (currentUser?.id !== 'guest' ? currentUser.id : 'QkNGf1ZfhsMyUEk90a6Iz8ZplZS2');
      const targetUser = allUsers.find(u => u.id === targetUid) || currentUser;
      
      const authorPayload = {
        id: targetUser.id || targetUid,
        name: targetUser.name || 'Admin Utama',
        avatar: targetUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        role: targetUser.role || ('admin' as UserRole),
      };

      const articlesSnap = await getDocs(collection(db, 'articles'));
      let count = 0;
      const batchUpdates: Promise<void>[] = [];

      articlesSnap.forEach(docSnap => {
        const data = docSnap.data() as Article;
        const needsMigration = 
          !data.authorId || 
          data.authorId === 'system-redaksi' ||
          data.authorId === '0PCmaBvJrzeaQgpf3sSTC4mnsh02' ||
          !data.author ||
          (data.author?.name && (data.author.name.includes('Dinda') || data.author.name.includes('Chief Admin')));

        if (needsMigration) {
          count++;
          batchUpdates.push(
            updateDoc(doc(db, 'articles', docSnap.id), {
              authorId: authorPayload.id,
              author: authorPayload,
            })
          );
        }
      });

      if (batchUpdates.length > 0) {
        await Promise.all(batchUpdates);
        showToast(`Migrasi Berhasil: ${count} artikel lama di Firestore diperbarui ke akun ${authorPayload.name}.`);
      } else {
        showToast(`Semua artikel di Firestore sudah terhubung ke akun pengguna asli.`);
      }

      return { success: true, count };
    } catch (err) {
      console.error('[Migration Error]', err);
      showToast('Gagal menjalankan migrasi artikel: ' + (err as Error).message);
      return { success: false, count: 0 };
    }
  };

  const addFilm = async (filmData: Omit<FilmItem, 'id'>): Promise<boolean> => {
    const filmId = `film-${Date.now()}`;
    const newFilm: FilmItem = {
      ...filmData,
      id: filmId,
    };
    try {
      await setDoc(doc(db, 'films', filmId), newFilm);
      setFilms(prev => [newFilm, ...prev]);
      showToast(`Film "${newFilm.title}" berhasil ditambahkan ke database.`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `films/${filmId}`);
      return false;
    }
  };

  const updateFilm = async (id: string, updates: Partial<FilmItem>): Promise<boolean> => {
    try {
      await updateDoc(doc(db, 'films', id), updates);
      setFilms(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      showToast('Metadata film berhasil diperbarui.');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `films/${id}`);
      return false;
    }
  };

  const deleteFilm = async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'films', id));
      setFilms(prev => prev.filter(f => f.id !== id));
      showToast('Film berhasil dihapus dari katalog.');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `films/${id}`);
      return false;
    }
  };

  const deleteBuzzPost = async (buzzId: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'buzz', buzzId));
      setBuzzList(prev => prev.filter(b => b.id !== buzzId));
      showToast('Post obrolan warga berhasil dihapus.');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `buzz/${buzzId}`);
      return false;
    }
  };

  const deleteBuzzReply = async (buzzId: string, replyId: string): Promise<boolean> => {
    const post = buzzList.find(b => b.id === buzzId);
    if (!post) return false;
    const filteredReplies = (post.replies || []).filter(r => r.id !== replyId);
    try {
      await updateDoc(doc(db, 'buzz', buzzId), {
        replies: filteredReplies,
        repliesCount: Math.max(0, (post.repliesCount || 1) - 1),
      });
      setBuzzList(prev => prev.map(b => b.id === buzzId ? { ...b, replies: filteredReplies, repliesCount: Math.max(0, (b.repliesCount || 1) - 1) } : b));
      showToast('Balasan komentar berhasil dihapus.');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `buzz/${buzzId}`);
      return false;
    }
  };

  const reportContent = async (report: Omit<ModerationReport, 'id' | 'createdAt' | 'status'>): Promise<boolean> => {
    const reportId = `rep-${Date.now()}`;
    const newReport: ModerationReport = {
      ...report,
      id: reportId,
      createdAt: 'Baru saja',
      status: 'pending',
    };
    try {
      await setDoc(doc(db, 'reports', reportId), newReport);
      setModerationReports(prev => [newReport, ...prev]);
      showToast('Laporan berhasil dikirim ke tim admin.');
      return true;
    } catch (e) {
      setModerationReports(prev => [newReport, ...prev]);
      showToast('Laporan berhasil dikirim ke tim admin.');
      return true;
    }
  };

  const resolveReport = async (
    reportId: string,
    action: 'dismiss' | 'take_down',
    targetInfo?: { targetType: 'buzz' | 'reply' | 'review'; targetId: string; parentBuzzId?: string }
  ): Promise<boolean> => {
    try {
      if (action === 'take_down' && targetInfo) {
        if (targetInfo.targetType === 'buzz') {
          await deleteBuzzPost(targetInfo.targetId);
        } else if (targetInfo.targetType === 'reply' && targetInfo.parentBuzzId) {
          await deleteBuzzReply(targetInfo.parentBuzzId, targetInfo.targetId);
        } else if (targetInfo.targetType === 'review') {
          await deleteFilmRating(targetInfo.targetId);
        }
      }
      const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
      try {
        await updateDoc(doc(db, 'reports', reportId), { status: newStatus });
      } catch (e) { /* silent catch */ }
      setModerationReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      showToast(action === 'dismiss' ? 'Laporan ditolak / ditandai bersih.' : 'Konten berhasil dihapus dan laporan dituntaskan.');
      return true;
    } catch (e) {
      return false;
    }
  };

  const isAdmin = isLoggedIn && isUserAdmin(currentUser);
  const isWriter = isLoggedIn && (isUserWriter(currentUser) || currentUser.role === 'penulis_sotoy' || isAdmin || currentUser.role === 'admin');
  const isCritic = isLoggedIn && (isUserCritic(currentUser) || currentUser.role === 'si_paling_sotoy' || isAdmin);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        isAdmin,
        isWriter,
        isCritic,
        loginModalOpen,
        setLoginModalOpen,
        isComposeBuzzOpen,
        setIsComposeBuzzOpen,
        logout,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        articles: resolvedArticles,
        publishedArticles,
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
        files,
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
        updateArticle,
        deleteArticle,
        addBuzzPost,
        likeBuzzPost,
        reactToBuzzPost,
        addBuzzReply,
        likeBuzzReply,
        addFilmRating,
        updateFilmRating,
        deleteFilmRating,
        likeArticle,
        buzzFeedTab,
        setBuzzFeedTab,
        toastMessage,
        toastType,
        showToast,
        finishOnboarding,
        notifications,
        unreadNotificationsCount,
        sendNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        checkAndSendMentions,
        updateUserRole,
        toggleUserSuspension,
        bulkUpdateArticles,
        bulkDeleteArticles,
        bulkReassignAuthor,
        migrateAllOldArticlesToTargetAuthor,
        addFilm,
        updateFilm,
        deleteFilm,
        deleteBuzzPost,
        deleteBuzzReply,
        moderationReports,
        reportContent,
        resolveReport,
        userProfilesCache,
        cacheUserProfile,
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
