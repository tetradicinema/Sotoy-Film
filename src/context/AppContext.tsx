import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Article,
  FilmItem,
  BuzzPost,
  BuzzReply,
  UserRating,
  MainCategory,
  SubCategory,
  UserSettings,
  UserTab,
  SettingsSubPage,
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
  login: (roleKey?: string) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  articles: Article[];
  films: FilmItem[];
  buzzList: BuzzPost[];
  ratings: UserRating[];
  watchlist: string[];
  toggleWatchlist: (filmId: string) => void;
  isFilmInWatchlist: (filmId: string) => boolean;
  updateUserBio: (newBio: string) => void;
  updateUserProfile: (updates: { name?: string; handle?: string; avatar?: string; bio?: string }) => void;
  uploadProfilePhoto: (base64Data: string) => void;
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
    }
  ) => void;
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
  addArticle: (newArticle: Omit<Article, 'id' | 'publishedAt' | 'views' | 'likes' | 'commentsCount'>) => boolean;
  deleteArticle: (id: string) => void;
  addBuzzPost: (
    content: string,
    taggedFilmId?: string,
    skorSotoy?: number,
    taggedArticleId?: string
  ) => void;
  likeBuzzPost: (buzzId: string) => void;
  addBuzzReply: (buzzId: string, content: string) => void;
  likeBuzzReply: (buzzId: string, replyId: string) => void;
  addFilmRating: (filmId: string, score: number, headline: string, reviewText: string) => void;
  likeArticle: (articleId: string) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('sotoy_role');
    if (saved && INITIAL_USERS[saved]) {
      return INITIAL_USERS[saved];
    }
    return INITIAL_USERS.warga; // Default to Warga Sotoy
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('sotoy_is_logged_in');
    return saved !== null ? saved === 'true' : true;
  });

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('sotoy_watchlist');
    return saved ? JSON.parse(saved) : ['film-1', 'film-3'];
  });

  const [articles, setArticles] = useState<Article[]>(() => {
    const saved = localStorage.getItem('sotoy_articles');
    return saved ? JSON.parse(saved) : INITIAL_ARTICLES;
  });

  const [films, setFilms] = useState<FilmItem[]>(() => {
    const saved = localStorage.getItem('sotoy_films');
    return saved ? JSON.parse(saved) : INITIAL_FILMS;
  });

  const [buzzList, setBuzzList] = useState<BuzzPost[]>(() => {
    const saved = localStorage.getItem('sotoy_buzz');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BuzzPost[];
        return parsed.map(post => {
          const matchInitial = INITIAL_BUZZ.find(ib => ib.id === post.id);
          const hasReplies = Array.isArray(post.replies) && post.replies.length > 0;
          const mergedReplies = hasReplies ? post.replies : (matchInitial?.replies || []);
          return {
            ...post,
            replies: mergedReplies,
            repliesCount: mergedReplies ? mergedReplies.length : (post.repliesCount || 0),
          };
        });
      } catch (e) {
        console.error('Failed to parse sotoy_buzz', e);
      }
    }
    return INITIAL_BUZZ;
  });

  const [ratings, setRatings] = useState<UserRating[]>(() => {
    const saved = localStorage.getItem('sotoy_ratings');
    return saved ? JSON.parse(saved) : INITIAL_RATINGS;
  });

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

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('sotoy_all_users');
    return saved ? JSON.parse(saved) : ALL_USERS_DATABASE;
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

  // Sync to local storage for realistic persistence
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
    localStorage.setItem('sotoy_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  // Sync to local storage for realistic persistence
  useEffect(() => {
    localStorage.setItem('sotoy_is_logged_in', String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('sotoy_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('sotoy_articles', JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    localStorage.setItem('sotoy_buzz', JSON.stringify(buzzList));
  }, [buzzList]);

  useEffect(() => {
    localStorage.setItem('sotoy_films', JSON.stringify(films));
  }, [films]);

  useEffect(() => {
    localStorage.setItem('sotoy_ratings', JSON.stringify(ratings));
  }, [ratings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const login = (roleKey?: string) => {
    let target = INITIAL_USERS.warga;
    if (roleKey === 'critic' || roleKey === 'si_paling_sotoy') target = INITIAL_USERS.critic;
    else if (roleKey === 'writer' || roleKey === 'penulis_sotoy') target = INITIAL_USERS.writer;
    else if (roleKey === 'admin') target = INITIAL_USERS.admin;
    else if (roleKey === 'warga' || roleKey === 'warga_sotoy') target = INITIAL_USERS.warga;

    setCurrentUser(target);
    setIsLoggedIn(true);
    setLoginModalOpen(false);
    localStorage.setItem('sotoy_is_logged_in', 'true');
    localStorage.setItem('sotoy_role', roleKey || 'warga');

    // Role-based login redirection:
    // - warga_sotoy: Community Feed (Buzz Feed)
    // - si_paling_sotoy: Film Database
    // - penulis_sotoy & admin: Homepage (dengan tombol Tulis Artikel)
    if (target.role === 'warga_sotoy') {
      navigateTo('community-feed');
      showToast(`Selamat datang, ${target.name}! Langsung diarahkan ke Buzz Feed.`);
    } else if (target.role === 'si_paling_sotoy') {
      navigateTo('film-database');
      showToast(`Selamat datang, ${target.name}! Langsung diarahkan ke Database Film.`);
    } else {
      navigateTo('home');
      showToast(`Selamat datang, ${target.name}! Beranda terbuka dengan akses Menulis Artikel.`);
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('sotoy_is_logged_in', 'false');
    // For visitors / unauthenticated users, land on Homepage
    navigateTo('home');
    showToast('Anda telah beralih ke mode Pengunjung (Visitor). Beranda ditampilkan.');
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

  const updateUserBio = (newBio: string) => {
    setCurrentUser(prev => ({ ...prev, bio: newBio }));
    showToast('Bio profil kamu berhasil diperbarui!');
  };

  const updateUserProfile = (updates: { name?: string; handle?: string; avatar?: string; bio?: string }) => {
    setCurrentUser(prev => ({
      ...prev,
      name: updates.name?.trim() ? updates.name.trim() : prev.name,
      handle: updates.handle?.trim() ? (updates.handle.startsWith('@') ? updates.handle.trim() : `@${updates.handle.trim()}`) : prev.handle,
      avatar: updates.avatar?.trim() ? updates.avatar.trim() : prev.avatar,
      bio: updates.bio !== undefined ? updates.bio : prev.bio,
    }));
    showToast('Profil pengguna berhasil disimpan!');
  };

  const uploadProfilePhoto = (base64Data: string) => {
    setCurrentUser(prev => ({
      ...prev,
      avatar: base64Data,
    }));
    showToast('Foto profil dari perangkat kamu berhasil diunggah!');
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

  const switchRole = (role: UserRole) => {
    let targetUser = INITIAL_USERS.warga;
    if (role === 'si_paling_sotoy') targetUser = INITIAL_USERS.critic;
    else if (role === 'penulis_sotoy') targetUser = INITIAL_USERS.writer;
    else if (role === 'admin') targetUser = INITIAL_USERS.admin;

    setCurrentUser(targetUser);
    setIsLoggedIn(true);
    localStorage.setItem('sotoy_is_logged_in', 'true');
    localStorage.setItem('sotoy_role', role === 'si_paling_sotoy' ? 'critic' : role === 'penulis_sotoy' ? 'writer' : role === 'admin' ? 'admin' : 'warga');

    if (role === 'warga_sotoy') {
      navigateTo('community-feed');
      showToast(`Beralih ke peran: ${targetUser.roleTitle} (Buzz Feed dibuka)`);
    } else if (role === 'si_paling_sotoy') {
      navigateTo('film-database');
      showToast(`Beralih ke peran: ${targetUser.roleTitle} (Database Film dibuka)`);
    } else {
      navigateTo('home');
      showToast(`Beralih ke peran: ${targetUser.roleTitle} (Beranda & Tombol Tulis Artikel aktif)`);
    }
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
    }
  ) => {
    setCurrentView(view);
    if (options?.articleId !== undefined) setSelectedArticleId(options.articleId);
    if (options?.filmId !== undefined) setSelectedFilmId(options.filmId);
    if (options?.buzzId !== undefined) setSelectedBuzzId(options.buzzId);
    if (options?.category !== undefined) setActiveCategory(options.category);
    if (options?.subCategory !== undefined) setActiveSubCategory(options.subCategory);
    if (options?.userTab !== undefined) setActiveUserTab(options.userTab);
    if (options?.settingsTab !== undefined) setActiveSettingsTab(options.settingsTab);
    
    // Visiting another user's profile or own profile
    if (options?.userId !== undefined) {
      setViewedUserId(options.userId);
    } else if (view === 'user-profile' && !viewedUserId) {
      setViewedUserId(currentUser.id);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Only Penulis Sotoy and Admin can publish editorial articles
  const addArticle = (newArticle: Omit<Article, 'id' | 'publishedAt' | 'views' | 'likes' | 'commentsCount'>): boolean => {
    if (currentUser.role !== 'penulis_sotoy' && currentUser.role !== 'admin') {
      showToast('Akses ditolak: Hanya Penulis Sotoy & Admin yang dapat mempublikasikan artikel!');
      return false;
    }

    const created: Article = {
      ...newArticle,
      id: `art-${Date.now()}`,
      publishedAt: 'Baru saja',
      views: 1,
      likes: 0,
      commentsCount: 0,
    };

    setArticles(prev => [created, ...prev]);
    showToast('Artikel berhasil dipublikasikan!');
    return true;
  };

  const deleteArticle = (id: string) => {
    if (currentUser.role !== 'admin') {
      showToast('Hanya Admin yang dapat menghapus artikel.');
      return;
    }
    setArticles(prev => prev.filter(a => a.id !== id));
    showToast('Artikel berhasil dihapus oleh Admin.');
  };

  const addBuzzPost = (
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

    // Extract hashtags
    const matchedTags = content.match(/#[a-zA-Z0-9_]+/g) || [];
    const cleanTags = matchedTags.map(t => t.replace('#', ''));

    const newBuzz: BuzzPost = {
      id: `buzz-${Date.now()}`,
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
    };

    setBuzzList(prev => [newBuzz, ...prev]);
    showToast('Buzz Sotoy kamu berhasil diposting!');
  };

  const likeBuzzPost = (buzzId: string) => {
    setBuzzList(prev =>
      prev.map(b => {
        if (b.id === buzzId) {
          const isLiked = b.likedByMe;
          return {
            ...b,
            likes: isLiked ? b.likes - 1 : b.likes + 1,
            likedByMe: !isLiked,
          };
        }
        return b;
      })
    );
  };

  const addBuzzReply = (buzzId: string, content: string) => {
    if (!content.trim()) return;
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu untuk membalas diskusi buzz!');
      return;
    }

    const newReply: BuzzReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      buzzId,
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

    setBuzzList(prev =>
      prev.map(b => {
        if (b.id === buzzId) {
          const currentReplies = b.replies || [];
          return {
            ...b,
            replies: [...currentReplies, newReply],
            repliesCount: (b.repliesCount || currentReplies.length) + 1,
          };
        }
        return b;
      })
    );

    showToast('Balasan kamu berhasil diposting!');
  };

  const likeBuzzReply = (buzzId: string, replyId: string) => {
    setBuzzList(prev =>
      prev.map(b => {
        if (b.id === buzzId && b.replies) {
          const updatedReplies = b.replies.map(r => {
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
          return {
            ...b,
            replies: updatedReplies,
          };
        }
        return b;
      })
    );
  };

  const addFilmRating = (filmId: string, score: number, headline: string, reviewText: string) => {
    const newRating: UserRating = {
      id: `rate-${Date.now()}`,
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

    setRatings(prev => [newRating, ...prev]);

    // Update film average score
    setFilms(prev =>
      prev.map(film => {
        if (film.id === filmId) {
          const currentTotal = film.skorSotoy * film.totalVotes;
          const newVotes = film.totalVotes + 1;
          const newAverage = Number(((currentTotal + score) / newVotes).toFixed(1));
          return {
            ...film,
            skorSotoy: newAverage,
            totalVotes: newVotes,
          };
        }
        return film;
      })
    );

    showToast(`Skor Sotoy ${score.toFixed(1)}/5.0 dan ulasan kamu berhasil dikirim!`);
  };

  const likeArticle = (articleId: string) => {
    setArticles(prev =>
      prev.map(a => {
        if (a.id === articleId) {
          return { ...a, likes: a.likes + 1 };
        }
        return a;
      })
    );
    showToast('Kamu menyukai artikel ini!');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        loginModalOpen,
        setLoginModalOpen,
        login,
        logout,
        switchRole,
        articles,
        films,
        buzzList,
        ratings,
        watchlist,
        toggleWatchlist,
        isFilmInWatchlist,
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
        addBuzzReply,
        likeBuzzReply,
        addFilmRating,
        likeArticle,
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
