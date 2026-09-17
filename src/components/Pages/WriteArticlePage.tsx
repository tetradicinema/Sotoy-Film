import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PenSquare,
  Sparkles,
  Lock,
  ArrowLeft,
  CheckCircle,
  Eye,
  Image as ImageIcon,
  Star,
  Send,
  HelpCircle,
  Save,
  RotateCcw,
  Upload,
  Film,
  Search,
  X,
  Trash2,
  Link,
  FileText,
  Check,
  Plus,
  Users,
  Globe,
  AlertTriangle,
  Share2,
  Calendar,
  Clock,
  Columns,
  CheckCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MainCategory, SubCategory, FilmItem } from '../../types';
import { db } from '../../lib/firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

interface CoEditor {
  userId: string;
  userName: string;
  userAvatar: string;
  roleTitle?: string;
  lastActive: number;
}

export const WriteArticlePage: React.FC = () => {
  const {
    currentUser,
    isLoggedIn,
    isWriter,
    isAdmin,
    articles,
    films,
    selectedArticleId,
    setLoginModalOpen,
    addArticle,
    updateArticle,
    navigateTo,
    showToast,
  } = useApp();

  const isAuthorized = isLoggedIn && (currentUser.role === 'penulis_sotoy' || currentUser.role === 'admin' || currentUser.id === '0PCmaBvJrzeaQgpf3sSTC4mnsh02' || isWriter || isAdmin);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MainCategory>('movies');
  const [subCategory, setSubCategory] = useState<SubCategory>('news');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80');
  const [tagsInput, setTagsInput] = useState('Film, Bioskop, Review');
  const [readTime, setReadTime] = useState('5 mnt baca');
  const [previewMode, setPreviewMode] = useState(false);
  const [splitPreview, setSplitPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [articleStatus, setArticleStatus] = useState<'published' | 'draft' | 'scheduled'>('published');
  const [publishOption, setPublishOption] = useState<'now' | 'scheduled' | 'draft'>('now');
  const [scheduledAtDate, setScheduledAtDate] = useState<string>('');

  // Auto-Save State
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // SEO Metadata State
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');

  // Collaborative Presence State
  const [coEditors, setCoEditors] = useState<CoEditor[]>([]);

  // Cover Image Mode: 'file' | 'url'
  const [coverMode, setCoverMode] = useState<'file' | 'url'>('file');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Related Film Selection State
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
  const [filmSearchQuery, setFilmSearchQuery] = useState('');
  const [isFilmSearchOpen, setIsFilmSearchOpen] = useState(false);

  // Subcategory mapping based on category
  const subCategoryOptions: Record<MainCategory, { id: SubCategory; label: string }[]> = {
    movies: [
      { id: 'news', label: 'News' },
      { id: 'lists', label: 'Lists' },
      { id: 'reviews', label: 'Reviews' },
    ],
    series: [
      { id: 'news', label: 'News' },
      { id: 'lists', label: 'Lists' },
      { id: 'reviews', label: 'Reviews' },
    ],
    anime: [
      { id: 'news', label: 'News' },
      { id: 'lists', label: 'Lists' },
    ],
    'cinema-gear': [
      { id: 'gear-news', label: 'Gear News' },
      { id: 'gear-reviews', label: 'Gear Reviews' },
    ],
    'film-studies': [
      { id: 'producing', label: 'Producing' },
      { id: 'directing', label: 'Directing' },
      { id: 'cinematography', label: 'Cinematography' },
      { id: 'lighting', label: 'Lighting' },
      { id: 'post-production', label: 'Post-Production' },
    ],
  };

  // Currently selected film object
  const selectedFilm = useMemo(() => {
    if (!selectedFilmId) return null;
    return films.find(f => f.id === selectedFilmId) || null;
  }, [films, selectedFilmId]);

  // Filtered films for auto-complete search
  const filteredFilms = useMemo(() => {
    if (!filmSearchQuery.trim()) return [];
    const q = filmSearchQuery.toLowerCase();
    return films.filter(f =>
      f.title.toLowerCase().includes(q) ||
      (f.originalTitle && f.originalTitle.toLowerCase().includes(q)) ||
      f.director.toLowerCase().includes(q) ||
      f.genres.some(g => g.toLowerCase().includes(q)) ||
      f.year.toString().includes(q)
    ).slice(0, 6);
  }, [films, filmSearchQuery]);

  // Populate data if editing an existing article
  useEffect(() => {
    if (selectedArticleId) {
      const found = articles.find(a => a.id === selectedArticleId);
      if (found) {
        setIsEditMode(true);
        setEditingId(found.id);
        setTitle(found.title || '');
        setCategory(found.category || 'movies');
        setSubCategory(found.subCategory || 'news');
        setExcerpt(found.excerpt || '');
        setContent(found.content || '');
        setCoverImage(found.coverImage || '');
        setTagsInput((found.tags || []).join(', '));
        setReadTime(found.readTime || '5 mnt baca');
        const validStatus: 'published' | 'draft' | 'scheduled' = 
          found.status === 'scheduled' ? 'scheduled' : 
          found.status === 'draft' || found.status === 'trash' ? 'draft' : 'published';
        setArticleStatus(validStatus);
        if (found.status === 'scheduled') {
          setPublishOption('scheduled');
          setScheduledAtDate(found.scheduledAt || '');
        } else if (found.status === 'draft') {
          setPublishOption('draft');
          setScheduledAtDate('');
        } else {
          setPublishOption('now');
          setScheduledAtDate('');
        }
        setSeoTitle(found.seoTitle || found.title || '');
        setMetaDescription(found.metaDescription || found.excerpt || '');
        setOgImage(found.ogImage || found.coverImage || '');
        setSeoKeywords(found.seoKeywords || (found.tags || []).join(', '));
        if (found.relatedFilmId) {
          setSelectedFilmId(found.relatedFilmId);
        }
        return;
      }
    }
    // Default reset for new article
    setIsEditMode(false);
    setEditingId(null);
    setArticleStatus('published');
    setSeoTitle('');
    setMetaDescription('');
    setOgImage('');
    setSeoKeywords('');
  }, [selectedArticleId, articles]);

  // Collaborative Presence Heartbeat & Sync Listener
  const activeArticleDocId = editingId || (selectedArticleId ? selectedArticleId : 'draft_session_' + currentUser.id);

  useEffect(() => {
    if (!isAuthorized || !currentUser?.id) return;

    const presenceRef = doc(db, 'article_presence', `${activeArticleDocId}_${currentUser.id}`);

    const updatePresence = async () => {
      try {
        await setDoc(presenceRef, {
          articleId: activeArticleDocId,
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          roleTitle: currentUser.roleTitle || currentUser.role,
          lastActive: Date.now(),
        });
      } catch (err) {
        // Ignore transient presence sync error
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 10000);

    const unsub = onSnapshot(
      collection(db, 'article_presence'),
      (snapshot) => {
        const active: CoEditor[] = [];
        const now = Date.now();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CoEditor & { articleId: string };
          if (
            data.articleId === activeArticleDocId &&
            data.userId !== currentUser.id &&
            now - (data.lastActive || 0) < 25000
          ) {
            active.push(data);
          }
        });
        setCoEditors(active);
      },
      (err) => {
        console.warn('[Firestore] article_presence subscription warning:', err.message);
      }
    );

    return () => {
      clearInterval(interval);
      unsub();
      deleteDoc(presenceRef).catch(() => {});
    };
  }, [activeArticleDocId, currentUser, isAuthorized]);

  // 30-Second Auto-Save Effect
  useEffect(() => {
    if (!isAuthorized || isSubmitting) return;

    const autoSaveTimer = setInterval(async () => {
      // Don't auto-save empty document
      if (!title.trim() && !content.trim()) return;

      setIsAutoSaving(true);
      try {
        const cleanTags = tagsInput
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

        const slug = title
          ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          : `draft-${Date.now()}`;

        const payload = {
          title: title.trim() || 'Draf Tanpa Judul',
          slug,
          excerpt: excerpt || title || 'Draf Otomatis',
          content: content || '',
          coverImage,
          category,
          subCategory,
          readTime,
          tags: cleanTags.length > 0 ? cleanTags : ['SotoyFilm', 'Draft'],
          relatedFilmId: selectedFilmId || undefined,
          status: 'draft' as const,
          seoTitle: seoTitle.trim() || title,
          metaDescription: metaDescription.trim() || excerpt,
          ogImage: ogImage.trim() || coverImage,
          seoKeywords: seoKeywords.trim() || cleanTags.join(', '),
        };

        if (editingId) {
          await updateArticle(editingId, payload);
        } else {
          const newDraftId = `art-draft-${Date.now()}`;
          const newArticlePayload = {
            ...payload,
            id: newDraftId,
            publishedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            views: 1,
            likes: 0,
            commentsCount: 0,
            author: {
              id: currentUser.id,
              name: currentUser.name,
              avatar: currentUser.avatar,
              role: currentUser.role,
            },
          };
          await setDoc(doc(db, 'articles', newDraftId), newArticlePayload);
          setEditingId(newDraftId);
          setIsEditMode(true);
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastAutoSavedAt(timeStr);
      } catch (err) {
        console.warn('[AutoSave] Gagal menyimpan draf otomatis:', err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveTimer);
  }, [
    isAuthorized,
    isSubmitting,
    editingId,
    title,
    content,
    excerpt,
    category,
    subCategory,
    coverImage,
    tagsInput,
    readTime,
    selectedFilmId,
    seoTitle,
    metaDescription,
    ogImage,
    seoKeywords,
    currentUser,
  ]);

  const handleCategoryChange = (newCat: MainCategory) => {
    setCategory(newCat);
    setSubCategory(subCategoryOptions[newCat][0].id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih berkas gambar (JPG, PNG, WEBP, dll.)');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      showToast('Ukuran gambar terlalu besar (Maksimal 12MB)');
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxWidth = 1200;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCoverImage(dataUrl);
        setIsUploadingImage(false);
        showToast('Gambar cover berhasil diunggah dari perangkat!');
      };
      img.onerror = () => {
        setIsUploadingImage(false);
        showToast('Gagal memproses gambar.');
      };
      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setIsUploadingImage(false);
      showToast('Gagal membaca berkas.');
    };

    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setIsEditMode(false);
    setEditingId(null);
    setTitle('');
    setExcerpt('');
    setContent('');
    setCoverImage('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80');
    setTagsInput('Film, Bioskop, Review');
    setReadTime('5 mnt baca');
    setSelectedFilmId(null);
    setFilmSearchQuery('');
    setSeoTitle('');
    setMetaDescription('');
    setOgImage('');
    setSeoKeywords('');
    setArticleStatus('published');
    navigateTo('write-article', { articleId: undefined });
  };

  const handleQuickSchedule = (hoursAhead: number) => {
    const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    setScheduledAtDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    setPublishOption('scheduled');
  };

  const handleSaveArticle = async (targetStatus: 'published' | 'draft' | 'scheduled') => {
    if (!title.trim() || !content.trim()) {
      showToast('Harap isi judul dan konten artikel!');
      return;
    }

    if (targetStatus === 'scheduled') {
      if (!scheduledAtDate) {
        showToast('Harap tentukan tanggal dan waktu penayangan artikel!');
        return;
      }
      const schedTime = new Date(scheduledAtDate).getTime();
      if (isNaN(schedTime)) {
        showToast('Format tanggal dan waktu tidak valid.');
        return;
      }
    }

    const cleanTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    setIsSubmitting(true);

    try {
      let customPublishedAt: string | undefined = undefined;
      if (targetStatus === 'scheduled' && scheduledAtDate) {
        const d = new Date(scheduledAtDate);
        customPublishedAt = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      const payload = {
        title,
        slug,
        excerpt: excerpt || title,
        content,
        coverImage,
        category,
        subCategory,
        readTime,
        tags: cleanTags.length > 0 ? cleanTags : ['SotoyFilm'],
        relatedFilmId: selectedFilmId || undefined,
        status: targetStatus,
        scheduledAt: targetStatus === 'scheduled' ? scheduledAtDate : undefined,
        publishedAt: customPublishedAt,
        seoTitle: seoTitle.trim() || title,
        metaDescription: metaDescription.trim() || excerpt || title,
        ogImage: ogImage.trim() || coverImage,
        seoKeywords: seoKeywords.trim() || (cleanTags.join(', ')),
      };

      if (isEditMode && editingId) {
        const success = await updateArticle(editingId, payload);
        if (success) {
          navigateTo('writer-dashboard');
        }
      } else {
        const success = await addArticle({
          ...payload,
          author: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            role: currentUser.role,
          },
        });

        if (success) {
          navigateTo('writer-dashboard');
        }
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat memproses artikel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is Warga Sotoy or Si Paling Sotoy, show Role-based access explanation
  if (!isAuthorized) {
    return (
      <div className="min-h-screen py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#121324] border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center mx-auto border border-[#FF2E7E]/40">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="font-display font-black text-2xl text-white">
            Akses Menulis Terbatas
          </h2>

          <div className="text-slate-300 text-xs leading-relaxed space-y-2 text-left bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <p>
              Sesuai aturan hak akses <strong>Sotoy Film</strong>:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>
                <strong>Warga Sotoy</strong> & <strong>Si Paling Sotoy (Critic)</strong> tidak dapat menulis artikel berita/editorial. Namun bisa memberikan <em>Skor Sotoy</em>, menulis ulasan di database film, dan posting di <em>Buzz Feed</em>.
              </li>
              <li>
                Hanya <strong>Penulis Sotoy (Writer)</strong> & <strong>Admin</strong> yang berwenang menerbitkan artikel editorial.
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            {!isLoggedIn ? (
              <button
                id="login-to-write-btn"
                onClick={() => setLoginModalOpen(true)}
                className="w-full bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg shadow-[#FF2E7E]/25"
              >
                Masuk (Log In) Akun Penulis Sekarang
              </button>
            ) : (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                 <p className="text-[11px] text-slate-400">Hubungi Admin jika Anda adalah penulis resmi yang memerlukan akses ke panel editor.</p>
              </div>
            )}
            <button
              onClick={() => navigateTo('home')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-[#0A0B10]">
      <div className={`${splitPreview ? 'max-w-[92rem]' : 'max-w-4xl'} mx-auto px-4 sm:px-6 lg:px-8 space-y-6 transition-all duration-300`}>
        
        {/* Header Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121324]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('writer-dashboard')}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#FF2E7E]" />
              <span>Kembali ke Dasbor</span>
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 text-xs text-[#FFD000] hover:underline bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal Edit</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Real-time Auto-Save Status Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
              <CheckCheck className={`w-3.5 h-3.5 ${isAutoSaving ? 'text-amber-400 animate-spin' : lastAutoSavedAt ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>
                {isAutoSaving
                  ? 'Menyimpan draf...'
                  : lastAutoSavedAt
                  ? `Otomatis tersimpan ${lastAutoSavedAt}`
                  : 'Auto-save aktif (30d)'}
              </span>
            </div>

            {/* Split Screen Preview Toggle */}
            <button
              type="button"
              onClick={() => {
                setSplitPreview(!splitPreview);
                if (previewMode) setPreviewMode(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                splitPreview
                  ? 'bg-gradient-to-r from-[#FF2E7E] to-[#FF8008] text-white shadow-lg shadow-[#FF2E7E]/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span>Split Preview</span>
            </button>

            {/* Full Preview Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                setPreviewMode(!previewMode);
                if (splitPreview) setSplitPreview(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewMode
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{previewMode ? 'Mode Edit' : 'Pratinjau Penuh'}</span>
            </button>
          </div>
        </div>

        {/* Main Editor & Split Preview Container */}
        <div className={splitPreview ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 items-start' : 'space-y-6'}>
          <div className="bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center">
              <PenSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black text-2xl text-white">
                  {isEditMode ? 'Sunting Artikel' : 'Studio Editor Penulis Sotoy'}
                </h1>
                {isEditMode && (
                  <span className="px-2 py-0.5 rounded-md bg-[#FF2E7E]/20 border border-[#FF2E7E]/40 text-[#FF2E7E] text-[10px] font-black uppercase tracking-wider">
                    Mode Edit
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs">
                {isEditMode
                  ? 'Perbarui konten artikel Anda. Perubahan akan langsung disinkronkan ke pembaca.'
                  : 'Publikasikan berita, review Skor Sotoy, kurasi daftar, atau modul studi perfilman.'}
              </p>
            </div>
          </div>

          {/* Collaborative Co-Editing Realtime Alert */}
          {coEditors.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-2 border-amber-500/50 rounded-2xl p-4 flex items-center justify-between text-amber-200 shadow-xl shadow-amber-950/40 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Peringatan Editor Kolaboratif Aktif
                  </h4>
                  <p className="text-xs text-slate-200 mt-0.5">
                    <strong className="text-amber-300">{coEditors.map(e => e.userName).join(', ')}</strong> sedang membuka & menyunting artikel ini secara bersamaan! Harap berhati-hati agar naskah tidak saling menimpa.
                  </p>
                </div>
              </div>
              <div className="flex -space-x-2 shrink-0">
                {coEditors.map((editor, idx) => (
                  <img
                    key={idx}
                    src={editor.userAvatar}
                    alt={editor.userName}
                    title={`${editor.userName} (${editor.roleTitle || 'Editor'})`}
                    className="w-8 h-8 rounded-full border-2 border-amber-500 object-cover ring-2 ring-black"
                  />
                ))}
              </div>
            </div>
          )}

          {previewMode ? (
            /* Live Preview Mode */
            <div className="space-y-6 bg-slate-900/50 p-6 sm:p-8 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[#FF2E7E] uppercase tracking-wider px-2.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/30">
                  {category} • {subCategory}
                </span>
                {selectedFilm && (
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-1">
                    <Film className="w-3 h-3" />
                     membahas: {selectedFilm.title} ({selectedFilm.year})
                  </span>
                )}
              </div>

              <h2 className="font-display font-black text-2xl sm:text-3xl text-white leading-tight">
                {title || 'Judul Artikel Kamu'}
              </h2>

              {coverImage && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                  <img src={coverImage} alt="Cover preview" className="w-full max-h-96 object-cover" />
                </div>
              )}

              {/* Linked Film Feature Card Preview */}
              {selectedFilm && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border border-cyan-500/30 flex items-center gap-4">
                  <img
                    src={selectedFilm.poster}
                    alt={selectedFilm.title}
                    className="w-14 h-20 rounded-xl object-cover border border-slate-700 shrink-0"
                  />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1 mb-1">
                      <Film className="w-3 h-3" />
                      <span>Film yang Dibahas Dalam Artikel Ini</span>
                    </div>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      {selectedFilm.title}
                      <span className="text-xs text-slate-400">({selectedFilm.year})</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Sutradara: {selectedFilm.director}</div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>Skor Sotoy: {selectedFilm.skorSotoy} / 5.0</span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-slate-300 text-sm italic font-medium border-l-2 border-[#FF2E7E] pl-4 py-1">
                {excerpt || 'Ringkasan artikel...'}
              </p>

              <div className="prose prose-invert text-slate-200 text-sm leading-relaxed whitespace-pre-line pt-2">
                {content || 'Isi artikel akan tampil di sini...'}
              </div>
            </div>
          ) : (
            /* Editor Form */
            <form onSubmit={(e) => { e.preventDefault(); handleSaveArticle('published'); }} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Judul Artikel <span className="text-[#FF2E7E]">*</span>
                </label>
                <input
                  id="write-title-input"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Contoh: Bedah Sinematografi Film Joker: Folie à Deux..."
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]"
                />
              </div>

              {/* Category & SubCategory Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Kategori Utama <span className="text-[#FF2E7E]">*</span>
                  </label>
                  <select
                    id="write-category-select"
                    value={category}
                    onChange={e => handleCategoryChange(e.target.value as MainCategory)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF2E7E] cursor-pointer"
                  >
                    <option value="movies">Movies</option>
                    <option value="series">Series</option>
                    <option value="anime">Anime</option>
                    <option value="cinema-gear">Cinema Gear</option>
                    <option value="film-studies">Film Studies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Sub-Kategori / Rubrik <span className="text-[#FF2E7E]">*</span>
                  </label>
                  <select
                    id="write-subcategory-select"
                    value={subCategory}
                    onChange={e => setSubCategory(e.target.value as SubCategory)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF2E7E] cursor-pointer"
                  >
                    {subCategoryOptions[category].map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cover Image Upload & Selection Section */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#FF2E7E]" />
                      <span>Gambar Sampul / Cover Image Artikel</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Unggah berkas foto dari komputer/HP Anda atau gunakan link URL eksternal.
                    </p>
                  </div>

                  {/* Toggle Mode: Upload vs URL */}
                  <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold shrink-0">
                    <button
                      type="button"
                      onClick={() => setCoverMode('file')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        coverMode === 'file'
                          ? 'bg-[#FF2E7E] text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Device</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverMode('url')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        coverMode === 'url'
                          ? 'bg-[#FF2E7E] text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Link className="w-3.5 h-3.5" />
                      <span>Link URL</span>
                    </button>
                  </div>
                </div>

                {coverMode === 'file' ? (
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/png, image/jpeg, image/webp, image/gif"
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-[#FF2E7E] bg-slate-950/60 hover:bg-slate-950 transition-all rounded-2xl p-6 text-center cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-[#FF2E7E] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-white">
                        {isUploadingImage ? 'Memproses Berkas Gambar...' : 'Klik di sini untuk Memilih / Unggah Gambar dari Komputer/HP'}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Format didukung: PNG, JPG, WEBP, GIF (Maks. 12MB).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={coverImage}
                      onChange={e => setCoverImage(e.target.value)}
                      placeholder="Masukkan URL gambar (e.g. https://images.unsplash.com/...)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                    />
                  </div>
                )}

                {/* Cover Image Live Preview Thumbnail */}
                {coverImage && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group">
                    <img src={coverImage} alt="Cover preview" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3">
                      <span className="text-[10px] font-mono text-slate-300 truncate max-w-xs bg-black/60 px-2 py-1 rounded">
                        Cover Aktif
                      </span>
                      <button
                        type="button"
                        onClick={() => setCoverImage('')}
                        className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Hapus Cover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Hapus</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tag Film Terkait / Film yang Dibahas Section */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-cyan-400" />
                    <span>Tambahkan Film yang Dibahas dalam Artikel (Pencarian Database)</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tautkan film dari database Sotoy Film agar pembaca dapat langsung melihat skor, trailer, dan detail film terkait.
                  </p>
                </div>

                {/* Currently Linked Film Card or Search Input */}
                {selectedFilm ? (
                  <div className="p-4 rounded-2xl bg-[#0D0E15] border border-cyan-500/40 flex items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={selectedFilm.poster}
                        alt={selectedFilm.title}
                        className="w-12 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
                            {selectedFilm.type}
                          </span>
                          <span className="text-xs font-mono text-slate-400">{selectedFilm.year}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{selectedFilm.title}</h4>
                        <div className="text-[11px] text-slate-400">Sutradara: {selectedFilm.director}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedFilmId(null)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                      title="Lepas Kaitan Film"
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Lepas Film</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={filmSearchQuery}
                        onChange={e => {
                          setFilmSearchQuery(e.target.value);
                          setIsFilmSearchOpen(true);
                        }}
                        onFocus={() => setIsFilmSearchOpen(true)}
                        placeholder="Cari judul film, sutradara, atau genre di database Sotoy Film..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                      {filmSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setFilmSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Auto-complete Search Results Dropdown */}
                    {isFilmSearchOpen && filmSearchQuery.trim().length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#121324] border border-slate-700 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800">
                        {filteredFilms.length > 0 ? (
                          filteredFilms.map(film => (
                            <div
                              key={film.id}
                              onClick={() => {
                                setSelectedFilmId(film.id);
                                setIsFilmSearchOpen(false);
                                setFilmSearchQuery('');
                                showToast(`Film "${film.title}" berhasil ditautkan!`);
                              }}
                              className="p-3 hover:bg-cyan-500/10 cursor-pointer flex items-center justify-between transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={film.poster}
                                  alt={film.title}
                                  className="w-10 h-14 rounded-lg object-cover bg-slate-800 shrink-0"
                                />
                                <div>
                                  <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                                    {film.title} <span className="text-slate-400 font-normal">({film.year})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {film.director} • {film.genres.join(', ')}
                                  </div>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/30 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                                + Pilih Film
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400">
                            Tidak ditemukan film yang cocok dengan "{filmSearchQuery}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Ringkasan / Excerpt (Lead Paragraph)
                </label>
                <textarea
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  placeholder="Tuliskan hook atau intisari singkat tulisan..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none"
                />
              </div>

              {/* Read Time */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Estimasi Waktu Baca
                </label>
                <input
                  type="text"
                  value={readTime}
                  onChange={e => setReadTime(e.target.value)}
                  placeholder="Contoh: 6 mnt baca"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
              </div>

              {/* Content Editor */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Isi Konten Artikel (Mendukung Markdown ### Heading) <span className="text-[#FF2E7E]">*</span>
                </label>
                <textarea
                  id="write-content-textarea"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Tulis ulasan mendalam, breakdown teknis, atau poin-poin artikel..."
                  required
                  rows={10}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-y"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Tags (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="IMAX, Sinematografi, Sony FX3, Festival"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
              </div>

              {/* Dedicated SEO Metadata & OpenGraph Social Section */}
              <div className="p-6 rounded-2xl bg-[#0D0E15] border border-slate-800 space-y-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00F0FF]">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                        <span>Manajemen SEO & Meta Social Share Card</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/30">
                          Optimasi Mesin Pencari
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Atur meta title, meta description, dan tag Open Graph agar artikel berpenampilan menarik di Google dan media sosial.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left: Metadata Inputs */}
                  <div className="space-y-4">
                    {/* SEO Meta Title */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          Meta Title Custom (Judul SEO)
                        </label>
                        <span className={`text-[11px] font-mono font-bold ${seoTitle.length > 60 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {seoTitle.length}/60 Karakter
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={seoTitle}
                          onChange={e => setSeoTitle(e.target.value)}
                          placeholder="Ketik judul khusus untuk mesin pencari..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
                        />
                        <button
                          type="button"
                          onClick={() => setSeoTitle(title)}
                          className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors"
                          title="Salin dari judul utama artikel"
                        >
                          Sama Judul
                        </button>
                      </div>
                    </div>

                    {/* SEO Meta Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          Meta Description (Deskripsi Ringkas Search Engine)
                        </label>
                        <span className={`text-[11px] font-mono font-bold ${metaDescription.length > 160 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {metaDescription.length}/160 Karakter
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={metaDescription}
                        onChange={e => setMetaDescription(e.target.value)}
                        placeholder="Ringkasan 1-2 kalimat menarik yang muncul di Google Snippet & WhatsApp..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMetaDescription(excerpt)}
                        className="mt-1 text-[11px] text-[#00F0FF] hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Salin dari Excerpt Artikel</span>
                      </button>
                    </div>

                    {/* Open Graph Image URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Tag Gambar Open Graph (OG Image Card)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ogImage}
                          onChange={e => setOgImage(e.target.value)}
                          placeholder="URL gambar khusus kartu media sosial..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
                        />
                        <button
                          type="button"
                          onClick={() => setOgImage(coverImage)}
                          className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors"
                        >
                          Sama Cover
                        </button>
                      </div>
                    </div>

                    {/* SEO Keywords */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Kata Kunci Target / Keywords SEO (Pisahkan dengan koma)
                      </label>
                      <input
                        type="text"
                        value={seoKeywords}
                        onChange={e => setSeoKeywords(e.target.value)}
                        placeholder="Dune 2, Sinematografi, Timothee Chalamet, Ulasan Film"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
                      />
                    </div>
                  </div>

                  {/* Right: Live Social Share Preview Card */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <Share2 className="w-4 h-4" />
                        Pratinjau Kartu Media Sosial (Live Card)
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">X / Twitter & OpenGraph</span>
                    </div>

                    {/* Card Preview Box */}
                    <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-[#121324] shadow-2xl">
                      <div className="relative h-36 bg-slate-800 overflow-hidden">
                        <img
                          src={ogImage || coverImage}
                          alt="OG Card Preview"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded-md font-mono">
                          sotoyfilm.com
                        </span>
                      </div>
                      <div className="p-3.5 space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-[#FF2E7E] font-black">
                          SOTOY FILM STUDIO • {category.toUpperCase()}
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-2">
                          {seoTitle || title || 'Judul Artikel Anda Akan Tampil Di Sini'}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {metaDescription || excerpt || 'Deskripsi ringkas SEO akan ditampilkan di sini saat tautan artikel dibagikan di jejaring sosial...'}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Metadata ini otomatis terbaca oleh crawler Google, WhatsApp, Facebook, dan Slack.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Publishing Schedule & Status Section */}
              <div className="p-6 rounded-2xl bg-[#0D0E15] border border-slate-800 space-y-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Status & Tanggal Penayangan Artikel</span>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                          Penjadwalan Otomatis
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tentukan kapan artikel ini mulai tayang secara publik di Sotoy Film.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option Selector Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Terbitkan Langsung */}
                  <button
                    type="button"
                    onClick={() => setPublishOption('now')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      publishOption === 'now'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                        : 'bg-[#121324] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${publishOption === 'now' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Send className="w-4 h-4" />
                      </div>
                      {publishOption === 'now' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">Terbitkan Langsung</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Artikel tayang publik seketika</div>
                    </div>
                  </button>

                  {/* Option 2: Jadwalkan Terbit */}
                  <button
                    type="button"
                    onClick={() => {
                      setPublishOption('scheduled');
                      if (!scheduledAtDate) handleQuickSchedule(24);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      publishOption === 'scheduled'
                        ? 'bg-purple-500/10 border-purple-500 text-white shadow-lg shadow-purple-950/40'
                        : 'bg-[#121324] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${publishOption === 'scheduled' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      {publishOption === 'scheduled' && <CheckCircle className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">Jadwalkan Waktu Terbit</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Pilih tanggal & jam penayangan</div>
                    </div>
                  </button>

                  {/* Option 3: Simpan Draf */}
                  <button
                    type="button"
                    onClick={() => setPublishOption('draft')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      publishOption === 'draft'
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-950/40'
                        : 'bg-[#121324] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${publishOption === 'draft' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Save className="w-4 h-4" />
                      </div>
                      {publishOption === 'draft' && <CheckCircle className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">Simpan Draf</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Tersimpan rahasia bagi Anda</div>
                    </div>
                  </button>
                </div>

                {/* Date & Time Picker Controls (Visible when 'scheduled' option active) */}
                {publishOption === 'scheduled' && (
                  <div className="p-4 bg-[#121324] border border-purple-500/30 rounded-2xl space-y-4 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>Pilih Tanggal & Waktu Penayangan:</span>
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Pilih jadwal waktu kapan artikel akan dipublikasikan secara resmi ke publik.
                        </p>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Pintasan:</span>
                        <button
                          type="button"
                          onClick={() => handleQuickSchedule(24)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          +1 Hari
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickSchedule(72)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          +3 Hari
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickSchedule(168)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          +1 Minggu
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <input
                          id="schedule-datetime-input"
                          type="datetime-local"
                          value={scheduledAtDate}
                          onChange={(e) => setScheduledAtDate(e.target.value)}
                          className="w-full bg-[#0A0B10] border border-purple-500/50 rounded-xl px-4 py-2.5 text-xs font-mono text-purple-200 focus:outline-none focus:border-purple-400 cursor-pointer"
                        />
                      </div>

                      {/* Formatted Date Preview Card */}
                      {scheduledAtDate && (
                        <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl flex items-center gap-2.5">
                          <Calendar className="w-5 h-5 text-purple-400 shrink-0" />
                          <div className="text-xs">
                            <span className="text-slate-400 block text-[10px]">Dijadwalkan terbit pada:</span>
                            <span className="font-bold text-purple-200">
                              {new Date(scheduledAtDate).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })} pukul {new Date(scheduledAtDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigateTo('writer-dashboard')}
                    className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Save as Draft Button */}
                  <button
                    id="save-draft-btn"
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveArticle('draft')}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Draf'}</span>
                  </button>

                  {/* Dynamic Action Button depending on publishOption */}
                  {publishOption === 'scheduled' ? (
                    <button
                      id="schedule-article-submit-btn"
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveArticle('scheduled')}
                      className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Calendar className="w-4 h-4 text-purple-200" />
                      <span>
                        {isSubmitting
                          ? 'Menjadwalkan...'
                          : 'Simpan Jadwal Terbit'}
                      </span>
                    </button>
                  ) : (
                    <button
                      id="publish-article-submit-btn"
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveArticle('published')}
                      className="bg-gradient-to-r from-[#FF2E7E] via-[#FFD000] to-[#00F0FF] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#FF2E7E]/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {isSubmitting
                          ? 'Memproses...'
                          : isEditMode
                          ? 'Publikasikan Perubahan'
                          : 'Publikasikan Sekarang'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Right Split Live Preview Panel */}
        {splitPreview && (
          <div className="sticky top-20 bg-[#121324] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                <Eye className="w-4 h-4 text-[#00F0FF]" />
                <span>Live Pratinjau Artikel</span>
              </div>
              <span className="text-[10px] bg-[#FF2E7E]/20 border border-[#FF2E7E]/40 text-[#FF2E7E] px-2.5 py-1 rounded-full font-mono font-bold">
                REAL-TIME
              </span>
            </div>

            {/* Rendered Live Article */}
            <div className="space-y-5">
              {coverImage && (
                <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-800 shadow-xl">
                  <img src={coverImage} alt={title || 'Cover'} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-[#FF2E7E] text-white">
                      {category}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900/90 text-slate-300 border border-slate-700">
                      {subCategory}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                  {title || 'Judul Artikel Anda...'}
                </h2>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FF2E7E]" />
                  <div>
                    <div className="font-bold text-white">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {readTime} • {publishOption === 'scheduled' ? `Jadwal Terbit: ${scheduledAtDate ? new Date(scheduledAtDate).toLocaleDateString('id-ID') : 'Belum diatur'}` : 'Terbit Langsung'}
                    </div>
                  </div>
                </div>
              </div>

              {excerpt && (
                <div className="p-3.5 bg-slate-900/80 rounded-2xl border-l-4 border-[#00F0FF] border-slate-800 text-xs text-slate-300 italic">
                  "{excerpt}"
                </div>
              )}

              {/* Tagged Film Card */}
              {selectedFilm && (
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center gap-3.5">
                  <img src={selectedFilm.poster} alt={selectedFilm.title} className="w-12 h-16 rounded-xl object-cover shrink-0" />
                  <div>
                    <div className="text-xs font-black text-white">{selectedFilm.title} ({selectedFilm.year})</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{selectedFilm.director} • {selectedFilm.genres.slice(0, 2).join(', ')}</div>
                    <div className="text-[11px] text-[#FFD000] font-bold mt-1">★ {selectedFilm.skorSotoy} Skor Sotoy</div>
                  </div>
                </div>
              )}

              {/* Article Content Preview */}
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3 whitespace-pre-wrap font-sans border-t border-slate-800/80 pt-4">
                {content || 'Mulai mengetik di panel kiri untuk melihat pratinjau langsung konten artikel Anda di sini...'}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
