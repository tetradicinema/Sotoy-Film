import React, { useState, useMemo, useEffect } from 'react';
import { 
  Film, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Star, 
  Calendar, 
  Clock, 
  Layers, 
  X, 
  Check, 
  Tv, 
  Sparkles,
  Eye,
  AlertCircle,
  Loader2,
  Download,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Tag,
  Users,
  Image as ImageIcon,
  CheckSquare,
  Square,
  MinusSquare,
  FileSpreadsheet,
  Award,
  RefreshCw,
  CopyCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FilmItem, CastMember } from '../../types';
import { AdminBatchTmdbModal } from './AdminBatchTmdbModal';
import { AdminTmdbSyncModal } from './AdminTmdbSyncModal';
import { slugify } from '../../utils/slugify';
import { 
  formatDuration, 
  generateSuggestedTags, 
  mapTmdbDetailsToFilm,
  fetchTmdbDetails,
  buildFilmPayloadTmdbId,
  findExistingFilmByTmdb,
  findTmdbDuplicateGroups
} from '../../utils/tmdbHelper';
import { tmdbMediaType } from '../../utils/tmdbSync';
import { classifyFilmType, normalizeFilmType } from '../../utils/filmType';

interface FilmFormData {
  title: string;
  originalTitle: string;
  tmdbId?: number;
  type: 'movie' | 'series' | 'animation';
  year: number;
  releaseDate: string; // ISO date string e.g. "2024-07-12"
  duration: string;
  poster: string;
  backdrop: string;
  synopsis: string;
  director: string;
  writer: string;
  studio: string;
  cast: string; // Comma-separated in form
  castDetails: CastMember[]; // Top 5 with profile photos
  genres: string; // Comma-separated in form
  tags: string[]; // Active selected tags
  suggestedTags: string[]; // Dynamic suggested tags
  originCountry: string[]; // ISO 3166-1 alpha-2 codes from TMDB
  skorSotoy: number;
  trailerUrl: string;
  featuredRecommendation: boolean;
  collectionId?: number;
  collectionName?: string;
  relatedFilmIds: string[];
}

const DEFAULT_FORM: FilmFormData = {
  title: '',
  originalTitle: '',
  tmdbId: undefined,
  type: 'movie',
  year: new Date().getFullYear(),
  releaseDate: '',
  duration: '2h 10m',
  poster: '',
  backdrop: '',
  synopsis: '',
  director: '',
  writer: '',
  studio: '',
  cast: '',
  castDetails: [],
  genres: 'Action, Drama',
  tags: ['action-packed', 'drama'],
  suggestedTags: ['action-packed', 'drama', 'thriller', 'must-watch'],
  originCountry: [],
  skorSotoy: 4.0,
  trailerUrl: '',
  featuredRecommendation: false,
  collectionId: undefined,
  collectionName: undefined,
  relatedFilmIds: [],
};

export const AdminCatalogManager: React.FC = () => {
  const { films, addFilm, updateFilm, deleteFilm, bulkDeleteFilms, bulkUpdateFilms, navigateTo, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series' | 'animation'>('all');

  // Bulk Selection State
  const [selectedFilmIds, setSelectedFilmIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkFormatModal, setShowBulkFormatModal] = useState(false);
  const [bulkTargetFormat, setBulkTargetFormat] = useState<'movie' | 'series' | 'animation'>('movie');
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkSuggestedTags, setBulkSuggestedTags] = useState<string[]>([
    'trending', 'must-watch', 'box-office', 'award-winning', 'cult-classic', 'indonesian-cinema', 'plot-twist', 'masterpiece'
  ]);

  // Delete Confirmation State
  const [filmToDelete, setFilmToDelete] = useState<FilmItem | null>(null);
  const [isDeletingFilm, setIsDeletingFilm] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFilmId, setEditingFilmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FilmFormData>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isTmdbSyncModalOpen, setIsTmdbSyncModalOpen] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const duplicateGroups = useMemo(() => findTmdbDuplicateGroups(films), [films]);
  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');

  const relatedSearchResults = useMemo(() => {
    const q = relatedSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return films
      .filter(f => {
        if (!f || !f.id) return false;
        if (editingFilmId && f.id === editingFilmId) return false;
        if (formData.relatedFilmIds?.includes(f.id)) return false;
        return (
          f.title?.toLowerCase().includes(q) ||
          f.originalTitle?.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [films, editingFilmId, formData.relatedFilmIds, relatedSearchQuery]);

  const handleAddRelatedFilm = (targetFilmId: string) => {
    if (!targetFilmId) return;
    if (editingFilmId && targetFilmId === editingFilmId) {
      showToast('Film tidak dapat menambahkan dirinya sendiri sebagai film terkait!');
      return;
    }
    const current = formData.relatedFilmIds || [];
    if (current.includes(targetFilmId)) return;
    if (current.length >= 12) {
      showToast('Maksimal 12 film terkait!');
      return;
    }
    setFormData(prev => ({
      ...prev,
      relatedFilmIds: [...(prev.relatedFilmIds || []), targetFilmId],
    }));
    setRelatedSearchQuery('');
  };

  const handleRemoveRelatedFilm = (targetFilmId: string) => {
    setFormData(prev => ({
      ...prev,
      relatedFilmIds: (prev.relatedFilmIds || []).filter(id => id !== targetFilmId),
    }));
  };

  // TMDB Import State
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbType, setTmdbType] = useState<'movie' | 'tv'>('movie');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [isTmdbSearching, setIsTmdbSearching] = useState(false);
  const [isTmdbImporting, setIsTmdbImporting] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [importedTmdbTitle, setImportedTmdbTitle] = useState<string | null>(null);
  const [showTmdbSection, setShowTmdbSection] = useState(true);

  // Debounced TMDB search effect
  useEffect(() => {
    if (!isModalOpen) {
      setTmdbResults([]);
      setTmdbError(null);
      setIsTmdbSearching(false);
      return;
    }

    const trimmed = tmdbQuery.trim();
    if (trimmed.length < 2) {
      setTmdbResults([]);
      setTmdbError(null);
      setIsTmdbSearching(false);
      return;
    }

    setIsTmdbSearching(true);
    setTmdbError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb?action=search&query=${encodeURIComponent(trimmed)}&type=${tmdbType}`);
        const data = await res.json();

        if (!res.ok) {
          const errMsg = data?.error || 'Gagal mencari di TMDB.';
          setTmdbError(errMsg);
          setTmdbResults([]);
          showToast(errMsg);
        } else {
          const results = Array.isArray(data) ? data : data?.results || [];
          setTmdbResults(results);
          if (results.length === 0) {
            setTmdbError(`Tidak ada hasil ditemukan di TMDB untuk "${trimmed}".`);
          }
        }
      } catch (err: any) {
        const msg = err.message || 'Koneksi ke proxy TMDB gagal.';
        setTmdbError(msg);
        showToast(msg);
      } finally {
        setIsTmdbSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [tmdbQuery, tmdbType, isModalOpen]);

  // Handle selecting a TMDB search result to import its full details + cast profile photos + auto-tags
  const handleSelectTmdbResult = async (result: any) => {
    // Stale list guard: Check if this film is already in catalog
    const itemTitle = result.title || result.name || '';
    const itemYear = (result.release_date || result.first_air_date || '').substring(0, 4);
    const existingBefore = findExistingFilmByTmdb(
      films,
      result.id,
      result.media_type || tmdbType,
      {
        title: itemTitle,
        year: itemYear ? parseInt(itemYear, 10) : undefined,
      }
    );
    if (existingBefore) {
      const msg = `Film "${existingBefore.title}" (${existingBefore.year}) sudah ada di katalog. Impor dibatalkan untuk mencegah duplikat.`;
      setTmdbError(msg);
      showToast(msg);
      return;
    }

    setIsTmdbImporting(true);
    setTmdbError(null);
    try {
      const details = await fetchTmdbDetails(result.id, tmdbType);
      const mapped = mapTmdbDetailsToFilm(details, tmdbType);

      // Re-guard after details fetch with mapped year and normalized media type
      const mappedMediaType = tmdbMediaType({ type: mapped.type, duration: mapped.duration });
      const existingAfter = findExistingFilmByTmdb(
        films,
        mapped.tmdbId,
        mappedMediaType,
        {
          title: mapped.title,
          year: mapped.year,
        }
      );
      if (existingAfter) {
        const msg = `Film "${existingAfter.title}" (${existingAfter.year}) sudah ada di katalog. Impor dibatalkan untuk mencegah duplikat.`;
        setTmdbError(msg);
        showToast(msg);
        return;
      }

      setFormData(prev => ({
        ...prev,
        title: mapped.title,
        originalTitle: mapped.originalTitle,
        tmdbId: mapped.tmdbId,
        type: mapped.type,
        year: mapped.year,
        releaseDate: mapped.releaseDate || prev.releaseDate || '',
        poster: mapped.poster || prev.poster,
        backdrop: mapped.backdrop || prev.backdrop,
        synopsis: mapped.synopsis || prev.synopsis,
        director: mapped.director || prev.director,
        writer: mapped.writer || prev.writer,
        studio: mapped.studio || prev.studio,
        cast: mapped.cast || prev.cast,
        castDetails: mapped.castDetails,
        genres: mapped.genres || prev.genres,
        tags: mapped.tags,
        suggestedTags: mapped.suggestedTags,
        originCountry: mapped.originCountry,
        duration: mapped.duration || prev.duration,
        trailerUrl: mapped.trailerUrl || prev.trailerUrl,
        skorSotoy: mapped.skorSotoy || prev.skorSotoy,
        collectionId: mapped.collectionId ?? prev.collectionId,
        collectionName: mapped.collectionName ?? prev.collectionName,
        relatedFilmIds: prev.relatedFilmIds || [],
      }));

      setImportedTmdbTitle(mapped.title);
      setTmdbResults([]);
      showToast(`Metadata & foto profil pemeran "${mapped.title}" berhasil diimpor dari TMDB!`);
    } catch (err: any) {
      const msg = err.message || 'Gagal mengimpor data dari TMDB.';
      setTmdbError(msg);
      showToast(msg);
    } finally {
      setIsTmdbImporting(false);
    }
  };

  // Filtered films
  const filteredFilms = useMemo(() => {
    const seenIds = new Set<string>();
    return films.filter(film => {
      if (!film || !film.id) return false;
      if (seenIds.has(film.id)) return false;
      seenIds.add(film.id);
      if (typeFilter !== 'all' && normalizeFilmType(film.type) !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = film.title?.toLowerCase().includes(q);
        const matchDirector = film.director?.toLowerCase().includes(q);
        const matchGenre = film.genres?.some(g => g?.toLowerCase().includes(q));
        if (!matchTitle && !matchDirector && !matchGenre) return false;
      }
      return true;
    });
  }, [films, typeFilter, searchQuery]);

  // Bulk Selection Helpers
  const isAllSelected = filteredFilms.length > 0 && filteredFilms.every(f => selectedFilmIds.includes(f.id));
  const isSomeSelected = filteredFilms.some(f => selectedFilmIds.includes(f.id)) && !isAllSelected;

  const handleToggleSelectFilm = (id: string) => {
    setSelectedFilmIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (isAllSelected) {
      // Deselect all filtered
      const filteredIds = new Set(filteredFilms.map(f => f.id));
      setSelectedFilmIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      // Select all filtered
      const newSelected = new Set([...selectedFilmIds, ...filteredFilms.map(f => f.id)]);
      setSelectedFilmIds(Array.from(newSelected));
    }
  };

  const handleClearSelection = () => {
    setSelectedFilmIds([]);
  };

  // Bulk Operations Handlers
  const handleBulkDeleteConfirm = async () => {
    if (selectedFilmIds.length === 0) return;
    setIsBulkOperating(true);
    try {
      const ok = await bulkDeleteFilms(selectedFilmIds);
      if (ok) {
        setSelectedFilmIds([]);
        setShowBulkDeleteModal(false);
      }
    } catch (err: any) {
      showToast('Gagal menghapus film massal: ' + (err?.message || 'Error'));
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkFormatChange = async (targetFormat: 'movie' | 'series' | 'animation') => {
    if (selectedFilmIds.length === 0) return;
    setIsBulkOperating(true);
    try {
      const ok = await bulkUpdateFilms(selectedFilmIds, { type: targetFormat });
      if (ok) {
        showToast(`Format ${selectedFilmIds.length} film berhasil diubah ke ${targetFormat.toUpperCase()}.`);
        setShowBulkFormatModal(false);
        setSelectedFilmIds([]);
      }
    } catch (err: any) {
      showToast('Gagal mengubah format film: ' + (err?.message || 'Error'));
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkToggleFeatured = async (isFeatured: boolean) => {
    if (selectedFilmIds.length === 0) return;
    setIsBulkOperating(true);
    try {
      const ok = await bulkUpdateFilms(selectedFilmIds, { featuredRecommendation: isFeatured });
      if (ok) {
        showToast(isFeatured 
          ? `${selectedFilmIds.length} film ditandai sebagai Rekomendasi Unggulan! ⭐`
          : `${selectedFilmIds.length} film dihapus dari Rekomendasi Unggulan.`
        );
        setSelectedFilmIds([]);
      }
    } catch (err: any) {
      showToast('Gagal mengubah status rekomendasi: ' + (err?.message || 'Error'));
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkAddTags = async () => {
    if (selectedFilmIds.length === 0) return;
    const inputTags = bulkTagInput
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    if (inputTags.length === 0) {
      showToast('Masukkan minimal satu tag yang valid!');
      return;
    }

    setIsBulkOperating(true);
    try {
      // Merge new tags with existing tags for each selected film
      await Promise.all(
        selectedFilmIds.map(async id => {
          const film = films.find(f => f.id === id);
          const currentTags = film?.tags || [];
          const merged = Array.from(new Set([...currentTags, ...inputTags]));
          await updateFilm(id, { tags: merged });
        })
      );
      showToast(`Tag [${inputTags.join(', ')}] berhasil ditambahkan ke ${selectedFilmIds.length} film!`);
      setShowBulkTagModal(false);
      setBulkTagInput('');
      setSelectedFilmIds([]);
    } catch (err: any) {
      showToast('Gagal menambahkan tag massal: ' + (err?.message || 'Error'));
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleExportSelectedFilms = (format: 'json' | 'csv') => {
    const targetFilms = films.filter(f => selectedFilmIds.includes(f.id));
    if (targetFilms.length === 0) {
      showToast('Pilih minimal satu film untuk diekspor!');
      return;
    }

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(targetFilms, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `sotoy-films-export-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`${targetFilms.length} film berhasil diekspor ke format JSON.`);
    } else {
      // CSV Format
      const headers = ['ID', 'Judul', 'Tipe', 'Tahun', 'Sutradara', 'Studio', 'Genre', 'Skor Sotoy', 'Poster'];
      const rows = targetFilms.map(f => [
        `"${f.id}"`,
        `"${(f.title || '').replace(/"/g, '""')}"`,
        `"${f.type || 'movie'}"`,
        f.year || 2024,
        `"${(f.director || '').replace(/"/g, '""')}"`,
        `"${(f.studio || '').replace(/"/g, '""')}"`,
        `"${(f.genres || []).join('; ')}"`,
        f.skorSotoy || 4.0,
        `"${f.poster || ''}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `sotoy-films-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(`${targetFilms.length} film berhasil diekspor ke format CSV.`);
    }
  };

  // Open modal for new film
  const handleOpenAddModal = (focusTmdb = false) => {
    setEditingFilmId(null);
    setFormData({ ...DEFAULT_FORM, tmdbId: undefined });
    setTmdbQuery('');
    setTmdbResults([]);
    setTmdbError(null);
    setImportedTmdbTitle(null);
    setShowTmdbSection(true);
    setIsSubmitting(false);
    setCustomTagInput('');
    setRelatedSearchQuery('');
    setIsModalOpen(true);
  };

  // Open modal for editing existing film
  const handleOpenEditModal = (film: FilmItem) => {
    setEditingFilmId(film.id);
    const existingGenres = film.genres || [];
    const suggested = generateSuggestedTags(
      film.title,
      existingGenres,
      film.year,
      film.synopsis,
      film.skorSotoy ? film.skorSotoy * 2 : 8.0,
      film.director
    );

    setFormData({
      title: film.title || '',
      originalTitle: film.originalTitle || '',
      tmdbId: film.tmdbId,
      type: normalizeFilmType(film.type),
      year: film.year || 2024,
      releaseDate: film.releaseDate || '',
      duration: film.duration || '',
      poster: film.poster || '',
      backdrop: film.backdrop || '',
      synopsis: film.synopsis || '',
      director: film.director || '',
      writer: film.writer || '',
      studio: film.studio || '',
      cast: (film.cast || []).join(', '),
      castDetails: film.castDetails || (film.cast || []).slice(0, 5).map(name => ({
        name,
        character: 'Pemeran',
        photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
      })),
      genres: existingGenres.join(', '),
      tags: film.tags || suggested.slice(0, 4),
      suggestedTags: suggested,
      originCountry: film.originCountry || [],
      skorSotoy: film.skorSotoy || 4.0,
      trailerUrl: film.trailerUrl || '',
      featuredRecommendation: !!film.featuredRecommendation,
      collectionId: film.collectionId,
      collectionName: film.collectionName,
      relatedFilmIds: Array.isArray(film.relatedFilmIds) ? [...film.relatedFilmIds] : [],
    });
    setTmdbQuery('');
    setTmdbResults([]);
    setTmdbError(null);
    setImportedTmdbTitle(null);
    setShowTmdbSection(false);
    setIsSubmitting(false);
    setCustomTagInput('');
    setRelatedSearchQuery('');
    setIsModalOpen(true);
  };

  // Save (Add or Update)
  const handleSaveFilm = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Guard: Prevent double-submission
    if (isSubmitting) {
      return;
    }

    // Step 1: Validate Title
    if (!formData.title || !formData.title.trim()) {
      showToast('Judul film wajib diisi!');
      return;
    }

    // Step 2: Validate & Parse Year
    const parsedYear = Number(formData.year) || 2024;

    // Step 3: Validate & Parse Genres
    const genresArray = formData.genres
      ? formData.genres.split(',').map(g => g.trim()).filter(Boolean)
      : [];

    // Step 4: Validate & Parse Cast
    const castArray = formData.cast
      ? formData.cast.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    // Step 5: Prevent saving a NEW film (not edits) whose tmdbId + media type already exists
    if (!editingFilmId) {
      const targetMediaType = tmdbMediaType({
        type: formData.type,
        duration: formData.duration,
      });
      const existingDup = findExistingFilmByTmdb(
        films,
        formData.tmdbId,
        targetMediaType,
        {
          title: formData.title.trim(),
          year: parsedYear,
        }
      );
      if (existingDup) {
        showToast(
          `Gagal menyimpan: film sudah ada di katalog dengan judul "${existingDup.title}" (${existingDup.year}).`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Clean & ensure valid image and trailer URLs
      let posterUrl = formData.poster.trim();
      if (!posterUrl) {
        posterUrl = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
      } else if (!/^https?:\/\//i.test(posterUrl) && posterUrl.includes('.')) {
        posterUrl = 'https://' + posterUrl;
      }

      let backdropUrl = formData.backdrop.trim();
      if (!backdropUrl) {
        backdropUrl = 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80';
      } else if (!/^https?:\/\//i.test(backdropUrl) && backdropUrl.includes('.')) {
        backdropUrl = 'https://' + backdropUrl;
      }

      let trailerUrl = formData.trailerUrl.trim();
      if (trailerUrl && !/^https?:\/\//i.test(trailerUrl) && trailerUrl.includes('.')) {
        trailerUrl = 'https://' + trailerUrl;
      }

      // Sync top 5 castDetails with castArray if castDetails was empty
      let finalCastDetails = formData.castDetails;
      if ((!finalCastDetails || finalCastDetails.length === 0) && castArray.length > 0) {
        finalCastDetails = castArray.slice(0, 5).map(name => ({
          name,
          character: 'Pemeran',
          photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
        }));
      }

      const existingFilm = editingFilmId
        ? films.find(film => film.id === editingFilmId)
        : undefined;

      const validRelatedIds = (formData.relatedFilmIds || [])
        .filter(id => id && id !== (editingFilmId || ''))
        .slice(0, 12);

      const resolvedCollectionId =
        formData.collectionId !== undefined
          ? formData.collectionId
          : existingFilm?.collectionId;

      const resolvedCollectionName =
        formData.collectionName !== undefined && formData.collectionName.trim() !== ''
          ? formData.collectionName.trim()
          : existingFilm?.collectionName;

      const filmPayload = {
        title: formData.title.trim(),
        originalTitle: formData.originalTitle.trim() || undefined,
        ...buildFilmPayloadTmdbId(formData.tmdbId, existingFilm?.tmdbId),
        slug: ((formData as any).slug?.trim()) || slugify(formData.title.trim()),
        type: formData.type,
        year: parsedYear,
        releaseDate: formData.releaseDate ? formData.releaseDate.trim() : undefined,
        duration: formData.duration.trim() || undefined,
        poster: posterUrl,
        backdrop: backdropUrl,
        synopsis: formData.synopsis.trim(),
        director: formData.director.trim(),
        writer: formData.writer.trim() || undefined,
        studio: formData.studio.trim() || undefined,
        cast: castArray,
        castDetails: finalCastDetails,
        genres: genresArray,
        tags: formData.tags,
        ...(formData.originCountry.length > 0 ? { originCountry: formData.originCountry } : {}),
        skorSotoy: Number(formData.skorSotoy) || 0,
        criticsSkorSotoy: Number(formData.skorSotoy) || 0,
        trailerUrl: trailerUrl || undefined,
        featuredRecommendation: formData.featuredRecommendation,
        ...(resolvedCollectionId ? { collectionId: resolvedCollectionId } : {}),
        ...(resolvedCollectionName ? { collectionName: resolvedCollectionName } : {}),
        ...(validRelatedIds.length > 0 ? { relatedFilmIds: validRelatedIds } : {}),
      };

      let success = false;
      if (editingFilmId) {
        // Never write whereToWatch when editing: the TMDB sync owns that field.
        success = await updateFilm(editingFilmId, filmPayload);
      } else {
        // New films start with no availability data; the TMDB sync fills it.
        // totalVotes seeds at 0 on create ONLY: the edit path above omits it
        // so the real vote count accumulated from reviews is never clobbered
        // (updateFilm is a partial updateDoc — omitted fields are preserved).
        success = await addFilm({ ...filmPayload, whereToWatch: [], totalVotes: 0 });
      }

      if (success !== false) {
        setIsModalOpen(false);
      } else {
        console.warn('[AdminCatalogManager] Operation returned false from Firestore, but local catalog was updated. Closing modal.');
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error('[AdminCatalogManager] [CRITICAL ERROR] in handleSaveFilm:', err);
      showToast('Gagal memproses film: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (film: FilmItem) => {
    setFilmToDelete(film);
  };

  const confirmDelete = async () => {
    if (!filmToDelete) return;
    setIsDeletingFilm(true);
    try {
      await deleteFilm(filmToDelete.id);
      setFilmToDelete(null);
    } catch (err: any) {
      console.error('[AdminCatalogManager] Error deleting film:', err);
      showToast('Gagal menghapus film: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsDeletingFilm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-xl text-white tracking-tight flex items-center gap-2.5">
            <span>Katalog Database Film & Series</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10 font-mono">
              {films.length} Judul Terindeks
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Tambah judul film baru, perbaiki metadata (poster, sinopsis, cast, sutradara), dan kelola katalog Firestore.
          </p>
        </div>

        {/* Actions: TMDB Import and Manual Add */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            id="admin-batch-import-btn"
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            title="Import banyak film sekaligus dengan daftar ID TMDB"
          >
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Import Massal TMDB</span>
          </button>

          <button
            onClick={() => setIsTmdbSyncModalOpen(true)}
            id="admin-tmdb-sync-btn"
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            title="Sinkronkan tanggal rilis Indonesia dan platform tonton dari TMDB"
          >
            <RefreshCw className="w-4 h-4 text-[#FF2E7E]" />
            <span>Sinkron TMDB</span>
          </button>

          <button
            onClick={() => handleOpenAddModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            title="Cari dan impor metadata film/serial secara otomatis dari TMDB"
          >
            <Sparkles className="w-4 h-4 text-[#FF2E7E]" />
            <span>Import dari TMDB</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDuplicatesModal(true)}
            id="admin-check-tmdb-duplicates-btn"
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            title="Cek daftar film di katalog yang memiliki TMDB ID dan format yang sama"
          >
            <CopyCheck className="w-4 h-4 text-amber-400" />
            <span>Cek duplikat TMDB</span>
            {duplicateGroups.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {duplicateGroups.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleOpenAddModal(false)}
            className="px-4 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Tambah Film Manual</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#171717] border border-white/[0.08] rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Format Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium pb-1 sm:pb-0 scrollbar-none">
            {(['all', 'movie', 'series', 'animation'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setTypeFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors whitespace-nowrap ${
                  typeFilter === tab
                    ? 'bg-[#FF2E7E] text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {tab === 'all' ? 'Semua Format' : tab === 'movie' ? 'Movie' : tab === 'series' ? 'Series' : 'Animation'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul, sutradara, genre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] transition-colors"
            />
          </div>
        </div>

        {/* Bulk Actions Floating/Contextual Bar */}
        {selectedFilmIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#171717] border border-white/15 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/[0.08] text-white font-mono text-xs">
                {selectedFilmIds.length}
              </span>
              <span className="text-xs font-bold text-white">
                Film Dipilih
              </span>
              <span className="text-[11px] text-slate-400">
                (dari total {filteredFilms.length} yang ditampilkan)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Change Format */}
              <button
                type="button"
                onClick={() => setShowBulkFormatModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-750 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Ubah format semua film yang dipilih"
              >
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ubah Format</span>
              </button>

              {/* Add Tags */}
              <button
                type="button"
                onClick={() => setShowBulkTagModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-750 text-[#FF2E7E] border border-[#FF2E7E]/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Tambahkan tag ke semua film yang dipilih"
              >
                <Tag className="w-3.5 h-3.5 text-[#FF2E7E]" />
                <span>Tambah Tag</span>
              </button>

              {/* Toggle Featured Recommendation */}
              <button
                type="button"
                onClick={() => handleBulkToggleFeatured(true)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-750 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Jadikan film pilihan sebagai Rekomendasi Unggulan"
              >
                <Award className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Unggulan</span>
              </button>

              {/* Export JSON / CSV */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-750 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => handleExportSelectedFilms('json')}
                  className="px-2 py-1 rounded text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                  title="Ekspor film terpilih ke file JSON"
                >
                  <Download className="w-3 h-3 text-slate-400" />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSelectedFilms('csv')}
                  className="px-2 py-1 rounded text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                  title="Ekspor film terpilih ke file CSV / Excel"
                >
                  <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                  <span>CSV</span>
                </button>
              </div>

              {/* Delete Selected */}
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Hapus massal film yang dipilih"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Hapus Massal</span>
              </button>

              {/* Cancel Selection */}
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Batalkan semua pilihan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Film Catalog Grid/List */}
        <div className="overflow-x-auto rounded-xl border border-slate-850">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#171717] text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                {/* Select All Checkbox Column */}
                <th className="p-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="p-1 rounded hover:bg-slate-750 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                    title={isAllSelected ? "Batalkan pilihan semua" : "Pilih semua film di tabel"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                    ) : isSomeSelected ? (
                      <MinusSquare className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="p-3.5 min-w-[260px]">Judul Film & Poster</th>
                <th className="p-3.5 min-w-[90px]">Tipe</th>
                <th className="p-3.5 min-w-[80px]">Tahun</th>
                <th className="p-3.5 min-w-[150px]">Sutradara & Studio</th>
                <th className="p-3.5 min-w-[150px]">Genre</th>
                <th className="p-3.5 min-w-[100px]">Skor Sotoy</th>
                <th className="p-3.5 min-w-[140px] text-right">Aksi Manajemen</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-850/80 bg-[#171717]">
              {filteredFilms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                    Tidak ada film yang cocok dengan kueri pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredFilms.map(film => {
                  const isSelected = selectedFilmIds.includes(film.id);
                  return (
                    <tr 
                      key={film.id} 
                      className={`transition-colors group ${
                        isSelected 
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-2 border-amber-400' 
                          : 'hover:bg-slate-850/40'
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectFilm(film.id)}
                          className="p-1 rounded hover:bg-slate-750 text-slate-400 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Poster and Title */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=120&q=80'}
                            alt={film.title}
                            className="w-10 h-14 rounded-lg object-cover ring-1 ring-slate-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span 
                                onClick={() => navigateTo('film-detail', { filmId: film.id })}
                                className="font-semibold text-white hover:text-[#FF2E7E] cursor-pointer transition-colors text-xs block truncate max-w-[200px]"
                              >
                                {film.title}
                              </span>
                              {film.featuredRecommendation && (
                                <span className="p-0.5 rounded bg-white/[0.08] text-white" title="Rekomendasi Unggulan">
                                  <Star className="w-3 h-3 fill-current" />
                                </span>
                              )}
                            </div>
                            {film.originalTitle && (
                              <span className="text-[10px] text-slate-500 italic block truncate max-w-[180px]">
                                {film.originalTitle}
                              </span>
                            )}
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              ID: {film.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/10 text-[10px] font-semibold uppercase tracking-wider font-mono">
                          {film.type || 'Movie'}
                        </span>
                      </td>

                      {/* Year */}
                      <td className="p-3.5 text-slate-300 font-semibold font-mono tabular-nums">
                        {film.year || '-'}
                      </td>

                      {/* Director & Studio */}
                      <td className="p-3.5">
                        <div className="text-xs text-slate-200 font-medium truncate max-w-[140px]">
                          {film.director || 'Tidak terdata'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                          {film.studio || 'Studio independen'}
                        </div>
                      </td>

                      {/* Genres */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {(film.genres || []).slice(0, 2).map((g, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.05] text-slate-300 font-mono">
                              {g}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Skor Sotoy */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-slate-200 font-semibold text-xs font-mono tabular-nums">
                          {Number(film.skorSotoy) > 0 ? (
                            <>
                              <Star className="w-3.5 h-3.5 fill-[#FF2E7E] text-[#FF2E7E]" />
                              <span>{film.skorSotoy.toFixed(1)}</span>
                            </>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(film)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Sunting Metadata Film"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigateTo('film-detail', { filmId: film.id })}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-[#FF2E7E] transition-colors cursor-pointer"
                            title="Buka Halaman Film"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            id={`admin-delete-film-btn-${film.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(film);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Hapus Film dari Katalog"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT METADATA MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5 text-white font-display font-bold text-base">
                <Film className="w-5 h-5 text-[#FF2E7E]" />
                <span>{editingFilmId ? 'Sunting Metadata Film' : 'Tambah Film Baru ke Database'}</span>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TMDB Quick Import Section */}
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 space-y-3.5 relative overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/[0.05] text-[#FF2E7E] border border-white/10">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                      <span>Import Cepat dari TMDB</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10 font-mono">
                        Auto-fill
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Isi otomatis poster, sinopsis, cast, sutradara, genre, durasi, dan trailer dari TMDB.
                    </p>
                  </div>
                </div>

                {/* Type Toggle: Movie vs TV Series */}
                <div className="flex items-center bg-slate-900 border border-slate-750 p-0.5 rounded-xl text-xs shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setTmdbType('movie');
                      setTmdbResults([]);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                      tmdbType === 'movie'
                        ? 'bg-cyan-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Film (Movie)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTmdbType('tv');
                      setTmdbResults([]);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                      tmdbType === 'tv'
                        ? 'bg-cyan-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Serial (TV)</span>
                  </button>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={tmdbQuery}
                  onChange={e => {
                    setTmdbQuery(e.target.value);
                    if (importedTmdbTitle) setImportedTmdbTitle(null);
                  }}
                  placeholder={
                    tmdbType === 'movie'
                      ? 'Ketik judul film di TMDB (contoh: Oppenheimer, Dune, Parasite)...'
                      : 'Ketik judul serial TV di TMDB (contoh: Shogun, Breaking Bad, Arcane)...'
                  }
                  className="w-full bg-slate-900/90 border border-cyan-500/40 focus:border-cyan-400 rounded-xl pl-10 pr-20 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all shadow-inner"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {isTmdbSearching && (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  )}
                  {tmdbQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setTmdbQuery('');
                        setTmdbResults([]);
                        setTmdbError(null);
                      }}
                      className="text-slate-500 hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Loading Detail State */}
              {isTmdbImporting && (
                <div className="bg-cyan-950/50 border border-cyan-500/50 rounded-xl p-3 flex items-center gap-3 text-cyan-200 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <span>Mengunduh metadata lengkap, sinopsis, cast, dan trailer dari TMDB...</span>
                </div>
              )}

              {/* Imported Success Alert */}
              {importedTmdbTitle && !isTmdbImporting && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-start justify-between gap-2.5 text-emerald-300 text-xs animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Metadata Berhasil Diisi Otomatis!</p>
                      <p className="text-[11px] text-emerald-300/80">
                        Data film &ldquo;{importedTmdbTitle}&rdquo; telah dimuat ke dalam formulir di bawah. Silakan tinjau dan edit data sebelum menyimpan ke database.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportedTmdbTitle(null)}
                    className="text-emerald-400/60 hover:text-emerald-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* TMDB Error Alert */}
              {tmdbError && !isTmdbSearching && !isTmdbImporting && (
                <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 flex items-start gap-2.5 text-red-200 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-red-300">Pemberitahuan TMDB</p>
                    <p className="text-[11px] text-red-200/90">{tmdbError}</p>
                    {tmdbError.includes('TMDB_API_KEY') && (
                      <p className="text-[10px] text-amber-300 mt-1 font-mono">
                        Silakan tambahkan environment variable TMDB_API_KEY di server.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Search Results Picker List */}
              {tmdbResults.length > 0 && !isTmdbImporting && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
                    <span>Hasil Pencarian ({tmdbResults.length} judul):</span>
                    <span className="text-[10px] text-cyan-400 font-bold">Pilih untuk auto-fill form</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {tmdbResults.map(item => {
                      const itemTitle = item.title || item.name || '';
                      const itemDate = item.release_date || item.first_air_date || '';
                      const itemYear = itemDate ? itemDate.slice(0, 4) : '';
                      const parsedItemYear = itemYear ? parseInt(itemYear, 10) : undefined;
                      const posterUrl = item.poster_path
                        ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
                        : null;
                      const itemMediaType = item.media_type || tmdbType;
                      const existingFilm = findExistingFilmByTmdb(films, item.id, itemMediaType, {
                        title: itemTitle,
                        year: parsedItemYear,
                      });
                      const isAlreadyInCatalog = Boolean(existingFilm);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (!isAlreadyInCatalog) {
                              handleSelectTmdbResult(item);
                            }
                          }}
                          className={`rounded-xl p-2.5 flex items-center justify-between gap-3 transition-all ${
                            isAlreadyInCatalog
                              ? 'bg-amber-950/20 border border-amber-500/40 opacity-90'
                              : 'bg-slate-900/95 hover:bg-slate-800/90 border border-slate-750 hover:border-cyan-500/60 cursor-pointer group'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {posterUrl?.trim() ? (
                              <img
                                src={posterUrl.trim()}
                                alt={itemTitle}
                                className={`w-9 h-13 rounded-lg object-cover ring-1 shrink-0 ${
                                  isAlreadyInCatalog ? 'ring-amber-500/50' : 'ring-slate-700 group-hover:ring-cyan-400'
                                }`}
                              />
                            ) : (
                              <div className="w-9 h-13 rounded-lg bg-slate-800 border border-slate-750 flex items-center justify-center shrink-0 text-slate-500">
                                <Film className="w-4 h-4" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`font-bold text-xs truncate transition-colors ${
                                  isAlreadyInCatalog ? 'text-amber-200' : 'text-white group-hover:text-cyan-300'
                                }`}>
                                  {itemTitle}
                                </h4>
                                {itemYear && (
                                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-slate-800 text-amber-300 rounded border border-slate-750 shrink-0">
                                    {itemYear}
                                  </span>
                                )}
                                {isAlreadyInCatalog && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1 shrink-0">
                                    <Check className="w-3 h-3 text-amber-400" />
                                    <span>Sudah ada</span>
                                  </span>
                                )}
                              </div>

                              {item.overview && (
                                <p className="text-slate-400 text-[10px] line-clamp-1 mt-0.5">
                                  {item.overview}
                                </p>
                              )}

                              {isAlreadyInCatalog && existingFilm && (
                                <div className="mt-1 flex items-center gap-2 text-[10px]">
                                  <span className="text-amber-300/80">
                                    Sudah ada di katalog: <strong className="text-white font-medium">{existingFilm.title}</strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(existingFilm);
                                    }}
                                    className="text-cyan-400 hover:text-cyan-300 underline font-bold cursor-pointer"
                                  >
                                    Buka Edit Form
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isAlreadyInCatalog && existingFilm ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(existingFilm);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Buka form edit untuk film ini"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit di Katalog</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectTmdbResult(item);
                                }}
                                disabled={isAlreadyInCatalog}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 group-hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Pilih & Impor</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveFilm} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Judul Utama Film *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Oppenheimer"
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                  {typeof formData.tmdbId === 'number' && formData.tmdbId > 0 && (
                    <p className="text-[10px] font-mono text-slate-500 pt-0.5">
                      TMDB #{formData.tmdbId}
                    </p>
                  )}
                </div>

                {/* Original Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Judul Asli (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.originalTitle}
                    onChange={e => setFormData({ ...formData, originalTitle: e.target.value })}
                    placeholder="Contoh: Oppenheimer (2023)"
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Type Format */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Format Konten
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  >
                    <option value="movie">Movie (Film Layar Lebar)</option>
                    <option value="series">Series (Serial Televisi / Web)</option>
                    <option value="animation">Animation</option>
                  </select>
                </div>

                {/* Year */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tahun Rilis
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Release Date (optional) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Tanggal Rilis (opsional)</span>
                    {formData.releaseDate && (
                      <span className="text-[10px] text-cyan-400 font-normal">✓ {formData.releaseDate}</span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={formData.releaseDate}
                    onChange={e => setFormData({ ...formData, releaseDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Durasi / Episode
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="Contoh: 3h 0m atau 10 Episodes"
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Poster URL */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>URL Poster Film</span>
                    {formData.poster && (
                      <span className="text-[10px] text-emerald-400 font-normal">✓ Poster Terisi</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.poster}
                    onChange={e => setFormData({ ...formData, poster: e.target.value })}
                    placeholder="https://images.unsplash.com/... atau tautan gambar poster"
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Backdrop URL */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>URL Backdrop / Header Gambar Lebar</span>
                    {formData.backdrop && (
                      <span className="text-[10px] text-emerald-400 font-normal">✓ Backdrop Terisi</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.backdrop}
                    onChange={e => setFormData({ ...formData, backdrop: e.target.value })}
                    placeholder="https://images.unsplash.com/... atau tautan gambar landscape"
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Director */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Sutradara
                  </label>
                  <input
                    type="text"
                    value={formData.director}
                    onChange={e => setFormData({ ...formData, director: e.target.value })}
                    placeholder="Contoh: Christopher Nolan"
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Writer / Penulis Skenario */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Penulis Skenario / Writer
                  </label>
                  <input
                    type="text"
                    value={formData.writer}
                    onChange={e => setFormData({ ...formData, writer: e.target.value })}
                    placeholder="Contoh: Christopher Nolan, Kai Bird"
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Studio */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Studio / Rumah Produksi
                  </label>
                  <input
                    type="text"
                    value={formData.studio}
                    onChange={e => setFormData({ ...formData, studio: e.target.value })}
                    placeholder="Contoh: Universal Pictures, Warner Bros, Syncopy"
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Cast (comma-separated) */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Daftar Pemeran / Cast (Pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={formData.cast}
                    onChange={e => setFormData({ ...formData, cast: e.target.value })}
                    placeholder="Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr."
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Cast Details: Top 5 with Profile Photos */}
                <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Foto Profil & Metadata Top 5 Pemeran Utama (TMDB)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {formData.castDetails?.length || 0}/5 Pemeran Ditautkan
                    </span>
                  </div>

                  {formData.castDetails && formData.castDetails.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {formData.castDetails.map((castMember, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center text-center relative group hover:border-cyan-500/40 transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                castDetails: prev.castDetails.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="absolute -top-1.5 -right-1.5 w-7 h-7 md:w-5 md:h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md"
                            title="Hapus pemeran ini"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <img
                            src={castMember.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                            alt={castMember.name}
                            className="w-14 h-14 rounded-full object-cover border border-cyan-500/30 mb-1.5 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
                            }}
                          />
                          <input
                            type="text"
                            value={castMember.name}
                            onChange={(e) => {
                              const updated = [...formData.castDetails];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setFormData(prev => ({ ...prev, castDetails: updated }));
                            }}
                            placeholder="Nama Aktor"
                            className="w-full bg-slate-950/60 border border-slate-800 text-[11px] font-bold text-white text-center rounded px-1 py-0.5 focus:outline-none focus:border-cyan-400"
                          />
                          <input
                            type="text"
                            value={castMember.character || ''}
                            onChange={(e) => {
                              const updated = [...formData.castDetails];
                              updated[idx] = { ...updated[idx], character: e.target.value };
                              setFormData(prev => ({ ...prev, castDetails: updated }));
                            }}
                            placeholder="Sebagai / Peran"
                            className="w-full bg-transparent text-[10px] text-slate-400 text-center border-none p-0 focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded mt-1"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-3 text-center">
                      <p className="text-[11px] text-slate-500">
                        Belum ada foto profil aktor. Impor metadata melalui TMDB di atas atau foto default akan digunakan saat publikasi.
                      </p>
                    </div>
                  )}
                </div>

                {/* Genres (comma-separated) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Genre Film (Pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={formData.genres}
                    onChange={e => setFormData({ ...formData, genres: e.target.value })}
                    placeholder="Biography, Drama, History"
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Skor Sotoy */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Skor Sotoy Awal (1.0 - 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formData.skorSotoy}
                    onChange={e => setFormData({ ...formData, skorSotoy: parseFloat(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Auto-Tagging & Tags Management */}
                <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tagar Film & Auto-Tagging Rekomendasi</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {formData.tags?.length || 0} tag aktif
                    </span>
                  </div>

                  {/* Active tags chips */}
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] p-2 bg-slate-900 border border-slate-750 rounded-xl">
                    {formData.tags && formData.tags.length > 0 ? (
                      formData.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-semibold"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                tags: prev.tags.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="hover:text-white transition-colors ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">
                        Belum ada tagar dipilih. Klik saran tag di bawah atau buat tag sendiri.
                      </span>
                    )}
                  </div>

                  {/* Suggested tags chips based on genres, title, and TMDB import */}
                  {formData.suggestedTags && formData.suggestedTags.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Saran Tag Otomatis (Klik untuk menambah atau menghapus):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {formData.suggestedTags.map((stag, idx) => {
                          const isSelected = formData.tags?.includes(stag);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setFormData(prev => {
                                  const currentTags = prev.tags || [];
                                  if (currentTags.includes(stag)) {
                                    return { ...prev, tags: currentTags.filter(t => t !== stag) };
                                  } else {
                                    return { ...prev, tags: [...currentTags, stag] };
                                  }
                                });
                              }}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                              }`}
                            >
                              <span>{isSelected ? '✓' : '+'}</span>
                              <span>{stag}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add Custom Tag input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={e => setCustomTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customTagInput.trim().toLowerCase().replace(/^#/, '');
                          if (val && !formData.tags?.includes(val)) {
                            setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), val] }));
                            setCustomTagInput('');
                          }
                        }
                      }}
                      placeholder="Ketik tag custom (cth: 90s cinema, thriller, oscar-winner) lalu tekan Enter..."
                      className="flex-1 bg-slate-900 border border-slate-750 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customTagInput.trim().toLowerCase().replace(/^#/, '');
                        if (val && !formData.tags?.includes(val)) {
                          setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), val] }));
                          setCustomTagInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>

                {/* Trailer URL */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tautan Trailer YouTube (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.trailerUrl}
                    onChange={e => setFormData({ ...formData, trailerUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Koleksi TMDB (Read-Only when present) */}
                {formData.collectionName && (
                  <div className="sm:col-span-2 space-y-1 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#FF2E7E]" />
                        <span>Koleksi / Franchise TMDB (Otomatis)</span>
                      </span>
                      {formData.collectionId && (
                        <span className="text-[10px] font-mono text-slate-500">ID #{formData.collectionId}</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white pt-0.5">{formData.collectionName}</p>
                  </div>
                )}

                {/* Film Terkait Picker */}
                <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-[#FF2E7E]" />
                      <span>Film Terkait (Franchise / Sekuel / Semesta Sinematik)</span>
                    </label>
                    <span className={`text-[10px] font-semibold ${formData.relatedFilmIds.length >= 12 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {formData.relatedFilmIds.length} / 12 film dipilih
                    </span>
                  </div>

                  {/* Selected Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] p-2 bg-slate-900 border border-slate-750 rounded-xl">
                    {formData.relatedFilmIds && formData.relatedFilmIds.length > 0 ? (
                      formData.relatedFilmIds.map(relId => {
                        const relFilm = films.find(f => f.id === relId);
                        const relTitle = relFilm ? `${relFilm.title} (${relFilm.year || 'N/A'})` : relId;
                        return (
                          <span
                            key={relId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF2E7E]/15 text-[#FF2E7E] border border-[#FF2E7E]/30 text-xs font-semibold"
                          >
                            <span className="truncate max-w-[200px]">{relTitle}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRelatedFilm(relId)}
                              className="hover:text-white transition-colors"
                              title="Hapus film terkait"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-500 italic">
                        Belum ada film terkait dipilih. Cari judul film dari katalog di bawah untuk menambahkan.
                      </span>
                    )}
                  </div>

                  {/* Search Input for Related Films */}
                  {formData.relatedFilmIds.length < 12 && (
                    <div className="relative pt-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={relatedSearchQuery}
                        onChange={e => setRelatedSearchQuery(e.target.value)}
                        placeholder="Cari judul film di katalog Sotoy untuk dihubungkan..."
                        className="w-full bg-slate-900 border border-slate-750 focus:border-[#FF2E7E] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                      />

                      {/* Dropdown Results */}
                      {relatedSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                          {relatedSearchResults.map(f => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => handleAddRelatedFilm(f.id)}
                              className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between text-xs text-white border-b border-slate-800 last:border-b-0 transition-colors"
                            >
                              <div className="flex items-center gap-2 truncate">
                                {f.poster && (
                                  <img src={f.poster} alt={f.title} className="w-5 h-7 object-cover rounded shrink-0 bg-slate-950" />
                                )}
                                <div className="truncate">
                                  <span className="font-bold">{f.title}</span>
                                  <span className="text-slate-400 ml-1.5 font-normal">({f.year || 'N/A'})</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-[#FF2E7E] font-bold shrink-0 ml-2">+ Hubungkan</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Synopsis */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Sinopsis Lengkap Film
                  </label>
                  <textarea
                    rows={4}
                    value={formData.synopsis}
                    onChange={e => setFormData({ ...formData, synopsis: e.target.value })}
                    placeholder="Tuliskan sinopsis film secara mendalam..."
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00F0FF] resize-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="admin-publish-film-btn"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    console.log('[AdminCatalogManager] "Terbitkan Film" button clicked via onClick!', {
                      buttonId: 'admin-publish-film-btn',
                      isSubmitting,
                      title: formData.title,
                      timestamp: new Date().toISOString(),
                    });
                    // Explicit trigger in case form.onSubmit does not bubble or is intercepted
                    handleSaveFilm(e);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{editingFilmId ? 'Menyimpan Perubahan...' : 'Menerbitkan Film ke Database...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{editingFilmId ? 'Simpan Perubahan' : 'Terbitkan Film ke Database'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import TMDB Modal */}
      <AdminBatchTmdbModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onAddFilm={addFilm}
        showToast={showToast}
      />

      {/* Sync Metadata TMDB Modal */}
      <AdminTmdbSyncModal
        isOpen={isTmdbSyncModalOpen}
        onClose={() => setIsTmdbSyncModalOpen(false)}
      />

      {/* Delete Confirmation Modal (In-App, non-blocking for iframes) */}
      {filmToDelete && (
        <div
          id="delete-film-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !isDeletingFilm && setFilmToDelete(null)}
        >
          <div
            id="delete-film-modal-card"
            className="bg-[#171717] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-7 h-7 stroke-[2]" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-black text-lg text-white">
                Hapus Film dari Database?
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Apakah Anda yakin ingin menghapus film{' '}
                <strong className="text-white font-bold">"{filmToDelete.title}"</strong>{' '}
                ({filmToDelete.year})? Tindakan ini akan menghapus data film secara permanen dari Firestore.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                id="cancel-delete-film-btn"
                onClick={() => setFilmToDelete(null)}
                disabled={isDeletingFilm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="confirm-delete-film-btn"
                onClick={confirmDelete}
                disabled={isDeletingFilm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isDeletingFilm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Ya, Hapus Film</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !isBulkOperating && setShowBulkDeleteModal(false)}
        >
          <div
            className="bg-[#171717] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-7 h-7 stroke-[2]" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-black text-lg text-white">
                Hapus {selectedFilmIds.length} Film Massal?
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                Apakah Anda yakin ingin menghapus <strong className="text-red-400 font-bold">{selectedFilmIds.length} judul film</strong> sekaligus? Tindakan ini akan menghapus dokumen film dari Firestore secara permanen.
              </p>
            </div>

            {/* List preview */}
            <div className="max-h-36 overflow-y-auto bg-black/30 border border-white/10 rounded-xl p-3 text-left divide-y divide-white/[0.06] custom-scrollbar">
              {selectedFilmIds.map(id => {
                const item = films.find(f => f.id === id);
                return (
                  <div key={id} className="py-1.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200 truncate max-w-[240px]">
                      {item?.title || id}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item?.year || ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkOperating}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={isBulkOperating}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isBulkOperating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menghapus {selectedFilmIds.length} Film...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Ya, Hapus {selectedFilmIds.length} Judul</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK FORMAT CHANGE MODAL */}
      {showBulkFormatModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !isBulkOperating && setShowBulkFormatModal(false)}
        >
          <div
            className="bg-[#171717] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5 text-white font-display font-bold text-base">
                <Tv className="w-5 h-5 text-[#FF2E7E]" />
                <span>Ubah Format {selectedFilmIds.length} Film</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkFormatModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Pilih format tayangan baru untuk <strong className="text-white">{selectedFilmIds.length} film</strong> yang dipilih:
            </p>

            <div className="grid grid-cols-3 gap-3">
              {(['movie', 'series', 'animation'] as const).map(fmt => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setBulkTargetFormat(fmt)}
                  className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                    bulkTargetFormat === fmt
                      ? 'bg-[#FF2E7E] border-[#FF2E7E] text-white shadow-sm font-semibold'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.05] font-medium'
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider">{fmt}</div>
                  <div className="text-[10px] text-slate-400 mt-1 capitalize font-normal">
                    {fmt === 'movie' ? 'Layar Lebar' : fmt === 'series' ? 'Serial TV' : 'Animation'}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkFormatModal(false)}
                disabled={isBulkOperating}
                className="py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleBulkFormatChange(bulkTargetFormat)}
                disabled={isBulkOperating}
                className="py-2.5 px-5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isBulkOperating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menerapkan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Terapkan Format ({bulkTargetFormat.toUpperCase()})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK ADD TAGS MODAL */}
      {showBulkTagModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !isBulkOperating && setShowBulkTagModal(false)}
        >
          <div
            className="bg-[#171717] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5 text-white font-display font-bold text-base">
                <Tag className="w-5 h-5 text-[#FF2E7E]" />
                <span>Tambah Tag Massal</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkTagModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Tambahkan label/tag ke <strong className="text-white">{selectedFilmIds.length} judul film</strong> yang dipilih sekaligus. Tag akan digabungkan dengan tag yang sudah ada.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
                  Tag Cepat
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {bulkSuggestedTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = bulkTagInput ? bulkTagInput.split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (!current.includes(tag)) {
                          setBulkTagInput([...current, tag].join(', '));
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Input Tag (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={bulkTagInput}
                  onChange={e => setBulkTagInput(e.target.value)}
                  placeholder="trending, must-watch, plot-twist..."
                  className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF2E7E] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkTagModal(false)}
                disabled={isBulkOperating}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkAddTags}
                disabled={isBulkOperating}
                className="py-2.5 px-5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white font-black text-xs transition-all shadow-lg shadow-[#FF2E7E]/20 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isBulkOperating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menerapkan Tag...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Tambahkan Tag</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY TMDB DUPLICATES REPORT MODAL */}
      {showDuplicatesModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowDuplicatesModal(false)}
        >
          <div
            className="bg-[#171717] border border-amber-500/30 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-amber-950/30 via-[#171717] to-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <CopyCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-display font-black text-base flex items-center gap-2">
                    <span>Laporan Duplikat TMDB</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                      Read-Only
                    </span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Daftar film di katalog yang berbagi nilai TMDB ID dan format media yang sama.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicatesModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {duplicateGroups.length === 0 ? (
                <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-white font-bold text-sm">Tidak Ditemukan Duplikat TMDB</h4>
                  <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                    Semua film yang memiliki TMDB ID di katalog Anda sudah unik berdasarkan kombinasi (mediaType, tmdbId).
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 leading-relaxed">
                      <p className="font-bold">
                        Ditemukan {duplicateGroups.length} grup entri dengan TMDB ID kembar.
                      </p>
                      <p className="text-slate-300 text-[11px]">
                        Laporan ini bersifat <em>read-only</em> dan tidak mengubah atau menghapus data secara otomatis. Gunakan tombol &ldquo;Edit Film&rdquo; untuk memeriksa atau memperbaiki film bersangkutan.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {duplicateGroups.map((group) => (
                      <div
                        key={`${group.mediaType}-${group.tmdbId}`}
                        className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-800 text-cyan-300 border border-slate-700 uppercase">
                              {group.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                            </span>
                            <span className="font-mono font-bold text-xs text-amber-300">
                              TMDB ID #{group.tmdbId}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {group.films.length} entri kembar
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {group.films.map((film) => (
                            <div
                              key={film.id}
                              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=120&q=80'}
                                  alt={film.title}
                                  className="w-9 h-13 rounded-lg object-cover ring-1 ring-slate-800 shrink-0"
                                />
                                <div className="min-w-0">
                                  <h5 className="font-bold text-white text-xs truncate">
                                    {film.title}
                                  </h5>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                    <span>Tahun: {film.year || '-'}</span>
                                    <span>•</span>
                                    <span>Format: {film.type}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                                    Doc ID: {film.id}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setShowDuplicatesModal(false);
                                  handleOpenEditModal(film);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                                title={`Edit form untuk film ${film.title}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-slate-900/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowDuplicatesModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup Laporan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
