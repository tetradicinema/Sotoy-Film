import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Film, 
  Tv, 
  Tag, 
  Users, 
  ArrowRight,
  ExternalLink,
  Play
} from 'lucide-react';
import { fetchTmdbDetails, mapTmdbDetailsToFilm, MappedTmdbFilm } from '../../utils/tmdbHelper';
import { FilmItem } from '../../types';

interface AdminBatchTmdbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFilm: (film: Omit<FilmItem, 'id'>) => Promise<boolean>;
  showToast: (msg: string) => void;
}

interface BatchItemProgress {
  id: string;
  type: 'movie' | 'tv';
  status: 'pending' | 'fetching' | 'success' | 'error';
  title?: string;
  year?: number;
  poster?: string;
  genres?: string;
  tags?: string[];
  error?: string;
}

const SAMPLE_MOVIES = '872585, 693134, 155, 157336, 496243'; // Oppenheimer, Dune 2, Dark Knight, Interstellar, Parasite
const SAMPLE_SERIES = '1396, 66732, 1399, 126308'; // Breaking Bad, Stranger Things, GOT, Shogun
const SAMPLE_INDONESIAN = '391713, 85350, 480373'; // The Raid 2, The Raid, Pengabdi Setan

export const AdminBatchTmdbModal: React.FC<AdminBatchTmdbModalProps> = ({
  isOpen,
  onClose,
  onAddFilm,
  showToast
}) => {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [rawInput, setRawInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [items, setItems] = useState<BatchItemProgress[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  if (!isOpen) return null;

  // Extract valid numerical IDs from string
  const parseIds = (text: string): string[] => {
    // Matches all sequences of digits, deduplicated
    const matches = text.match(/\d+/g) || [];
    return Array.from(new Set(matches));
  };

  const parsedIds = parseIds(rawInput);

  const handleStartBatch = async () => {
    if (parsedIds.length === 0) {
      showToast('Masukkan minimal satu ID TMDB yang valid.');
      return;
    }

    setIsRunning(true);
    setCompletedCount(0);
    setSuccessCount(0);

    const initialItems: BatchItemProgress[] = parsedIds.map(id => ({
      id,
      type: mediaType,
      status: 'pending'
    }));
    setItems(initialItems);

    let currentSuccess = 0;
    let currentDone = 0;

    for (let i = 0; i < parsedIds.length; i++) {
      const tmdbId = parsedIds[i];

      // Mark current item as fetching
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'fetching' } : item));

      try {
        // 1. Fetch details via existing serverless proxy
        const details = await fetchTmdbDetails(tmdbId, mediaType);

        // 2. Map details, including top 5 cast profile photos and auto-tags
        const mapped: MappedTmdbFilm = mapTmdbDetailsToFilm(details, mediaType);

        // 3. Publish to database
        const posterUrl = mapped.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
        const backdropUrl = mapped.backdrop || 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80';

        const castArray = mapped.cast ? mapped.cast.split(',').map(c => c.trim()).filter(Boolean) : [];
        const genresArray = mapped.genres ? mapped.genres.split(',').map(g => g.trim()).filter(Boolean) : [];

        const newFilmData: Omit<FilmItem, 'id'> = {
          title: mapped.title,
          originalTitle: mapped.originalTitle || undefined,
          type: mapped.type,
          year: mapped.year,
          duration: mapped.duration || undefined,
          poster: posterUrl,
          backdrop: backdropUrl,
          synopsis: mapped.synopsis,
          director: mapped.director,
          writer: mapped.writer || undefined,
          studio: mapped.studio || undefined,
          cast: castArray,
          castDetails: mapped.castDetails,
          genres: genresArray,
          tags: mapped.tags,
          skorSotoy: mapped.skorSotoy,
          totalVotes: 1,
          criticsSkorSotoy: mapped.skorSotoy,
          whereToWatch: [
            { platform: 'Bioskop / Cinema', type: 'cinema', badgeColor: '#E50914' }
          ],
          trailerUrl: mapped.trailerUrl || undefined,
          featuredRecommendation: mapped.featuredRecommendation,
        };

        const success = await onAddFilm(newFilmData);

        if (success !== false) {
          currentSuccess++;
          setSuccessCount(currentSuccess);
          setItems(prev => prev.map((item, idx) => idx === i ? {
            ...item,
            status: 'success',
            title: mapped.title,
            year: mapped.year,
            poster: mapped.poster,
            genres: mapped.genres,
            tags: mapped.tags
          } : item));
        } else {
          setItems(prev => prev.map((item, idx) => idx === i ? {
            ...item,
            status: 'error',
            title: mapped.title,
            error: 'Gagal menulis ke database Firestore.'
          } : item));
        }
      } catch (err: any) {
        setItems(prev => prev.map((item, idx) => idx === i ? {
          ...item,
          status: 'error',
          error: err?.message || 'Gagal memproses ID TMDB ini.'
        } : item));
      }

      currentDone++;
      setCompletedCount(currentDone);
    }

    setIsRunning(false);
    showToast(`Batch import selesai: ${currentSuccess} dari ${parsedIds.length} judul berhasil diterbitkan!`);
  };

  const handleReset = () => {
    setRawInput('');
    setItems([]);
    setCompletedCount(0);
    setSuccessCount(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#111322] border border-cyan-500/30 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl shadow-cyan-950/40 my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-gradient-to-r from-[#161a33] via-[#111322] to-[#14122b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-base sm:text-lg text-white">
                  Import Massal TMDB (Batch Import)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase tracking-wider">
                  Bulk TMDB
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Impor banyak film sekaligus hanya dengan memasukkan daftar ID TMDB.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Format Selection and Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-slate-300 block">Format Media TMDB:</span>
              <span className="text-[11px] text-slate-400">Pilih jenis entri yang ingin diimpor secara massal</span>
            </div>
            <div className="flex items-center bg-slate-950 border border-slate-750 p-1 rounded-xl text-xs shrink-0">
              <button
                type="button"
                onClick={() => setMediaType('movie')}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  mediaType === 'movie'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Film (Movie)</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaType('tv')}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  mediaType === 'tv'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Serial (TV)</span>
              </button>
            </div>
          </div>

          {/* Quick Presets / Examples */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Contoh Daftar ID TMDB Populer (Klik untuk mengisi cepat):
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isRunning}
                onClick={() => { setMediaType('movie'); setRawInput(SAMPLE_MOVIES); }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-300 border border-slate-700 transition-colors"
              >
                🎬 Film Box Office (Oppenheimer, Dune 2, Dark Knight, Interstellar, Parasite)
              </button>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => { setMediaType('movie'); setRawInput(SAMPLE_INDONESIAN); }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 border border-slate-700 transition-colors"
              >
                🇮🇩 Film Indonesia (The Raid, Pengabdi Setan)
              </button>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => { setMediaType('tv'); setRawInput(SAMPLE_SERIES); }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-purple-300 border border-slate-700 transition-colors"
              >
                📺 TV Series (Breaking Bad, Stranger Things, Game of Thrones, Shogun)
              </button>
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>Daftar TMDB ID</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Pisahkan dengan koma, spasi, atau baris baru)
                </span>
              </label>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {parsedIds.length} ID terdeteksi
              </span>
            </div>
            <textarea
              rows={4}
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              disabled={isRunning}
              placeholder="Contoh: 872585, 693134, 155, 157336, 496243..."
              className="w-full bg-slate-900 border border-slate-750 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400 transition-all leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                Setiap film akan otomatis dilengkapi foto poster, backdrop, sinopsis, sutradara, foto 5 pemain utama, dan auto-tagar cerdas (seperti 'thriller', '90s cinema', 'oscar-winner').
              </span>
            </p>
          </div>

          {/* Progress / Status Section if active or completed */}
          {items.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="font-bold text-white">
                    {isRunning ? 'Sedang Memproses Batch Import...' : 'Proses Selesai'}
                  </span>
                </div>
                <span className="font-mono text-slate-400">
                  {completedCount} / {items.length} Selesai ({successCount} Berhasil)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${(completedCount / Math.max(1, items.length)) * 100}%` }}
                />
              </div>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto space-y-2 pt-1 pr-1">
                {items.map((item, idx) => (
                  <div
                    key={item.id + idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={item.title || item.id}
                          className="w-8 h-11 object-cover rounded-md shrink-0 border border-slate-800"
                        />
                      ) : (
                        <div className="w-8 h-11 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                          #{item.id}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate max-w-[240px] sm:max-w-md">
                            {item.title || `TMDB ID: ${item.id}`}
                          </span>
                          {item.year && (
                            <span className="text-[10px] text-slate-400">({item.year})</span>
                          )}
                        </div>
                        {item.genres && (
                          <span className="text-[10px] text-slate-400 truncate block">
                            {item.genres}
                          </span>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.slice(0, 3).map((t, i) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.error && (
                          <span className="text-[10px] text-red-400 block mt-0.5">
                            {item.error}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {item.status === 'pending' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                          Menunggu
                        </span>
                      )}
                      {item.status === 'fetching' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 font-mono">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Mengambil...</span>
                        </span>
                      )}
                      {item.status === 'success' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Diterbitkan</span>
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Gagal</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isRunning || parsedIds.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-40"
          >
            Bersihkan Input
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all disabled:opacity-40"
            >
              {completedCount > 0 && !isRunning ? 'Selesai & Tutup' : 'Batal'}
            </button>
            <button
              type="button"
              id="start-batch-tmdb-import-btn"
              onClick={handleStartBatch}
              disabled={isRunning || parsedIds.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Sedang Mengimpor ({completedCount}/{parsedIds.length})...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Mulai Import {parsedIds.length > 0 ? `(${parsedIds.length} Film)` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
