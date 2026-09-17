import React, { useState, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FilmItem } from '../../types';

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
  genres: string; // Comma-separated in form
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
  genres: 'Action, Drama',
  skorSotoy: 4.0,
  trailerUrl: '',
  featuredRecommendation: false,
};

export const AdminCatalogManager: React.FC = () => {
  const { films, addFilm, updateFilm, deleteFilm, navigateTo, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series' | 'anime'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFilmId, setEditingFilmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FilmFormData>(DEFAULT_FORM);

  // Filtered films
  const filteredFilms = useMemo(() => {
    return films.filter(film => {
      if (typeFilter !== 'all' && film.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = film.title.toLowerCase().includes(q);
        const matchDirector = film.director?.toLowerCase().includes(q);
        const matchGenre = film.genres?.some(g => g.toLowerCase().includes(q));
        if (!matchTitle && !matchDirector && !matchGenre) return false;
      }
      return true;
    });
  }, [films, typeFilter, searchQuery]);

  // Open modal for new film
  const handleOpenAddModal = () => {
    setEditingFilmId(null);
    setFormData(DEFAULT_FORM);
    setIsModalOpen(true);
  };

  // Open modal for editing existing film
  const handleOpenEditModal = (film: FilmItem) => {
    setEditingFilmId(film.id);
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
      genres: (film.genres || []).join(', '),
      skorSotoy: film.skorSotoy || 4.0,
      trailerUrl: film.trailerUrl || '',
      featuredRecommendation: !!film.featuredRecommendation,
    });
    setIsModalOpen(true);
  };

  // Save (Add or Update)
  const handleSaveFilm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast('Judul film wajib diisi!');
      return;
    }

    const castArray = formData.cast
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    const genresArray = formData.genres
      .split(',')
      .map(g => g.trim())
      .filter(Boolean);

    const posterUrl = formData.poster.trim() || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
    const backdropUrl = formData.backdrop.trim() || 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80';

    if (editingFilmId) {
      // Update existing
      await updateFilm(editingFilmId, {
        title: formData.title.trim(),
        originalTitle: formData.originalTitle.trim() || undefined,
        type: formData.type,
        year: Number(formData.year) || 2024,
        duration: formData.duration.trim() || undefined,
        poster: posterUrl,
        backdrop: backdropUrl,
        synopsis: formData.synopsis.trim(),
        director: formData.director.trim(),
        writer: formData.writer.trim() || undefined,
        studio: formData.studio.trim() || undefined,
        cast: castArray,
        genres: genresArray,
        skorSotoy: Number(formData.skorSotoy) || 4.0,
        trailerUrl: formData.trailerUrl.trim() || undefined,
        featuredRecommendation: formData.featuredRecommendation,
      });
    } else {
      // Create new
      await addFilm({
        title: formData.title.trim(),
        originalTitle: formData.originalTitle.trim() || undefined,
        type: formData.type,
        year: Number(formData.year) || 2024,
        duration: formData.duration.trim() || undefined,
        poster: posterUrl,
        backdrop: backdropUrl,
        synopsis: formData.synopsis.trim(),
        director: formData.director.trim(),
        writer: formData.writer.trim() || undefined,
        studio: formData.studio.trim() || undefined,
        cast: castArray,
        genres: genresArray,
        skorSotoy: Number(formData.skorSotoy) || 4.0,
        totalVotes: 1,
        criticsSkorSotoy: Number(formData.skorSotoy) || 4.0,
        whereToWatch: [
          { platform: 'Bioskop / Cinema', type: 'cinema', badgeColor: '#E50914' }
        ],
        trailerUrl: formData.trailerUrl.trim() || undefined,
        featuredRecommendation: formData.featuredRecommendation,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (film: FilmItem) => {
    if (window.confirm(`Yakin ingin menghapus film "${film.title}" dari database secara permanen?`)) {
      await deleteFilm(film.id);
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

        {/* Add Movie Button */}
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Tambah Film Baru</span>
        </button>
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
                          onClick={() => handleDelete(film)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
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

            {/* Form */}
            <form onSubmit={handleSaveFilm} className="space-y-4">
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    URL Poster Film
                  </label>
                  <input
                    type="url"
                    value={formData.poster}
                    onChange={e => setFormData({ ...formData, poster: e.target.value })}
                    placeholder="https://images.unsplash.com/... atau tautan gambar poster"
                    className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Backdrop URL */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    URL Backdrop / Header Gambar Lebar
                  </label>
                  <input
                    type="url"
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

                {/* Studio */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Studio / Rumah Produksi
                  </label>
                  <input
                    type="text"
                    value={formData.studio}
                    onChange={e => setFormData({ ...formData, studio: e.target.value })}
                    placeholder="Contoh: Universal Pictures, Warner Bros"
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

                {/* Trailer URL */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tautan Trailer YouTube (Opsional)
                  </label>
                  <input
                    type="url"
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
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingFilmId ? 'Simpan Perubahan' : 'Terbitkan Film ke Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
