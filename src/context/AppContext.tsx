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
  UploadedFile,
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
import { db, auth, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
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

export const ADMIN_UIDS = ['CsG2CY2TaIZmG7yuPfzAxmRYrlY2', 'I34eqzOmvsSdS2Rf7jpfxw1ZKeu1'];
export const ADMIN_EMAILS = ['eksposurmedia@gmail.com'];
export const WRITER_UIDS = ['0PCmaBvJrzeaQgpf3sSTC4mnsh02'];

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
  | 'onboarding';

interface AppContextType {
  currentUser: User;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isWriter: boolean;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  isComposeBuzzOpen: boolean;
  setIsComposeBuzzOpen: (open: boolean) => void;
  logout: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, name: string, handle: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
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
  likeArticle: (articleId: string) => Promise<void>;
  buzzFeedTab: 'for-you' | 'following' | 'saved' | 'liked' | 'trending';
  setBuzzFeedTab: (tab: 'for-you' | 'following' | 'saved' | 'liked' | 'trending') => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  finishOnboarding: (updates: { name: string; handle: string; bio: string; avatar?: string; favoriteGenres?: string[] }) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState<User>(() => INITIAL_USERS.warga);
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

    return () => {
      unsubFilms();
      unsubArticles();
      unsubBuzz();
      unsubRatings();
      unsubUsers();
    };
  }, []);

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
            if (isAdminRole && data.role !== 'admin') {
              data.role = 'admin';
              data.roleTitle = 'Head Admin & Lead Editor';
            } else if (isWriterRole && data.role !== 'penulis_sotoy') {
              data.role = 'penulis_sotoy';
              data.roleTitle = 'Penulis Sotoy (Jurnalis Film & Pop-Culture)';
            }
            
            // Clean up any legacy mock names/handles from previous tests
            if (data.name === 'Chief Admin Sotoy' && fbUser.displayName) {
              data.name = fbUser.displayName;
              data.handle = '@' + (fbUser.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'warga_' + uid.slice(0, 4));
              data.role = 'warga_sotoy';
              data.roleTitle = 'Warga Sotoy (Penonton Santai)';
              try { await setDoc(userDocRef, data, { merge: true }); } catch (e) {}
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
            const defaultUser: User = {
              id: uid,
              name: fbUser.displayName || (isAdminRole ? 'Admin Utama' : isWriterRole ? 'Penulis Sotoy' : 'Warga Baru'),
              handle: '@' + (fbUser.displayName ? fbUser.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') : (fbUser.email ? fbUser.email.split('@')[0] : 'user_' + uid.slice(0, 4))),
              avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
              role: isAdminRole ? 'admin' : (isWriterRole ? 'penulis_sotoy' : 'warga_sotoy'),
              roleTitle: isAdminRole ? 'Head Admin & Lead Editor' : (isWriterRole ? 'Penulis Sotoy (Jurnalis Film & Pop-Culture)' : 'Warga Sotoy (Penonton Santai)'),
              bio: isAdminRole ? 'Menjaga ketertiban obrolan sotoy seantero jagat perfilman.' : (isWriterRole ? 'Menulis kabar terbaru, ulasan mendalam, dan kurasi film di Sotoy Film.' : 'Cinephile baru mendarat di Sotoy Film!'),
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
        setCurrentUser(INITIAL_USERS.warga);
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
      const isAdminUser = isUserAdmin(currentUser);
      // Admin queries all files, regular users query only their own files
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
        const role: UserRole = isAdminUID ? 'admin' : (isWriterUID ? 'penulis_sotoy' : 'warga_sotoy');
        const roleTitle = isAdminUID ? 'Head Admin & Lead Editor' : (isWriterUID ? 'Penulis Sotoy (Jurnalis Film & Pop-Culture)' : 'Warga Sotoy (Penonton Santai)');
        const bio = isAdminUID ? 'Menjaga ketertiban obrolan sotoy seantero jagat perfilman.' : (isWriterUID ? 'Menulis kabar terbaru, ulasan mendalam, dan kurasi film di Sotoy Film.' : 'Cinephile baru mendarat di Sotoy Film!');
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
          const cleanHandle = '@' + (userCredential.user.displayName ? userCredential.user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') : (userCredential.user.email ? userCredential.user.email.split('@')[0] : 'user_' + uid.slice(0, 4)));
          const newUser: User = {
            id: uid,
            name: userCredential.user.displayName || (isAdminRole ? 'Admin Utama' : isWriterRole ? 'Penulis Sotoy' : 'Warga Baru'),
            handle: cleanHandle,
            avatar: userCredential.user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            role: isAdminRole ? 'admin' : (isWriterRole ? 'penulis_sotoy' : 'warga_sotoy'),
            roleTitle: isAdminRole ? 'Head Admin & Lead Editor' : (isWriterRole ? 'Penulis Sotoy (Jurnalis Film & Pop-Culture)' : 'Warga Sotoy (Penonton Santai)'),
            bio: isAdminRole ? 'Menjaga ketertiban obrolan sotoy seantero jagat perfilman.' : (isWriterRole ? 'Menulis kabar terbaru, ulasan mendalam, dan kurasi film di Sotoy Film.' : 'Cinephile baru mendarat di Sotoy Film!'),
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
      setCurrentUser(INITIAL_USERS.warga);
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
    const isPermitted = currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin' || isUserWriter(currentUser) || isUserAdmin(currentUser);
    if (!isPermitted) {
      showToast('Akses ditolak: Hanya Penulis Sotoy & Admin yang dapat mempublikasikan artikel!');
      return false;
    }

    const articleId = `art-${Date.now()}`;
    const created: Article = {
      ...newArticle,
      id: articleId,
      publishedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
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
      showToast('Artikel berhasil diperbarui!');
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

  const isAdmin = isLoggedIn && isUserAdmin(currentUser);
  const isWriter = isLoggedIn && (isUserWriter(currentUser) || currentUser.role === 'penulis_sotoy' || isAdmin || currentUser.role === 'admin');

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        isAdmin,
        isWriter,
        loginModalOpen,
        setLoginModalOpen,
        isComposeBuzzOpen,
        setIsComposeBuzzOpen,
        logout,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
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
        likeArticle,
        buzzFeedTab,
        setBuzzFeedTab,
        toastMessage,
        showToast,
        finishOnboarding,
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
