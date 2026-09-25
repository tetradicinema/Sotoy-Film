import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Sliders,
  Activity,
  Upload,
  Camera,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Smartphone,
  Globe,
  Key,
  Mail,
  Film,
  Sparkles,
  Save,
  ChevronRight,
  RefreshCw,
  LogOut,
  Layers,
  Award,
  Flame,
  TrendingUp,
  MessageSquare,
  Bookmark,
  Star,
  Send,
  Heart,
  Archive,
  Clock,
  Search,
  PenSquare,
  ExternalLink,
  Undo2,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SettingsSubPage, UserSettings } from '../../types';
import { ProfilePhotoCropModal } from '../Common/ProfilePhotoCropModal';

export const SettingsPage: React.FC = () => {
  const {
    currentUser,
    updateUserProfile,
    uploadProfilePhoto,
    userSettings,
    updateUserSettings,
    activeSettingsTab,
    setActiveSettingsTab,
    changeEmail,
    changePassword,
    toggleTwoFactor,
    exportUserData,
    ratings,
    watchlist,
    buzzList,
    films,
    articles,
    savedArticles,
    toggleWatchlist,
    toggleSaveArticle,
    showToast,
    logout,
    navigateTo,
    isAdmin,
    isWriter,
  } = useApp();

  // Profile Form state
  const [name, setName] = useState(currentUser.name || '');
  const [handle, setHandle] = useState(currentUser.handle || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Photo Cropping state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<{
    src: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);

  // Security Form state
  const [currentEmail, setCurrentEmail] = useState(currentUser.email || 'budi.cinephile@sotoyfilm.id');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setHandle(currentUser.handle || '');
      setBio(currentUser.bio || '');
      setAvatarPreview(currentUser.avatar || '');
      if (currentUser.email) {
        setCurrentEmail(currentUser.email);
      }
    }
  }, [currentUser]);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Activity Centre State
  const [activityCategory, setActivityCategory] = useState<'all' | 'liked' | 'saved' | 'reviews' | 'buzz' | 'archived'>('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [archivedActivities, setArchivedActivities] = useState<Array<{
    id: string;
    type: 'liked' | 'saved' | 'reviews' | 'buzz';
    title: string;
    subtitle: string;
    date: string;
    linkType?: 'film' | 'buzz' | 'article';
    linkId?: string;
    imageUrl?: string;
    meta?: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem('sotoy_archived_activities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const archiveItem = (item: {
    id: string;
    type: 'liked' | 'saved' | 'reviews' | 'buzz';
    title: string;
    subtitle: string;
    date: string;
    linkType?: 'film' | 'buzz' | 'article';
    linkId?: string;
    imageUrl?: string;
    meta?: string;
  }) => {
    const updated = [item, ...archivedActivities.filter(a => a.id !== item.id)];
    setArchivedActivities(updated);
    localStorage.setItem('sotoy_archived_activities', JSON.stringify(updated));
    showToast(`"${item.title}" dipindahkan ke Arsip Aktivitas.`);
  };

  const restoreArchivedItem = (id: string) => {
    const updated = archivedActivities.filter(a => a.id !== id);
    setArchivedActivities(updated);
    localStorage.setItem('sotoy_archived_activities', JSON.stringify(updated));
    showToast('Aktivitas dikembalikan dari arsip.');
  };

  const deleteArchivedItem = (id: string) => {
    const updated = archivedActivities.filter(a => a.id !== id);
    setArchivedActivities(updated);
    localStorage.setItem('sotoy_archived_activities', JSON.stringify(updated));
    showToast('Riwayat dihapus permanen.');
  };

  // All Available Genres
  const ALL_GENRES = [
    'Sci-Fi',
    'Psychological Thriller',
    'Neo-Noir',
    'Cinema Gear',
    'Anime',
    'Indie Cinema',
    'Horror',
    'Action & Epik',
    'Drama & Biografi',
    'Komedi Satir',
    'Dokumenter Sinema',
    'Cyberpunk',
  ];

  // Handle device file upload - opens 1:1 cropping modal
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Mohon pilih file gambar yang valid (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran gambar terlalu besar. Maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const base64 = event.target?.result as string;
      if (base64) {
        setImageToCrop({
          src: base64,
          name: file.name,
          size: file.size,
          type: file.type,
        });
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropConfirmed = async (
    croppedDataUrl: string,
    fileName?: string,
    fileSize?: number,
    fileType?: string
  ) => {
    setAvatarPreview(croppedDataUrl);
    await uploadProfilePhoto(croppedDataUrl, fileName, fileSize, fileType);
  };

  const handleCloseCropModal = () => {
    setCropModalOpen(false);
    setImageToCrop(null);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name,
      handle,
      bio,
      avatar: avatarPreview,
    });
  };

  const handleUpdateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      showToast('Masukkan alamat email baru.');
      return;
    }
    if (newEmail !== confirmEmail) {
      showToast('Konfirmasi email baru tidak cocok.');
      return;
    }
    if (changeEmail(newEmail)) {
      setCurrentEmail(newEmail);
      setNewEmail('');
      setConfirmEmail('');
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      showToast('Masukkan kata sandi lama.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    if (changePassword(oldPassword, newPassword)) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const toggleGenre = (genre: string) => {
    const current = userSettings.favoriteGenres || [];
    const next = current.includes(genre)
      ? current.filter(g => g !== genre)
      : [...current, genre];
    updateUserSettings({ favoriteGenres: next });
  };

  // User activities derived for Activity Centre
  const userReviews = ratings.filter(r => r.userId === currentUser.id);
  const userBuzzPosts = buzzList.filter(b => b.author.id === currentUser.id);
  const likedBuzzPosts = buzzList.filter(b => !!b.myReaction);
  const watchlistFilmItems = watchlist.map(id => films.find(f => f.id === id)).filter((f): f is typeof films[0] => Boolean(f));
  const savedArticleItems = (savedArticles || []).map(id => articles.find(a => a.id === id)).filter((a): a is typeof articles[0] => Boolean(a));

  const isWriterOrAdmin = currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin' || isWriter || isAdmin;

  const navItems: { id: SettingsSubPage; label: string; icon: any; desc: string }[] = [
    {
      id: 'profile',
      label: 'Profil & Foto Perangkat',
      icon: UserIcon,
      desc: 'Nama, bio & upload foto dari device',
    },
    {
      id: 'activity',
      label: 'Riwayat Aktivitas',
      icon: Activity,
      desc: 'Log postingan disukai, disimpan, ulasan & arsip',
    },
    {
      id: 'security',
      label: 'Keamanan & Akun',
      icon: Lock,
      desc: 'Email, ganti sandi & sesi login',
    },
    {
      id: 'privacy',
      label: 'Privasi & Visibilitas',
      icon: Shield,
      desc: 'Visibilitas data, tag & unduh arsip',
    },
    {
      id: 'preferences',
      label: 'Preferensi Sinema',
      icon: Sliders,
      desc: 'Genre film, player & autoplay',
    },
    {
      id: 'notifications',
      label: 'Notifikasi',
      icon: Bell,
      desc: 'Pemberitahuan suka, rilis & buzz',
    },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF2E7E] shadow-sm shadow-[#FF2E7E]" />
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight">
              Pengaturan Akun & Pusat Aktivitas
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isWriterOrAdmin && (
              <button
                id="settings-open-cms-btn"
                onClick={() => navigateTo('cms')}
                className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-xs font-bold text-purple-300 hover:text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Buka Halaman CMS</span>
                <ExternalLink className="w-3 h-3 text-purple-400" />
              </button>
            )}
            <button
              id="back-to-dashboard-btn"
              onClick={() => navigateTo('user-profile')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#FF2E7E]" />
              <span>Lihat Dashboard</span>
            </button>
          </div>
        </div>

        {/* Settings Main Grid: Sidebar Sub-Pages + Active Content Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Subpage Navigation Sidebar */}
          <aside className="lg:col-span-4 bg-[#171A1F] border border-slate-800 rounded-3xl p-3 sm:p-4 space-y-1 shadow-xl">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-2">
              Kategori Pengaturan
            </div>

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeSettingsTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`settings-nav-${item.id}`}
                  onClick={() => setActiveSettingsTab(item.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border border-[#FF2E7E]/40 text-white shadow-lg shadow-cyan-500/10'
                      : 'hover:bg-slate-850 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-[#FF2E7E] text-black font-black'
                          : 'bg-slate-800 text-slate-400 group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${isActive ? 'text-[#FF2E7E]' : 'text-white'}`}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? 'text-[#FF2E7E] translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                    }`}
                  />
                </button>
              );
            })}

            {/* Quick Export / Danger actions */}
            <div className="pt-4 mt-2 border-t border-slate-800/80 space-y-1">
              <button
                onClick={exportUserData}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2.5 transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Unduh Salinan Data Akun</span>
              </button>
              <button
                onClick={logout}
                className="w-full text-left p-2.5 rounded-xl hover:bg-red-500/10 text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-2.5 transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Keluar (Log Out)</span>
              </button>
            </div>
          </aside>

          {/* Subpage Active Content Pane */}
          <section className="lg:col-span-8 bg-[#171A1F] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
            
            {/* =================================================================== */}
            {/* SUBPAGE 1: PROFIL & UPLOAD FOTO DARI DEVICE */}
            {/* =================================================================== */}
            {activeSettingsTab === 'profile' && (
              <div id="settings-pane-profile" className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-display font-black text-white flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-[#FF2E7E]" />
                    <span>Identitas Profil & Foto Perangkat</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unggah foto profil langsung dari komputer atau ponsel kamu, dan sesuaikan profil sinematikmu.
                  </p>
                </div>

                {/* Upload Foto Profil Langsung dari Device Section */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Foto Profil Kamu
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Live Avatar Preview */}
                    <div className="relative group shrink-0">
                      <img
                        src={avatarPreview}
                        alt={name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-2 ring-[#FF2E7E] shadow-xl"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold gap-1"
                        title="Klik untuk memilih foto"
                      >
                        <Camera className="w-5 h-5 text-[#FF2E7E]" />
                        <span>Ganti Foto</span>
                      </button>
                    </div>

                    <div className="flex-1 space-y-3 text-center sm:text-left">
                      <div>
                        <div className="text-sm font-bold text-white">Unggah Foto dari Perangkat</div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Mendukung file JPG, PNG, atau WEBP langsung dari penyimpanan lokal perangkatmu (Maksimal 5MB).
                        </p>
                      </div>

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="device-photo-upload-input"
                      />

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                        <button
                          type="button"
                          id="btn-upload-from-device"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#00d0e0] text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Pilih Foto dari Galeri / Device</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const defaultUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80';
                            setAvatarPreview(defaultUrl);
                            uploadProfilePhoto(defaultUrl);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reset Foto Default</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Form Fields */}
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Nama Lengkap / Tampilan</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Handle / Username (@)</label>
                      <input
                        type="text"
                        value={handle}
                        onChange={e => setHandle(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Bio Sinematik & Filosofi Menonton</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none"
                      placeholder="Ceritakan seleramu tentang film, sutradara favorit, atau gaya visual yang kamu sukai..."
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      id="save-profile-btn"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#00A3FF] hover:brightness-110 text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan Profil</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =================================================================== */}
            {/* SUBPAGE 2: PUSAT RIWAYAT AKTIVITAS (ACTIVITY CENTRE) */}
            {/* =================================================================== */}
            {activeSettingsTab === 'activity' && (() => {
              // Assemble real activity items from user data
              interface ActivityItem {
                id: string;
                type: 'liked' | 'saved' | 'reviews' | 'buzz' | 'archived';
                categoryLabel: string;
                title: string;
                subtitle: string;
                meta?: string;
                date: string;
                linkType?: 'film' | 'buzz' | 'article';
                linkId?: string;
                imageUrl?: string;
                badgeColor: string;
              }

              const allActivities: ActivityItem[] = [];

              // 1. Liked items
              likedBuzzPosts.forEach(b => {
                const totalReactions = (b.reactions ? Object.values(b.reactions).reduce((acc: number, val) => acc + (typeof val === 'number' ? val : 0), 0) : 0) + (b.likes || 0);
                allActivities.push({
                  id: `liked-buzz-${b.id}`,
                  type: 'liked',
                  categoryLabel: 'Buzz Disukai',
                  title: `Menyukai Buzz dari @${b.author.handle.replace('@', '')}`,
                  subtitle: b.content,
                  meta: `Reaksi: ${b.myReaction || '👍'} • ${totalReactions} total reaksi`,
                  date: b.createdAt,
                  linkType: 'buzz',
                  linkId: b.id,
                  imageUrl: b.author.avatar,
                  badgeColor: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
                });
              });

              // 2. Saved items (Watchlist films & Saved articles)
              watchlistFilmItems.forEach(f => {
                allActivities.push({
                  id: `saved-film-${f.id}`,
                  type: 'saved',
                  categoryLabel: 'Watchlist Film',
                  title: `Menyimpan Film "${f.title}"`,
                  subtitle: `${f.year} • Disutradarai ${f.director} • ${f.genres?.join(', ') || 'Sinema'}`,
                  meta: `Skor Komunitas: ${f.skorSotoy}/5.0`,
                  date: 'Tersimpan di Watchlist',
                  linkType: 'film',
                  linkId: f.id,
                  imageUrl: f.poster,
                  badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                });
              });

              savedArticleItems.forEach(a => {
                allActivities.push({
                  id: `saved-art-${a.id}`,
                  type: 'saved',
                  categoryLabel: 'Artikel Tersimpan',
                  title: `Menyimpan Artikel "${a.title}"`,
                  subtitle: `${a.readTime} baca • Oleh ${a.author.name}`,
                  meta: a.category,
                  date: a.publishedAt || 'Tersimpan',
                  linkType: 'article',
                  linkId: a.id,
                  imageUrl: a.coverImage,
                  badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                });
              });

              // 3. Reviews & Ratings
              userReviews.forEach(r => {
                const film = films.find(f => f.id === r.filmId);
                allActivities.push({
                  id: `review-${r.id}`,
                  type: 'reviews',
                  categoryLabel: 'Skor & Ulasan',
                  title: `Memberikan Skor ${r.score}/5.0 pada "${film ? film.title : 'Film'}"`,
                  subtitle: r.headline || r.reviewText || 'Ulasan penonton',
                  meta: film ? `${film.year} • ${film.genres?.[0] || 'Sinema'}` : undefined,
                  date: r.createdAt,
                  linkType: 'film',
                  linkId: r.filmId,
                  imageUrl: film?.poster,
                  badgeColor: 'text-[#FF2E7E] bg-amber-500/10 border-amber-500/30',
                });
              });

              // 4. User Buzz Posts
              userBuzzPosts.forEach(b => {
                const totalReactions = (b.reactions ? Object.values(b.reactions).reduce((acc: number, val) => acc + (typeof val === 'number' ? val : 0), 0) : 0) + (b.likes || 0);
                allActivities.push({
                  id: `buzz-${b.id}`,
                  type: 'buzz',
                  categoryLabel: 'Postingan Buzz',
                  title: 'Mempublikasikan Opini di Buzz Feed',
                  subtitle: b.content,
                  meta: `${b.repliesCount || 0} balasan • ${totalReactions} reaksi`,
                  date: b.createdAt,
                  linkType: 'buzz',
                  linkId: b.id,
                  imageUrl: currentUser.avatar,
                  badgeColor: 'text-[#FF2E7E] bg-cyan-500/10 border-cyan-500/30',
                });
              });

              // Filter out items that are already in archivedActivities
              const archivedIds = new Set(archivedActivities.map(a => a.id));
              const activeList = allActivities.filter(a => !archivedIds.has(a.id));

              // Categorize items
              const displayList: ActivityItem[] = activityCategory === 'archived'
                ? archivedActivities.map(a => ({
                    ...a,
                    type: 'archived' as const,
                    categoryLabel: 'Diarsipkan',
                    badgeColor: 'text-slate-400 bg-slate-800 border-slate-700',
                  }))
                : activityCategory === 'all'
                ? activeList
                : activeList.filter(a => a.type === activityCategory);

              // Apply Search Filter
              const filteredList = displayList.filter(item => {
                if (!activitySearch.trim()) return true;
                const q = activitySearch.toLowerCase();
                return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
              });

              return (
                <div id="settings-pane-activity" className="space-y-6 animate-in fade-in duration-200">
                  {/* Header */}
                  <div className="border-b border-slate-800 pb-4">
                    <h2 className="text-lg font-display font-black text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[#FF2E7E]" />
                      <span>Pusat Riwayat Aktivitas (Activity Centre)</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Histori lengkap aktivitas akun: postingan yang kamu sukai, film & artikel tersimpan, ulasan yang ditulis, opini buzz, serta arsip.
                    </p>
                  </div>

                  {/* Activity Summary Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div
                      onClick={() => setActivityCategory('liked')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activityCategory === 'liked'
                          ? 'bg-pink-500/10 border-pink-500/50 shadow-sm'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disukai</span>
                        <Heart className="w-3.5 h-3.5 text-pink-400" />
                      </div>
                      <div className="text-xl font-black text-white mt-1.5 font-mono">{likedBuzzPosts.length}</div>
                      <div className="text-[10px] text-pink-400 mt-0.5">Postingan & Reaksi</div>
                    </div>

                    <div
                      onClick={() => setActivityCategory('saved')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activityCategory === 'saved'
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tersimpan</span>
                        <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-xl font-black text-white mt-1.5 font-mono">
                        {watchlistFilmItems.length + savedArticleItems.length}
                      </div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">Watchlist & Bacaan</div>
                    </div>

                    <div
                      onClick={() => setActivityCategory('reviews')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activityCategory === 'reviews'
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ulasan</span>
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="text-xl font-black text-white mt-1.5 font-mono">{userReviews.length}</div>
                      <div className="text-[10px] text-amber-400 mt-0.5">Skor Film Ditulis</div>
                    </div>

                    <div
                      onClick={() => setActivityCategory('buzz')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activityCategory === 'buzz'
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-sm'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buzz Opini</span>
                        <MessageSquare className="w-3.5 h-3.5 text-[#FF2E7E]" />
                      </div>
                      <div className="text-xl font-black text-white mt-1.5 font-mono">{userBuzzPosts.length}</div>
                      <div className="text-[10px] text-cyan-400 mt-0.5">Thread Terkirim</div>
                    </div>

                    <div
                      onClick={() => setActivityCategory('archived')}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                        activityCategory === 'archived'
                          ? 'bg-purple-500/10 border-purple-500/50 shadow-sm'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arsip</span>
                        <Archive className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <div className="text-xl font-black text-white mt-1.5 font-mono">{archivedActivities.length}</div>
                      <div className="text-[10px] text-purple-400 mt-0.5">Riwayat Disimpan</div>
                    </div>
                  </div>

                  {/* Filter & Search Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap">
                      <button
                        onClick={() => setActivityCategory('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                          activityCategory === 'all'
                            ? 'bg-[#FF2E7E] text-black shadow-md shadow-cyan-500/20'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        Semua ({activeList.length})
                      </button>

                      <button
                        onClick={() => setActivityCategory('liked')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                          activityCategory === 'liked'
                            ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Heart className="w-3 h-3" />
                        <span>Disukai ({likedBuzzPosts.length})</span>
                      </button>

                      <button
                        onClick={() => setActivityCategory('saved')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                          activityCategory === 'saved'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Bookmark className="w-3 h-3" />
                        <span>Disimpan ({watchlistFilmItems.length + savedArticleItems.length})</span>
                      </button>

                      <button
                        onClick={() => setActivityCategory('reviews')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                          activityCategory === 'reviews'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Star className="w-3 h-3" />
                        <span>Ulasan ({userReviews.length})</span>
                      </button>

                      <button
                        onClick={() => setActivityCategory('buzz')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                          activityCategory === 'buzz'
                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Buzz ({userBuzzPosts.length})</span>
                      </button>

                      <button
                        onClick={() => setActivityCategory('archived')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                          activityCategory === 'archived'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Archive className="w-3 h-3" />
                        <span>Arsip ({archivedActivities.length})</span>
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={activitySearch}
                        onChange={e => setActivitySearch(e.target.value)}
                        placeholder="Cari aktivitas..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                      />
                    </div>
                  </div>

                  {/* Activity Items List */}
                  <div className="space-y-3">
                    {filteredList.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 mx-auto flex items-center justify-center">
                          <Activity className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 max-w-sm mx-auto">
                          <h4 className="text-sm font-bold text-white">
                            {activityCategory === 'archived'
                              ? 'Tidak ada riwayat di arsip'
                              : activitySearch
                              ? 'Tidak ada aktivitas yang sesuai dengan kata kunci'
                              : 'Belum ada riwayat aktivitas'}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {activityCategory === 'archived'
                              ? 'Aktivitas yang kamu arsipkan atau simpan riwayatnya akan tampil di sini.'
                              : 'Ketika kamu menyukai postingan buzz, menyimpan watchlist film, menulis ulasan, atau memposting opini, semuanya akan tercatat rapi di sini.'}
                          </p>
                        </div>
                        {activityCategory !== 'all' && (
                          <button
                            onClick={() => {
                              setActivityCategory('all');
                              setActivitySearch('');
                            }}
                            className="text-xs font-bold text-[#FF2E7E] hover:underline"
                          >
                            Tampilkan Semua Aktivitas
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredList.map(item => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            {/* Thumbnail or Icon */}
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-11 h-14 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-800 shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0">
                                {item.type === 'liked' && <Heart className="w-5 h-5 text-pink-400" />}
                                {item.type === 'saved' && <Bookmark className="w-5 h-5 text-emerald-400" />}
                                {item.type === 'reviews' && <Star className="w-5 h-5 text-amber-400" />}
                                {item.type === 'buzz' && <MessageSquare className="w-5 h-5 text-cyan-400" />}
                                {item.type === 'archived' && <Archive className="w-5 h-5 text-purple-400" />}
                              </div>
                            )}

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor}`}>
                                  {item.categoryLabel}
                                </span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{item.date}</span>
                                </span>
                              </div>

                              <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#FF2E7E] transition-colors truncate">
                                {item.title}
                              </h4>

                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {item.subtitle}
                              </p>

                              {item.meta && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {item.meta}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {item.linkType === 'film' && item.linkId && (
                              <button
                                onClick={() => navigateTo('film-detail', { filmId: item.linkId })}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-[#FF2E7E] hover:text-black text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                <span>Buka Film</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}

                            {item.linkType === 'article' && item.linkId && (
                              <button
                                onClick={() => navigateTo('article-detail', { articleId: item.linkId })}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-purple-500 hover:text-white text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                <span>Baca Artikel</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}

                            {item.linkType === 'buzz' && (
                              <button
                                onClick={() => navigateTo('community-feed')}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-[#FF2E7E] hover:text-white text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                <span>Lihat Buzz</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}

                            {item.type === 'archived' ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => restoreArchivedItem(item.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-400 text-xs font-bold transition-colors flex items-center gap-1"
                                  title="Kembalikan dari Arsip"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Pulihkan</span>
                                </button>
                                <button
                                  onClick={() => deleteArchivedItem(item.id)}
                                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-600 hover:text-white text-slate-400 transition-colors"
                                  title="Hapus Permanen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => archiveItem({
                                  id: item.id,
                                  type: item.type as 'liked' | 'saved' | 'reviews' | 'buzz',
                                  title: item.title,
                                  subtitle: item.subtitle,
                                  date: item.date,
                                  linkType: item.linkType,
                                  linkId: item.linkId,
                                  imageUrl: item.imageUrl,
                                  meta: item.meta,
                                })}
                                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                title="Pindahkan ke Arsip"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            {/* =================================================================== */}
            {/* SUBPAGE: MY CONTENT WORKSPACE MOVED NOTIFICATION */}
            {/* =================================================================== */}
            {activeSettingsTab === 'my-content' && (
              <div id="settings-pane-my-content" className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-black text-white">
                    Full Control CMS Telah Dipindahkan ke Halaman Tersendiri
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                    Sesuai kebutuhan tata kelola redaksi, modul CMS dan manajemen artikel tidak lagi berada di dalam menu pengaturan profil, melainkan memiliki halaman mandiri tersendiri dengan ruang kerja penuh.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => navigateTo('cms')}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 inline-flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Buka Halaman Mandiri Full Control CMS</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* SUBPAGE 3: KEAMANAN & AKUN (GANTI EMAIL, SANDI, 2FA) */}
            {/* =================================================================== */}
            {activeSettingsTab === 'security' && (
              <div id="settings-pane-security" className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-display font-black text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#FF2E7E]" />
                    <span>Keamanan Akun & Kredensial</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Perbarui alamat email terdaftar, ganti kata sandi, dan aktifkan proteksi autentikasi dua langkah (2FA).
                  </p>
                </div>

                {/* Ganti Email Form */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#FF2E7E]" />
                        <span>Alamat Email Terdaftar</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Email aktif saat ini: <span className="font-mono text-white font-bold">{currentEmail}</span>
                      </div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Terverifikasi
                    </span>
                  </div>

                  <form onSubmit={handleUpdateEmail} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-400">Email Baru</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="contoh@domain.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-400">Konfirmasi Email Baru</label>
                      <input
                        type="email"
                        value={confirmEmail}
                        onChange={e => setConfirmEmail(e.target.value)}
                        placeholder="Ulangi email baru"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E]"
                      />
                    </div>

                    <div className="sm:col-span-2 flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
                      >
                        Perbarui Alamat Email
                      </button>
                    </div>
                  </form>
                </div>

                {/* Ganti Kata Sandi Form */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#FF2E7E]" />
                      <span>Ganti Kata Sandi (Password)</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Gunakan kombinasi minimal 6 karakter dengan huruf dan angka untuk keamanan optimal.
                    </div>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-400">Kata Sandi Saat Ini</label>
                      <div className="relative">
                        <input
                          type={showOldPassword ? 'text' : 'password'}
                          value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)}
                          placeholder="Masukkan password lama kamu"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                        >
                          {showOldPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-400">Kata Sandi Baru</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E] pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                          >
                            {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-400">Konfirmasi Sandi Baru</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi kata sandi baru"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-black text-xs transition-all shadow-md shadow-amber-500/20"
                      >
                        Simpan Kata Sandi Baru
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2-Factor Authentication (2FA) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-white">Autentikasi Dua Langkah (2FA)</span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-lg">
                      Tambahkan perlindungan ekstra dengan verifikasi kode OTP setiap kali masuk dari perangkat baru.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleTwoFactor}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 ${
                      userSettings.twoFactorEnabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${userSettings.twoFactorEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{userSettings.twoFactorEnabled ? '2FA Aktif' : 'Aktifkan 2FA'}</span>
                  </button>
                </div>

                {/* Active Sessions */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Perangkat & Sesi Login Aktif
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-[#FF2E7E]" />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>Chrome di Windows 11</span>
                            <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.2 rounded">
                              Sesi Saat Ini
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">Jakarta, Indonesia • IP 182.253.xx.xx</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* SUBPAGE 4: PENGATURAN PRIVASI & DATA */}
            {/* =================================================================== */}
            {activeSettingsTab === 'privacy' && (
              <div id="settings-pane-privacy" className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-display font-black text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#FF2E7E]" />
                    <span>Pengaturan Privasi & Visibilitas Data</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kontrol siapa saja yang dapat melihat profil, daftar tontonan, ulasan, serta izin ditandai dalam komunitas.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Mode Profil Privat */}
                  <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">Jadikan Profil Privat</div>
                      <div className="text-[11px] text-slate-400">
                        Hanya pengguna yang disetujui sebagai pengikut yang dapat melihat ulasan lengkap dan watchlist kamu.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateUserSettings({ isPrivateProfile: !userSettings.isPrivateProfile })}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        userSettings.isPrivateProfile ? 'bg-[#FF2E7E]' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          userSettings.isPrivateProfile ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Visibilitas Watchlist */}
                  <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">Tampilkan Watchlist ke Publik</div>
                      <div className="text-[11px] text-slate-400">
                        Izinkan penonton lain melihat daftar film yang ingin kamu tonton di halaman profilmu.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateUserSettings({ isWatchlistPublic: !userSettings.isWatchlistPublic })}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        userSettings.isWatchlistPublic ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          userSettings.isWatchlistPublic ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Visibilitas Riwayat Ulasan */}
                  <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">Publikasikan Skor & Ulasan Saya di Feed</div>
                      <div className="text-[11px] text-slate-400">
                        Setiap kali kamu memberi rating bintang atau ulasan, tampilkan di tab ulasan film publik.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateUserSettings({ isReviewsPublic: !userSettings.isReviewsPublic })}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        userSettings.isReviewsPublic ? 'bg-[#FF2E7E]' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          userSettings.isReviewsPublic ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Izin Penandaan (Tagging) di Buzz */}
                  <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
                    <div className="text-xs font-bold text-white">Izin Ditandai di Postingan Buzz (@mention)</div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        { id: 'everyone', label: 'Semua Orang' },
                        { id: 'following', label: 'Hanya yang Diikuti' },
                        { id: 'none', label: 'Jangan Izinkan' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateUserSettings({ allowTagging: opt.id as any })}
                          className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                            userSettings.allowTagging === opt.id
                              ? 'bg-cyan-500/20 border-[#FF2E7E] text-[#FF2E7E]'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Data Export & Zona Berbahaya */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Arsip Data & Zona Berbahaya
                  </div>

                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">Unduh Arsip Data Pribadi (JSON)</div>
                      <div className="text-[11px] text-slate-400">
                        Dapatkan salinan data ulasan film, watchlist tersimpan, dan daftar following/followers.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={exportUserData}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Data Saya</span>
                    </button>
                  </div>

                  <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-red-400">Hapus Akun Sotoy Film</div>
                      <div className="text-[11px] text-slate-400">
                        Tindakan ini akan menghapus semua ulasan, thread buzz, dan progres kurasi secara permanen.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast('Permintaan penghapusan akun telah dicatat. Hubungi tim support untuk konfirmasi akhir.')}
                      className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Akun</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* SUBPAGE 5: PREFERENSI SINEMA & GENRE */}
            {/* =================================================================== */}
            {activeSettingsTab === 'preferences' && (
              <div id="settings-pane-preferences" className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-display font-black text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#FF2E7E]" />
                    <span>Preferensi Sinema & Pemutar Film</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Personalisasi rekomendasi film di beranda dan sesuaikan pemutar trailer sesuai koneksi internetmu.
                  </p>
                </div>

                {/* Genre Favorit Multi-select */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div>
                    <div className="text-sm font-bold text-white">Genre Film Favorit Kamu</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Pilih genre yang paling sering kamu tonton untuk mengasah algoritma rekomendasi:
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {ALL_GENRES.map(genre => {
                      const isFav = userSettings.favoriteGenres?.includes(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => toggleGenre(genre)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isFav
                              ? 'bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] text-white shadow-md shadow-[#FF2E7E]/20'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {isFav ? `✓ ${genre}` : `+ ${genre}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kualitas Pemutar Trailer */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="text-sm font-bold text-white">Resolusi Pemutar Trailer Video</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {(['4K Ultra HD', '1080p Full HD', 'Auto Data Saver'] as const).map(quality => (
                      <button
                        key={quality}
                        type="button"
                        onClick={() => updateUserSettings({ cinemaQuality: quality })}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                          userSettings.cinemaQuality === quality
                            ? 'bg-cyan-500/20 border-[#FF2E7E] text-[#FF2E7E]'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold">{quality}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {quality === '4K Ultra HD' ? 'Kualitas sinematik terbaik' : quality === '1080p Full HD' ? 'Seimbang & tajam' : 'Hemat kuota internet'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Setting */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="text-sm font-bold text-white">Bahasa / Language</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {(['en', 'id'] as const).map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => updateUserSettings({ language: lang })}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                          userSettings.language === lang
                            ? 'bg-cyan-500/20 border-[#FF2E7E] text-[#FF2E7E]'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold">{lang === 'en' ? 'English' : 'Bahasa Indonesia'}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Autoplay Trailer */}
                <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-white">Autoplay Trailer di Halaman Detail Film</div>
                    <div className="text-[11px] text-slate-400">
                      Putar trailer secara otomatis saat membuka halaman ulasan film.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateUserSettings({ autoplayTrailer: !userSettings.autoplayTrailer })}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                      userSettings.autoplayTrailer ? 'bg-[#FF2E7E]' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-black transition-transform ${
                        userSettings.autoplayTrailer ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* SUBPAGE 6: NOTIFIKASI */}
            {/* =================================================================== */}
            {activeSettingsTab === 'notifications' && (
              <div id="settings-pane-notifications" className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-display font-black text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#FF2E7E]" />
                    <span>Preferensi Notifikasi</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Atur interaksi dan pengingat yang ingin kamu terima dari komunitas dan redaksi film.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">Notifikasi Suka Ulasan</div>
                      <div className="text-[11px] text-slate-400">
                        Beri tahu saya saat cinephile lain menyukai Skor Sotoy atau ulasan saya.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateUserSettings({ notifyReviewLikes: !userSettings.notifyReviewLikes })}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        userSettings.notifyReviewLikes ? 'bg-pink-500' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          userSettings.notifyReviewLikes ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">Balasan Buzz Komunitas</div>
                      <div className="text-[11px] text-slate-400">
                        Beri tahu saya saat kurator atau penonton lain membalas thread buzz saya.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateUserSettings({ notifyCuratorBuzz: !userSettings.notifyCuratorBuzz })}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        userSettings.notifyCuratorBuzz ? 'bg-[#FF2E7E]' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          userSettings.notifyCuratorBuzz ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">Pengingat Rilis Film di Watchlist</div>
                      <div className="text-[11px] text-slate-400">
                        Kirim notifikasi saat film yang ada di daftar tontonanmu mulai tayang di bioskop atau streaming.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateUserSettings({ notifyWatchlistRelease: !userSettings.notifyWatchlistRelease })}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        userSettings.notifyWatchlistRelease ? 'bg-[#FF2E7E]' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          userSettings.notifyWatchlistRelease ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 1:1 Square Profile Photo Crop Modal */}
      <ProfilePhotoCropModal
        isOpen={cropModalOpen}
        imageSrc={imageToCrop?.src || null}
        fileName={imageToCrop?.name}
        fileSize={imageToCrop?.size}
        fileType={imageToCrop?.type}
        onClose={handleCloseCropModal}
        onCropConfirmed={handleCropConfirmed}
      />
    </div>
  );
};
