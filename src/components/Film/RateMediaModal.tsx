import React, { useCallback, useEffect, useState } from 'react';
import { X, Star, Send, Loader2 } from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useApp } from '../../context/AppContext';
import { auth, db } from '../../lib/firebase';
import type { FilmItem } from '../../types';
import { DEFAULT_POSTER } from '../../data/mockData';
import { getScoreLabel, type ScoreLabelTone } from '../../utils/scoreLabel';
import {
  buildMediaRatingId,
  type MediaRatingDoc,
} from '../../utils/mediaRatings';

const SCORE_LABEL_STYLES: Record<ScoreLabelTone, string> = {
  pink: 'text-[#FF2E7E] border-[#FF2E7E]/50 bg-[#FF2E7E]/10',
  amber: 'text-amber-400 border-amber-400/50 bg-amber-400/10',
  neutral: 'text-slate-300 border-slate-600/70 bg-slate-700/30',
  slate: 'text-slate-400 border-slate-600/60 bg-slate-800/60',
};

const mapRatingDoc = (id: string, data: any): MediaRatingDoc => ({
  id,
  filmId: typeof data?.filmId === 'string' ? data.filmId : '',
  seasonNumber: Number(data?.seasonNumber),
  episodeNumber:
    data?.episodeNumber === null || data?.episodeNumber === undefined
      ? null
      : Number(data.episodeNumber),
  userId: typeof data?.userId === 'string' ? data.userId : '',
  score: Number(data?.score),
  createdAt: typeof data?.createdAt === 'string' ? data.createdAt : undefined,
  updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : undefined,
});

/**
 * One query for every season-level score of a film. Used by the seasons list
 * and the detail-page "Season Terakhir" card.
 */
export const fetchFilmSeasonRatingDocs = async (
  filmId: string
): Promise<MediaRatingDoc[]> => {
  if (!filmId) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, 'mediaRatings'),
        where('filmId', '==', filmId),
        where('episodeNumber', '==', null)
      )
    );
    return snap.docs.map(item => mapRatingDoc(item.id, item.data()));
  } catch (err) {
    console.warn('[MediaRatings] Failed to load season scores:', err);
    return [];
  }
};

/**
 * One query for every score of a single season: the season itself plus all of
 * its episodes. The page aggregates them client-side.
 */
export const fetchSeasonRatingDocs = async (
  filmId: string,
  seasonNumber: number
): Promise<MediaRatingDoc[]> => {
  if (!filmId || !Number.isInteger(seasonNumber)) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, 'mediaRatings'),
        where('filmId', '==', filmId),
        where('seasonNumber', '==', seasonNumber),
        limit(1000)
      )
    );
    return snap.docs.map(item => mapRatingDoc(item.id, item.data()));
  } catch (err) {
    console.warn('[MediaRatings] Failed to load season ratings:', err);
    return [];
  }
};

export interface SaveMediaRatingInput {
  filmId: string;
  seasonNumber: number;
  episodeNumber: number | null;
  userId: string;
  score: number;
}

/** Creates or updates the caller's score for one season/episode target. */
export const saveMediaRating = async (
  input: SaveMediaRatingInput
): Promise<MediaRatingDoc> => {
  const { filmId, seasonNumber, episodeNumber, userId } = input;
  if (!filmId || !userId) {
    throw new Error('Film atau pengguna tidak ditemukan.');
  }

  const score = Math.min(10, Math.max(1, Number(input.score.toFixed(1))));
  const id = buildMediaRatingId(filmId, seasonNumber, episodeNumber, userId);
  const ref = doc(db, 'mediaRatings', id);
  const now = new Date().toISOString();

  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { score, updatedAt: now });
    return {
      ...mapRatingDoc(id, snap.data()),
      score,
      updatedAt: now,
    };
  }

  const data: MediaRatingDoc = {
    id,
    filmId,
    seasonNumber,
    episodeNumber,
    userId,
    score,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, data);
  return data;
};

/**
 * Mirrors the film-rating gate (`requireVerified` in AppContext): guests are
 * sent to the login modal, unverified emails get the same toast.
 */
export const useMediaRatingGate = (): (() => boolean) => {
  const {
    currentUser,
    isLoggedIn,
    isEmailVerified,
    setLoginModalOpen,
    showToast,
  } = useApp();

  return useCallback((): boolean => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest') {
      setLoginModalOpen(true);
      showToast('Silakan masuk terlebih dahulu.');
      return false;
    }
    if (!isEmailVerified) {
      showToast('Verifikasi email dulu untuk melakukan ini');
      return false;
    }
    return true;
  }, [currentUser?.id, isLoggedIn, isEmailVerified, setLoginModalOpen, showToast]);
};

interface RateMediaModalProps {
  film: FilmItem;
  isOpen: boolean;
  onClose: () => void;
  seasonNumber: number;
  episodeNumber?: number | null;
  episodeTitle?: string;
  initialScore?: number | null;
  onSaved: (score: number) => void;
}

export const RateMediaModal: React.FC<RateMediaModalProps> = ({
  film,
  isOpen,
  onClose,
  seasonNumber,
  episodeNumber = null,
  episodeTitle,
  initialScore,
  onSaved,
}) => {
  const { currentUser, isLoggedIn, setLoginModalOpen, showToast } = useApp();
  const requireAccess = useMediaRatingGate();

  const [score, setScore] = useState<number>(8.5);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const seed = typeof initialScore === 'number' ? initialScore : 8.5;
    setScore(Math.min(10, Math.max(1, Number(seed.toFixed(1)))));
    setError(null);
    setIsSaving(false);
  }, [isOpen, seasonNumber, episodeNumber, initialScore]);

  if (!isOpen) return null;

  const scoreLabel = getScoreLabel(score, 10);
  const seasonText = `Season ${seasonNumber}`;
  const targetText =
    episodeNumber === null
      ? seasonText
      : `${seasonText} · E${episodeNumber}${episodeTitle ? ` ${episodeTitle}` : ''}`;
  const modalTitle = `Beri Skor – ${film.title} · ${targetText}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requireAccess()) return;

    setError(null);
    setIsSaving(true);

    try {
      const userId = auth.currentUser?.uid || currentUser.id;
      await saveMediaRating({
        filmId: film.id,
        seasonNumber,
        episodeNumber,
        userId,
        score,
      });
      onSaved(score);
      onClose();
    } catch (err: any) {
      console.error('[MediaRatings] Failed to save score:', err?.code, err?.message);
      setError(
        err?.code === 'permission-denied'
          ? 'Izin ditolak (permission denied). Pastikan email sudah diverifikasi.'
          : 'Gagal menyimpan skor. Coba lagi sebentar lagi.'
      );
      showToast('Gagal menyimpan Skor Sotoy.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="rate-media-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="rate-media-modal-container"
        className="bg-[#171717] border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
      >
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start gap-3">
          <img
            src={film.poster?.trim() || DEFAULT_POSTER}
            alt={film.title}
            className="w-10 h-14 object-cover rounded-lg border border-slate-700 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black text-[#FF2E7E] uppercase tracking-wider">
              Skor Sotoy
            </span>
            <h3 className="font-display font-black text-white text-sm sm:text-base leading-tight">
              {modalTitle}
            </h3>
          </div>
          <button
            id="close-rate-media-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isLoggedIn ? (
          <div className="p-8 text-center space-y-4">
            <h3 className="font-display font-black text-xl text-white">
              Masuk untuk Memberikan Skor
            </h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
              Anda harus Masuk (Log In) ke akun Sotoy Film terlebih dahulu untuk
              memberikan Skor Sotoy pada season atau episode ini.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                setLoginModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl bg-[#FF2E7E] text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all"
            >
              Masuk Sekarang
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Berapa Skor Sotoy Menurut Kamu? (Skala 1.0 - 10.0)
              </span>

              <div className="flex items-center justify-center gap-2 my-2">
                <span className="font-display font-black text-4xl text-[#FFD000] drop-shadow-[0_0_12px_rgba(255,208,0,0.4)]">
                  {score.toFixed(1)}
                </span>
                <span className="text-slate-500 font-medium text-lg">/ 10.0</span>
              </div>

              <div className="h-7 flex items-center justify-center -mt-1">
                {scoreLabel && (
                  <span
                    className={`inline-flex items-center h-6 px-3 rounded-full border text-[11px] font-bold uppercase tracking-wider leading-none whitespace-nowrap ${SCORE_LABEL_STYLES[scoreLabel.tone]}`}
                  >
                    {scoreLabel.label}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center gap-1 mb-3 flex-wrap">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const fill = Math.max(0, Math.min(1, score - idx));
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setScore(idx + 1)}
                      className="cursor-pointer relative transform hover:scale-125 transition-transform p-0.5"
                      title={`Beri skor ${idx + 1}.0`}
                      aria-label={`Beri skor ${idx + 1}.0`}
                    >
                      <Star className="w-5 h-5 text-slate-700 fill-slate-800" />
                      {fill > 0 && (
                        <span
                          className="absolute inset-0.5 overflow-hidden pointer-events-none"
                          style={{ width: `${fill * 100}%` }}
                        >
                          <Star className="w-5 h-5 text-[#FFD000] fill-[#FFD000]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                <input
                  id="skor-media-slider"
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.1"
                  value={score}
                  onChange={e => setScore(parseFloat(e.target.value))}
                  className="w-full accent-[#FF2E7E] cursor-pointer"
                  aria-label="Skor Sotoy"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-bold px-1">
                  <span>1.0</span>
                  <span>4.0</span>
                  <span>6.0</span>
                  <span>8.0</span>
                  <span>10.0</span>
                </div>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2"
              >
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                id="submit-rate-media-btn"
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-[#FF2E7E] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-sm hover:brightness-110 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? 'Menyimpan...' : 'Kirim Skor Sotoy'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RateMediaModal;
