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
  Image as ImageIcon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FilmItem, CastMember } from '../../types';
import { AdminBatchTmdbModal } from './AdminBatchTmdbModal';
import { 
  formatDuration, 
  generateSuggestedTags, 
  mapTmdbDetailsToFilm,
  fetchTmdbDetails
} from '../../utils/tmdbHelper';

interface FilmFormData {
  title: string;
  originalTitle: string;
  type: 'movie' | 'series' | 'anime';
  year: number;
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
  skorSotoy: number;
  trailerUrl: string;
  featuredRecommendation: boolean;
}

const DEFAULT_FORM: FilmFormData = {
  title: '',
  originalTitle: '',
  type: 'movie',
  year: new Date().getFullYear(),
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
  skorSotoy: 4.0,
  trailerUrl: '',
  featuredRecommendation: false,
};

export const AdminCatalogManager: React.FC = () => {
  const { films, addFilm, updateFilm, deleteFilm, navigateTo, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series' | 'anime'>('all');

  // Delete Confirmation State
  const [filmToDelete, setFilmToDelete] = useState<FilmItem | null>(null);
  const [isDeletingFilm, setIsDeletingFilm] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFilmId, setEditingFilmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FilmFormData>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

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
    setIsTmdbImporting(true);
    setTmdbError(null);
    try {
      const details = await fetchTmdbDetails(result.id, tmdbType);
      const mapped = mapTmdbDetailsToFilm(details, tmdbType);

      setFormData(prev => ({
        ...prev,
        title: mapped.title,
        originalTitle: mapped.originalTitle,
        type: mapped.type,
        year: mapped.year,
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
        duration: mapped.duration || prev.duration,
        trailerUrl: mapped.trailerUrl || prev.trailerUrl,
        skorSotoy: mapped.skorSotoy || prev.skorSotoy,
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
      if (typeFilter !== 'all' && film.type !== typeFilter) return false;
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

  // Open modal for new film
  const handleOpenAddModal = (focusTmdb = false) => {
    setEditingFilmId(null);
    setFormData(DEFAULT_FORM);
    setTmdbQuery('');
    setTmdbResults([]);
    setTmdbError(null);
    setImportedTmdbTitle(null);
    setShowTmdbSection(true);
    setIsSubmitting(false);
    setCustomTagInput('');
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
      type: film.type || 'movie',
      year: film.year || 2024,
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
      skorSotoy: film.skorSotoy || 4.0,
      trailerUrl: film.trailerUrl || '',
      featuredRecommendation: !!film.featuredRecommendation,
    });
    setTmdbQuery('');
    setTmdbResults([]);
    setTmdbError(null);
    setImportedTmdbTitle(null);
    setShowTmdbSection(false);
    setIsSubmitting(false);
    setCustomTagInput('');
    setIsModalOpen(true);
  };

  // Save (Add or Update)
  const handleSaveFilm = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    console.log('[AdminCatalogManager] === [EVENT CAPTURED] handleSaveFilm triggered ===', {
      eventType: e?.type,
      editingFilmId,
      isSubmitting,
      timestamp: new Date().toISOString(),
    });

    console.log('[AdminCatalogManager] Raw formData state before validation:', {
      title: formData.title,
      type: formData.type,
      year: formData.year,
      duration: formData.duration,
      genres: formData.genres,
      cast: formData.cast,
      poster: formData.poster,
      backdrop: formData.backdrop,
      director: formData.director,
      tags: formData.tags,
      skorSotoy: formData.skorSotoy,
    });

    // Guard: Prevent double-submission
    if (isSubmitting) {
      console.warn('[AdminCatalogManager] Submission BLOCKED: isSubmitting is currently true');
      return;
    }

    // Step 1: Validate Title
    console.log('[AdminCatalogManager] [Validation Step 1] Checking title:', {
      value: formData.title,
      trimmed: formData.title?.trim(),
      isEmpty: !formData.title || !formData.title.trim(),
    });

    if (!formData.title || !formData.title.trim()) {
      console.warn('[AdminCatalogManager] Validation BLOCKED: Judul film is empty or contains only whitespace!');
      showToast('Judul film wajib diisi!');
      return;
    }
    console.log('[AdminCatalogManager] Title validated successfully:', formData.title.trim());

    // Step 2: Validate & Parse Year
    const parsedYear = Number(formData.year) || 2024;
    console.log('[AdminCatalogManager] [Validation Step 2] Parsed year:', { raw: formData.year, parsed: parsedYear });

    // Step 3: Validate & Parse Genres
    const genresArray = formData.genres
      ? formData.genres.split(',').map(g => g.trim()).filter(Boolean)
      : [];
    console.log('[AdminCatalogManager] [Validation Step 3] Parsed genres:', genresArray);

    // Step 4: Validate & Parse Cast
    const castArray = formData.cast
      ? formData.cast.split(',').map(c => c.trim()).filter(Boolean)
      : [];
    console.log('[AdminCatalogManager] [Validation Step 4] Parsed cast array (count):', castArray.length);

    setIsSubmitting(true);
    console.log('[AdminCatalogManager] isSubmitting state set to true, proceeding with payload construction...');

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

      const filmPayload = {
        title: formData.title.trim(),
        originalTitle: formData.originalTitle.trim() || undefined,
        type: formData.type,
        year: parsedYear,
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
        skorSotoy: Number(formData.skorSotoy) || 4.0,
        totalVotes: 1,
        criticsSkorSotoy: Number(formData.skorSotoy) || 4.0,
        whereToWatch: [
          { platform: 'Bioskop / Cinema', type: 'cinema' as const, badgeColor: '#E50914' }
        ],
        trailerUrl: trailerUrl || undefined,
        featuredRecommendation: formData.featuredRecommendation,
      };

      console.log('[AdminCatalogManager] Validation ALL PASSED! Prepared filmPayload:', filmPayload);

      let success = false;
      if (editingFilmId) {
        console.log('[AdminCatalogManager] Invoking updateFilm for film ID:', editingFilmId);
        success = await updateFilm(editingFilmId, filmPayload);
      } else {
        console.log('[AdminCatalogManager] Invoking addFilm with new film payload...');
        success = await addFilm(filmPayload);
      }

      console.log('[AdminCatalogManager] Result from AppContext (addFilm/updateFilm):', { success });

      if (success !== false) {
        console.log('[AdminCatalogManager] Operation reported success, closing modal.');
        setIsModalOpen(false);
      } else {
        console.warn('[AdminCatalogManager] Operation returned false from Firestore, but local catalog was updated. Closing modal.');
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error('[AdminCatalogManager] [CRITICAL ERROR] in handleSaveFilm:', err);
      showToast('Gagal memproses film: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      console.log('[AdminCatalogManager] Resetting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleDelete = (film: FilmItem) => {
    console.log('[AdminCatalogManager] Initiating in-app delete modal for film:', {
      id: film.id,
      title: film.title,
    });
    setFilmToDelete(film);
  };

  const confirmDelete = async () => {
    if (!filmToDelete) return;
    console.log('[AdminCatalogManager] Confirming deletion for film:', {
      id: filmToDelete.id,
      title: filmToDelete.title,
    });
    setIsDeletingFilm(true);
    try {
      const res = await deleteFilm(filmToDelete.id);
      console.log('[AdminCatalogManager] deleteFilm returned:', res);
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
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[#FFD000] border border-amber-500/30 font-sans font-bold">
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
            className="px-3.5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            title="Import banyak film sekaligus dengan daftar ID TMDB"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Import Massal TMDB</span>
          </button>

          <button
            onClick={() => handleOpenAddModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            title="Cari dan impor metadata film/serial secara otomatis dari TMDB"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Import dari TMDB</span>
          </button>

          <button
            onClick={() => handleOpenAddModal(false)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Tambah Film Manual</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121324] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Format Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium pb-1 sm:pb-0 scrollbar-none">
            {(['all', 'movie', 'series', 'anime'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setTypeFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors whitespace-nowrap ${
                  typeFilter === tab
                    ? 'bg-amber-500/20 text-[#FFD000] font-bold border border-amber-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab === 'all' ? 'Semua Format' : tab}
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
              className="w-full bg-slate-900 border border-slate-750 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>

        {/* Film Catalog Grid/List */}
        <div className="overflow-x-auto rounded-xl border border-slate-850">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#17182b] text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 min-w-[260px]">Judul Film & Poster</th>
                <th className="p-3.5 min-w-[90px]">Tipe</th>
                <th className="p-3.5 min-w-[80px]">Tahun</th>
                <th className="p-3.5 min-w-[150px]">Sutradara & Studio</th>
                <th className="p-3.5 min-w-[150px]">Genre</th>
                <th className="p-3.5 min-w-[100px]">Skor Sotoy</th>
                <th className="p-3.5 min-w-[140px] text-right">Aksi Manajemen</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-850/80 bg-[#111220]">
              {filteredFilms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    Tidak ada film yang cocok dengan kueri pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredFilms.map(film => (
                  <tr key={film.id} className="hover:bg-slate-850/40 transition-colors group">
                    {/* Poster and Title */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={film.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=120&q=80'}
                          alt={film.title}
                          className="w-10 h-14 rounded-lg object-cover ring-1 ring-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <span 
                            onClick={() => navigateTo('film-detail', { filmId: film.id })}
                            className="font-bold text-white hover:text-[#FFD000] cursor-pointer transition-colors text-xs block truncate max-w-[200px]"
                          >
                            {film.title}
                          </span>
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        film.type === 'series'
                          ? 'bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/30'
                          : film.type === 'anime'
                          ? 'bg-pink-500/20 text-[#FF2E7E] border border-pink-500/30'
                          : 'bg-amber-500/20 text-[#FFD000] border border-amber-500/30'
                      }`}>
                        {film.type || 'Movie'}
                      </span>
                    </td>

                    {/* Year */}
                    <td className="p-3.5 text-slate-300 font-bold">
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
                          <span key={i} className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Skor Sotoy */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1 text-amber-400 font-black text-xs">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{(film.skorSotoy || 4.0).toFixed(1)}</span>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(film)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-[#FFD000] transition-colors"
                          title="Sunting Metadata Film"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigateTo('film-detail', { filmId: film.id })}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-[#00F0FF] transition-colors"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT METADATA MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#121324] border border-amber-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400 font-display font-bold text-base">
                <Film className="w-5 h-5" />
                <span>{editingFilmId ? 'Sunting Metadata Film' : 'Tambah Film Baru ke Database'}</span>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TMDB Quick Import Section */}
            <div className="bg-gradient-to-br from-[#151930] via-[#111425] to-[#0d0e1a] border border-cyan-500/35 rounded-2xl p-4 space-y-3.5 relative overflow-hidden shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xs sm:text-sm text-cyan-200 flex items-center gap-1.5">
                      <span>Import Cepat dari TMDB</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
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
                      const itemTitle = item.title || item.name;
                      const itemDate = item.release_date || item.first_air_date || '';
                      const itemYear = itemDate ? itemDate.slice(0, 4) : '';
                      const posterUrl = item.poster_path
                        ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
                        : null;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectTmdbResult(item)}
                          className="bg-slate-900/95 hover:bg-slate-800/90 border border-slate-750 hover:border-cyan-500/60 rounded-xl p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {posterUrl ? (
                              <img
                                src={posterUrl}
                                alt={itemTitle}
                                className="w-9 h-13 rounded-lg object-cover ring-1 ring-slate-700 group-hover:ring-cyan-400 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-13 rounded-lg bg-slate-800 border border-slate-750 flex items-center justify-center shrink-0 text-slate-500">
                                <Film className="w-4 h-4" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-xs truncate group-hover:text-cyan-300 transition-colors">
                                  {itemTitle}
                                </h4>
                                {itemYear && (
                                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-slate-800 text-amber-300 rounded border border-slate-750 shrink-0">
                                    {itemYear}
                                  </span>
                                )}
                              </div>

                              {item.overview && (
                                <p className="text-slate-400 text-[10px] line-clamp-1 mt-0.5">
                                  {item.overview}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTmdbResult(item);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 group-hover:shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Pilih & Impor</span>
                          </button>
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="movie">Movie (Film Layar Lebar)</option>
                    <option value="series">Series (Serial Televisi / Web)</option>
                    <option value="anime">Anime (Animasi Jepang)</option>
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Auto-Tagging & Tags Management */}
                <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold"
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
                      className="flex-1 bg-slate-900 border border-slate-750 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
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
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 cursor-pointer"
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

      {/* Delete Confirmation Modal (In-App, non-blocking for iframes) */}
      {filmToDelete && (
        <div
          id="delete-film-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !isDeletingFilm && setFilmToDelete(null)}
        >
          <div
            id="delete-film-modal-card"
            className="bg-[#121324] border border-red-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
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
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="confirm-delete-film-btn"
                onClick={confirmDelete}
                disabled={isDeletingFilm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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
    </div>
  );
};
