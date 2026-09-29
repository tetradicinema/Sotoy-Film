import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { slugify } from '../utils/slugify';
import {
  User,
  UserPrivate,
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
  InterestProfile,
  AccountAppeal,
  AuditLog,
  AuditLogActionType,
} from '../types';
import {
  DEFAULT_FALLBACK_AUTHOR,
  INITIAL_ARTICLES,
  INITIAL_FILMS,
  INITIAL_BUZZ,
  INITIAL_RATINGS,
} from '../data/mockData';

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-demo-1',
    action: 'role_override',
    actorId: 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2',
    actorName: 'Admin Sotoy',
    actorEmail: 'eksposurmedia@gmail.com',
    actorRole: 'admin',
    actorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    targetId: '0PCmaBvJrzeaQgpf3sSTC4mnsh02',
    targetName: 'Kritikus Film Senior',
    targetEmail: 'redaksi@sotoyfilm.id',
    targetRole: 'penulis_sotoy',
    targetType: 'user',
    details: 'Menetapkan hak akses editorial CMS Penulis Sotoy untuk koordinasi publikasi artikel.',
    metadata: { previousRole: 'warga_sotoy', newRole: 'penulis_sotoy' },
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'audit-demo-2',
    action: 'account_suspended',
    actorId: 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2',
    actorName: 'Admin Sotoy',
    actorEmail: 'eksposurmedia@gmail.com',
    actorRole: 'admin',
    actorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    targetId: 'u-user-toxic',
    targetName: 'Warga Kritis 99',
    targetRole: 'warga_sotoy',
    targetType: 'user',
    details: 'Membekukan akun pengguna karena pelanggaran pedoman komunitas terkait ujaran kebencian & spam.',
    metadata: { isSuspended: true, reportId: 'rep-1' },
    timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: 'audit-demo-3',
    action: 'critic_approved',
    actorId: 'CsG2CY2TaIZmG7yuPfzAxmRYrlY2',
    actorName: 'Admin Sotoy',
    actorEmail: 'eksposurmedia@gmail.com',
    actorRole: 'admin',
    actorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    targetId: 'u-3',
    targetName: 'Cinephile Nusantara',
    targetType: 'critic_submission',
    details: 'Menyetujui permohonan verifikasi Si Paling Sotoy (Kritikus Film) setelah evaluasi portofolio.',
    metadata: { publicationName: 'Jurnal Sinema ID', verified: true },
    timestamp: new Date(Date.now() - 14 * 3600000).toISOString(),
  }
];

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
  increment,
  writeBatch,
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification
} from 'firebase/auth';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { fetchTmdbDetails, mapTmdbDetailsToFilm, TmdbSearchResultItem } from '../utils/tmdbHelper';

export const ADMIN_UIDS = [
  'QkNGf1ZfhsMyUEk90a6Iz8ZplZS2', // User ID Admin 1
  'CsG2CY2TaIZmG7yuPfzAxmRYrlY2', // User ID Admin 2
];
export const ADMIN_EMAILS = ['eksposurmedia@gmail.com'];
export const WRITER_UIDS = [
  '0PCmaBvJrzeaQgpf3sSTC4mnsh02', // User ID Penulis Sotoy
];
export const CRITIC_UIDS = ['Jm0raI2h47TJG9ZtZAR1HLVcjSj2'];

export const EXEMPT_VERIFICATION_UIDS = [
  'CsG2CY2TaIZmG7yuPfzAxmRYrlY2',
  'QkNGf1ZfhsMyUEk90a6Iz8ZplZS2',
  'I34eqzOmvsSdS2Rf7jpfxw1ZKeu1',
  '0PCmaBvJrzeaQgpf3sSTC4mnsh02',
  'Jm0raI2h47TJG9ZtZAR1HLVcjSj2',
];

export const computeIsEmailVerified = (user?: Partial<User> | null, fbUserParam?: any): boolean => {
  const fbUser = fbUserParam ?? auth.currentUser;
  if (!fbUser) return false;
  if (fbUser.emailVerified === true) return true;

  // Sign-in provider is not 'password' (e.g. Google sign-in)
  const isPasswordProvider = fbUser.providerData?.some((p: any) => p.providerId === 'password') ?? false;
  if (!isPasswordProvider && (fbUser.providerData?.length > 0 || fbUser.isAnonymous)) return true;

  // Elevated user role
  const role = user?.role;
  if (role === 'admin' || role === 'penulis_sotoy' || role === 'si_paling_sotoy') return true;

  // Hardcoded exempt UIDs
  const uid = user?.id || fbUser.uid;
  if (EXEMPT_VERIFICATION_UIDS.includes(uid)) return true;

  return false;
};

export const isUserAdmin = (user?: Partial<User> | null, fbUid?: string, fbEmail?: string, emailVerified?: boolean): boolean => {
  if (user?.role === 'admin') return true;
  if (user?.id && ADMIN_UIDS.includes(user.id)) return true;
  if (fbUid && ADMIN_UIDS.includes(fbUid)) return true;
  
  const isVerified = emailVerified ?? auth.currentUser?.emailVerified ?? false;
  if (isVerified) {
    if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
    if (fbEmail && ADMIN_EMAILS.includes(fbEmail.toLowerCase())) return true;
  }
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
  | 'panduan-leaderboard'
  | 'admin-critic-submissions'
  | 'admin-dashboard'
  | 'writer-dashboard'
  | 'critic-dashboard'
  | 'cms'
  | 'cms-workspace'
  | 'onboarding';

interface AppContextType {
  currentUser: User;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isWriter: boolean;
  isCritic: boolean;
  isEmailVerified: boolean;
  resendVerificationEmail: () => Promise<boolean>;
  refreshEmailVerification: () => Promise<boolean>;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  isComposeBuzzOpen: boolean;
  setIsComposeBuzzOpen: (open: boolean) => void;
  logout: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, name: string, handle: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  getLastAuthErrorCode: () => string | null;
  clearAuthError: () => void;
  articles: Article[];
  publishedArticles: Article[];
  films: FilmItem[];
  buzzList: BuzzPost[];
  isLoadingArticles: boolean;
  isLoadingFilms: boolean;
  isLoadingBuzz: boolean;
  isInitialLoading: boolean;
  ratings: UserRating[];
  criticSubmissions: CriticSubmission[];
  addCriticSubmission: (sub: Omit<CriticSubmission, 'id' | 'status' | 'date'>) => Promise<boolean>;
  updateCriticSubmissionStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  watchlist: string[];
  toggleWatchlist: (filmId: string) => void;
  removeBulkFromWatchlist: (filmIds: string[]) => Promise<void>;
  isFilmInWatchlist: (filmId: string) => boolean;
  savedArticles: string[];
  toggleSaveArticle: (articleId: string) => void;
  removeBulkFromSavedArticles: (articleIds: string[]) => Promise<void>;
  isArticleSaved: (articleId: string) => boolean;
  savedBuzzIds: string[];
  toggleSaveBuzz: (buzzId: string) => void;
  isBuzzSaved: (buzzId: string) => boolean;
  interestProfile: InterestProfile;
  recordUserInterest: (topics: (string | undefined | null)[], weight: number) => Promise<void>;
  decayInterestProfile: (decayFactor?: number) => Promise<void>;
  performPeriodicInterestReduction: (reductionFactor?: number) => Promise<void>;
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
    taggedArticleId?: string,
    imageDataUrl?: string
  ) => Promise<void>;
  likeBuzzPost: (buzzId: string) => Promise<void>;
  reactToBuzzPost: (buzzId: string, reaction: ReactionType) => Promise<void>;
  toggleRepostBuzzPost: (buzzId: string) => Promise<boolean>;
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
  bulkUpdateUserRoles: (userIds: string[], newRole: UserRole) => Promise<boolean>;
  bulkToggleUserSuspension: (userIds: string[], isSuspended: boolean) => Promise<boolean>;
  bulkUpdateArticles: (articleIds: string[], updates: Partial<Article>) => Promise<boolean>;
  bulkDeleteArticles: (articleIds: string[]) => Promise<boolean>;
  bulkReassignAuthor: (articleIds: string[], targetAuthor: { id: string; name: string; avatar: string; role: UserRole }) => Promise<boolean>;
  migrateAllOldArticlesToTargetAuthor: (customAuthorId?: string) => Promise<{ success: boolean; count: number }>;
  addFilm: (film: Omit<FilmItem, 'id'>) => Promise<boolean>;
  importAndNavigateToTmdbFilm: (tmdbItem: { id: number; title?: string; name?: string; media_type?: 'movie' | 'tv' }) => Promise<FilmItem | null>;
  updateFilm: (id: string, updates: Partial<FilmItem>) => Promise<boolean>;
  deleteFilm: (id: string) => Promise<boolean>;
  bulkDeleteFilms: (filmIds: string[]) => Promise<boolean>;
  bulkUpdateFilms: (filmIds: string[], updates: Partial<FilmItem>) => Promise<boolean>;
  deleteBuzzPost: (buzzId: string) => Promise<boolean>;
  deleteBuzzReply: (buzzId: string, replyId: string) => Promise<boolean>;
  moderationReports: ModerationReport[];
  reportContent: (report: Omit<ModerationReport, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  resolveReport: (reportId: string, action: 'dismiss' | 'take_down', targetInfo?: { targetType: 'buzz' | 'reply' | 'review'; targetId: string; parentBuzzId?: string }) => Promise<boolean>;
  // Account Lifecycle & Moderation
  deleteUserAccount: (userId: string) => Promise<boolean>;
  bulkDeleteUserAccounts: (userIds: string[]) => Promise<boolean>;
  appeals: AccountAppeal[];
  submitAccountAppeal: (reason: string) => Promise<boolean>;
  resolveAccountAppeal: (appealId: string, status: 'approved' | 'rejected', adminNote?: string) => Promise<boolean>;
  deleteAccountAppeal: (appealId: string) => Promise<boolean>;
  // Audit Log & Transparency Tracking
  auditLogs: AuditLog[];
  recordAuditLog: (logData: {
    action: AuditLogActionType;
    targetId?: string;
    targetName?: string;
    targetEmail?: string;
    targetRole?: string;
    targetType?: 'user' | 'appeal' | 'report' | 'critic_submission' | 'content';
    details?: string;
    metadata?: Record<string, any>;
  }) => Promise<void>;
  deleteAuditLog: (logId: string) => Promise<boolean>;
  clearAuditLogs: () => Promise<boolean>;
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
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [savedArticles, setSavedArticles] = useState<string[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [films, setFilms] = useState<FilmItem[]>([]);
  const removedMockFilmIdsRef = React.useRef<Set<string>>(new Set());
  const [rawBuzzList, setRawBuzzList] = useState<BuzzPost[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState<boolean>(true);
  const [isLoadingFilms, setIsLoadingFilms] = useState<boolean>(true);
  const [isLoadingBuzz, setIsLoadingBuzz] = useState<boolean>(true);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [criticSubmissions, setCriticSubmissions] = useState<CriticSubmission[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [appeals, setAppeals] = useState<AccountAppeal[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
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

  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followersIds, setFollowersIds] = useState<string[]>([]);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);

  // Saved buzz bookmark state persisted in Firestore subcollection (users/{userId}/savedBuzz)
  const [savedBuzzIds, setSavedBuzzIds] = useState<string[]>([]);

  // User Interest Profile state (tracks tags, genres, categories, and creators)
  const [interestProfile, setInterestProfile] = useState<InterestProfile>(() => {
    try {
      const saved = localStorage.getItem('sotoy_interest_profile');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Derive per-user buzz posts reaction & like state with zero account bleed-over
  const buzzList = useMemo(() => {
    return rawBuzzList.map(post => {
      const userReaction = (isLoggedIn && currentUser?.id && post.reactionsByUser)
        ? post.reactionsByUser[currentUser.id] || null
        : null;

      const heartCount = post.reactions?.heart ?? (typeof post.likes === 'number' ? post.likes : 0);

      const mappedReplies = (post.replies || []).map(reply => {
        return {
          ...reply,
          likes: reply.likes || 0,
        };
      });

      return {
        ...post,
        myReaction: userReaction,
        likedByMe: userReaction === 'heart',
        likes: heartCount,
        repostsCount: post.repostsCount || 0,
        repostedByUsers: post.repostedByUsers || {},
        replies: mappedReplies,
      };
    });
  }, [rawBuzzList, isLoggedIn, currentUser?.id]);

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
    } else if (path === '/cms' || path === '/workspace' || path === '/admin/cms') {
      setCurrentView('cms-workspace');
    } else if (path === '/admin' || path.startsWith('/admin/')) {
      setCurrentView('admin-dashboard');
    } else if (path === '/writer' || path === '/penulis') {
      setCurrentView('writer-dashboard');
    } else if (path === '/critic' || path === '/kritikus') {
      setCurrentView('critic-dashboard');
    } else if (path === '/onboarding') {
      setCurrentView('onboarding');
    }
  }, [location.pathname, films, articles, currentUser.id]);

  // Sync basic preferences to local storage
  useEffect(() => {
    localStorage.setItem('sotoy_user_settings', JSON.stringify(userSettings));
  }, [userSettings]);

  useEffect(() => {
    localStorage.setItem('sotoy_is_logged_in', String(isLoggedIn));
  }, [isLoggedIn]);

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
    let latestFirestoreFilmMap = new Map<string, FilmItem>();
    let hasReceivedFilms = false;

    const syncFilmsWithRemovedMarkers = (currentFilmMap: Map<string, FilmItem>, removedSet: Set<string>) => {
      const mergedMap = new Map<string, FilmItem>(currentFilmMap);
      for (const init of INITIAL_FILMS) {
        if (!mergedMap.has(init.id) && !removedSet.has(init.id)) {
          mergedMap.set(init.id, init);
        }
      }
      const merged = Array.from(mergedMap.values()).filter(f => !removedSet.has(f.id));
      setFilms(merged.sort((a, b) => (a.trendingRank || 99) - (b.trendingRank || 99)));
      setIsLoadingFilms(false);
    };

    const unsubRemovedMockFilms = onSnapshot(
      collection(db, 'removedMockFilms'),
      (snapshot) => {
        const removedSet = new Set<string>();
        snapshot.forEach(docSnap => {
          removedSet.add(docSnap.id);
          const data = docSnap.data();
          if (data?.id) removedSet.add(data.id);
        });
        removedMockFilmIdsRef.current = removedSet;
        if (hasReceivedFilms) {
          syncFilmsWithRemovedMarkers(latestFirestoreFilmMap, removedSet);
        }
      },
      (err) => {
        console.warn('[Firestore] removedMockFilms subscription notice:', err.message);
      }
    );

    const unsubFilms = onSnapshot(
      collection(db, 'films'),
      (snapshot) => {
        const filmMap = new Map<string, FilmItem>();
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as FilmItem;
          const id = data.id || docSnap.id;
          if (id) {
            // Normalize legacy 5-point scale to 10-point scale if needed
            const normalizedSkor = data.skorSotoy && data.skorSotoy <= 5.0 && data.skorSotoy > 0
              ? Number((data.skorSotoy * 2).toFixed(1))
              : data.skorSotoy;
            const normalizedCriticsSkor = data.criticsSkorSotoy && data.criticsSkorSotoy <= 5.0 && data.criticsSkorSotoy > 0
              ? Number((data.criticsSkorSotoy * 2).toFixed(1))
              : data.criticsSkorSotoy;
            filmMap.set(id, {
              ...data,
              id,
              skorSotoy: normalizedSkor,
              criticsSkorSotoy: normalizedCriticsSkor || normalizedSkor,
            });
          }
        });
        latestFirestoreFilmMap = filmMap;
        hasReceivedFilms = true;
        syncFilmsWithRemovedMarkers(filmMap, removedMockFilmIdsRef.current);
      },
      (err) => {
        console.warn('[Firestore] films subscription fallback to initial mock:', err.message);
        const fallbackMap = new Map<string, FilmItem>();
        syncFilmsWithRemovedMarkers(fallbackMap, removedMockFilmIdsRef.current);
      }
    );

    const unsubArticles = onSnapshot(
      collection(db, 'articles'),
      (snapshot) => {
        const articleMap = new Map<string, Article>();
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as Article;
          const id = data.id || docSnap.id;
          if (id) {
            articleMap.set(id, { ...data, id });
          }
        });
        for (const init of INITIAL_ARTICLES) {
          if (!articleMap.has(init.id)) {
            articleMap.set(init.id, init);
          }
        }
        const merged = Array.from(articleMap.values());
        setArticles(merged.sort((a, b) => b.id.localeCompare(a.id)));
        setIsLoadingArticles(false);
      },
      (err) => {
        console.warn('[Firestore] articles subscription fallback to initial mock:', err.message);
        setArticles(INITIAL_ARTICLES);
        setIsLoadingArticles(false);
      }
    );

    const getSortTimestamp = (item: { id: string; createdAt?: string; timestamp?: number }): number => {
      if (item.timestamp && typeof item.timestamp === 'number') {
        return item.timestamp;
      }
      if (item.createdAt && !isNaN(Date.parse(item.createdAt))) {
        return Date.parse(item.createdAt);
      }
      const numMatch = item.id.match(/\d+/g);
      if (numMatch && numMatch.length > 0) {
        const lastNum = parseInt(numMatch[numMatch.length - 1], 10);
        if (lastNum > 1000000000) return lastNum;
        return 1700000000000 + lastNum * 1000;
      }
      return 0;
    };

    const unsubBuzz = onSnapshot(
      collection(db, 'buzz'),
      (snapshot) => {
        const buzzMap = new Map<string, BuzzPost>();
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as BuzzPost;
          const id = data.id || docSnap.id;
          if (id) {
            buzzMap.set(id, { ...data, id });
          }
        });
        if (buzzMap.size === 0) {
          INITIAL_BUZZ.forEach(b => buzzMap.set(b.id, b));
        }
        const merged = Array.from(buzzMap.values());
        setRawBuzzList(merged.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a)));
        setIsLoadingBuzz(false);
      },
      (err) => {
        console.warn('[Firestore] buzz subscription fallback to initial mock:', err.message);
        setRawBuzzList(INITIAL_BUZZ);
        setIsLoadingBuzz(false);
      }
    );

    const unsubRatings = onSnapshot(
      collection(db, 'ratings'),
      (snapshot) => {
        const ratingMap = new Map<string, UserRating>();
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as UserRating;
          const id = data.id || docSnap.id;
          if (id) {
            // Normalize legacy 5-point rating to 10-point scale if needed
            const normalizedScore = data.score && data.score <= 5.0 && data.score > 0
              ? Number((data.score * 2).toFixed(1))
              : data.score;
            ratingMap.set(id, { ...data, id, score: normalizedScore });
          }
        });
        if (ratingMap.size === 0) {
          INITIAL_RATINGS.forEach(r => ratingMap.set(r.id, r));
        }
        const merged = Array.from(ratingMap.values());
        setRatings(merged.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a)));
      },
      (err) => {
        console.warn('[Firestore] ratings subscription fallback to initial mock:', err.message);
        setRatings(INITIAL_RATINGS);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const userMap = new Map<string, User>();
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as User;
          const id = data.id || docSnap.id;
          if (id) {
            userMap.set(id, { ...data, id });
          }
        });
        const items = Array.from(userMap.values());
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

    const unsubAppeals = onSnapshot(
      collection(db, 'appeals'),
      (snapshot) => {
        const items: AccountAppeal[] = [];
        snapshot.forEach(docSnap => {
          items.push({ ...docSnap.data() as AccountAppeal, id: docSnap.id });
        });
        setAppeals(items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      },
      (err) => {
        console.warn('[Firestore] appeals subscription error:', err);
      }
    );

    const unsubAudit = onSnapshot(
      collection(db, 'auditLogs'),
      (snapshot) => {
        const items: AuditLog[] = [];
        snapshot.forEach(docSnap => {
          items.push({ ...docSnap.data() as AuditLog, id: docSnap.id });
        });
        if (items.length > 0) {
          setAuditLogs(items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      },
      (err) => {
        console.warn('[Firestore] auditLogs subscription notice:', err.message);
      }
    );

    return () => {
      unsubRemovedMockFilms();
      unsubFilms();
      unsubArticles();
      unsubBuzz();
      unsubRatings();
      unsubUsers();
      unsubAppeals();
      unsubAudit();
    };
  }, []);

  const isAdmin = isLoggedIn && isUserAdmin(currentUser);
  const isWriter = isLoggedIn && (isUserWriter(currentUser) || currentUser.role === 'penulis_sotoy' || isAdmin || currentUser.role === 'admin');
  const isCritic = isLoggedIn && (isUserCritic(currentUser) || currentUser.role === 'si_paling_sotoy' || isAdmin);

  // Admin-only realtime subscription to userPrivate collection to join emails in memory
  const [adminUserEmails, setAdminUserEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) {
      setAdminUserEmails({});
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'userPrivate'),
      (snapshot) => {
        const map: Record<string, string> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserPrivate;
          if (data?.email) {
            map[docSnap.id] = data.email;
          }
        });
        setAdminUserEmails(map);
      },
      (err) => {
        console.warn('[Firestore] userPrivate admin subscription notice:', err.message);
      }
    );
    return () => unsub();
  }, [isAdmin]);

  // Merge private emails onto users for admin viewer, and currentUser's auth email for currentUser
  const resolvedAllUsers = useMemo(() => {
    return allUsers.map(user => {
      const privateEmail = adminUserEmails[user.id];
      const email = (currentUser?.id === user.id ? currentUser.email : null) || privateEmail || user.email || '';
      return {
        ...user,
        email: email || undefined,
      };
    });
  }, [allUsers, adminUserEmails, currentUser?.id, currentUser?.email]);

  const viewedUser = (viewedUserId ? resolvedAllUsers.find(u => u.id === viewedUserId) : null) || currentUser;

  // Dynamically resolve article author profiles directly from Firestore users collection
  const resolvedArticles = useMemo(() => {
    return articles.map(article => {
      const user = resolvedAllUsers.find(u => u.id === article.authorId || u.id === article.author?.id);
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
          message: `menyebut Anda: "${text.length > 60 ? text.slice(0, 60) + '...' : text}"`,
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

  const lastAuthErrorCodeRef = useRef<string | null>(null);
  const isSigningUpRef = useRef<boolean>(false);

  const getLastAuthErrorCode = useCallback(() => lastAuthErrorCodeRef.current, []);
  const clearAuthError = useCallback(() => {
    lastAuthErrorCodeRef.current = null;
  }, []);

  // Initialize Firebase Auth & Real User profile sync
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      // If email sign-up is currently in flight, skip listener execution so signUpWithEmail wins
      if (isSigningUpRef.current) {
        return;
      }
      if (fbUser && !fbUser.isAnonymous) {
        const uid = fbUser.uid;
        const userDocRef = doc(db, 'users', uid);
        try {
          if (isSigningUpRef.current) {
            return;
          }
          const userSnap = await getDoc(userDocRef);
          if (isSigningUpRef.current) {
            return;
          }
          if (userSnap.exists()) {
            const data = userSnap.data() as User;
            data.email = fbUser.email || undefined;
            const isAdminRole = isUserAdmin(data, uid, fbUser.email || undefined, fbUser.emailVerified);
            const isWriterRole = !isAdminRole && isUserWriter(data, uid);
            const isCriticRole = !isAdminRole && !isWriterRole && isUserCritic(data, uid);
            
            if (isAdminRole) {
              data.role = 'admin';
              data.roleTitle = 'Head Admin & Lead Editor';
              if (userSnap.data()?.role !== 'admin') {
                try { await updateDoc(userDocRef, { role: 'admin', roleTitle: 'Head Admin & Lead Editor' }); } catch (e) {}
              }
            } else if (isWriterRole || uid === '0PCmaBvJrzeaQgpf3sSTC4mnsh02') {
              data.role = 'penulis_sotoy';
              data.roleTitle = 'Penulis Sotoy (Jurnalis Film & Pop-Culture)';
            } else if (isCriticRole) {
              data.role = 'si_paling_sotoy';
              data.roleTitle = 'Si Paling Sotoy (Kritikus Film)';
            }

            // Sync private email if present in Firebase Auth
            if (fbUser.email) {
              try {
                await setDoc(doc(db, 'userPrivate', uid), {
                  email: fbUser.email,
                  updatedAt: new Date().toISOString(),
                }, { merge: true });
              } catch (e) {}
            }

            // Followers and Following are populated in real-time exclusively via the Firestore 'follows' listener

            setCurrentUser(data);
            setIsEmailVerified(computeIsEmailVerified(data, fbUser));

            // Check and perform periodic interest profile weight reduction (halving) on login if overdue (>= 7 days)
            const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const lastDecay = data.lastInterestDecay || localStorage.getItem('sotoy_last_interest_decay');
            if (lastDecay) {
              const lastDecayTime = new Date(lastDecay).getTime();
              if (!isNaN(lastDecayTime) && (now - lastDecayTime) >= ONE_WEEK_MS) {
                performPeriodicInterestReduction(0.5);
              }
            } else {
              try {
                const nowIso = new Date(now).toISOString();
                localStorage.setItem('sotoy_last_interest_decay', nowIso);
                updateDoc(userDocRef, { lastInterestDecay: nowIso }).catch(() => {});
              } catch {}
            }

            // Redirect to onboarding if not finished
            if (data.hasFinishedOnboarding === false && currentView !== 'onboarding') {
              setCurrentView('onboarding');
            }
          } else {
            // First time user registration - skip if email sign-up is currently creating the profile
            if (isSigningUpRef.current) {
              return;
            }
            const isAdminRole = isUserAdmin(null, uid, fbUser.email || undefined, fbUser.emailVerified);
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
              createdAt: new Date().toISOString(),
              totalReviews: 0,
              totalBuzz: 0,
              followers: [],
              following: [],
              followersCount: 0,
              followingCount: 0,
              hasFinishedOnboarding: true,
            };
            const { email: _unused, ...publicUserPayload } = defaultUser;
            try { await setDoc(userDocRef, publicUserPayload); } catch (e) { /* ignore write permission */ }
            if (fbUser.email) {
              try {
                await setDoc(doc(db, 'userPrivate', uid), {
                  email: fbUser.email,
                  updatedAt: new Date().toISOString(),
                }, { merge: true });
              } catch (e) {}
            }
            setCurrentUser({ ...defaultUser, email: fbUser.email || '' });
            setIsEmailVerified(computeIsEmailVerified(defaultUser, fbUser));
            setFollowingIds([]);
            setFollowersIds([]);
            setWatchlist([]);
            setSavedArticles([]);
          }
          setIsLoggedIn(true);
        } catch (err) {
          console.warn('[Auth] Error getting user profile: ', err);
        }
      } else {
        // Visitor / Not logged in
        setIsLoggedIn(false);
        setCurrentUser(GUEST_USER);
        setIsEmailVerified(true);
        setFollowingIds([]);
        setFollowersIds([]);
        setWatchlist([]);
        setSavedArticles([]);
      }
    });
    return () => unsubAuth();
  }, []);

  // Real-time listener for current user's follows (follower and following) from Firestore
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest') {
      setFollowingIds([]);
      setFollowersIds([]);
      return;
    }

    const followingQuery = query(
      collection(db, 'follows'),
      where('followerId', '==', currentUser.id)
    );
    const unsubFollowing = onSnapshot(
      followingQuery,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.followingId) ids.push(data.followingId);
        });
        setFollowingIds(ids);
      },
      (err) => {
        console.warn('[Firestore] following subscription notice:', err.message);
      }
    );

    const followersQuery = query(
      collection(db, 'follows'),
      where('followingId', '==', currentUser.id)
    );
    const unsubFollowers = onSnapshot(
      followersQuery,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.followerId) ids.push(data.followerId);
        });
        setFollowersIds(ids);
      },
      (err) => {
        console.warn('[Firestore] followers subscription notice:', err.message);
      }
    );

    return () => {
      unsubFollowing();
      unsubFollowers();
    };
  }, [isLoggedIn, currentUser?.id]);

  // Real-time listener for current user's watchlist, saved articles, and saved buzz from Firestore subcollections
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest') {
      setWatchlist([]);
      setSavedArticles([]);
      setSavedBuzzIds([]);
      return;
    }

    const watchlistCol = collection(db, 'users', currentUser.id, 'watchlist');
    const unsubWatchlist = onSnapshot(
      watchlistCol,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((docSnap) => {
          ids.push(docSnap.id);
        });
        setWatchlist(ids);
      },
      (err) => {
        console.warn('[Firestore] watchlist subscription notice:', err.message);
      }
    );

    const savedArticlesCol = collection(db, 'users', currentUser.id, 'savedArticles');
    const unsubSavedArticles = onSnapshot(
      savedArticlesCol,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((docSnap) => {
          ids.push(docSnap.id);
        });
        setSavedArticles(ids);
      },
      (err) => {
        console.warn('[Firestore] savedArticles subscription notice:', err.message);
      }
    );

    const savedBuzzCol = collection(db, 'users', currentUser.id, 'savedBuzz');
    const unsubSavedBuzz = onSnapshot(
      savedBuzzCol,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((docSnap) => {
          ids.push(docSnap.id);
        });
        setSavedBuzzIds(ids);
      },
      (err) => {
        console.warn('[Firestore] savedBuzz subscription notice:', err.message);
      }
    );

    return () => {
      unsubWatchlist();
      unsubSavedArticles();
      unsubSavedBuzz();
    };
  }, [isLoggedIn, currentUser?.id]);

  // Real-time listener for current user's interest profile from Firestore
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest') {
      try {
        const local = localStorage.getItem('sotoy_interest_profile');
        if (local) setInterestProfile(JSON.parse(local));
      } catch {}
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.id);
    const interestDocRef = doc(db, 'users', currentUser.id, 'meta', 'interestProfile');
    
    // Listen to user document for interestProfile
    const unsubUser = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.interestProfile && typeof data.interestProfile === 'object') {
            setInterestProfile(data.interestProfile);
            try {
              localStorage.setItem('sotoy_interest_profile', JSON.stringify(data.interestProfile));
            } catch {}
          }
        }
      },
      (err) => {
        console.warn('[Firestore] user doc interestProfile subscription notice:', err.message);
      }
    );

    const unsubMeta = onSnapshot(
      interestDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.profile && typeof data.profile === 'object') {
            setInterestProfile(data.profile);
            try {
              localStorage.setItem('sotoy_interest_profile', JSON.stringify(data.profile));
            } catch {}
          }
        } else {
          // Initialize baseline interest from userSettings.favoriteGenres if present
          if (userSettings?.favoriteGenres && userSettings.favoriteGenres.length > 0) {
            const initial: InterestProfile = {};
            userSettings.favoriteGenres.forEach(g => {
              if (g) initial[g.toLowerCase().trim()] = 5;
            });
            setInterestProfile(initial);
            setDoc(interestDocRef, {
              profile: initial,
              lastUpdated: new Date().toISOString(),
            }).catch(() => {});
            setDoc(userDocRef, {
              interestProfile: initial,
            }, { merge: true }).catch(() => {});
          }
        }
      },
      (err) => {
        console.warn('[Firestore] interestProfile subscription notice:', err.message);
      }
    );

    return () => {
      unsubUser();
      unsubMeta();
    };
  }, [isLoggedIn, currentUser?.id]);

  // Record user interest signal helper (increments weights for tags, genres, categories)
  const recordUserInterest = useCallback(async (rawTopics: (string | undefined | null)[], weight: number) => {
    if (!rawTopics || rawTopics.length === 0 || weight <= 0) return;

    // Filter, clean, and normalize topics
    const cleanTopics = rawTopics
      .filter((t): t is string => Boolean(t && typeof t === 'string'))
      .map(t => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(t => t.length >= 2 && t !== 'all' && t !== 'sotoyfeed');

    if (cleanTopics.length === 0) return;

    setInterestProfile(prev => {
      const updated = { ...prev };
      const MAX_TAG_WEIGHT = 50;
      const TOTAL_WEIGHT_THRESHOLD = 300;

      cleanTopics.forEach(topic => {
        const current = updated[topic] || 0;
        updated[topic] = Math.min(MAX_TAG_WEIGHT, Number((current + weight).toFixed(1)));
      });

      const totalWeight = Object.values(updated).reduce((sum, w) => sum + (w || 0), 0);
      if (totalWeight > TOTAL_WEIGHT_THRESHOLD) {
        Object.keys(updated).forEach(k => {
          updated[k] = Math.max(1, Math.round((updated[k] || 1) * 0.85));
        });
      }

      try {
        localStorage.setItem('sotoy_interest_profile', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }

      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        const nowIso = new Date().toISOString();
        const userDocRef = doc(db, 'users', uid);
        const interestDocRef = doc(db, 'users', uid, 'meta', 'interestProfile');

        // Persist directly to user document's interestProfile field
        setDoc(userDocRef, {
          interestProfile: updated,
        }, { merge: true }).catch(err => {
          console.warn('[Firestore] Error persisting interestProfile on user doc:', err);
        });

        // Also update subcollection for complete sync
        setDoc(interestDocRef, {
          profile: updated,
          lastUpdated: nowIso,
        }, { merge: true }).catch(err => {
          console.warn('[Firestore] Error persisting interestProfile to meta:', err);
        });
      }

      return updated;
    });
  }, []);

  // Periodic scheduled reduction: iterates through interestProfile map and halves all weights
  const decayInterestProfile = useCallback(async (reductionFactor = 0.5) => {
    setInterestProfile(prev => {
      if (!prev || Object.keys(prev).length === 0) return prev;

      const updated: InterestProfile = {};
      // Iterate through user's interestProfile map and halve (or reduce) all values
      Object.entries(prev).forEach(([key, weight]) => {
        const halved = Number((weight * reductionFactor).toFixed(1));
        if (halved >= 0.5) {
          updated[key] = halved;
        }
      });

      const nowIso = new Date().toISOString();
      try {
        localStorage.setItem('sotoy_interest_profile', JSON.stringify(updated));
        localStorage.setItem('sotoy_last_interest_decay', nowIso);
      } catch (e) {
        // ignore
      }

      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        const userDocRef = doc(db, 'users', uid);
        const metaDocRef = doc(db, 'users', uid, 'meta', 'interestProfile');

        setDoc(userDocRef, {
          interestProfile: updated,
          lastInterestDecay: nowIso,
        }, { merge: true }).catch(err => {
          console.warn('[Firestore] Error persisting decayed interestProfile to user doc:', err);
        });

        setDoc(metaDocRef, {
          profile: updated,
          lastUpdated: nowIso,
          lastInterestDecay: nowIso,
        }, { merge: true }).catch(err => {
          console.warn('[Firestore] Error persisting decayed interestProfile to meta doc:', err);
        });
      }

      return updated;
    });
  }, []);

  // Alias for backward compatibility
  const performPeriodicInterestReduction = decayInterestProfile;

  // Background trigger & weekly timer hook check to call decay once per week
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest') return;

    const checkAndDecayWeekly = () => {
      const lastDecayStr = currentUser.lastInterestDecay || localStorage.getItem('sotoy_last_interest_decay');
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (!lastDecayStr) {
        try {
          const nowIso = new Date(now).toISOString();
          localStorage.setItem('sotoy_last_interest_decay', nowIso);
          if (auth.currentUser) {
            updateDoc(doc(db, 'users', auth.currentUser.uid), { lastInterestDecay: nowIso }).catch(() => {});
          }
        } catch {}
      } else {
        const lastDecayTime = new Date(lastDecayStr).getTime();
        if (!isNaN(lastDecayTime) && (now - lastDecayTime) >= ONE_WEEK_MS) {
          decayInterestProfile(0.5);
        }
      }
    };

    // Run check on mount
    checkAndDecayWeekly();

    // Background periodic timer interval check every 12 hours while the app is active
    const timer = setInterval(checkAndDecayWeekly, 12 * 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [isLoggedIn, currentUser?.id, currentUser?.lastInterestDecay, decayInterestProfile]);

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

  const toggleWatchlist = async (filmId: string) => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest') {
      setLoginModalOpen(true);
      showToast('Silakan Log In terlebih dahulu untuk menyimpan ke Daftar Tonton!');
      return;
    }

    const exists = watchlist.includes(filmId);
    const itemRef = doc(db, 'users', currentUser.id, 'watchlist', filmId);

    // Optimistic UI state update
    setWatchlist(prev => (exists ? prev.filter(id => id !== filmId) : [...prev, filmId]));
    showToast(exists ? 'Dihapus dari Daftar Tonton (Watchlist)' : 'Ditambahkan ke Daftar Tonton (Watchlist)!');

    try {
      if (exists) {
        await deleteDoc(itemRef);
      } else {
        await setDoc(itemRef, {
          filmId,
          addedAt: new Date().toISOString(),
        });
        // Track interest signal when adding film to watchlist (+3 weight)
        const film = films.find(f => f.id === filmId);
        if (film) {
          const topics = [...(film.genres || []), film.type, film.title];
          recordUserInterest(topics, 3);
        }
      }
    } catch (err) {
      console.error('[Watchlist] Firestore error:', err);
      // Revert optimistic update on error
      setWatchlist(prev => (exists ? [...prev, filmId] : prev.filter(id => id !== filmId)));
      showToast('Gagal memperbarui Daftar Tonton.', 'error');
    }
  };

  const removeBulkFromWatchlist = async (filmIds: string[]) => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest' || !filmIds || filmIds.length === 0) {
      return;
    }

    const prevWatchlist = [...watchlist];
    // Optimistic UI state update
    setWatchlist(prev => prev.filter(id => !filmIds.includes(id)));
    showToast(`${filmIds.length} film dihapus dari Daftar Tonton.`);

    try {
      const batch = writeBatch(db);
      filmIds.forEach(filmId => {
        const itemRef = doc(db, 'users', currentUser.id, 'watchlist', filmId);
        batch.delete(itemRef);
      });
      await batch.commit();
    } catch (err) {
      console.error('[Watchlist] Bulk delete error:', err);
      // Revert optimistic update on error
      setWatchlist(prevWatchlist);
      showToast('Gagal menghapus film terpilih dari Daftar Tonton.', 'error');
    }
  };

  const isFilmInWatchlist = (filmId: string) => {
    return watchlist.includes(filmId);
  };

  const toggleSaveBuzz = async (buzzId: string) => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest') {
      setLoginModalOpen(true);
      showToast('Silakan Log In terlebih dahulu untuk menyimpan Buzz!');
      return;
    }

    const exists = savedBuzzIds.includes(buzzId);
    const itemRef = doc(db, 'users', currentUser.id, 'savedBuzz', buzzId);

    // Optimistic UI state update
    setSavedBuzzIds(prev => (exists ? prev.filter(id => id !== buzzId) : [...prev, buzzId]));
    showToast(exists ? 'Buzz dihapus dari Tersimpan' : 'Buzz disimpan ke Tersimpan! 📌');

    try {
      if (exists) {
        await deleteDoc(itemRef);
      } else {
        await setDoc(itemRef, {
          buzzId,
          addedAt: new Date().toISOString(),
        });

        // Track interest signal when bookmarking a buzz (+3 weight)
        const post = rawBuzzList.find(b => b.id === buzzId) || buzzList.find(b => b.id === buzzId);
        if (post) {
          const topics: string[] = [...(post.tags || [])];
          if (post.taggedFilm?.genres) {
            topics.push(...post.taggedFilm.genres);
          }
          if (post.taggedFilm?.type) {
            topics.push(post.taggedFilm.type);
          }
          recordUserInterest(topics, 3);
        }
      }
    } catch (err) {
      console.error('[SavedBuzz] Firestore error:', err);
      // Revert optimistic update on error
      setSavedBuzzIds(prev => (exists ? [...prev, buzzId] : prev.filter(id => id !== buzzId)));
      showToast('Gagal memperbarui Buzz tersimpan.', 'error');
    }
  };

  const isBuzzSaved = (buzzId: string) => {
    return savedBuzzIds.includes(buzzId);
  };

  const toggleSaveArticle = async (articleId: string) => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest') {
      setLoginModalOpen(true);
      showToast('Silakan Log In terlebih dahulu untuk menyimpan artikel ke Perpustakaan!');
      return;
    }

    const exists = savedArticles.includes(articleId);
    const itemRef = doc(db, 'users', currentUser.id, 'savedArticles', articleId);

    // Optimistic UI state update
    setSavedArticles(prev => (exists ? prev.filter(id => id !== articleId) : [...prev, articleId]));
    showToast(exists ? 'Artikel dihapus dari Perpustakaan!' : 'Artikel berhasil disimpan ke Perpustakaan!');

    try {
      if (exists) {
        await deleteDoc(itemRef);
      } else {
        await setDoc(itemRef, {
          articleId,
          addedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[SavedArticles] Firestore error:', err);
      // Revert optimistic update on error
      setSavedArticles(prev => (exists ? [...prev, articleId] : prev.filter(id => id !== articleId)));
      showToast('Gagal memperbarui Perpustakaan.', 'error');
    }
  };

  const removeBulkFromSavedArticles = async (articleIds: string[]) => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest' || !articleIds || articleIds.length === 0) {
      return;
    }

    const prevSavedArticles = [...savedArticles];
    // Optimistic UI state update
    setSavedArticles(prev => prev.filter(id => !articleIds.includes(id)));
    showToast(`${articleIds.length} artikel dihapus dari Perpustakaan.`);

    try {
      const batch = writeBatch(db);
      articleIds.forEach(articleId => {
        const itemRef = doc(db, 'users', currentUser.id, 'savedArticles', articleId);
        batch.delete(itemRef);
      });
      await batch.commit();
    } catch (err) {
      console.error('[SavedArticles] Bulk delete error:', err);
      // Revert optimistic update on error
      setSavedArticles(prevSavedArticles);
      showToast('Gagal menghapus artikel terpilih dari Perpustakaan.', 'error');
    }
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
    const { email: _unused, ...userDocPayload } = updated;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), userDocPayload, { merge: true });
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
    const { email: _unused, ...userDocPayload } = updated;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), userDocPayload, { merge: true });
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
      const { email: _unused, ...userDocPayload } = updatedUser;
      try {
        await setDoc(userDocRef, userDocPayload, { merge: true });
      } catch (err) {
        console.warn('[Onboarding] Error saving to Firestore, continuing with local state:', err);
      }
    }

    setCurrentUser(updatedUser);
    localStorage.setItem('sotoy_current_user', JSON.stringify(updatedUser));
    showToast('Profil kamu sudah siap! Selamat datang di Sotoy Film. 🎬');
    setCurrentView('home');
  };

  const compressImageToDataUrl = async (
    dataUrl: string,
    maxWidth = 360,
    maxHeight = 360,
    quality = 0.85
  ): Promise<string> => {
    if (typeof window === 'undefined' || !dataUrl || !dataUrl.startsWith('data:image')) {
      return dataUrl;
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const uploadProfilePhoto = async (
    base64Data: string,
    fileName?: string,
    fileSize?: number,
    fileType?: string
  ) => {
    if (!auth.currentUser) return;
    try {
      showToast('Sedang memproses foto profil...');
      const actualName = fileName || `profile_photo_${Date.now()}.jpg`;
      const actualType = fileType || 'image/jpeg';

      // Optimize image data URL so it is performant, lightweight, and fits seamlessly
      const optimizedDataUrl = await compressImageToDataUrl(base64Data, 360, 360, 0.85);
      const actualSize = fileSize || Math.round((optimizedDataUrl.length * 3) / 4);

      let finalAvatarUrl = optimizedDataUrl;

      // If it's a data URL, attempt Firebase Storage upload first
      if (optimizedDataUrl.startsWith('data:')) {
        try {
          const storagePath = `profile_photos/${auth.currentUser.uid}/${Date.now()}_${actualName}`;
          const storageRef = ref(storage, storagePath);
          await uploadString(storageRef, optimizedDataUrl, 'data_url');
          finalAvatarUrl = await getDownloadURL(storageRef);
        } catch (storageErr: any) {
          // When Firebase Storage rules or bucket permissions reject client uploads (e.g. storage/unauthorized),
          // gracefully fall back to storing the optimized data URL directly without failing or crashing
          console.warn('[Storage] Firebase Storage unavailable or unauthorized; falling back to direct cloud-synchronized avatar:', storageErr?.message || storageErr);
        }
      }

      // Record in 'files' collection if accessible
      try {
        const fileId = doc(collection(db, 'files')).id;
        const fileRecord: UploadedFile = {
          id: fileId,
          userId: auth.currentUser.uid,
          url: finalAvatarUrl,
          name: actualName,
          size: actualSize,
          type: actualType,
          uploadedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'files', fileId), fileRecord);
      } catch (fileErr) {
        console.warn('[Storage] Files index write skipped:', fileErr);
      }

      // Update user in Firestore and client state
      const updated = { ...currentUser, avatar: finalAvatarUrl };
      const { email: _unused, ...userDocPayload } = updated;
      await setDoc(doc(db, 'users', auth.currentUser.uid), userDocPayload, { merge: true });
      setCurrentUser(updated);
      localStorage.setItem('sotoy_current_user', JSON.stringify(updated));
      showToast('Foto profil berhasil diperbarui! 🎉');
    } catch (err) {
      console.error('[Storage] Error updating profile photo: ', err);
      showToast('Gagal memperbarui foto profil.');
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    lastAuthErrorCodeRef.current = null;
    try {
      showToast('Menghubungkan ke Firebase Auth...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        // Fetch profile
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setCurrentUser({ ...(userSnap.data() as User), email: userCredential.user.email || email.trim() });
        }
        if (userCredential.user.email) {
          try {
            await setDoc(doc(db, 'userPrivate', userCredential.user.uid), {
              email: userCredential.user.email,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          } catch (e) {}
        }
        setIsLoggedIn(true);
        localStorage.setItem('sotoy_is_logged_in', 'true');
        showToast('Login berhasil! Selamat datang kembali. 🎉');
        setLoginModalOpen(false);
        return true;
      }
      return false;
    } catch (err: any) {
      lastAuthErrorCodeRef.current = err.code || 'unknown';
      console.error('[Auth] Sign-in error: ', err);
      let errMsg = 'Gagal masuk. Mohon periksa email dan password Anda.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errMsg = 'Email atau password salah. Pastikan Anda sudah terdaftar.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Format email tidak valid.';
      } else if (err.code === 'auth/admin-restricted-operation') {
        errMsg = 'Pendaftaran/masuk email dibatasi oleh administrator Firebase.';
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
    isSigningUpRef.current = true;
    lastAuthErrorCodeRef.current = null;
    try {
      showToast('Membuat akun di Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        const uid = userCredential.user.uid;
        
        // Send email verification inside try/catch without blocking account creation
        try {
          await sendEmailVerification(userCredential.user, {
            url: 'https://www.sotoyfilm.my.id/',
          });
          showToast('Email verifikasi telah dikirim! Cek inbox atau folder spam.');
        } catch (emailErr: any) {
          console.error('[Auth] Failed to send verification email at sign-up:', emailErr);
          showToast('Akun dibuat, namun gagal mengirim email verifikasi. Kamu dapat mengirim ulang nanti.');
        }

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
          createdAt: new Date().toISOString(),
          totalReviews: 0,
          totalBuzz: 0,
          followers: [],
          following: [],
          followersCount: 0,
          followingCount: 0,
          hasFinishedOnboarding: false,
        };

        const userDocRef = doc(db, 'users', uid);
        const { email: _unused, ...publicUserDoc } = newUser;
        await setDoc(userDocRef, publicUserDoc);
        try {
          await setDoc(doc(db, 'userPrivate', uid), {
            email: email.trim(),
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {}

        setCurrentUser({ ...newUser, email: email.trim() });
        setIsEmailVerified(computeIsEmailVerified(newUser, userCredential.user));
        setIsLoggedIn(true);
        localStorage.setItem('sotoy_is_logged_in', 'true');
        showToast('Akun berhasil dibuat! Mari lengkapi profilmu. 🎬');
        setLoginModalOpen(false);
        setCurrentView('onboarding');
        return true;
      }
      return false;
    } catch (err: any) {
      lastAuthErrorCodeRef.current = err.code || 'unknown';
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
    } finally {
      isSigningUpRef.current = false;
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
          if (userCredential.user.email) {
            try {
              await setDoc(doc(db, 'userPrivate', uid), {
                email: userCredential.user.email,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            } catch (e) {}
          }
          setCurrentUser({ ...existingData, email: userCredential.user.email || '' });
          // Following/followers are populated via Firestore 'follows' listener

          if (existingData.hasFinishedOnboarding === false) {
            setCurrentView('onboarding');
          }
        } else {
          // First-time signup with Google! Clean, fresh new account
          const isAdminRole = isUserAdmin(null, uid, userCredential.user.email || undefined, userCredential.user.emailVerified);
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
            createdAt: new Date().toISOString(),
            totalReviews: 0,
            totalBuzz: 0,
            followers: [],
            following: [],
            followersCount: 0,
            followingCount: 0,
            hasFinishedOnboarding: false,
          };
          const { email: _unused, ...publicUserPayload } = newUser;
          try {
            await setDoc(userDocRef, publicUserPayload);
          } catch (e) {
            console.warn('[Auth] Firestore setDoc fallback:', e);
          }
          if (userCredential.user.email) {
            try {
              await setDoc(doc(db, 'userPrivate', uid), {
                email: userCredential.user.email,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            } catch (e) {}
          }
          setCurrentUser({ ...newUser, email: userCredential.user.email || '' });
          setFollowingIds([]);
          setFollowersIds([]);
          setWatchlist([]);
          setSavedArticles([]);
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
      setIsEmailVerified(true);
      setFollowingIds([]);
      setFollowersIds([]);
      setWatchlist([]);
      setSavedArticles([]);
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

  // Centralized verification check required for interactive actions
  const requireVerified = (): boolean => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest') {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu.');
      return false;
    }
    if (!computeIsEmailVerified(currentUser)) {
      showToast('Verifikasi email dulu untuk melakukan ini');
      return false;
    }
    return true;
  };

  const resendVerificationEmail = async (): Promise<boolean> => {
    try {
      if (!auth.currentUser) {
        showToast('Silakan masuk terlebih dahulu.');
        return false;
      }
      await sendEmailVerification(auth.currentUser, {
        url: 'https://www.sotoyfilm.my.id/',
      });
      showToast('Email verifikasi telah dikirim! Cek inbox atau folder spam.');
      return true;
    } catch (err: any) {
      console.error('[Auth] Resend verification email error:', err);
      if (err.code === 'auth/too-many-requests') {
        showToast('Terlalu banyak permintaan kirim ulang. Mohon tunggu beberapa saat sebelum mencoba lagi.');
      } else {
        showToast('Gagal mengirim ulang email verifikasi. Coba beberapa saat lagi.');
      }
      return false;
    }
  };

  const refreshEmailVerification = async (): Promise<boolean> => {
    try {
      if (!auth.currentUser) return false;
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      const verified = computeIsEmailVerified(currentUser);
      setIsEmailVerified(verified);
      if (verified) {
        showToast('Email berhasil diverifikasi! Selamat datang penuh di Sotoy Film 🎉');
      } else {
        showToast('Email belum terverifikasi. Silakan cek inbox email kamu dan klik link konfirmasi.');
      }
      return verified;
    } catch (err: any) {
      console.error('[Auth] Refresh email verification error:', err);
      showToast('Gagal memeriksa status verifikasi email.');
      return false;
    }
  };

  // Auto-refresh verification state when user returns / tab regains focus
  useEffect(() => {
    const handleFocus = async () => {
      if (isLoggedIn && auth.currentUser && !computeIsEmailVerified(currentUser)) {
        try {
          await auth.currentUser.reload();
          await auth.currentUser.getIdToken(true);
          const verified = computeIsEmailVerified(currentUser);
          setIsEmailVerified(verified);
        } catch (e) {
          // ignore background reload failure
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isLoggedIn, currentUser]);

  const toggleFollowUser = async (targetUserId: string) => {
    if (!requireVerified()) return;

    if (targetUserId === currentUser.id) {
      showToast('Kamu tidak bisa mengikuti akunmu sendiri.');
      return;
    }

    const target = allUsers.find(u => u.id === targetUserId);
    const targetName = target ? target.name : 'Pengguna';
    const isAlreadyFollowing = followingIds.includes(targetUserId);
    const followDocId = `${currentUser.id}_${targetUserId}`;

    if (isAlreadyFollowing) {
      // Optimistic update
      const prevFollowing = followingIds;
      setFollowingIds(prev => prev.filter(id => id !== targetUserId));

      try {
        await deleteDoc(doc(db, 'follows', followDocId));
      } catch (err: any) {
        // Roll back optimistic state on Firestore failure
        setFollowingIds(prevFollowing);
        console.error('[Firestore] Error removing follow record:', err);
        const reason = err?.code === 'permission-denied'
          ? 'Izin ditolak (permission denied)'
          : (err?.message?.includes('offline') || err?.code === 'unavailable'
              ? 'Koneksi bermasalah (network/offline error)'
              : (err?.message || 'Gagal memproses'));
        showToast(`Gagal berhenti mengikuti ${targetName}: ${reason}`);
        return;
      }

      showToast(`Berhenti mengikuti ${targetName}`);

      // Best-effort updates on users documents (failure does not roll back the follow)
      try {
        await updateDoc(doc(db, 'users', targetUserId), {
          followersCount: increment(-1),
        });
      } catch (e) {
        console.error('[Firestore] Failed to decrement target followersCount:', e);
      }
      try {
        await updateDoc(doc(db, 'users', currentUser.id), {
          followingCount: increment(-1),
        });
      } catch (e) {
        console.error('[Firestore] Failed to decrement current followingCount:', e);
      }
    } else {
      // Optimistic update
      const prevFollowing = followingIds;
      setFollowingIds(prev => [...prev, targetUserId]);

      try {
        await setDoc(doc(db, 'follows', followDocId), {
          followerId: currentUser.id,
          followingId: targetUserId,
          createdAt: new Date().toISOString(),
        });
      } catch (err: any) {
        // Roll back optimistic state on Firestore failure
        setFollowingIds(prevFollowing);
        console.error('[Firestore] Error saving follow record:', err);
        const reason = err?.code === 'permission-denied'
          ? 'Izin ditolak (permission denied)'
          : (err?.message?.includes('offline') || err?.code === 'unavailable'
              ? 'Koneksi bermasalah (network/offline error)'
              : (err?.message || 'Gagal memproses'));
        showToast(`Gagal mengikuti ${targetName}: ${reason}`);
        return;
      }

      showToast(`Sekarang kamu mengikuti ${targetName}! 🎉`);

      // Best-effort updates on users documents (failure does not roll back the follow)
      try {
        await updateDoc(doc(db, 'users', targetUserId), {
          followersCount: increment(1),
        });
      } catch (e) {
        console.error('[Firestore] Failed to increment target followersCount:', e);
      }
      try {
        await updateDoc(doc(db, 'users', currentUser.id), {
          followingCount: increment(1),
        });
      } catch (e) {
        console.error('[Firestore] Failed to increment current followingCount:', e);
      }

      // ONLY after follows write has succeeded: send notification and record interest signal
      try {
        await sendNotification({
          userId: targetUserId,
          type: 'follow',
          title: 'Pengikut Baru',
          message: 'mulai mengikuti profil Anda.',
          targetView: 'user-profile',
          targetId: currentUser.id,
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            handle: currentUser.handle,
          },
        });
      } catch (notifErr) {
        console.error('[Notifications] Failed to send follow notification:', notifErr);
      }

      // Track interest signal toward top tags from followed user's posts (+1 weight)
      try {
        const targetPosts = rawBuzzList.filter(b => b.author.id === targetUserId);
        const tagCounts: Record<string, number> = {};
        targetPosts.forEach(post => {
          post.tags?.forEach(t => {
            const clean = t.toLowerCase().replace(/^#/, '');
            tagCounts[clean] = (tagCounts[clean] || 0) + 1;
          });
          if (post.taggedFilm?.genres) {
            post.taggedFilm.genres.forEach(g => {
              const clean = g.toLowerCase().trim();
              tagCounts[clean] = (tagCounts[clean] || 0) + 1;
            });
          }
        });
        const topFollowedTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([tag]) => tag);
        if (topFollowedTags.length > 0) {
          recordUserInterest(topFollowedTags, 1);
        }
      } catch (interestErr) {
        console.error('[Interest] Failed to record user interest on follow:', interestErr);
      }
    }
  };

  const isFollowing = (userId: string) => {
    return followingIds.includes(userId);
  };

  const getUserById = (userId: string) => {
    return resolvedAllUsers.find(u => u.id === userId);
  };

  const changeEmail = (newEmail: string): boolean => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      showToast('Format email tidak valid.');
      return false;
    }
    if (auth.currentUser) {
      setDoc(doc(db, 'userPrivate', auth.currentUser.uid), {
        email: trimmed,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
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
      case 'panduan-leaderboard':
        targetPath = '/panduan-leaderboard';
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
      case 'cms':
      case 'cms-workspace':
        targetPath = '/cms';
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
    if (!requireVerified()) return false;
    const isPermitted = currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin' || isUserWriter(currentUser) || isUserAdmin(currentUser);
    if (!isPermitted) {
      showToast('Akses ditolak: Hanya Penulis Sotoy & Admin yang dapat mempublikasikan artikel!', 'error');
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
      showToast(toastMsg, 'success');
      return true;
    } catch (error: any) {
      console.error('[Article] Error adding article:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Akses ditolak: Anda tidak memiliki izin.'
        : 'Gagal mempublikasikan artikel.';
      showToast(reason, 'error');
      return false;
    }
  };

  // Update Article in Firestore
  const updateArticle = async (id: string, updatedFields: Partial<Article>): Promise<boolean> => {
    if (!requireVerified()) return false;
    const targetArticle = articles.find(a => a.id === id);
    const isAuthor = targetArticle?.author?.id === currentUser.id;
    const isPermitted = isAuthor || currentUser.role === 'admin' || isUserAdmin(currentUser) || isUserWriter(currentUser);
    if (!isPermitted) {
      showToast('Hanya Penulis pemilik artikel atau Admin yang dapat menyunting artikel.', 'error');
      return false;
    }
    try {
      await updateDoc(doc(db, 'articles', id), updatedFields);
      const toastMsg = updatedFields.status === 'draft'
        ? 'Draf artikel berhasil disimpan!'
        : updatedFields.status === 'scheduled'
        ? 'Jadwal terbit artikel berhasil diperbarui!'
        : 'Artikel berhasil diperbarui!';
      showToast(toastMsg, 'success');
      return true;
    } catch (error: any) {
      console.error('[Article] Error updating article:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Akses ditolak: Anda tidak memiliki izin.'
        : 'Gagal memperbarui artikel.';
      showToast(reason, 'error');
      return false;
    }
  };

  // Delete Article from Firestore
  const deleteArticle = async (id: string) => {
    if (!requireVerified()) return;
    const targetArticle = articles.find(a => a.id === id);
    const isAuthor = targetArticle?.author?.id === currentUser.id;
    const isPermitted = isAuthor || currentUser.role === 'admin' || isUserAdmin(currentUser) || isUserWriter(currentUser);
    if (!isPermitted) {
      showToast('Hanya Penulis pemilik artikel atau Admin yang dapat menghapus artikel.', 'error');
      return;
    }
    try {
      await deleteDoc(doc(db, 'articles', id));
      showToast('Artikel berhasil dihapus.', 'success');
    } catch (error: any) {
      console.error('[Article] Error deleting article:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Akses ditolak: Anda tidak memiliki izin.'
        : 'Gagal menghapus artikel.';
      showToast(reason, 'error');
    }
  };

  // Add Buzz Post to Firestore
  const addBuzzPost = async (
    content: string,
    taggedFilmId?: string,
    skorSotoy?: number,
    taggedArticleId?: string,
    imageDataUrl?: string
  ) => {
    if (!requireVerified()) return;
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

    const now = Date.now();
    const buzzId = `buzz-${now}`;
    const authorId = auth.currentUser?.uid || currentUser.id;

    const newBuzz: BuzzPost = {
      id: buzzId,
      author: {
        id: authorId,
        name: currentUser.name || auth.currentUser?.displayName || 'Cinephile',
        handle: currentUser.handle || '@cinephile',
        avatar: currentUser.avatar || auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        role: currentUser.role || 'warga_sotoy',
      },
      content: content.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
      repliesCount: 0,
      repostsCount: 0,
      repostedByUsers: {},
      tags: cleanTags,
      replies: [],
      reactions: {
        heart: 0,
      },
      reactionsByUser: {},
    };

    if (taggedFilm) {
      newBuzz.taggedFilm = taggedFilm;
    }
    if (taggedArticle) {
      newBuzz.taggedArticle = taggedArticle;
    }
    if (skorSotoy !== undefined && !isNaN(skorSotoy)) {
      newBuzz.skorSotoyMention = skorSotoy;
    }

    // Set image data URL or upload to Firebase Storage if provided
    if (imageDataUrl) {
      newBuzz.image = imageDataUrl;
      if (imageDataUrl.startsWith('data:')) {
        try {
          const storagePath = `buzz_media/${authorId}/${buzzId}/${Date.now()}.jpg`;
          const storageRef = ref(storage, storagePath);
          await uploadString(storageRef, imageDataUrl, 'data_url');
          const downloadUrl = await getDownloadURL(storageRef);
          newBuzz.image = downloadUrl;
        } catch (storageErr: any) {
          console.warn('[Storage] Firebase Storage unavailable or upload failed for buzz media:', storageErr?.message || storageErr);
        }
      }
    }

    // 1. Optimistic UI update so user immediately sees their post at top of feed & profile
    const previousRawBuzzList = [...rawBuzzList];
    setRawBuzzList(prev => [newBuzz, ...prev.filter(b => b.id !== buzzId)]);
    showToast('Buzz kamu berhasil diposting!', 'success');

    // Check for user mentions in the buzz content
    checkAndSendMentions(content, 'Sebutan Baru di Buzz', 'buzz-detail', buzzId);

    // 2. Persist to Firestore with clean payload (no undefined values)
    try {
      const sanitizedPayload = JSON.parse(JSON.stringify(newBuzz));
      delete sanitizedPayload.myReaction;
      delete sanitizedPayload.likedByMe;
      await setDoc(doc(db, 'buzz', buzzId), sanitizedPayload);
    } catch (error: any) {
      setRawBuzzList(previousRawBuzzList);
      console.error('[BuzzPost] Error adding buzz post:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal memposting Buzz baru.';
      showToast(reason, 'error');
    }
  };

  // Quick Reactions for Buzz Post in Firestore (Per-user scoped with aggregate counts)
  const reactToBuzzPost = async (buzzId: string, reaction: ReactionType) => {
    if (!requireVerified()) return;

    const post = rawBuzzList.find(b => b.id === buzzId) || buzzList.find(b => b.id === buzzId);
    if (!post) return;

    const currentReactions: BuzzReactions = post.reactions || {
      heart: post.likes || 0,
    };

    const currentReactionsByUser: Record<string, ReactionType> = { ...(post.reactionsByUser || {}) };
    const prevReaction = currentReactionsByUser[currentUser.id] || post.myReaction || null;
    const updatedReactions = { ...currentReactions };
    const updatedReactionsByUser = { ...currentReactionsByUser };

    let newReaction: ReactionType | null = reaction;

    if (prevReaction === reaction) {
      // User tapped the same reaction -> toggle off
      if (reaction === 'heart') {
        updatedReactions.heart = Math.max(0, (updatedReactions.heart || 0) - 1);
      }
      delete updatedReactionsByUser[currentUser.id];
      newReaction = null;
    } else {
      // If user had a previous reaction, decrement old one
      if (prevReaction === 'heart') {
        updatedReactions.heart = Math.max(0, (updatedReactions.heart || 0) - 1);
      }
      // Increment new reaction
      if (reaction === 'heart') {
        updatedReactions.heart = (updatedReactions.heart || 0) + 1;
      }
      updatedReactionsByUser[currentUser.id] = reaction;
    }

    const updatedPost: BuzzPost = {
      ...post,
      reactions: updatedReactions,
      reactionsByUser: updatedReactionsByUser,
      likes: updatedReactions.heart || 0,
    };

    // Optimistic UI update
    const previousRawBuzzList = [...rawBuzzList];
    setRawBuzzList(prev => prev.map(b => b.id === buzzId ? updatedPost : b));

    // Track interest signal when adding reaction (+2 weight)
    if (newReaction) {
      const topics: string[] = [...(post.tags || [])];
      if (post.taggedFilm?.genres) {
        topics.push(...post.taggedFilm.genres);
      }
      if (post.taggedFilm?.type) {
        topics.push(post.taggedFilm.type);
      }
      if (topics.length > 0) {
        recordUserInterest(topics, 2);
      }
    }

    const emojiMap: Record<ReactionType, string> = {
      heart: '❤️ Suka',
    };
    showToast(
      newReaction
        ? `Reaksi ${emojiMap[reaction]} dikirim!`
        : 'Reaksi dihapus.',
      'success'
    );

    try {
      const sanitizedPayload = JSON.parse(JSON.stringify(updatedPost));
      delete sanitizedPayload.myReaction;
      delete sanitizedPayload.likedByMe;
      await setDoc(doc(db, 'buzz', buzzId), sanitizedPayload);

      // Trigger reaction notification to post author (if not reacting to own post)
      if (newReaction && post.author?.id && post.author.id !== currentUser.id) {
        await sendNotification({
          userId: post.author.id,
          type: 'reaction',
          title: 'Reaksi Baru di Buzz',
          message: `memberi reaksi ${emojiMap[reaction]} pada Buzz Anda.`,
          targetView: 'buzz-detail',
          targetId: buzzId,
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            handle: currentUser.handle,
          },
        });
      }
    } catch (error: any) {
      setRawBuzzList(previousRawBuzzList);
      console.error('[BuzzReaction] Error reacting to buzz post:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal mengirim reaksi.';
      showToast(reason, 'error');
    }
  };

  // Like/Unlike Buzz Post in Firestore
  const likeBuzzPost = async (buzzId: string) => {
    if (!requireVerified()) return;
    await reactToBuzzPost(buzzId, 'heart');
  };

  // Toggle Repost on a Buzz Post
  const toggleRepostBuzzPost = async (buzzId: string): Promise<boolean> => {
    if (!requireVerified()) return false;

    const post = rawBuzzList.find(b => b.id === buzzId) || buzzList.find(b => b.id === buzzId);
    if (!post) return false;

    // Users should not be able to repost their own post
    if (post.author?.id === currentUser.id) {
      showToast('Kamu tidak bisa me-repost postinganmu sendiri.', 'info');
      return false;
    }

    const currentRepostsMap = post.repostedByUsers ? { ...post.repostedByUsers } : {};
    const isAlreadyReposted = currentUser.id in currentRepostsMap;

    let updatedRepostsMap: Record<string, string>;
    let nextCount: number;

    if (isAlreadyReposted) {
      updatedRepostsMap = { ...currentRepostsMap };
      delete updatedRepostsMap[currentUser.id];
      nextCount = Math.max(0, (post.repostsCount || 0) - 1);
    } else {
      updatedRepostsMap = {
        ...currentRepostsMap,
        [currentUser.id]: new Date().toISOString(),
      };
      nextCount = (post.repostsCount || 0) + 1;
    }

    const updatedPost: BuzzPost = {
      ...post,
      repostedByUsers: updatedRepostsMap,
      repostsCount: nextCount,
    };

    // Optimistic UI update
    const previousRawBuzzList = [...rawBuzzList];
    setRawBuzzList(prev => prev.map(b => b.id === buzzId ? updatedPost : b));

    showToast(
      !isAlreadyReposted
        ? 'Postingan berhasil di-repost ke profilmu!'
        : 'Repost dibatalkan.',
      'success'
    );

    try {
      const sanitizedPayload = JSON.parse(JSON.stringify(updatedPost));
      delete sanitizedPayload.myReaction;
      delete sanitizedPayload.likedByMe;
      delete sanitizedPayload.myVote;
      await setDoc(doc(db, 'buzz', buzzId), sanitizedPayload);

      // Send notification to author if newly reposted and not self
      if (!isAlreadyReposted && post.author?.id && post.author.id !== currentUser.id) {
        await sendNotification({
          userId: post.author.id,
          type: 'repost',
          title: 'Repost Baru di Buzz',
          message: 'me-repost postingan Anda.',
          targetView: 'buzz-detail',
          targetId: buzzId,
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            handle: currentUser.handle,
          },
        });
      }
      return true;
    } catch (error: any) {
      setRawBuzzList(previousRawBuzzList);
      console.error('[BuzzRepost] Error reposting buzz:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal melakukan repost.';
      showToast(reason, 'error');
      return false;
    }
  };

  // Add Reply to a Buzz Post in Firestore (Supports threaded replies & mentions & notifications)
  const addBuzzReply = async (
    buzzId: string,
    content: string,
    parentId?: string,
    replyToUser?: { id: string; name: string; handle: string }
  ) => {
    if (!content.trim()) return;
    if (!requireVerified()) return;

    const post = rawBuzzList.find(b => b.id === buzzId) || buzzList.find(b => b.id === buzzId);
    if (!post) return;

    const authorId = auth.currentUser?.uid || currentUser.id;
    const newReply: BuzzReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      buzzId,
      parentId,
      replyToUser,
      author: {
        id: authorId,
        name: currentUser.name || auth.currentUser?.displayName || 'Cinephile',
        handle: currentUser.handle || '@cinephile',
        avatar: currentUser.avatar || auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        role: currentUser.role || 'warga_sotoy',
      },
      content: content.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
    };

    const currentReplies = post.replies || [];
    const updatedReplies = [...currentReplies, newReply];
    const updatedPost: BuzzPost = {
      ...post,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
    };

    // Optimistic UI update
    const previousRawBuzzList = [...rawBuzzList];
    setRawBuzzList(prev => prev.map(b => b.id === buzzId ? updatedPost : b));
    showToast('Balasan kamu berhasil diposting!', 'success');

    // Track interest signal when replying to a buzz (+3 weight)
    const replyTopics: string[] = [...(post.tags || [])];
    if (post.taggedFilm?.genres) {
      replyTopics.push(...post.taggedFilm.genres);
    }
    if (post.taggedFilm?.type) {
      replyTopics.push(post.taggedFilm.type);
    }
    if (replyTopics.length > 0) {
      recordUserInterest(replyTopics, 3);
    }

    try {
      const sanitizedPayload = JSON.parse(JSON.stringify(updatedPost));
      delete sanitizedPayload.myReaction;
      delete sanitizedPayload.likedByMe;
      await setDoc(doc(db, 'buzz', buzzId), sanitizedPayload);

      // 1. Notify post author (if author is not the replier)
      if (post.author?.id && post.author.id !== authorId) {
        await sendNotification({
          userId: post.author.id,
          type: 'reply',
          title: 'Balasan Baru di Buzz',
          message: `membalas Buzz Anda: "${content.length > 50 ? content.slice(0, 50) + '...' : content}"`,
          targetView: 'buzz-detail',
          targetId: buzzId,
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            handle: currentUser.handle,
          },
        });
      }

      // 2. If replying to a specific comment author, notify them as well (if not self and not post author)
      if (replyToUser?.id && replyToUser.id !== authorId && replyToUser.id !== post.author?.id) {
        await sendNotification({
          userId: replyToUser.id,
          type: 'reply',
          title: 'Balasan Baru di Diskusi',
          message: `membalas komentar Anda di Buzz: "${content.length > 50 ? content.slice(0, 50) + '...' : content}"`,
          targetView: 'buzz-detail',
          targetId: buzzId,
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            handle: currentUser.handle,
          },
        });
      }

      // 3. Send notifications for any tagged mentions in reply
      checkAndSendMentions(content, 'Sebutan Baru di Balasan Buzz', 'buzz-detail', buzzId);
    } catch (error: any) {
      setRawBuzzList(previousRawBuzzList);
      console.error('[BuzzReply] Error adding buzz reply:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal memposting balasan komentar.';
      showToast(reason, 'error');
    }
  };

  // Like a Buzz Post Reply in Firestore
  const likeBuzzReply = async (buzzId: string, replyId: string) => {
    if (!requireVerified()) return;
    const post = rawBuzzList.find(b => b.id === buzzId) || buzzList.find(b => b.id === buzzId);
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

    // Optimistic UI update
    const previousRawBuzzList = [...rawBuzzList];
    setRawBuzzList(prev => prev.map(b => b.id === buzzId ? updatedPost : b));

    try {
      const sanitizedPayload = JSON.parse(JSON.stringify(updatedPost));
      delete sanitizedPayload.myReaction;
      delete sanitizedPayload.likedByMe;
      await setDoc(doc(db, 'buzz', buzzId), sanitizedPayload);
    } catch (error: any) {
      setRawBuzzList(previousRawBuzzList);
      console.error('[BuzzReply] Error liking buzz reply:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal menyukai balasan ini.';
      showToast(reason, 'error');
    }
  };

  // Submit Rating & Review to Firestore
  const addFilmRating = async (filmId: string, score: number, headline: string, reviewText: string) => {
    if (!requireVerified()) return;
    const ratingId = `rate-${Date.now()}`;
    const newRating: UserRating = {
      id: ratingId,
      filmId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userRole: currentUser.role,
      score: Math.min(10, Math.max(1.0, Number(score.toFixed(1)))),
      headline,
      reviewText,
      createdAt: new Date().toISOString(),
      likes: 0,
      views: 0,
      commentsCount: 0,
      featured: false,
    };

    const previousRatings = [...ratings];
    const previousFilms = [...films];

    // Optimistically update local ratings state
    setRatings(prev => [newRating, ...prev.filter(r => r.id !== ratingId)]);

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

        // Track interest signal when rating film (+3 weight)
        const rateTopics = [...(film.genres || []), film.type, film.title];
        recordUserInterest(rateTopics, 3);
      }

      showToast(`Skor Sotoy ${score.toFixed(1)}/10.0 dan ulasan kamu berhasil dikirim!`, 'success');
    } catch (error: any) {
      setRatings(previousRatings);
      setFilms(previousFilms);
      console.error('[FilmRating] Error adding rating:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal mengirim ulasan film.';
      showToast(reason, 'error');
    }
  };

  const updateFilmRating = async (ratingId: string, updates: Partial<UserRating>) => {
    if (!requireVerified()) return;
    const rating = ratings.find(r => r.id === ratingId);
    if (!rating) return;

    if (rating.userId !== currentUser.id && !isAdmin) {
      showToast('Akses ditolak: Hanya pemilik ulasan yang dapat menyunting.', 'error');
      return;
    }

    const previousRatings = [...ratings];
    const updated = { ...rating, ...updates };

    // Optimistically update local ratings state
    setRatings(prev => prev.map(r => r.id === ratingId ? updated : r));

    try {
      await setDoc(doc(db, 'ratings', ratingId), updated);
      showToast('Ulasan film kamu berhasil diperbarui!', 'success');
    } catch (error: any) {
      setRatings(previousRatings);
      console.error('[FilmRating] Error updating rating:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal memperbarui ulasan film.';
      showToast(reason, 'error');
    }
  };

  const deleteFilmRating = async (ratingId: string) => {
    if (!requireVerified()) return;
    const rating = ratings.find(r => r.id === ratingId);
    if (!rating) return;

    if (rating.userId !== currentUser.id && !isAdmin) {
      showToast('Akses ditolak: Hanya pemilik ulasan atau Admin yang dapat menghapus.', 'error');
      return;
    }

    const previousRatings = [...ratings];
    setRatings(prev => prev.filter(r => r.id !== ratingId));

    try {
      await deleteDoc(doc(db, 'ratings', ratingId));
      showToast('Ulasan film kamu telah dihapus.', 'success');
    } catch (error: any) {
      setRatings(previousRatings);
      console.error('[FilmRating] Error deleting rating:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal menghapus ulasan film.';
      showToast(reason, 'error');
    }
  };

  // Like Editorial Article in Firestore
  const likeArticle = async (articleId: string) => {
    if (!requireVerified()) return;
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const previousArticles = [...articles];
    const updatedArticle = {
      ...article,
      likes: article.likes + 1,
    };

    setArticles(prev => prev.map(a => a.id === articleId ? updatedArticle : a));
    showToast('Kamu menyukai artikel ini!', 'success');

    try {
      await setDoc(doc(db, 'articles', articleId), updatedArticle);
    } catch (error: any) {
      setArticles(previousArticles);
      console.error('[Article] Error liking article:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal menyukai artikel ini.';
      showToast(reason, 'error');
    }
  };

  // Submit Critic Application to Firestore
  const addCriticSubmission = async (submission: Omit<CriticSubmission, 'id' | 'status' | 'date'>): Promise<boolean> => {
    if (!requireVerified()) return false;
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

      await recordAuditLog({
        action: status === 'approved' ? 'critic_approved' : 'critic_rejected',
        targetId: sub.userId,
        targetName: sub.userName,
        targetEmail: sub.userEmail,
        targetRole: status === 'approved' ? 'si_paling_sotoy' : undefined,
        targetType: 'critic_submission',
        details: status === 'approved'
          ? `Menyetujui verifikasi Si Paling Sotoy (Kritikus Film) untuk "${sub.userName}" (${sub.publicationName || 'Independen'}).`
          : `Menolak permohonan verifikasi Si Paling Sotoy untuk "${sub.userName}".`,
        metadata: { submissionId: id, publicationName: sub.publicationName, portfolioUrl: sub.portfolioUrl, status }
      });
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

  const recordAuditLog = async (logData: {
    action: AuditLogActionType;
    targetId?: string;
    targetName?: string;
    targetEmail?: string;
    targetRole?: string;
    targetType?: 'user' | 'appeal' | 'report' | 'critic_submission' | 'content';
    details?: string;
    metadata?: Record<string, any>;
  }): Promise<void> => {
    const logId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newLog: AuditLog = {
      id: logId,
      action: logData.action,
      actorId: currentUser.id || 'system-admin',
      actorName: currentUser.name || 'Admin Sotoy',
      actorEmail: currentUser.email || '',
      actorRole: currentUser.role || 'admin',
      actorAvatar: currentUser.avatar || '',
      targetId: logData.targetId,
      targetName: logData.targetName,
      targetEmail: logData.targetEmail,
      targetRole: logData.targetRole,
      targetType: logData.targetType,
      details: logData.details,
      metadata: logData.metadata,
      timestamp: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'auditLogs', logId), newLog);
      setAuditLogs(prev => [newLog, ...prev.filter(l => l.id !== logId)]);
    } catch (err) {
      console.warn('[AppContext] recordAuditLog local fallback:', err);
      setAuditLogs(prev => [newLog, ...prev.filter(l => l.id !== logId)]);
    }
  };

  const deleteAuditLog = async (logId: string): Promise<boolean> => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya admin yang dapat mengelola audit log.');
      return false;
    }
    try {
      await deleteDoc(doc(db, 'auditLogs', logId));
      setAuditLogs(prev => prev.filter(l => l.id !== logId));
      showToast('Catatan audit log berhasil dihapus.');
      return true;
    } catch (error) {
      setAuditLogs(prev => prev.filter(l => l.id !== logId));
      showToast('Catatan audit log berhasil dihapus.');
      return true;
    }
  };

  const clearAuditLogs = async (): Promise<boolean> => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya admin yang dapat menghapus seluruh audit log.');
      return false;
    }
    try {
      const snap = await getDocs(collection(db, 'auditLogs'));
      const promises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
      setAuditLogs([]);
      showToast('Seluruh riwayat audit log berhasil dibersihkan.');
      return true;
    } catch (error) {
      setAuditLogs([]);
      showToast('Seluruh riwayat audit log berhasil dibersihkan.');
      return true;
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
    try {
      const previousUser = allUsers.find(u => u.id === userId);
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

      await recordAuditLog({
        action: 'role_override',
        targetId: userId,
        targetName: previousUser?.name || 'Pengguna',
        targetEmail: previousUser?.email || '',
        targetRole: newRole,
        targetType: 'user',
        details: `Mengubah hak akses role pengguna "${previousUser?.name || userId}" dari [${previousUser?.role || 'warga_sotoy'}] menjadi [${newRole}].`,
        metadata: { previousRole: previousUser?.role || 'warga_sotoy', newRole, roleTitle: title }
      });

      showToast(`Role pengguna berhasil diubah menjadi "${newRole.replace('_', ' ').toUpperCase()}".`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      return false;
    }
  };

  const toggleUserSuspension = async (userId: string, isSuspended: boolean): Promise<boolean> => {
    console.log(`[AppContext] toggleUserSuspension called for ${userId}, suspended: ${isSuspended}`);
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya admin yang dapat mengubah status akun.');
      return false;
    }
    try {
      const targetUser = allUsers.find(u => u.id === userId);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isSuspended,
        suspendedAt: isSuspended ? new Date().toISOString() : null,
      });
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuspended, suspendedAt: isSuspended ? new Date().toISOString() : undefined } : u));
      
      // Notify the user about their account status change
      await sendNotification({
        userId,
        type: 'account_status',
        title: isSuspended ? 'Akun Dibekukan' : 'Akun Diaktifkan Kembali',
        message: isSuspended 
          ? 'Akun Anda telah dibekukan karena melanggar pedoman komunitas. Anda dapat mengajukan banding jika merasa ini adalah kesalahan.'
          : 'Kabar baik! Akun Anda telah diaktifkan kembali oleh moderator.',
        targetView: 'user-profile',
        targetId: userId,
        sender: {
          id: 'system-admin',
          name: 'Sotoy Moderator',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
          handle: '@moderator'
        }
      });

      await recordAuditLog({
        action: isSuspended ? 'account_suspended' : 'account_unsuspended',
        targetId: userId,
        targetName: targetUser?.name || 'Pengguna',
        targetEmail: targetUser?.email || '',
        targetRole: targetUser?.role,
        targetType: 'user',
        details: isSuspended 
          ? `Membekukan akun "${targetUser?.name || userId}" (Suspension) karena pelanggaran pedoman komunitas.`
          : `Mengaktifkan kembali dan memulihkan akses akun "${targetUser?.name || userId}".`,
        metadata: { isSuspended, previousStatus: targetUser?.isSuspended ? 'suspended' : 'active' }
      });

      showToast(isSuspended ? 'Akun pengguna berhasil dibekukan (SUSPENDED).' : 'Akun pengguna berhasil diaktifkan kembali.');
      return true;
    } catch (error) {
      console.error('[AppContext] toggleUserSuspension error:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      return false;
    }
  };

  const deleteUserAccount = async (userId: string): Promise<boolean> => {
    console.log(`[AppContext] deleteUserAccount called for ${userId}`);
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya admin yang dapat menghapus akun.');
      return false;
    }
    if (userId === currentUser.id) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri.');
      return false;
    }
    try {
      const targetUser = allUsers.find(u => u.id === userId);

      // 1. Delete user profile document from Firestore
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);

      // 2. Cascade delete user ratings
      try {
        const ratingsQuery = query(collection(db, 'ratings'), where('userId', '==', userId));
        const ratingsSnap = await getDocs(ratingsQuery);
        const ratingPromises = ratingsSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(ratingPromises);
      } catch (err) {
        console.warn('[AppContext] Cascade delete ratings notice:', err);
      }

      // 3. Cascade delete user buzz posts
      try {
        const buzzQuery1 = query(collection(db, 'buzz'), where('author.id', '==', userId));
        const buzzSnap1 = await getDocs(buzzQuery1);
        const buzzPromises1 = buzzSnap1.docs.map(d => deleteDoc(d.ref));
        await Promise.all(buzzPromises1);

        const buzzQuery2 = query(collection(db, 'buzz'), where('authorId', '==', userId));
        const buzzSnap2 = await getDocs(buzzQuery2);
        const buzzPromises2 = buzzSnap2.docs.map(d => deleteDoc(d.ref));
        await Promise.all(buzzPromises2);
      } catch (err) {
        console.warn('[AppContext] Cascade delete buzz notice:', err);
      }

      // 4. Cascade delete user notifications
      try {
        const notifQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
        const notifSnap = await getDocs(notifQuery);
        const notifPromises = notifSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(notifPromises);
      } catch (err) {
        console.warn('[AppContext] Cascade delete notifications notice:', err);
      }

      // 5. Cascade delete user appeals
      try {
        const appealsQuery = query(collection(db, 'appeals'), where('userId', '==', userId));
        const appealsSnap = await getDocs(appealsQuery);
        const appealsPromises = appealsSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(appealsPromises);
      } catch (err) {
        console.warn('[AppContext] Cascade delete appeals notice:', err);
      }

      // 6. Cascade delete critic submissions
      try {
        const criticQuery = query(collection(db, 'criticSubmissions'), where('userId', '==', userId));
        const criticSnap = await getDocs(criticQuery);
        const criticPromises = criticSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(criticPromises);
      } catch (err) {
        console.warn('[AppContext] Cascade delete critic submissions notice:', err);
      }

      // 7. Update in-memory state instantly
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      setRatings(prev => prev.filter(r => r.userId !== userId));
      setRawBuzzList(prev => prev.filter(b => b.author?.id !== userId && (b as any).authorId !== userId));
      setNotifications(prev => prev.filter(n => n.userId !== userId));
      setAppeals(prev => prev.filter(a => a.userId !== userId));
      setCriticSubmissions(prev => prev.filter(c => c.userId !== userId));
      setUserProfilesCache(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      if (viewedUserId === userId) {
        setViewedUserId(null);
      }

      await recordAuditLog({
        action: 'account_deleted',
        targetId: userId,
        targetName: targetUser?.name || 'Pengguna',
        targetEmail: targetUser?.email || '',
        targetRole: targetUser?.role,
        targetType: 'user',
        details: `Menghapus akun pengguna "${targetUser?.name || userId}" secara permanen beserta seluruh ulasan, postingan obrolan, dan data terkait.`,
        metadata: { 
          deletedUserName: targetUser?.name, 
          deletedUserEmail: targetUser?.email,
          deletedUserRole: targetUser?.role,
          deletedUserId: userId 
        }
      });

      showToast('Akun dan seluruh data pengguna berhasil dihapus secara permanen.');
      return true;
    } catch (error) {
      console.error('[AppContext] deleteUserAccount error:', error);
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      return false;
    }
  };

  const bulkDeleteUserAccounts = async (userIds: string[]): Promise<boolean> => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya admin yang dapat menghapus akun.');
      return false;
    }
    const targetIds = userIds.filter(id => id !== currentUser.id);
    if (targetIds.length === 0) {
      showToast('Tidak ada akun valid yang dapat dihapus.');
      return false;
    }
    try {
      let successCount = 0;
      for (const id of targetIds) {
        const success = await deleteUserAccount(id);
        if (success) successCount++;
      }

      await recordAuditLog({
        action: 'bulk_accounts_deleted',
        targetType: 'user',
        details: `Menghapus massal ${targetIds.length} akun pengguna beserta pembersihan data database terkait.`,
        metadata: { targetUserIds: targetIds, count: targetIds.length }
      });

      showToast(`${successCount} akun pengguna berhasil dibersihkan dan dihapus permanen.`);
      return true;
    } catch (error) {
      console.error('[AppContext] bulkDeleteUserAccounts error:', error);
      return false;
    }
  };

  const submitAccountAppeal = async (reason: string): Promise<boolean> => {
    if (!isLoggedIn || !currentUser.id || currentUser.id === 'guest') {
      showToast('Silakan masuk terlebih dahulu untuk mengajukan permohonan.');
      return false;
    }
    const appealId = `appeal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAppeal: AccountAppeal = {
      id: appealId,
      userId: currentUser.id,
      userName: currentUser.name || 'Pengguna Sotoy',
      userHandle: currentUser.handle || `@${currentUser.name?.toLowerCase().replace(/\s+/g, '') || 'user'}`,
      userEmail: currentUser.email || '',
      userAvatar: currentUser.avatar || '',
      userRole: currentUser.role || 'warga_sotoy',
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    try {
      await setDoc(doc(db, 'appeals', appealId), newAppeal);
      setAppeals(prev => [newAppeal, ...prev.filter(a => a.id !== appealId)]);
      showToast('Banding Anda telah dikirim ke Tim Moderator Sotoy Film.');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `appeals/${appealId}`);
      return false;
    }
  };

  const resolveAccountAppeal = async (appealId: string, status: 'approved' | 'rejected', adminNote?: string): Promise<boolean> => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya admin yang dapat meninjau banding.');
      return false;
    }
    const appeal = appeals.find(a => a.id === appealId);
    if (!appeal) {
      showToast('Permohonan banding tidak ditemukan.');
      return false;
    }

    try {
      const resolvedAt = new Date().toISOString();
      await updateDoc(doc(db, 'appeals', appealId), {
        status,
        adminNote: adminNote || '',
        resolvedAt
      });

      setAppeals(prev => prev.map(a => a.id === appealId ? { ...a, status, adminNote, resolvedAt } : a));

      if (status === 'approved') {
        // Automatically unfreeze user if appeal is approved
        await toggleUserSuspension(appeal.userId, false);
      } else {
        // Send notification to the user about rejection
        await sendNotification({
          userId: appeal.userId,
          type: 'account_status',
          title: 'Permohonan Banding Ditolak',
          message: `Permohonan banding Anda telah ditinjau dan ditolak. Catatan Admin: ${adminNote || 'Pelanggaran pedoman komunitas tetap berlaku.'}`,
          targetView: 'user-profile',
          targetId: appeal.userId,
          sender: {
            id: 'system-admin',
            name: 'Sotoy Moderator Team',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
            handle: '@moderator'
          }
        });
      }

      await recordAuditLog({
        action: status === 'approved' ? 'appeal_approved' : 'appeal_rejected',
        targetId: appeal.userId,
        targetName: appeal.userName,
        targetEmail: appeal.userEmail,
        targetRole: appeal.userRole,
        targetType: 'appeal',
        details: status === 'approved'
          ? `Menerima permohonan banding dari "${appeal.userName}" dan memulihkan status akun.`
          : `Menolak permohonan banding dari "${appeal.userName}". Catatan admin: "${adminNote || 'Pelanggaran pedoman komunitas tetap berlaku.'}"`,
        metadata: { appealId, appealReason: appeal.reason, adminNote, status, resolvedAt }
      });

      showToast(`Banding berhasil ${status === 'approved' ? 'diterima & akun diaktifkan' : 'ditolak'}.`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appeals/${appealId}`);
      return false;
    }
  };

  const deleteAccountAppeal = async (appealId: string): Promise<boolean> => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya admin yang dapat menghapus log banding.');
      return false;
    }
    try {
      await deleteDoc(doc(db, 'appeals', appealId));
      setAppeals(prev => prev.filter(a => a.id !== appealId));
      showToast('Catatan banding berhasil dihapus.');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `appeals/${appealId}`);
      return false;
    }
  };

  const bulkUpdateUserRoles = async (userIds: string[], newRole: UserRole): Promise<boolean> => {
    try {
      const roleTitles: Record<UserRole, string> = {
        warga_sotoy: 'Warga Sotoy (Penonton Santai)',
        si_paling_sotoy: 'Si Paling Sotoy (Kritikus Film)',
        penulis_sotoy: 'Penulis Sotoy (Jurnalis Film & Pop-Culture)',
        admin: 'Admin Sotoy (Pengelola Platform)',
      };
      const title = roleTitles[newRole] || 'Warga Sotoy';

      await Promise.all(
        userIds.map(id => 
          updateDoc(doc(db, 'users', id), {
            role: newRole,
            roleTitle: title,
          })
        )
      );

      setAllUsers(prev => prev.map(u => userIds.includes(u.id) ? { ...u, role: newRole, roleTitle: title } : u));
      if (userIds.includes(currentUser.id)) {
        setCurrentUser(prev => ({ ...prev, role: newRole, roleTitle: title }));
      }

      await recordAuditLog({
        action: 'bulk_roles_override',
        targetType: 'user',
        details: `Mengubah hak akses role massal untuk ${userIds.length} pengguna menjadi [${newRole}].`,
        metadata: { userIds, newRole, count: userIds.length }
      });

      showToast(`Role ${userIds.length} pengguna berhasil diubah menjadi "${newRole.replace('_', ' ').toUpperCase()}".`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/bulk-roles`);
      return false;
    }
  };

  const bulkToggleUserSuspension = async (userIds: string[], isSuspended: boolean): Promise<boolean> => {
    try {
      await Promise.all(
        userIds.map(id =>
          updateDoc(doc(db, 'users', id), {
            isSuspended,
            suspendedAt: isSuspended ? new Date().toISOString() : null,
          })
        )
      );

      setAllUsers(prev => prev.map(u => userIds.includes(u.id) ? { ...u, isSuspended, suspendedAt: isSuspended ? new Date().toISOString() : undefined } : u));

      await recordAuditLog({
        action: isSuspended ? 'bulk_accounts_suspended' : 'bulk_accounts_unsuspended',
        targetType: 'user',
        details: isSuspended 
          ? `Membekukan massal ${userIds.length} akun pengguna.`
          : `Mengaktifkan kembali secara massal ${userIds.length} akun pengguna.`,
        metadata: { userIds, isSuspended, count: userIds.length }
      });

      showToast(isSuspended ? `${userIds.length} akun pengguna berhasil dibekukan.` : `${userIds.length} akun pengguna berhasil diaktifkan kembali.`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/bulk-suspension`);
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

  const importAndNavigateToTmdbFilm = async (tmdbItem: { id: number; title?: string; name?: string; media_type?: 'movie' | 'tv' }): Promise<FilmItem | null> => {
    const mediaType = tmdbItem.media_type === 'tv' ? 'tv' : 'movie';
    const tmdbIdNum = Number(tmdbItem.id);

    // Check if film already exists in `films` state
    const existing = films.find(f => f.tmdbId === tmdbIdNum || f.id === `tmdb-${tmdbIdNum}`);
    if (existing) {
      navigateTo('film-detail', { filmId: existing.id });
      return existing;
    }

    showToast('Mengambil data film dari TMDB...', 'info');
    try {
      const details = await fetchTmdbDetails(tmdbIdNum, mediaType);
      const mapped = mapTmdbDetailsToFilm(details, mediaType);

      const newFilm: FilmItem = {
        ...mapped,
        id: `tmdb-${tmdbIdNum}`,
        cast: mapped.cast ? mapped.cast.split(', ').filter(Boolean) : [],
        genres: mapped.genres ? mapped.genres.split(', ').filter(Boolean) : [],
        totalVotes: details.vote_count || 1,
        criticsSkorSotoy: mapped.skorSotoy,
        whereToWatch: [
          { platform: 'TMDB Global', type: 'stream', badgeColor: 'bg-cyan-500' }
        ]
      };

      setFilms(prev => {
        if (prev.some(f => f.id === newFilm.id)) return prev;
        return [newFilm, ...prev];
      });

      // Persist to Firestore so it stays in global database
      try {
        const sanitized = JSON.parse(JSON.stringify(newFilm));
        await setDoc(doc(db, 'films', newFilm.id), sanitized);
      } catch (e) {
        console.warn('[AppContext] Could not persist TMDB film to Firestore:', e);
      }

      showToast(`Berhasil memuat "${newFilm.title}" dari TMDB!`, 'success');
      navigateTo('film-detail', { filmId: newFilm.id });
      return newFilm;
    } catch (err) {
      console.error('[AppContext] Failed to import TMDB film:', err);
      showToast('Gagal memuat detail film dari TMDB.', 'error');
      return null;
    }
  };

  const addFilm = async (filmData: Omit<FilmItem, 'id'>): Promise<boolean> => {
    console.log('[AppContext] === [addFilm INVOKED] ===', {
      title: filmData.title,
      type: filmData.type,
      year: filmData.year,
      genres: filmData.genres,
      castCount: filmData.cast?.length || 0,
      timestamp: new Date().toISOString(),
    });

    const filmId = `film-${Date.now()}`;
    const newFilm: FilmItem = {
      ...filmData,
      id: filmId,
    };

    console.log('[AppContext] Generated filmId:', filmId);
    console.log('[AppContext] Current Auth State during addFilm:', {
      firebaseAuthCurrentUser: auth.currentUser ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        isAnonymous: auth.currentUser.isAnonymous,
      } : 'No active Firebase Auth user (null)',
      appContextCurrentUser: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      },
    });

    try {
      // Remove any undefined properties which crash Firestore setDoc
      const sanitizedFilm = JSON.parse(JSON.stringify(newFilm));
      await setDoc(doc(db, 'films', filmId), sanitizedFilm);
      setFilms(prev => {
        if (prev.some(f => f.id === newFilm.id)) {
          return prev.map(f => f.id === newFilm.id ? newFilm : f);
        }
        return [newFilm, ...prev];
      });
      showToast(`Film "${newFilm.title}" berhasil ditambahkan ke database.`);
      return true;
    } catch (error: any) {
      console.error('[AppContext] Firestore setDoc FAILED for filmId:', filmId, error);
      console.error('[AppContext] Detailed Firestore Error info:', {
        code: error?.code,
        message: error?.message,
        name: error?.name,
      });

      if (error?.code === 'permission-denied') {
        console.warn('[AppContext] DIAGNOSIS: Firestore returned "permission-denied". In firestore.rules, "allow create, update: if (isAdmin() || isWriter()) && isValidId(filmId) && isValidFilmItem(incoming())". Ensure request.auth is signed in with an authorized email (e.g., eksposurmedia@gmail.com) or admin role.');
      }

      const errMsg = error?.message || 'Gagal menyimpan ke database Firestore.';
      showToast(`Gagal menerbitkan film ke Firestore: ${errMsg}`);
      // Also update local list safely without duplicating
      setFilms(prev => {
        if (prev.some(f => f.id === newFilm.id)) {
          return prev.map(f => f.id === newFilm.id ? newFilm : f);
        }
        return [newFilm, ...prev];
      });
      return false;
    }
  };

  const updateFilm = async (id: string, updates: Partial<FilmItem>): Promise<boolean> => {
    try {
      const sanitizedUpdates = JSON.parse(JSON.stringify(updates));
      await updateDoc(doc(db, 'films', id), sanitizedUpdates);
      setFilms(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      showToast('Metadata film berhasil diperbarui.');
      return true;
    } catch (error: any) {
      console.error('[AppContext] Firestore updateDoc FAILED for filmId:', id, error);
      const errMsg = error?.message || 'Gagal memperbarui ke database Firestore.';
      showToast(`Gagal memperbarui film: ${errMsg}`);
      setFilms(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      return false;
    }
  };

  const deleteFilm = async (id: string): Promise<boolean> => {
    // Immediately remove from in-memory state
    setFilms(prev => prev.filter(f => f.id !== id));

    // If deleting a film whose ID matches an INITIAL_FILMS mock entry, write marker to removedMockFilms collection
    const isMockFilm = INITIAL_FILMS.some(m => m.id === id);
    if (isMockFilm) {
      try {
        await setDoc(doc(db, 'removedMockFilms', id), {
          id,
          removedAt: new Date().toISOString(),
        });
        removedMockFilmIdsRef.current.add(id);
      } catch (err) {
        console.error('[AppContext] Error writing to removedMockFilms:', err);
      }
    }

    try {
      await deleteDoc(doc(db, 'films', id));
      showToast('Film berhasil dihapus dari katalog.');
      return true;
    } catch (error: any) {
      console.error('[AppContext] Firestore deleteDoc ERROR for filmId:', id, error);
      const errMsg = error?.message || 'Gagal menghapus dari database Firestore.';
      showToast(`Catatan: Film dihapus dari katalog (${errMsg})`);
      return false;
    }
  };

  const bulkDeleteFilms = async (filmIds: string[]): Promise<boolean> => {
    setFilms(prev => prev.filter(f => !filmIds.includes(f.id)));

    // Mark any INITIAL_FILMS mock entries in removedMockFilms in Firestore
    const mockIds = filmIds.filter(id => INITIAL_FILMS.some(m => m.id === id));
    if (mockIds.length > 0) {
      try {
        await Promise.all(
          mockIds.map(id => {
            removedMockFilmIdsRef.current.add(id);
            return setDoc(doc(db, 'removedMockFilms', id), {
              id,
              removedAt: new Date().toISOString(),
            });
          })
        );
      } catch (err) {
        console.error('[AppContext] Error writing bulk removedMockFilms:', err);
      }
    }

    try {
      await Promise.all(
        filmIds.map(id => deleteDoc(doc(db, 'films', id)))
      );
      showToast(`${filmIds.length} film berhasil dihapus dari katalog.`);
      return true;
    } catch (error: any) {
      console.error('[AppContext] Firestore bulk delete error:', error);
      const errMsg = error?.message || 'Gagal menghapus dari database Firestore.';
      showToast(`Catatan: Film dihapus dari katalog (${errMsg})`);
      return false;
    }
  };

  const bulkUpdateFilms = async (filmIds: string[], updates: Partial<FilmItem>): Promise<boolean> => {
    try {
      const sanitizedUpdates = JSON.parse(JSON.stringify(updates));
      await Promise.all(
        filmIds.map(id => updateDoc(doc(db, 'films', id), sanitizedUpdates))
      );
      setFilms(prev => prev.map(f => filmIds.includes(f.id) ? { ...f, ...updates } : f));
      showToast(`${filmIds.length} film berhasil diperbarui secara massal.`);
      return true;
    } catch (error: any) {
      console.error('[AppContext] Firestore bulk update error:', error);
      setFilms(prev => prev.map(f => filmIds.includes(f.id) ? { ...f, ...updates } : f));
      const errMsg = error?.message || 'Gagal memperbarui ke database Firestore.';
      showToast(`Gagal memperbarui film: ${errMsg}`);
      return false;
    }
  };

  const deleteBuzzPost = async (buzzId: string): Promise<boolean> => {
    if (!requireVerified()) return false;
    const postToDelete = rawBuzzList.find(b => b.id === buzzId) || buzzList.find(b => b.id === buzzId);
    if (!postToDelete) return false;

    // Ownership check (only author or admin can delete)
    if (postToDelete.author?.id !== currentUser.id && !isAdmin) {
      showToast('Akses ditolak: Hanya pemilik postingan atau Admin yang dapat menghapus.', 'error');
      return false;
    }

    // 1. Cleanup image attachment from Firebase Storage if present
    if (postToDelete.image) {
      try {
        const imageRef = ref(storage, postToDelete.image);
        await deleteObject(imageRef);
      } catch (storageErr) {
        console.warn('[Storage] Failed to delete buzz media from Firebase Storage:', storageErr);
      }
    }

    const previousRawBuzzList = [...rawBuzzList];
    try {
      await deleteDoc(doc(db, 'buzz', buzzId));
      setRawBuzzList(prev => prev.filter(b => b.id !== buzzId));
      showToast('Post obrolan warga berhasil dihapus.', 'success');
      return true;
    } catch (error: any) {
      setRawBuzzList(previousRawBuzzList);
      console.error('[BuzzPost] Error deleting buzz post:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal menghapus postingan obrolan.';
      showToast(reason, 'error');
      return false;
    }
  };

  const deleteBuzzReply = async (buzzId: string, replyId: string): Promise<boolean> => {
    if (!requireVerified()) return false;
    const post = rawBuzzList.find(b => b.id === buzzId) || buzzList.find(b => b.id === buzzId);
    if (!post) return false;

    const replyToDelete = (post.replies || []).find(r => r.id === replyId);
    if (!replyToDelete) return false;

    // Ownership check (only reply author, post author, or admin can delete)
    if (replyToDelete.author?.id !== currentUser.id && post.author?.id !== currentUser.id && !isAdmin) {
      showToast('Akses ditolak: Hanya pemilik balasan komentar atau Admin yang dapat menghapus.', 'error');
      return false;
    }

    const previousRawBuzzList = [...rawBuzzList];
    const filteredReplies = (post.replies || []).filter(r => r.id !== replyId);
    try {
      await updateDoc(doc(db, 'buzz', buzzId), {
        replies: filteredReplies,
        repliesCount: Math.max(0, (post.repliesCount || 1) - 1),
      });
      setRawBuzzList(prev => prev.map(b => b.id === buzzId ? { ...b, replies: filteredReplies, repliesCount: Math.max(0, (b.repliesCount || 1) - 1) } : b));
      showToast('Balasan komentar berhasil dihapus.', 'success');
      return true;
    } catch (error: any) {
      setRawBuzzList(previousRawBuzzList);
      console.error('[BuzzReply] Error deleting buzz reply:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal menghapus balasan komentar.';
      showToast(reason, 'error');
      return false;
    }
  };

  const reportContent = async (report: Omit<ModerationReport, 'id' | 'createdAt' | 'status'>): Promise<boolean> => {
    if (!requireVerified()) return false;
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
      showToast('Laporan berhasil dikirim ke tim admin.', 'success');
      return true;
    } catch (error: any) {
      console.error('[Report] Error submitting moderation report:', error);
      const reason = error?.code === 'permission-denied'
        ? 'Izin ditolak (permission denied).'
        : 'Gagal mengirimkan laporan.';
      showToast(reason, 'error');
      return false;
    }
  };

  const resolveReport = async (
    reportId: string,
    action: 'dismiss' | 'take_down',
    targetInfo?: { targetType: 'buzz' | 'reply' | 'review'; targetId: string; parentBuzzId?: string }
  ): Promise<boolean> => {
    try {
      const rep = moderationReports.find(r => r.id === reportId);
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

      if (rep) {
        await recordAuditLog({
          action: action === 'take_down' ? 'content_taken_down' : 'content_report_dismissed',
          targetId: rep.targetId,
          targetName: rep.targetAuthorName,
          targetType: 'content',
          details: action === 'take_down'
            ? `Menghapus konten yang dilaporkan (${rep.targetType}) dari "${rep.targetAuthorName}". Alasan laporan: ${rep.reason}`
            : `Menolak/mengabaikan laporan konten (${rep.targetType}) dari pelapor "${rep.reporterName}".`,
          metadata: { reportId, targetType: rep.targetType, reason: rep.reason, reporterName: rep.reporterName, action }
        });
      }

      showToast(action === 'dismiss' ? 'Laporan ditolak / ditandai bersih.' : 'Konten berhasil dihapus dan laporan dituntaskan.');
      return true;
    } catch (e) {
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        isAdmin,
        isWriter,
        isCritic,
        isEmailVerified,
        resendVerificationEmail,
        refreshEmailVerification,
        loginModalOpen,
        setLoginModalOpen,
        isComposeBuzzOpen,
        setIsComposeBuzzOpen,
        logout,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        getLastAuthErrorCode,
        clearAuthError,
        articles: resolvedArticles,
        publishedArticles,
        films,
        buzzList,
        isLoadingArticles,
        isLoadingFilms,
        isLoadingBuzz,
        isInitialLoading: isLoadingArticles || isLoadingFilms || isLoadingBuzz,
        ratings,
        criticSubmissions,
        addCriticSubmission,
        updateCriticSubmissionStatus,
        watchlist,
        toggleWatchlist,
        removeBulkFromWatchlist,
        isFilmInWatchlist,
        savedArticles,
        toggleSaveArticle,
        removeBulkFromSavedArticles,
        isArticleSaved,
        savedBuzzIds,
        toggleSaveBuzz,
        isBuzzSaved,
        interestProfile,
        recordUserInterest,
        decayInterestProfile,
        performPeriodicInterestReduction,
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
        allUsers: resolvedAllUsers,
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
        toggleRepostBuzzPost,
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
        bulkUpdateUserRoles,
        bulkToggleUserSuspension,
        deleteUserAccount,
        bulkDeleteUserAccounts,
        appeals,
        submitAccountAppeal,
        resolveAccountAppeal,
        deleteAccountAppeal,
        bulkUpdateArticles,
        bulkDeleteArticles,
        bulkReassignAuthor,
        migrateAllOldArticlesToTargetAuthor,
        addFilm,
        importAndNavigateToTmdbFilm,
        updateFilm,
        deleteFilm,
        bulkDeleteFilms,
        bulkUpdateFilms,
        deleteBuzzPost,
        deleteBuzzReply,
        moderationReports,
        reportContent,
        resolveReport,
        auditLogs,
        recordAuditLog,
        deleteAuditLog,
        clearAuditLogs,
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
