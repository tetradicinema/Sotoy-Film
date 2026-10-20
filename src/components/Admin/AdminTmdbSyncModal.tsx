import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  RefreshCw,
  Square,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Database,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FilmItem } from '../../types';
import {
  computeFilmSyncUpdate,
  TmdbSyncData,
} from '../../utils/tmdbSync';

interface AdminTmdbSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PreviewRow {
  film: FilmItem;
  updates: Partial<FilmItem>;
  changes: string[];
}

interface ApplyResult {
  updated: number;
  failed: number;
  errors: string[];
}

const LAST_SYNC_KEY = 'lastTmdbSyncAt';
const CONCURRENCY = 4;

const hasTmdbId = (film: FilmItem): boolean => {
  const numericId = Number(film.tmdbId);
  return Boolean(film.tmdbId) && Number.isFinite(numericId) && numericId > 0;
};

const tmdbMediaType = (film: FilmItem): 'movie' | 'tv' => {
  if (film.type === 'series') return 'tv';
  if (film.type === 'animation' && /episode/i.test(film.duration || '')) return 'tv';
  return 'movie';
};

const errorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const formatLastSync = (value: string | null): string => {
  if (!value) return 'Belum pernah';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum pernah';
  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const AdminTmdbSyncModal: React.FC<AdminTmdbSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { films, updateFilm, showToast } = useApp();

  const [step, setStep] = useState<'preview' | 'apply'>('preview');
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanTotal, setScanTotal] = useState(0);
  const [scanDone, setScanDone] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [noTmdbTitles, setNoTmdbTitles] = useState<string[]>([]);

  const [isApplying, setIsApplying] = useState(false);
  const [applyTotal, setApplyTotal] = useState(0);
  const [applyDone, setApplyDone] = useState(0);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const stopRequestedRef = useRef(false);
  const scanSessionRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    scanSessionRef.current += 1;
    stopRequestedRef.current = true;

    setStep('preview');
    setIsScanning(false);
    setHasScanned(false);
    setScanTotal(0);
    setScanDone(0);
    setScanned(0);
    setPreviewRows([]);
    setErrors([]);
    setNoTmdbTitles([]);
    setIsApplying(false);
    setApplyTotal(0);
    setApplyDone(0);
    setApplyResult(null);
    setLastSyncAt(localStorage.getItem(LAST_SYNC_KEY));
  }, [isOpen]);

  const handleScan = async () => {
    if (isScanning || isApplying) return;

    const session = scanSessionRef.current + 1;
    scanSessionRef.current = session;
    stopRequestedRef.current = false;
    setIsScanning(true);
    setHasScanned(false);
    setStep('preview');
    setPreviewRows([]);
    setErrors([]);
    setApplyResult(null);
    setApplyDone(0);
    setApplyTotal(0);
    setScanDone(0);

    const withTmdb = (films || []).filter(hasTmdbId);
    const withoutTmdb = (films || []).filter(film => !hasTmdbId(film));

    setNoTmdbTitles(withoutTmdb.map(film => film.title));
    setScanTotal(withTmdb.length);

    const scanErrors: string[] = [];
    let nowPlayingIds: number[] = [];

    try {
      const response = await fetch('/api/tmdb?action=now_playing_ids');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `TMDB error ${response.status}`);
      }
      nowPlayingIds = Array.isArray(data?.ids)
        ? data.ids.map(Number).filter((id: number) => Number.isFinite(id))
        : [];
    } catch (error) {
      scanErrors.push(`now_playing_ids: ${errorMessage(error, 'Gagal mengambil data now playing.')}`);
    }

    if (scanSessionRef.current !== session) return;

    const queue = [...withTmdb];
    const foundRows: PreviewRow[] = [];
    const now = new Date();
    let completed = 0;

    const worker = async () => {
      while (
        queue.length > 0 &&
        !stopRequestedRef.current &&
        scanSessionRef.current === session
      ) {
        const film = queue.shift();
        if (!film) break;

        try {
          const type = tmdbMediaType(film);
          const response = await fetch(
            `/api/tmdb?action=sync&type=${type}&id=${encodeURIComponent(String(film.tmdbId))}`
          );
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.error || `TMDB error ${response.status}`);
          }
          if (scanSessionRef.current !== session || stopRequestedRef.current) return;

          const computed = computeFilmSyncUpdate({
            film,
            sync: data as TmdbSyncData,
            nowPlayingIds,
            now,
          });

          if (computed) {
            foundRows.push({ film, ...computed });
          }
        } catch (error) {
          scanErrors.push(`${film.title}: ${errorMessage(error, 'Gagal sinkron dari TMDB.')}`);
        } finally {
          if (scanSessionRef.current === session) {
            completed++;
            setScanDone(completed);
          }
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (scanSessionRef.current !== session) return;

    foundRows.sort((a, b) => a.film.title.localeCompare(b.film.title));
    setPreviewRows(foundRows);
    setErrors(scanErrors);
    setScanned(completed);
    setIsScanning(false);
    setHasScanned(true);

    if (stopRequestedRef.current) {
      showToast(
        `Pratinjau dihentikan: ${foundRows.length} film terdeteksi akan berubah.`,
        'info'
      );
    } else {
      showToast(
        `Pratinjau selesai: ${foundRows.length} film akan berubah.`,
        scanErrors.length > 0 ? 'info' : 'success'
      );
    }
  };

  const handleApply = async () => {
    if (isApplying || previewRows.length === 0) return;

    setIsApplying(true);
    setApplyTotal(previewRows.length);
    setApplyDone(0);
    setApplyResult(null);

    const queue = [...previewRows];
    const applyErrors: string[] = [];
    let updated = 0;
    let failed = 0;
    let completed = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const row = queue.shift();
        if (!row) break;

        try {
          const success = await updateFilm(row.film.id, row.updates);
          if (success) {
            updated++;
          } else {
            failed++;
            applyErrors.push(`${row.film.title}: gagal menulis ke Firestore.`);
          }
        } catch (error) {
          failed++;
          applyErrors.push(`${row.film.title}: ${errorMessage(error, 'Gagal memperbarui film.')}`);
        } finally {
          completed++;
          setApplyDone(completed);
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const finishedAt = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, finishedAt);
    setLastSyncAt(finishedAt);
    setApplyResult({ updated, failed, errors: applyErrors });
    setIsApplying(false);

    showToast(
      `Sinkron TMDB selesai: ${updated} film diperbarui${failed > 0 ? `, ${failed} gagal` : ''}.`,
      failed > 0 ? 'info' : 'success'
    );
  };

  const handleClose = () => {
    scanSessionRef.current += 1;
    stopRequestedRef.current = true;
    onClose();
  };

  if (!isOpen) return null;

  const scanPercent = scanTotal > 0 ? Math.round((scanDone / scanTotal) * 100) : 0;
  const applyPercent = applyTotal > 0 ? Math.round((applyDone / applyTotal) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#171717] border border-slate-800 w-full max-w-4xl rounded-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-slate-800">
          <div className="min-w-0">
            <h3 className="font-display font-black text-lg sm:text-xl text-white tracking-tight flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#FF2E7E]" />
              Sinkron TMDB
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Perbarui tanggal rilis dan platform tonton untuk film yang punya TMDB ID.
            </p>
            <p className="text-slate-500 text-[11px] mt-1.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Terakhir sinkron: {formatLastSync(lastSyncAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup Sinkron TMDB"
            className="shrink-0 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                if (!isScanning && !isApplying) setStep('preview');
              }}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                step === 'preview'
                  ? 'bg-[#FF2E7E] text-slate-950 border-[#FF2E7E]'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              1. Pratinjau
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isScanning && !isApplying && previewRows.length > 0) setStep('apply');
              }}
              disabled={previewRows.length === 0 || isScanning}
              className={`px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                step === 'apply'
                  ? 'bg-[#FF2E7E] text-slate-950 border-[#FF2E7E]'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              2. Terapkan
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Dipindai
              </div>
              <div className="text-lg font-black text-white mt-1">
                {isScanning ? scanDone : scanned}
                {scanTotal > 0 && <span className="text-slate-500 text-xs"> / {scanTotal}</span>}
              </div>
            </div>
            <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Akan berubah
              </div>
              <div className="text-lg font-black text-[#FF2E7E] mt-1">{previewRows.length}</div>
            </div>
            <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Tanpa TMDB ID
              </div>
              <div className="text-lg font-black text-white mt-1">{noTmdbTitles.length}</div>
            </div>
            <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                TMDB errors
              </div>
              <div className={`text-lg font-black mt-1 ${errors.length > 0 ? 'text-rose-400' : 'text-white'}`}>
                {errors.length}
              </div>
            </div>
          </div>

          {/* Scan progress */}
          {(isScanning || (hasScanned && scanTotal > 0)) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{isScanning ? 'Memindai film...' : 'Pemindaian selesai'}</span>
                <span className="font-mono">
                  {scanDone}/{scanTotal} ({scanPercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF2E7E] rounded-full transition-all duration-300"
                  style={{ width: `${scanPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Apply progress / result */}
          {(isApplying || applyResult) && (
            <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{isApplying ? 'Menerapkan perubahan...' : 'Penerapan selesai'}</span>
                <span className="font-mono">
                  {applyDone}/{applyTotal} ({applyPercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF2E7E] rounded-full transition-all duration-300"
                  style={{ width: `${applyPercent}%` }}
                />
              </div>
              {applyResult && (
                <div className="flex items-center gap-4 text-xs pt-1">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {applyResult.updated} diperbarui
                  </span>
                  <span className={`inline-flex items-center gap-1.5 font-bold ${applyResult.failed > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {applyResult.failed} gagal
                  </span>
                </div>
              )}
              {applyResult && applyResult.errors.length > 0 && (
                <ul className="space-y-1 text-[11px] text-rose-200/80 max-h-32 overflow-y-auto pt-1">
                  {applyResult.errors.map((message, index) => (
                    <li key={`${message}-${index}`}>• {message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <details className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
              <summary className="cursor-pointer text-xs font-bold text-rose-300">
                TMDB errors ({errors.length})
              </summary>
              <ul className="mt-2 space-y-1 text-[11px] text-rose-200/80 max-h-40 overflow-y-auto">
                {errors.map((message, index) => (
                  <li key={`${message}-${index}`}>• {message}</li>
                ))}
              </ul>
            </details>
          )}

          {/* Films without TMDB ID */}
          {noTmdbTitles.length > 0 && (
            <details className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-3">
              <summary className="cursor-pointer text-xs font-bold text-slate-300">
                Film tanpa TMDB ID ({noTmdbTitles.length})
              </summary>
              <ul className="mt-2 space-y-1 text-[11px] text-slate-400 max-h-40 overflow-y-auto">
                {noTmdbTitles.map((title, index) => (
                  <li key={`${title}-${index}`}>{title}</li>
                ))}
              </ul>
            </details>
          )}

          {/* Preview table */}
          {step === 'preview' && (
            <div>
              {previewRows.length === 0 ? (
                <div className="border border-slate-800 rounded-xl p-8 text-center bg-[#0A0A0A]">
                  <Database className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs">
                    {hasScanned
                      ? 'Tidak ada film yang perlu diubah dari hasil pemindaian ini.'
                      : 'Jalankan pratinjau untuk melihat film yang akan diubah.'}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-[#0A0A0A] border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2.5 text-slate-400 font-bold">Film</th>
                          <th className="px-3 py-2.5 text-slate-400 font-bold">Perubahan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {previewRows.map(row => (
                          <tr key={row.film.id} className="align-top">
                            <td className="px-3 py-2.5">
                              <div className="text-white font-semibold">{row.film.title}</div>
                              <div className="text-slate-500 text-[10px]">
                                {row.film.year} • TMDB #{row.film.tmdbId}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <ul className="space-y-0.5 text-[11px] text-slate-300">
                                {row.changes.length > 0 ? (
                                  row.changes.map((change, index) => (
                                    <li key={`${row.film.id}-${change}-${index}`}>{change}</li>
                                  ))
                                ) : (
                                  <li className="text-slate-500">Perubahan metadata</li>
                                )}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Apply confirmation */}
          {step === 'apply' && !applyResult && (
            <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold text-white">
                Terapkan {previewRows.length} perubahan ke Firestore?
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hanya field <span className="font-mono text-slate-300">idReleaseDate</span>,{' '}
                <span className="font-mono text-slate-300">releaseDate</span> (jika kosong), dan{' '}
                <span className="font-mono text-slate-300">whereToWatch</span> yang akan ditulis.
                Film tanpa TMDB ID tidak disentuh.
              </p>
              <p className="text-[11px] text-slate-500">
                Tidak ada data yang ditulis sebelum tombol Terapkan Sekarang ditekan.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            Data platform streaming oleh JustWatch via TMDB.
          </div>

          <div className="flex items-center gap-2">
            {isScanning ? (
              <button
                type="button"
                onClick={() => {
                  stopRequestedRef.current = true;
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                Batalkan
              </button>
            ) : step === 'preview' ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={isApplying}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 hover:text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {hasScanned ? 'Pindai Ulang' : 'Mulai Pratinjau'}
                </button>
                {previewRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep('apply')}
                    className="px-4 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-slate-950 text-xs font-black transition-colors"
                  >
                    Lanjut ke Terapkan
                  </button>
                )}
              </>
            ) : applyResult ? (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-slate-950 text-xs font-black transition-colors"
              >
                Tutup
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('preview')}
                  disabled={isApplying}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={isApplying || previewRows.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-slate-950 text-xs font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {isApplying ? `Menerapkan ${applyDone}/${applyTotal}` : 'Terapkan Sekarang'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
