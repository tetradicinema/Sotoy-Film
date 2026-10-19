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
  History,
  FileClock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MainCategory, SubCategory, FilmItem, ArticleVersion } from '../../types';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { ArticleEditor } from '../CMS/ArticleEditor';
import { RichTextEditor } from '../CMS/RichTextEditor';
import { DEFAULT_AVATAR, DEFAULT_POSTER, DEFAULT_COVER } from '../../data/mockData';

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
  const [customSlug, setCustomSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [category, setCategory] = useState<MainCategory>('movies');
  const [subCategory, setSubCategory] = useState<SubCategory>('news');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [contentFormat, setContentFormat] = useState<'markdown' | 'tiptap'>('tiptap');
  const [contentJson, setContentJson] = useState<string>('');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80');
  const [tagsInput, setTagsInput] = useState('Film, Bioskop, Review');
  const [readTime, setReadTime] = useState('5 mnt baca');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishingLoading, setIsPublishingLoading] = useState(false);
  const [publishedSuccessModal, setPublishedSuccessModal] = useState<{
    id: string;
    title: string;
    slug: string;
    coverImage: string;
    category: string;
    readTime: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
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

  // Related Film Selection State (Multiple Films Supported)
  const [selectedFilmIds, setSelectedFilmIds] = useState<string[]>([]);
  const [filmSearchQuery, setFilmSearchQuery] = useState('');
  const [isFilmSearchOpen, setIsFilmSearchOpen] = useState(false);

  // Versioning state
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [selectedVersionPreview, setSelectedVersionPreview] = useState<ArticleVersion | null>(null);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);

  // Helper to generate URL-friendly slug
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!isSlugManuallyEdited) {
      setCustomSlug(slugify(newTitle));
    }
  };

  const handleCustomSlugChange = (rawSlug: string) => {
    setIsSlugManuallyEdited(true);
    const cleaned = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setCustomSlug(cleaned);
  };

  const handleResetSlugFromTitle = () => {
    setIsSlugManuallyEdited(false);
    const generated = slugify(title);
    setCustomSlug(generated);
    showToast('Slug disinkronkan ulang dengan judul artikel.');
  };

  // Dynamic Reading Time & Word Count Stats
  const readingStats = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const chars = content.length;
    const paragraphs = content.split(/\n{2,}/).filter(p => p.trim().length > 0).length;
    const estimatedMinutes = Math.max(1, Math.ceil(words / 200));
    return {
      words,
      chars,
      paragraphs,
      estimatedMinutes,
      formattedTime: `${estimatedMinutes} mnt baca`,
    };
  }, [content]);

  // Sync calculated reading time to readTime when content changes
  useEffect(() => {
    if (readingStats.words > 0) {
      setReadTime(`${readingStats.estimatedMinutes} mnt baca`);
    }
  }, [readingStats.estimatedMinutes, readingStats.words]);

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

  // Currently selected films list
  const selectedFilms = useMemo(() => {
    return films.filter(f => selectedFilmIds.includes(f.id));
  }, [films, selectedFilmIds]);

  const selectedFilm = selectedFilms[0] || null;

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
    ).slice(0, 8);
  }, [films, filmSearchQuery]);

  const loadedArticleIdRef = useRef<string | null>(null);
  const editingIdRef = useRef<string | null>(editingId);
  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

  const creatingDraftPromiseRef = useRef<Promise<string | null> | null>(null);
  const lastSavedHashRef = useRef<string>('');
  const isSavingRef = useRef<boolean>(false);
  const autosaveTimeoutRef = useRef<any>(null);
  const autosaveIntervalRef = useRef<any>(null);
  const autosaveErrorRetryCountRef = useRef<number>(0);

  const [autosaveStatus, setAutosaveStatus] = useState<'clean' | 'dirty' | 'saving' | 'saved' | 'error'>('clean');
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [autosaveBackupData, setAutosaveBackupData] = useState<any | null>(null);

  const latestFormRef = useRef({
    title,
    customSlug,
    isSlugManuallyEdited,
    category,
    subCategory,
    excerpt,
    content,
    contentFormat,
    contentJson,
    coverImage,
    tagsInput,
    readTime,
    selectedFilmIds,
    seoTitle,
    metaDescription,
    ogImage,
    seoKeywords,
    articleStatus,
    publishOption,
    scheduledAtDate,
  });

  useEffect(() => {
    latestFormRef.current = {
      title,
      customSlug,
      isSlugManuallyEdited,
      category,
      subCategory,
      excerpt,
      content,
      contentFormat,
      contentJson,
      coverImage,
      tagsInput,
      readTime,
      selectedFilmIds,
      seoTitle,
      metaDescription,
      ogImage,
      seoKeywords,
      articleStatus,
      publishOption,
      scheduledAtDate,
    };
  }, [
    title,
    customSlug,
    isSlugManuallyEdited,
    category,
    subCategory,
    excerpt,
    content,
    contentFormat,
    contentJson,
    coverImage,
    tagsInput,
    readTime,
    selectedFilmIds,
    seoTitle,
    metaDescription,
    ogImage,
    seoKeywords,
    articleStatus,
    publishOption,
    scheduledAtDate,
  ]);

  // Populate data if editing an existing article (once per selectedArticleId)
  useEffect(() => {
    if (selectedArticleId) {
      if (loadedArticleIdRef.current === selectedArticleId) return;
      const found = articles.find(a => a.id === selectedArticleId);
      if (found) {
        loadedArticleIdRef.current = found.id;
        setIsEditMode(true);
        setEditingId(found.id);
        editingIdRef.current = found.id;
        setTitle(found.title || '');
        if (found.slug) {
          setCustomSlug(found.slug);
          setIsSlugManuallyEdited(true);
        } else {
          setCustomSlug(slugify(found.title || ''));
          setIsSlugManuallyEdited(false);
        }
        setCategory(found.category || 'movies');
        setSubCategory(found.subCategory || 'news');
        setExcerpt(found.excerpt || '');
        setContent(found.content || '');
        setContentFormat(found.contentFormat || 'markdown');
        setContentJson(found.contentJson || '');
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
        if (found.relatedFilmIds && Array.isArray(found.relatedFilmIds) && found.relatedFilmIds.length > 0) {
          setSelectedFilmIds(found.relatedFilmIds);
        } else if (found.relatedFilmId) {
          setSelectedFilmIds([found.relatedFilmId]);
        } else {
          setSelectedFilmIds([]);
        }

        if (validStatus === 'published' || validStatus === 'scheduled') {
          const backupRef = doc(db, 'articles', found.id, 'autosaves', currentUser.id);
          getDoc(backupRef).then(snap => {
            if (snap.exists()) {
              const bData = snap.data();
              const backupTime = new Date(bData.savedAt || 0).getTime();
              const articleTime = new Date(found.publishedAtTimestamp || (found as any).updatedAt || 0).getTime();
              if (backupTime > articleTime) {
                setAutosaveBackupData(bData);
                setShowRestoreBanner(true);
              }
            }
          }).catch(() => {});
        }
      }
    } else {
      if (editingIdRef.current) return;
      if (loadedArticleIdRef.current === null) {
        loadedArticleIdRef.current = 'new';
        setIsEditMode(false);
        setEditingId(null);
        editingIdRef.current = null;
        setTitle('');
        setCustomSlug('');
        setIsSlugManuallyEdited(false);
        setContent('');
        setContentFormat('tiptap');
        setContentJson('');
        setSelectedFilmIds([]);
        setArticleStatus('published');
        setSeoTitle('');
        setMetaDescription('');
        setOgImage('');
        setSeoKeywords('');
      }
    }
  }, [selectedArticleId]);

  const handleRestoreBackup = () => {
    if (!autosaveBackupData) return;
    setTitle(autosaveBackupData.title || '');
    if (autosaveBackupData.slug) {
      setCustomSlug(autosaveBackupData.slug);
      setIsSlugManuallyEdited(true);
    }
    setCategory(autosaveBackupData.category || 'movies');
    setSubCategory(autosaveBackupData.subCategory || 'news');
    setExcerpt(autosaveBackupData.excerpt || '');
    setContent(autosaveBackupData.content || '');
    if (autosaveBackupData.contentFormat) {
      setContentFormat(autosaveBackupData.contentFormat);
    }
    if (autosaveBackupData.contentJson) {
      setContentJson(autosaveBackupData.contentJson);
    }
    setCoverImage(autosaveBackupData.coverImage || '');
    setTagsInput((autosaveBackupData.tags || []).join(', '));
    if (autosaveBackupData.relatedFilmIds) setSelectedFilmIds(autosaveBackupData.relatedFilmIds);
    setShowRestoreBanner(false);
    showToast('Perubahan terbaru berhasil dipulihkan dari cadangan.', 'success');
  };

  const handleDiscardBackup = async () => {
    if (!editingIdRef.current) return;
    try {
      await deleteDoc(doc(db, 'articles', editingIdRef.current, 'autosaves', currentUser.id));
    } catch {}
    setShowRestoreBanner(false);
    setAutosaveBackupData(null);
    showToast('Cadangan perubahan dibuang.', 'info');
  };

  const getOrCreateDraftId = async (): Promise<string | null> => {
    if (editingIdRef.current) return editingIdRef.current;
    if (creatingDraftPromiseRef.current) return creatingDraftPromiseRef.current;

    creatingDraftPromiseRef.current = (async () => {
      try {
        const form = latestFormRef.current;
        const plainText = form.content.replace(/<[^>]*>/g, '').trim();
        if (form.title.trim().length < 3 && plainText.length < 30) {
          return null;
        }
        const newId = `art-draft-${currentUser.id}-${Date.now()}`;
        const finalSlug = form.isSlugManuallyEdited && form.customSlug.trim()
          ? form.customSlug.trim()
          : slugify(form.title) || `draft-${newId}`;
        const cleanTags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        const payload = {
          title: form.title.trim(),
          slug: finalSlug,
          excerpt: form.excerpt.trim() || form.title.trim(),
          content: form.content.trim(),
          contentFormat: 'tiptap',
          contentJson: form.contentJson || '',
          coverImage: form.coverImage || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
          category: form.category,
          subCategory: form.subCategory,
          readTime: form.readTime,
          tags: cleanTags.length > 0 ? cleanTags : ['SotoyFilm'],
          status: 'draft',
          publishedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          publishedAtTimestamp: new Date().toISOString(),
          seoTitle: form.seoTitle.trim() || form.title.trim(),
          metaDescription: form.metaDescription.trim() || form.excerpt,
          ogImage: ogImage.trim() || form.coverImage,
          seoKeywords: form.seoKeywords.trim() || cleanTags.join(', '),
          author: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            role: currentUser.role,
          },
          authorId: currentUser.id,
        };
        const success = await addArticle(payload as any);
        if (success) {
          editingIdRef.current = newId;
          setEditingId(newId);
          setIsEditMode(true);
          loadedArticleIdRef.current = newId;
          navigateTo('write-article', { articleId: newId });
          return newId;
        }
        return null;
      } finally {
        creatingDraftPromiseRef.current = null;
      }
    })();

    return creatingDraftPromiseRef.current;
  };

  const executeAutoSave = async () => {
    if (isSavingRef.current || isSubmitting) return;
    const form = latestFormRef.current;
    const plainText = form.content.replace(/<[^>]*>/g, '').trim();
    if (form.title.trim().length < 3 && plainText.length < 30) return;

    const currentHashFields = {
      title: form.title,
      slug: form.customSlug,
      category: form.category,
      subCategory: form.subCategory,
      excerpt: form.excerpt,
      content: form.content,
      contentJson: form.contentJson,
      coverImage: form.coverImage,
      tagsInput: form.tagsInput,
      selectedFilmIds: form.selectedFilmIds,
      seoTitle: form.seoTitle,
      metaDescription: form.metaDescription,
      ogImage: form.ogImage,
      seoKeywords: form.seoKeywords,
      articleStatus: form.articleStatus,
    };
    const snapshot = JSON.stringify(currentHashFields);
    if (snapshot === lastSavedHashRef.current) return;

    isSavingRef.current = true;
    setIsAutoSaving(true);
    setAutosaveStatus('saving');

    try {
      const isPublishedOrScheduled = form.articleStatus === 'published' || form.articleStatus === 'scheduled';
      let targetId = editingIdRef.current || selectedArticleId;

      if (!targetId) {
        targetId = await getOrCreateDraftId();
        if (!targetId) {
          isSavingRef.current = false;
          setIsAutoSaving(false);
          setAutosaveStatus('clean');
          return;
        }
      }

      const finalSlug = form.isSlugManuallyEdited && form.customSlug.trim()
        ? form.customSlug.trim()
        : slugify(form.title) || (targetId ? `draft-${targetId}` : `draft-${Date.now()}`);

      const cleanTags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const payload: Record<string, any> = {
        title: form.title,
        slug: finalSlug,
        excerpt: form.excerpt || form.title,
        content: form.content,
        contentFormat: 'tiptap',
        contentJson: form.contentJson || '',
        coverImage: form.coverImage,
        category: form.category,
        subCategory: form.subCategory,
        readTime: form.readTime,
        tags: cleanTags.length > 0 ? cleanTags : ['SotoyFilm'],
        seoTitle: form.seoTitle.trim() || form.title,
        metaDescription: form.metaDescription.trim() || form.excerpt || form.title,
        ogImage: form.ogImage.trim() || form.coverImage,
        seoKeywords: form.seoKeywords.trim() || cleanTags.join(', '),
      };

      if (form.selectedFilmIds.length > 0) {
        payload.relatedFilmIds = form.selectedFilmIds;
        payload.relatedFilmId = form.selectedFilmIds[0];
      }

      if (isPublishedOrScheduled) {
        const backupRef = doc(db, 'articles', targetId, 'autosaves', currentUser.id);
        await setDoc(backupRef, {
          ...payload,
          status: form.articleStatus,
          savedAt: new Date().toISOString(),
        }, { merge: true });
      } else {
        await updateArticle(targetId, {
          ...payload,
          status: 'draft',
        }, { silent: true });
      }

      lastSavedHashRef.current = snapshot;
      setLastAutoSavedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      setAutosaveStatus('saved');
      autosaveErrorRetryCountRef.current = 0;
    } catch (err) {
      console.error('[AutoSave] Error:', err);
      setAutosaveStatus('error');
      const retryCount = autosaveErrorRetryCountRef.current++;
      const delay = retryCount === 0 ? 5000 : retryCount === 1 ? 15000 : 45000;
      setTimeout(() => {
        if (autosaveStatus === 'error') executeAutoSave();
      }, delay);
    } finally {
      isSavingRef.current = false;
      setIsAutoSaving(false);
    }
  };

  // Debounce effect + 30s max interval
  useEffect(() => {
    if (!isAuthorized || isSubmitting) return;

    const form = latestFormRef.current;
    const currentHashFields = {
      title: form.title,
      slug: form.customSlug,
      category: form.category,
      subCategory: form.subCategory,
      excerpt: form.excerpt,
      content: form.content,
      contentJson: form.contentJson,
      coverImage: form.coverImage,
      tagsInput: form.tagsInput,
      selectedFilmIds: form.selectedFilmIds,
      seoTitle: form.seoTitle,
      metaDescription: form.metaDescription,
      ogImage: form.ogImage,
      seoKeywords: form.seoKeywords,
      articleStatus: form.articleStatus,
    };
    const snapshot = JSON.stringify(currentHashFields);

    if (snapshot !== lastSavedHashRef.current) {
      setAutosaveStatus('dirty');
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = setTimeout(() => {
        executeAutoSave();
      }, 4000);
    }

    if (!autosaveIntervalRef.current) {
      autosaveIntervalRef.current = setInterval(() => {
        const currentForm = latestFormRef.current;
        const currentHashFields = {
          title: currentForm.title,
          slug: currentForm.customSlug,
          category: currentForm.category,
          subCategory: currentForm.subCategory,
          excerpt: currentForm.excerpt,
          content: currentForm.content,
          coverImage: currentForm.coverImage,
          tagsInput: currentForm.tagsInput,
          selectedFilmIds: currentForm.selectedFilmIds,
          seoTitle: currentForm.seoTitle,
          metaDescription: currentForm.metaDescription,
          ogImage: currentForm.ogImage,
          seoKeywords: currentForm.seoKeywords,
          articleStatus: currentForm.articleStatus,
        };
        const currentSnap = JSON.stringify(currentHashFields);
        if (currentSnap !== lastSavedHashRef.current) {
          executeAutoSave();
        }
      }, 30000);
    }

    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
        autosaveIntervalRef.current = null;
      }
    };
  }, [
    title,
    customSlug,
    category,
    subCategory,
    excerpt,
    content,
    coverImage,
    tagsInput,
    selectedFilmIds,
    seoTitle,
    metaDescription,
    ogImage,
    seoKeywords,
    articleStatus,
    isAuthorized,
    isSubmitting,
  ]);

  // beforeunload warning handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const form = latestFormRef.current;
      const snapshot = JSON.stringify(form);
      if (snapshot !== lastSavedHashRef.current && (form.title.trim() || form.content.trim())) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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

  // Realtime Article Versions Listener
  const activeArticleIdForVersions = editingId || (selectedArticleId ? selectedArticleId : null);
  useEffect(() => {
    if (!activeArticleIdForVersions) {
      setVersions([]);
      return;
    }

    try {
      const versionsRef = collection(db, 'article_versions');
      const q = query(
        versionsRef,
        where('articleId', '==', activeArticleIdForVersions),
        orderBy('versionNumber', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ArticleVersion[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          setVersions(list);
        },
        (err) => {
          console.warn('[Firestore] article_versions subscription warning:', err.message);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('[Versioning] Error subscribing to article versions:', err);
    }
  }, [activeArticleIdForVersions]);

  // Helper to create a version snapshot
  const saveVersionSnapshot = async (summaryText?: string, targetArticleId?: string) => {
    const artId = targetArticleId || editingId || selectedArticleId;
    if (!artId || (!title.trim() && !content.trim())) {
      showToast('Belum ada judul atau isi artikel untuk dibuat versi snapshot.', 'error');
      return;
    }

    try {
      setIsCreatingSnapshot(true);
      const cleanTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const words = content.trim().split(/\s+/).filter(Boolean).length;
      const currentHighestVersion = versions.length > 0 ? Math.max(...versions.map(v => v.versionNumber || 0)) : 0;
      const nextVerNum = currentHighestVersion + 1;
      const verId = `ver_${artId}_${Date.now()}`;

      const versionPayload: ArticleVersion = {
        id: verId,
        articleId: artId,
        versionNumber: nextVerNum,
        title: title.trim() || 'Draf Tanpa Judul',
        excerpt: excerpt.trim() || title.trim() || 'Ringkasan Draf',
        content: content || '',
        contentFormat: 'tiptap',
        contentJson: contentJson || '',
        tags: cleanTags,
        category,
        subCategory,
        coverImage,
        readTime,
        savedAt: new Date().toISOString(),
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar,
        wordCount: words,
        summary: summaryText || (nextVerNum === 1 ? 'Versi Inisial (Draf Awal)' : `Versi ${nextVerNum} - Checkpoint Manual`),
      };

      await setDoc(doc(db, 'article_versions', verId), JSON.parse(JSON.stringify(versionPayload)));
      showToast(`Snapshot Versi v${nextVerNum} berhasil disimpan!`, 'success');
    } catch (err: any) {
      console.error('[Versioning] Gagal menyimpan snapshot:', err);
      showToast('Gagal menyimpan versi snapshot.', 'error');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Helper to restore an article version into the editor
  const handleRestoreVersion = async (ver: ArticleVersion) => {
    if (!window.confirm(`Pulihkan versi v${ver.versionNumber} ("${ver.title}")? Konten di editor saat ini akan digantikan dengan naskah dari versi tersebut.`)) {
      return;
    }

    // First save current editor state as a safety checkpoint if non-empty
    if (title.trim() || content.trim()) {
      await saveVersionSnapshot(`Checkpoint Sebelum Restorasi ke v${ver.versionNumber}`);
    }

    setTitle(ver.title || '');
    setExcerpt(ver.excerpt || '');
    setContent(ver.content || '');
    if (ver.contentFormat) {
      setContentFormat(ver.contentFormat);
    }
    if (ver.contentJson) {
      setContentJson(ver.contentJson);
    }
    if (ver.tags && Array.isArray(ver.tags) && ver.tags.length > 0) {
      setTagsInput(ver.tags.join(', '));
    }
    if (ver.category) setCategory(ver.category);
    if (ver.subCategory) setSubCategory(ver.subCategory);
    if (ver.coverImage) setCoverImage(ver.coverImage);
    if (ver.readTime) setReadTime(ver.readTime);

    setIsVersionModalOpen(false);
    setSelectedVersionPreview(null);
    showToast(`Berhasil memulihkan versi v${ver.versionNumber} ke editor!`, 'success');
  };

  // Helper to delete an article version
  const handleDeleteVersion = async (verId: string, verNum: number) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus catatan versi v${verNum}?`)) {
      return;
    }
    try {
      setDeletingVersionId(verId);
      await deleteDoc(doc(db, 'article_versions', verId));
      showToast(`Versi v${verNum} berhasil dihapus.`, 'success');
      if (selectedVersionPreview?.id === verId) {
        setSelectedVersionPreview(null);
      }
    } catch (err) {
      showToast('Gagal menghapus versi.', 'error');
    } finally {
      setDeletingVersionId(null);
    }
  };

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
    setCustomSlug('');
    setIsSlugManuallyEdited(false);
    setExcerpt('');
    setContent('');
    setContentFormat('tiptap');
    setContentJson('');
    setCoverImage('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80');
    setTagsInput('Film, Bioskop, Review');
    setReadTime('5 mnt baca');
    setSelectedFilmIds([]);
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

    const finalSlug = customSlug.trim() || slugify(title) || `artikel-${Date.now()}`;

    if (targetStatus === 'published') {
      setIsPublishingLoading(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      let customPublishedAt: string | undefined = undefined;
      let publishedAtTimestamp: string | undefined = undefined;
      const now = new Date();

      if (targetStatus === 'scheduled' && scheduledAtDate) {
        const d = new Date(scheduledAtDate);
        customPublishedAt = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        publishedAtTimestamp = d.toISOString();
      } else if (targetStatus === 'published') {
        customPublishedAt = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        publishedAtTimestamp = now.toISOString();
      } else {
        customPublishedAt = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        publishedAtTimestamp = now.toISOString();
      }

      const payload: Record<string, any> = {
        title,
        slug: finalSlug,
        excerpt: excerpt || title,
        content,
        contentFormat: 'tiptap',
        contentJson: contentJson || '',
        coverImage,
        category,
        subCategory,
        readTime,
        tags: cleanTags.length > 0 ? cleanTags : ['SotoyFilm'],
        status: targetStatus,
        publishedAt: customPublishedAt,
        publishedAtTimestamp,
        seoTitle: seoTitle.trim() || title,
        metaDescription: metaDescription.trim() || excerpt || title,
        ogImage: ogImage.trim() || coverImage,
        seoKeywords: seoKeywords.trim() || (cleanTags.join(', ')),
      };

      if (selectedFilmIds.length > 0) {
        payload.relatedFilmIds = selectedFilmIds;
        payload.relatedFilmId = selectedFilmIds[0];
      } else {
        payload.relatedFilmIds = [];
        delete payload.relatedFilmId;
      }

      if (targetStatus === 'scheduled' && scheduledAtDate) {
        payload.scheduledAt = scheduledAtDate;
      }

      // Small delay for smooth publishing feedback
      if (targetStatus === 'published') {
        await new Promise(res => setTimeout(res, 500));
      }

      const targetId = editingIdRef.current;
      if (targetId) {
        await saveVersionSnapshot(
          targetStatus === 'published' ? 'Pembaruan Artikel Terbit' : targetStatus === 'scheduled' ? 'Penjadwalan Terbit' : 'Penyimpanan Draf',
          targetId
        );
        const success = await updateArticle(targetId, payload);
        if (success) {
          deleteDoc(doc(db, 'articles', targetId, 'autosaves', currentUser.id)).catch(() => {});
          if (targetStatus === 'published') {
            setPublishedSuccessModal({
              id: targetId,
              title,
              slug: finalSlug,
              coverImage,
              category,
              readTime,
            });
          } else {
            navigateTo('writer-dashboard');
          }
        }
      } else {
        const newArtId = `art-${Date.now()}`;
        const newArticleData = {
          ...payload,
          id: newArtId,
          author: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            role: currentUser.role,
          },
        };
        await saveVersionSnapshot(
          targetStatus === 'published' ? 'Publikasi Perdana' : targetStatus === 'scheduled' ? 'Draf Terjadwal' : 'Draf Pertama',
          newArtId
        );
        const success = await addArticle(newArticleData as any);

        if (success) {
          if (targetStatus === 'published') {
            setPublishedSuccessModal({
              id: newArtId,
              title,
              slug: finalSlug,
              coverImage,
              category,
              readTime,
            });
          } else {
            navigateTo('writer-dashboard');
          }
        }
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat memproses artikel.');
    } finally {
      setIsSubmitting(false);
      setIsPublishingLoading(false);
    }
  };

  // If user is Warga Sotoy or Si Paling Sotoy, show Role-based access explanation
  if (!isAuthorized) {
    return (
      <div className="min-h-screen py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#171717] border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-5">
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
                className="w-full bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg shadow-[#FF2E7E]/25"
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
    <div className="min-h-screen py-8 bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 transition-all duration-300">
        
        {/* Header Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#171717]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
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
                className="inline-flex items-center gap-1.5 text-xs text-[#FF2E7E] hover:underline bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal Edit</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Version History Button with badge count */}
            <button
              id="article-version-history-btn"
              type="button"
              onClick={() => setIsVersionModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 hover:border-amber-500/60 shadow-sm"
              title="Lihat riwayat dan pulihkan versi artikel"
            >
              <History className="w-4 h-4 text-amber-400" />
              <span>Riwayat Versi</span>
              {versions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                  {versions.length}
                </span>
              )}
            </button>

            {/* Real-time Auto-Save Status Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
              <CheckCheck className={`w-3.5 h-3.5 ${
                autosaveStatus === 'saving' || isAutoSaving ? 'text-amber-400 animate-spin' :
                autosaveStatus === 'dirty' ? 'text-amber-500' :
                autosaveStatus === 'error' ? 'text-rose-400' : 'text-emerald-400'
              }`} />
              <span>
                {autosaveStatus === 'saving' || isAutoSaving
                  ? 'Menyimpan...'
                  : autosaveStatus === 'dirty'
                  ? 'Perubahan belum tersimpan'
                  : autosaveStatus === 'error'
                  ? 'Gagal menyimpan, mencoba lagi'
                  : lastAutoSavedAt
                  ? `Tersimpan otomatis ${lastAutoSavedAt}`
                  : 'Auto-save aktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Restore Backup Banner if newer autosave exists */}
        {showRestoreBanner && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Ada perubahan yang belum disimpan dari cadangan ({autosaveBackupData?.savedAt ? new Date(autosaveBackupData.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'terbaru'}).</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreBackup}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold transition-colors cursor-pointer"
              >
                Pulihkan
              </button>
              <button
                type="button"
                onClick={handleDiscardBackup}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Buang
              </button>
            </div>
          </div>
        )}

        {/* Main Editor Form Container */}
        <div className="space-y-6">
          <div className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
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
                    ? 'Perbarui konten artikel Anda. Format isi artikel langsung terlihat tanpa perlu berpindah ke pratinjau.'
                    : 'Publikasikan berita, review Skor Sotoy, kurasi daftar, atau modul studi perfilman. Format langsung terlihat di editor.'}
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
                      src={editor.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                      alt={editor.userName}
                      title={`${editor.userName} (${editor.roleTitle || 'Editor'})`}
                      className="w-8 h-8 rounded-full border-2 border-amber-500 object-cover ring-2 ring-black"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Direct Form */}
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
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Contoh: Bedah Sinematografi Film Joker: Folie à Deux..."
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] focus:ring-1 focus:ring-[#FF2E7E]"
                />
              </div>

              {/* Custom Slug Setting */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Link className="w-3.5 h-3.5 text-[#FF2E7E]" />
                    <span>Pengaturan Custom Slug (URL Artikel)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-[#FF2E7E] border border-pink-500/20">
                      SEO Friendly
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleResetSlugFromTitle}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    title="Generate ulang slug otomatis dari judul artikel"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset dari Judul</span>
                  </button>
                </div>
                
                <div className="flex items-stretch rounded-xl bg-slate-900 border border-slate-700 focus-within:border-[#FF2E7E] focus-within:ring-1 focus-within:ring-[#FF2E7E] overflow-hidden text-xs transition-all">
                  <div className="px-3.5 py-2.5 text-slate-400 bg-slate-950/70 font-mono text-[11px] border-r border-slate-800 select-none flex items-center gap-1.5 shrink-0">
                    <Globe className="w-3 h-3 text-[#FF2E7E]" />
                    <span>sotoyfilm.id/artikel/</span>
                  </div>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={e => handleCustomSlugChange(e.target.value)}
                    placeholder="custom-slug-artikel"
                    className="flex-1 bg-transparent px-3 py-2.5 text-white font-mono text-xs placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <p>
                    Pratinjau URL: <span className="text-[#FF2E7E] font-mono font-semibold">https://sotoyfilm.id/artikel/{customSlug || 'judul-artikel'}</span>
                  </p>
                  <span className="font-mono text-[10px] text-slate-400">
                    {customSlug.length} karakter
                  </span>
                </div>
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
                {coverImage?.trim() ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group">
                    <img src={coverImage.trim()} alt="Cover preview" className="w-full h-40 object-cover" />
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
                ) : null}
              </div>

              {/* Tag Film Terkait / Film yang Dibahas Section (Mendukung Beberapa Film) */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-white flex items-center gap-2">
                      <Film className="w-4 h-4 text-cyan-400" />
                      <span>Film yang Dibahas dalam Artikel (Bisa Pilih Beberapa Film)</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tautkan satu atau beberapa film dari database Sotoy Film untuk menampilkan poster, trailer, dan detail film terkait kepada pembaca.
                    </p>
                  </div>
                  {selectedFilmIds.length > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold font-mono">
                      {selectedFilmIds.length} Film Ditautkan
                    </span>
                  )}
                </div>

                {/* List of currently linked films */}
                {selectedFilms.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedFilms.map((film, idx) => (
                      <div
                        key={film.id}
                        className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-cyan-500/30 flex items-center justify-between gap-3 shadow-md hover:border-cyan-400 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {film.poster?.trim() ? (
                            <img
                              src={film.poster.trim()}
                              alt={film.title}
                              className="w-11 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-500">
                              <Film className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">
                                {film.type}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">{film.year}</span>
                              {idx === 0 && (
                                <span className="text-[9px] font-bold bg-[#FF2E7E]/20 text-[#FF2E7E] px-1.5 py-0.5 rounded border border-[#FF2E7E]/30">
                                  Utama
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-white truncate mt-1">{film.title}</h4>
                            <div className="text-[10px] text-slate-400 truncate">Sutradara: {film.director}</div>
                            {film.skorSotoy && (
                              <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold mt-0.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{film.skorSotoy}/10</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFilmIds(prev => prev.filter(id => id !== film.id));
                            showToast(`Film "${film.title}" dilepas.`);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-colors shrink-0 cursor-pointer"
                          title="Hapus film dari daftar kaitan artikel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs italic">
                    Belum ada film yang ditautkan ke artikel ini. Anda dapat menambahkan beberapa film di bawah.
                  </div>
                )}

                {/* Film Search Input to add films */}
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
                      placeholder={selectedFilmIds.length > 0 ? "Cari dan tambah film lain yang dibahas..." : "Cari judul film, sutradara, atau genre di database Sotoy Film..."}
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
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#171717] border border-slate-700 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800">
                      {filteredFilms.length > 0 ? (
                        filteredFilms.map(film => {
                          const isAlreadySelected = selectedFilmIds.includes(film.id);
                          return (
                            <div
                              key={film.id}
                              onClick={() => {
                                if (isAlreadySelected) {
                                  showToast('Film ini sudah ditautkan ke artikel.');
                                  return;
                                }
                                setSelectedFilmIds(prev => [...prev, film.id]);
                                setFilmSearchQuery('');
                                setIsFilmSearchOpen(false);
                                showToast(`Film "${film.title}" berhasil ditambahkan!`, 'success');
                              }}
                              className={`p-3 cursor-pointer flex items-center justify-between transition-colors group ${
                                isAlreadySelected ? 'bg-slate-900/50 opacity-60' : 'hover:bg-cyan-500/10'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {film.poster?.trim() ? (
                                  <img
                                    src={film.poster.trim()}
                                    alt={film.title}
                                    className="w-10 h-14 rounded-lg object-cover bg-slate-800 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-14 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                    <Film className="w-4 h-4" />
                                  </div>
                                )}
                                <div>
                                  <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                                    {film.title} <span className="text-slate-400 font-normal">({film.year})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {film.director} • {film.genres.join(', ')}
                                  </div>
                                </div>
                              </div>
                              {isAlreadySelected ? (
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Ditautkan</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/30 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                                  + Tambah Film
                                </span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">
                          Tidak ditemukan film yang cocok dengan "{filmSearchQuery}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

              {/* Live Reading Time Calculator & Content Metrics Widget */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Kalkulator Waktu Baca (Reading Time)</span>
                        <span className="text-[10px] font-mono bg-pink-500/15 text-[#FF2E7E] px-2 py-0.5 rounded-full border border-pink-500/30">
                          Otomatis Terhitung
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Dihitung berdasarkan jumlah kata dan standar kecepatan baca ~200 kata/menit.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReadTime(readingStats.formattedTime)}
                    className="px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-[#FF2E7E] border border-pink-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                    title="Reset ke estimasi otomatis"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sinkronkan ({readingStats.formattedTime})</span>
                  </button>
                </div>

                {/* Metrics Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase">Estimasi Baca</span>
                    <span className="text-sm font-bold text-[#FF2E7E] tabular-nums mt-0.5">~{readingStats.estimatedMinutes} menit</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase">Total Kata</span>
                    <span className="text-sm font-bold text-white tabular-nums mt-0.5">{readingStats.words.toLocaleString('id-ID')} kata</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase">Karakter</span>
                    <span className="text-sm font-bold text-slate-300 tabular-nums mt-0.5">{readingStats.chars.toLocaleString('id-ID')} char</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase">Paragraf</span>
                    <span className="text-sm font-bold text-slate-300 tabular-nums mt-0.5">{readingStats.paragraphs} paragraf</span>
                  </div>
                </div>

                <div className="pt-1">
                  <input
                    type="text"
                    value={readTime}
                    onChange={e => setReadTime(e.target.value)}
                    placeholder="Contoh: 5 mnt baca"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                  />
                </div>
              </div>

              {/* Content Editor */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Isi Konten Artikel (WYSIWYG Tiptap & Sematan Media Sosial) <span className="text-[#FF2E7E]">*</span></span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {readingStats.words} kata • ~{readingStats.estimatedMinutes} mnt baca
                  </span>
                </label>
                <ArticleEditor
                  key={editingId || (selectedArticleId ? `art-${selectedArticleId}` : 'new-article')}
                  initialJson={contentJson}
                  initialMarkdown={content}
                  onChange={({ json, markdown, plainText, wordCount }) => {
                    setContent(markdown);
                    setContentJson(json);
                    setContentFormat('tiptap');
                  }}
                  placeholder="Tulis naskah ulasan mendalam, analisis sinematografi, atau artikel film Anda... Ketik '/' untuk menu kilat atau tempelkan link YouTube/IG/X/TikTok/Threads untuk menyematkan embed."
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
              <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-slate-800 space-y-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#FF2E7E]">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                        <span>Manajemen SEO & Meta Social Share Card</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#FF2E7E] border border-cyan-500/30">
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
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMetaDescription(excerpt)}
                        className="mt-1 text-[11px] text-[#FF2E7E] hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
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
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
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
                    <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-[#171717] shadow-2xl">
                      <div className="relative h-36 bg-slate-800 overflow-hidden">
                        {(ogImage?.trim() || coverImage?.trim()) ? (
                          <img
                            src={ogImage?.trim() || coverImage?.trim() || DEFAULT_COVER}
                            alt="OG Card Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-1 bg-slate-900">
                            <Sparkles className="w-5 h-5 text-slate-600" />
                            <span className="text-[10px]">Gambar pratinjau belum diatur</span>
                          </div>
                        )}
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
              <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-slate-800 space-y-5 shadow-xl">
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
                        : 'bg-[#171717] border-slate-800 text-slate-400 hover:border-slate-700'
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
                        : 'bg-[#171717] border-slate-800 text-slate-400 hover:border-slate-700'
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
                        : 'bg-[#171717] border-slate-800 text-slate-400 hover:border-slate-700'
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
                  <div className="p-4 bg-[#171717] border border-purple-500/30 rounded-2xl space-y-4 animate-in fade-in duration-200">
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
                          className="w-full bg-[#0A0A0A] border border-purple-500/50 rounded-xl px-4 py-2.5 text-xs font-mono text-purple-200 focus:outline-none focus:border-purple-400 cursor-pointer"
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
              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigateTo('writer-dashboard')}
                    className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>

                  {/* Manual Snapshot Checkpoint Button */}
                  <button
                    type="button"
                    disabled={isCreatingSnapshot || (!title.trim() && !content.trim())}
                    onClick={() => saveVersionSnapshot('Checkpoint Manual dari Editor')}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    title="Simpan salinan versi saat ini tanpa mengubah status publikasi"
                  >
                    <FileClock className="w-4 h-4 text-amber-400" />
                    <span>{isCreatingSnapshot ? 'Menyimpan Versi...' : 'Snapshot Versi'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                  {/* Reading Time Summary Indicator before Publishing */}
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
                    <Clock className="w-4 h-4 text-[#FF2E7E]" />
                    <span>Estimasi: <strong className="text-white">~{readingStats.estimatedMinutes} mnt baca</strong> ({readingStats.words} kata)</span>
                  </div>

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
                      className="bg-gradient-to-r from-[#FF2E7E] via-[#FF2E7E] to-[#FF2E7E] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#FF2E7E]/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
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
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VERSION HISTORY MODAL (Riwayat & Pemulihan Versi Naskah) */}
      {/* ========================================================================= */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#171717] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg sm:text-xl text-white flex items-center gap-2">
                    <span>Riwayat Versi Artikel</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {versions.length} Versi Tersimpan
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lihat rekam jejak revisi naskah Anda dan pulihkan ke versi terdahulu kapan saja.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isCreatingSnapshot || (!title.trim() && !content.trim())}
                  onClick={() => saveVersionSnapshot('Snapshot Checkpoint Manual')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Simpan kondisi artikel saat ini sebagai versi baru"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Buat Versi Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsVersionModalOpen(false);
                    setSelectedVersionPreview(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Versions List & Preview */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {versions.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <FileClock className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white">Belum ada catatan riwayat versi</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Sistem akan mencatat versi secara otomatis setiap kali Anda menyimpan draf atau menerbitkan artikel. Anda juga bisa membuat checkpoint versi pertama sekarang.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isCreatingSnapshot || (!title.trim() && !content.trim())}
                    onClick={() => saveVersionSnapshot('Versi Awal Naskah')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Versi Checkpoint Pertama</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {versions.map((ver) => {
                    const isSelected = selectedVersionPreview?.id === ver.id;
                    const savedDate = ver.savedAt ? new Date(ver.savedAt) : new Date();
                    const formattedDate = savedDate.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    const formattedTime = savedDate.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={ver.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isSelected
                            ? 'bg-slate-900/90 border-amber-500/60 shadow-lg shadow-amber-950/20'
                            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
                              v{ver.versionNumber}
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-white font-display">
                                  {ver.title || '(Tanpa Judul)'}
                                </span>
                                {ver.summary && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                                    {ver.summary}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1 font-mono text-[11px]">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{formattedDate}, {formattedTime} WIB</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-mono text-[11px] text-amber-300">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>~{Math.max(1, Math.ceil((ver.wordCount || 0) / 200))} mnt ({ver.wordCount || 0} kata)</span>
                                </span>
                                <span>•</span>
                                <span className="text-[11px] text-slate-400">
                                  Penulis: <strong className="text-slate-200">{ver.authorName}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {/* Toggle Preview Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedVersionPreview(isSelected ? null : ver)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{isSelected ? 'Tutup Pratinjau' : 'Pratinjau'}</span>
                              {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {/* Restore Button */}
                            <button
                              type="button"
                              onClick={() => handleRestoreVersion(ver)}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs border border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Muat naskah versi ini kembali ke editor aktif"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Pulihkan Versi Ini</span>
                            </button>

                            {/* Delete Version Button */}
                            <button
                              type="button"
                              disabled={deletingVersionId === ver.id}
                              onClick={() => handleDeleteVersion(ver.id, ver.versionNumber)}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
                              title="Hapus versi ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Version Content Inspector */}
                        {isSelected && (
                          <div className="p-5 border-t border-slate-800 bg-slate-950/70 space-y-4 animate-in fade-in duration-200">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                <span>Isi Lengkap Versi v{ver.versionNumber}:</span>
                              </span>
                              <span className="text-[11px] font-mono text-slate-400 bg-black/40 px-2.5 py-1 rounded-lg border border-slate-800">
                                Kategori: {ver.category || '-'} / {ver.subCategory || '-'}
                              </span>
                            </div>

                            {ver.excerpt && (
                              <div className="p-3 rounded-xl bg-slate-900 border-l-2 border-amber-500 text-xs text-slate-300 italic">
                                "{ver.excerpt}"
                              </div>
                            )}

                            <div className="p-4 rounded-xl bg-black/50 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-sans custom-scrollbar">
                              {ver.content || '(Konten kosong...)'}
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <span className="text-[11px] text-slate-400">
                                Tags: {(ver.tags || []).join(', ') || '-'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRestoreVersion(ver)}
                                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                              >
                                <Check className="w-4 h-4" />
                                <span>Terapkan & Pulihkan ke Editor</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Memulihkan versi akan membuat salinan pengaman otomatis dari naskah saat ini.</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsVersionModalOpen(false);
                  setSelectedVersionPreview(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightweight Loading Indicator during Publishing */}
      {isPublishingLoading && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-pink-500/30 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center mx-auto text-[#FF2E7E]">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Mempublikasikan Artikel...</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Menyimpan naskah, merekam checkpoint versi, dan menyiapkan halaman artikel untuk pembaca.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Notification / Confirmation Modal for Published Article */}
      {publishedSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-[#1c1c1c] to-[#121212] border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPublishedSuccessModal(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Tutup notifikasi"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with celebration icon */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Artikel Berhasil Dipublikasikan! 🎉
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Artikel Anda sudah live di Sotoy Film dan dapat langsung dibaca oleh seluruh sinefil & komunitas.
              </p>
            </div>

            {/* Article Card Preview */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex items-center gap-4">
              {publishedSuccessModal.coverImage?.trim() ? (
                <img
                  src={publishedSuccessModal.coverImage.trim()}
                  alt={publishedSuccessModal.title}
                  className="w-16 h-20 rounded-xl object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-16 h-20 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-500">
                  <FileText className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-pink-500/20 text-[#FF2E7E] px-2 py-0.5 rounded border border-pink-500/30">
                    {publishedSuccessModal.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {publishedSuccessModal.readTime}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1.5 line-clamp-2">
                  {publishedSuccessModal.title}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-mono text-cyan-400 truncate">
                    sotoyfilm.id/artikel/{publishedSuccessModal.slug}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `https://sotoyfilm.id/artikel/${publishedSuccessModal.slug}`;
                      navigator.clipboard.writeText(url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                      showToast('Tautan artikel disalin ke papan klip!', 'success');
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                    title="Salin Tautan Artikel"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const targetId = publishedSuccessModal.id;
                  setPublishedSuccessModal(null);
                  navigateTo('article-detail', { articleId: targetId });
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF2E7E] to-[#e0266e] hover:from-[#ff408a] hover:to-[#FF2E7E] text-white font-bold text-sm shadow-xl shadow-[#FF2E7E]/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Lihat Artikel yang Sudah Terbit</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPublishedSuccessModal(null);
                    navigateTo('writer-dashboard');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Dashboard Penulis</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPublishedSuccessModal(null);
                    setIsEditMode(false);
                    setEditingId(null);
                    setTitle('');
                    setCustomSlug('');
                    setIsSlugManuallyEdited(false);
                    setExcerpt('');
                    setContent('');
                    setSelectedFilmIds([]);
                    setTagsInput('Film, Bioskop, Review');
                    showToast('Form artikel siap untuk penulisan artikel baru.');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tulis Artikel Baru</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
