import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Film, 
  Tv, 
  Flame,
  Star,
  TrendingUp,
  Radio,
  Play,
  Square,
  CopyCheck,
  RotateCcw,
  ListFilter,
  Check,
  Info
} from 'lucide-react';
import { fetchTmdbDetails, mapTmdbDetailsToFilm, fetchTmdbList, MappedTmdbFilm } from '../../utils/tmdbHelper';
import { FilmItem } from '../../types';
import { useApp } from '../../context/AppContext';

interface AdminBatchTmdbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFilm: (film: Omit<FilmItem, 'id'>) => Promise<boolean>;
  showToast: (msg: string) => void;
}

interface BatchItemProgress {
  id: string;
  type: 'movie' | 'tv';
  status: 'pending' | 'fetching' | 'success' | 'skipped' | 'error';
  title?: string;
  year?: number;
  poster?: string;
  genres?: string;
  tags?: string[];
  note?: string;
  error?: string;
}

type CuratedListType = 'popular' | 'top_rated' | 'trending' | 'now_playing';

const SAMPLE_MOVIES = '872585, 693134, 155, 157336, 496243'; // Oppenheimer, Dune 2, Dark Knight, Interstellar, Parasite
const SAMPLE_SERIES = '1396, 66732, 1399, 126308'; // Breaking Bad, Stranger Things, GOT, Shogun
const SAMPLE_INDONESIAN = '391713, 85350, 480373'; // The Raid 2, The Raid, Pengabdi Setan

export const AdminBatchTmdbModal: React.FC<AdminBatchTmdbModalProps> = ({
  isOpen,
  onClose,
  onAddFilm,
  showToast
}) => {
  const { films } = useApp();

  const [activeTab, setActiveTab] = useState<'curated' | 'manual'>('curated');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [listSource, setListSource] = useState<CuratedListType>('popular');
  const [pageCount, setPageCount] = useState<number>(1);
  const [rawInput, setRawInput] = useState('');
  
  const [isRunning, setIsRunning] = useState(false);
  const [isFetchingList, setIsFetchingList] = useState(false);
  const [items, setItems] = useState<BatchItemProgress[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const stopRequestedRef = useRef(false);

  if (!isOpen) return null;

  // Extract valid numerical IDs from raw text
  const parseIds = (text: string): string[] => {
    const matches = text.match(/\d+/g) || [];
    return Array.from(new Set(matches));
  };

  const parsedIds = parseIds(rawInput);

  // Duplicate check helper: matched by tmdbId against local state and current session
  const isFilmDuplicate = (tmdbIdNum: number, sessionProcessed: Set<number>): { isDup: boolean; matchedFilm?: FilmItem } => {
    if (sessionProcessed.has(tmdbIdNum)) {
      return { isDup: true };
    }
    const match = (films || []).find(f => 
      (f.tmdbId && Number(f.tmdbId) === tmdbIdNum) ||
      f.id === `film-tmdb-${tmdbIdNum}` ||
      f.id === `tmdb-${tmdbIdNum}`
    );
    if (match) {
      return { isDup: true, matchedFilm: match };
    }
    return { isDup: false };
  };

  // Shared Core Pipeline for both Curated and Manual ID modes
  const runImportPipeline = async (
    targetItems: Array<{ id: string; type: 'movie' | 'tv'; preloadedTitle?: string; preloadedPoster?: string }>
  ) => {
    setIsRunning(true);
    stopRequestedRef.current = false;
    setCompletedCount(0);
    setSuccessCount(0);
    setSkippedCount(0);
    setErrorCount(0);

    const initialProgress: BatchItemProgress[] = targetItems.map(item => ({
      id: item.id,
      type: item.type,
      status: 'pending',
      title: item.preloadedTitle,
      poster: item.preloadedPoster,
    }));
    setItems(initialProgress);

    let curSuccess = 0;
    let curSkipped = 0;
    let curError = 0;
    let curDone = 0;
    const sessionProcessed = new Set<number>();

    for (let i = 0; i < targetItems.length; i++) {
      if (stopRequestedRef.current) {
        break;
      }

      const { id: tmdbIdStr, type: itemType } = targetItems[i];
      const tmdbIdNum = Number(tmdbIdStr);

      // 1. Check Duplicate against loaded catalog
      const dupCheck = isFilmDuplicate(tmdbIdNum, sessionProcessed);
      if (dupCheck.isDup) {
        curSkipped++;
        setSkippedCount(curSkipped);
        curDone++;
        setCompletedCount(curDone);
        setItems(prev => prev.map((item, idx) => idx === i ? {
          ...item,
          status: 'skipped',
          title: dupCheck.matchedFilm?.title || item.title || `TMDB ID #${tmdbIdStr}`,
          poster: dupCheck.matchedFilm?.poster || item.poster,
          year: dupCheck.matchedFilm?.year || item.year,
          note: 'Sudah ada di katalog (matched by tmdbId)'
        } : item));
        continue;
      }

      // Mark current item as fetching
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'fetching' } : item));

      try {
        // 2. Fetch full details from TMDB proxy
        const details = await fetchTmdbDetails(tmdbIdStr, itemType);

        if (stopRequestedRef.current) break;

        // 3. Map details to Sotoy Film structure
        const mapped: MappedTmdbFilm = mapTmdbDetailsToFilm(details, itemType);

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
          crewDetails: mapped.crewDetails,
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
          tmdbId: mapped.tmdbId || tmdbIdNum || undefined,
        };

        const success = await onAddFilm(newFilmData);

        if (success !== false) {
          curSuccess++;
          setSuccessCount(curSuccess);
          sessionProcessed.add(tmdbIdNum);
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
          curError++;
          setErrorCount(curError);
          setItems(prev => prev.map((item, idx) => idx === i ? {
            ...item,
            status: 'error',
            title: mapped.title,
            error: 'Gagal menulis ke database Firestore.'
          } : item));
        }
      } catch (err: any) {
        curError++;
        setErrorCount(curError);
        setItems(prev => prev.map((item, idx) => idx === i ? {
          ...item,
          status: 'error',
          error: err?.message || 'Gagal memproses ID TMDB ini.'
        } : item));
      }

      curDone++;
      setCompletedCount(curDone);

      // Safe pacing delay (200ms) between items to protect API and database limits
      if (i < targetItems.length - 1 && !stopRequestedRef.current) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setIsRunning(false);
    setIsFetchingList(false);

    if (stopRequestedRef.current) {
      showToast(`Batch import dihentikan: ${curSuccess} berhasil diimpor, ${curSkipped} dilewati, ${curError} gagal.`);
    } else {
      showToast(`Batch import selesai: ${curSuccess} berhasil diimpor, ${curSkipped} dilewati karena sudah ada di katalog (matched by tmdbId)${curError > 0 ? `, ${curError} gagal` : ''}.`);
    }
  };

  // Start Curated List Import
  const handleStartCuratedBatch = async () => {
    setIsRunning(true);
    setIsFetchingList(true);
    stopRequestedRef.current = false;
    setItems([]);
    setCompletedCount(0);
    setSuccessCount(0);
    setSkippedCount(0);
    setErrorCount(0);

    try {
      const collectedItems: Array<{ id: string; type: 'movie' | 'tv'; preloadedTitle?: string; preloadedPoster?: string }> = [];
      const seenIds = new Set<string>();

      for (let p = 1; p <= pageCount; p++) {
        if (stopRequestedRef.current) break;
        const listResults = await fetchTmdbList(listSource, mediaType, p);
        for (const resItem of listResults) {
          const idStr = String(resItem.id);
          if (!seenIds.has(idStr)) {
            seenIds.add(idStr);
            collectedItems.push({
              id: idStr,
              type: mediaType,
              preloadedTitle: resItem.title || resItem.name,
              preloadedPoster: resItem.poster_path ? `https://image.tmdb.org/t/p/w185${resItem.poster_path}` : undefined,
            });
          }
        }
        if (p < pageCount && !stopRequestedRef.current) {
          await new Promise(r => setTimeout(r, 150));
        }
      }

      setIsFetchingList(false);

      if (collectedItems.length === 0) {
        setIsRunning(false);
        showToast('Tidak ada judul yang ditemukan dari TMDB untuk daftar ini.');
        return;
      }

      await runImportPipeline(collectedItems);
    } catch (err: any) {
      setIsRunning(false);
      setIsFetchingList(false);
      showToast(`Gagal mengambil daftar dari TMDB: ${err?.message || 'Error jaringan/API'}`);
    }
  };

  // Start Manual ID-Paste Import
  const handleStartManualBatch = async () => {
    if (parsedIds.length === 0) {
      showToast('Masukkan minimal satu ID TMDB yang valid.');
      return;
    }

    const collectedItems = parsedIds.map(id => ({
      id,
      type: mediaType,
    }));

    await runImportPipeline(collectedItems);
  };

  // Stop button handler
  const handleStop = () => {
    stopRequestedRef.current = true;
  };

  const handleReset = () => {
    setRawInput('');
    setItems([]);
    setCompletedCount(0);
    setSuccessCount(0);
    setSkippedCount(0);
    setErrorCount(0);
  };

  const listOptions = [
    {
      id: 'popular' as CuratedListType,
      label: 'Populer',
      desc: 'Judul paling populer dan banyak dicari saat ini',
      icon: Flame,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'top_rated' as CuratedListType,
      label: 'Rating Tertinggi',
      desc: 'Mahakarya dengan skor ulasan tertinggi sepanjang masa',
      icon: Star,
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    },
    {
      id: 'trending' as CuratedListType,
      label: 'Trending Minggu Ini',
      desc: 'Karya yang mengalami lonjakan ketertarikan pekan ini',
      icon: TrendingUp,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 'now_playing' as CuratedListType,
      label: mediaType === 'tv' ? 'Tayang On The Air' : 'Sedang Tayang di Bioskop',
      desc: mediaType === 'tv' ? 'Serial yang sedang aktif tayang di saluran TV/stream' : 'Film yang sedang tayang di bioskop saat ini',
      icon: Radio,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
  ];

  const estimatedTitles = pageCount * 20;

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
                Impor banyak film/serial sekaligus dari kurasi daftar resmi TMDB atau daftar ID kustom.
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
          
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => !isRunning && setActiveTab('curated')}
              disabled={isRunning}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'curated'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Dari Daftar Kurasi TMDB</span>
            </button>
            <button
              type="button"
              onClick={() => !isRunning && setActiveTab('manual')}
              disabled={isRunning}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'manual'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CopyCheck className="w-4 h-4" />
              <span>Input ID Manual (Paste)</span>
            </button>
          </div>

          {/* Format Selection (Movie vs TV) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-slate-300 block">Format Media TMDB:</span>
              <span className="text-[11px] text-slate-400">Pilih jenis entri yang ingin diimpor</span>
            </div>
            <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs shrink-0">
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

          {/* TAB 1: CURATED LIST SOURCE MODE */}
          {activeTab === 'curated' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Pilih Sumber Daftar TMDB:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {listOptions.map(opt => {
                    const Icon = opt.icon;
                    const isSelected = listSource === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setListSource(opt.id)}
                        disabled={isRunning}
                        className={`text-left p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-400 shadow-sm shadow-cyan-500/10'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className={`p-2 rounded-xl border shrink-0 ${opt.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                              {opt.label}
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Page Count Selector */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-200 block">
                      Jumlah Halaman yang Ditarik:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      1 halaman TMDB memuat 20 judul.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={pageCount}
                      onChange={e => setPageCount(Number(e.target.value))}
                      disabled={isRunning}
                      className="bg-slate-950 border border-slate-750 text-white font-mono font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 transition-colors"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>
                          {n} Halaman (≈ {n * 20} judul)
                        </option>
                      ))}
                    </select>
                    <span className="px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold shrink-0">
                      ≈ {estimatedTitles} judul
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Catatan Rate-Limit:</strong> Rekomendasi 1–3 halaman (20–60 judul) per run agar pemrosesan berjalan stabil dan tidak membebani kuota API TMDB maupun database.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL ID PASTE MODE */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
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
                    🎬 Film Box Office (Oppenheimer, Dune 2, Dark Knight...)
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
                    📺 TV Series (Breaking Bad, Stranger Things, Shogun...)
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
              </div>
            </div>
          )}

          {/* Progress / Status Section if active or completed */}
          {(items.length > 0 || isFetchingList) && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="font-bold text-white">
                    {isFetchingList 
                      ? 'Mengambil Daftar Judul dari TMDB...' 
                      : isRunning 
                        ? 'Sedang Memproses Batch Import...' 
                        : 'Proses Batch Selesai'}
                  </span>
                </div>
                <span className="font-mono text-slate-400">
                  {completedCount} / {items.length} Diproses
                </span>
              </div>

              {/* Running Summary Pills */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono pt-0.5">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{successCount} Berhasil Diimpor</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-bold">
                  <CopyCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{skippedCount} Dilewati (Duplikat)</span>
                </span>
                {errorCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/30 flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>{errorCount} Gagal</span>
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${(completedCount / Math.max(1, items.length)) * 100}%` }}
                />
              </div>

              {/* Final Explicit Duplicates Summary Notice */}
              {!isRunning && items.length > 0 && skippedCount > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <CopyCheck className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>Laporan Duplikasi:</strong> {skippedCount} film dilewati karena sudah ada di katalog ({skippedCount} films skipped because they already exist, matched by tmdbId).
                  </span>
                </div>
              )}

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
                        <div className="w-8 h-11 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 shrink-0 font-mono">
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
                        {item.note && (
                          <span className="text-[10px] text-amber-400 block mt-0.5 font-medium">
                            {item.note}
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
                      {item.status === 'skipped' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                          <CopyCheck className="w-3 h-3" />
                          <span>Dilewati</span>
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
            disabled={isRunning || (items.length === 0 && rawInput === '')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2.5">
            {isRunning ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-red-950/40"
              >
                <Square className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                <span>Hentikan (Stop)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-all"
              >
                {completedCount > 0 ? 'Selesai & Tutup' : 'Batal'}
              </button>
            )}

            {!isRunning && activeTab === 'curated' && (
              <button
                type="button"
                id="start-curated-tmdb-import-btn"
                onClick={handleStartCuratedBatch}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Mulai Import Dari TMDB (≈ {estimatedTitles} Judul)</span>
              </button>
            )}

            {!isRunning && activeTab === 'manual' && (
              <button
                type="button"
                id="start-manual-tmdb-import-btn"
                onClick={handleStartManualBatch}
                disabled={parsedIds.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Mulai Import {parsedIds.length > 0 ? `(${parsedIds.length} Film)` : ''}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
