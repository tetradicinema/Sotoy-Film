import React, { useState } from 'react';
import { X, Star, Send, Sparkles, CheckCircle2, Lock, LogIn, Share2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FilmItem } from '../../types';
import { DEFAULT_AVATAR, DEFAULT_POSTER, DEFAULT_COVER } from '../../data/mockData';

interface RateFilmModalProps {
  film: FilmItem;
  isOpen: boolean;
  onClose: () => void;
}

export const RateFilmModal: React.FC<RateFilmModalProps> = ({ film, isOpen, onClose }) => {
  const { currentUser, isLoggedIn, setLoginModalOpen, addFilmRating, openShareModal } = useApp();

  const [score, setScore] = useState<number>(8.5);
  const [headline, setHeadline] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      return;
    }

    const hasReview = reviewText.trim().length > 0;
    const defaultHeadline = hasReview
      ? `Ulasan ${film.title} dari ${currentUser.name}`
      : `${currentUser.name} memberi skor ${score.toFixed(1)}/10.0 untuk ${film.title}`;
    const finalHeadline = headline.trim() || defaultHeadline;

    addFilmRating(
      film.id,
      score,
      finalHeadline,
      reviewText.trim()
    );

    setSubmitted(true);
  };

  const handleShareReview = () => {
    const hasReview = reviewText.trim().length > 0;

    onClose();
    setSubmitted(false);
    openShareModal({
      title: `Rating ${film.title} - ${score.toFixed(1)}/10.0 oleh ${currentUser.name}`,
      text: hasReview ? reviewText.trim() : film.synopsis || '',
      headline: headline.trim() || undefined,
      url: window.location.href,
      type: 'film',
      image: film.poster,
      filmTitle: film.title,
      filmYear: film.year,
      filmPoster: film.poster,
      filmBackdrop: film.backdrop,
      filmGenres: film.genres,
      rating: score,
      reviewerName: currentUser.name,
      reviewerAvatar: currentUser.avatar,
      reviewerRole: currentUser.roleTitle,
      meta: `${film.title} (${film.year}) • Skor: ${score.toFixed(1)}/10.0`,
    });
  };

  return (
    <div
      id="rate-film-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="rate-film-modal-container"
        className="bg-[#171717] border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
      >
        {/* Header with film backdrop */}
        <div className="relative h-28 w-full overflow-hidden bg-slate-900">
          <img
            src={film.backdrop?.trim() || film.poster?.trim() || DEFAULT_COVER}
            alt={film.title}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-black/60" />

          <button
            id="close-rate-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3 left-5 right-5 flex items-center gap-3">
            <img
              src={film.poster?.trim() || DEFAULT_POSTER}
              alt={film.title}
              className="w-12 h-16 object-cover rounded-lg border-2 border-white/20 shadow-lg -mb-2"
            />
            <div>
              <span className="text-[10px] font-black text-[#FF2E7E] uppercase tracking-wider">
                Beri Penilaian & Review
              </span>
              <h3 className="font-display font-black text-white text-base leading-tight line-clamp-1">
                {film.title}
              </h3>
            </div>
          </div>
        </div>

        {!isLoggedIn ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center mx-auto border border-[#FF2E7E]/30">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="font-display font-black text-xl text-white">
              Masuk untuk Memberikan Skor & Ulasan
            </h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
              Anda harus Masuk (Log In) ke akun Sotoy Film terlebih dahulu untuk memberikan Skor Sotoy dan mempublikasikan ulasan film ini.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                id="login-from-rate-modal-btn"
                onClick={() => {
                  onClose();
                  setLoginModalOpen(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#FF2E7E] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-sm hover:brightness-110 active:scale-95 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Sekarang</span>
              </button>
            </div>
          </div>
        ) : submitted ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-[#10B981] mx-auto animate-bounce" />
            <div>
              <h3 className="font-display font-black text-xl text-white">
                Skor Sotoy Berhasil Terkirim!
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                {reviewText.trim().length > 0
                  ? 'Terima kasih atas kontribusi ulasanmu untuk komunitas Sotoy Film.'
                  : 'Skor Sotoy kamu berhasil tercatat!'}
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <img
                  src={film.poster?.trim() || DEFAULT_POSTER}
                  alt={film.title}
                  className="w-10 h-14 object-cover rounded-lg border border-slate-700"
                />
                <div>
                  <h4 className="font-display font-black text-sm text-white line-clamp-1">{film.title}</h4>
                  <p className="text-[11px] text-slate-400">Skor Kamu: <span className="text-[#FFD000] font-bold">★ {score.toFixed(1)} / 10.0</span></p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                id="rate-modal-share-now-btn"
                onClick={handleShareReview}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FF2E7E] via-[#e0266e] to-[#FF2E7E] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sm hover:brightness-110 active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4 text-slate-950" />
                <span>{reviewText.trim().length > 0 ? 'Bagikan Review ke Sosmed' : 'Bagikan Skor ke Sosmed'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="py-3 px-5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {/* Skor Sotoy 10-Point Decimal Controller */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Berapa Skor Sotoy Menurut Kamu? (Skala 1.0 - 10.0)
              </span>

              {/* Big Score Display */}
              <div className="flex items-center justify-center gap-2 my-2">
                <span className="font-display font-black text-4xl text-[#FFD000] drop-shadow-[0_0_12px_rgba(255,208,0,0.4)]">
                  {score.toFixed(1)}
                </span>
                <span className="text-slate-500 font-medium text-lg">/ 10.0</span>
              </div>

              {/* Star Visualizer (10 Stars) */}
              <div className="flex items-center justify-center gap-1 mb-3 flex-wrap">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const fill = Math.max(0, Math.min(1, score - idx));
                  return (
                    <div
                      key={idx}
                      onClick={() => setScore(idx + 1)}
                      className="cursor-pointer relative transform hover:scale-125 transition-transform p-0.5"
                      title={`Beri skor ${idx + 1}.0`}
                    >
                      <Star className="w-5 h-5 text-slate-700 fill-slate-800" />
                      {fill > 0 && (
                        <div
                          className="absolute inset-0.5 overflow-hidden"
                          style={{ width: `${fill * 100}%` }}
                        >
                          <Star className="w-5 h-5 text-[#FFD000] fill-[#FFD000]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Decimal Slider */}
              <div className="space-y-1">
                <input
                  id="skor-sotoy-slider"
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.1"
                  value={score}
                  onChange={e => setScore(parseFloat(e.target.value))}
                  className="w-full accent-[#FF2E7E] cursor-pointer"
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

            {/* Review Headline */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Judul Ulasan / Ringkasan Satu Kalimat
              </label>
              <input
                type="text"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="Contoh: Visualnya gila, tapi pacing paruh kedua agak kedodoran..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
              />
            </div>

            {/* Review Body */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tulis Ulasan Singkat <span className="text-slate-500 font-normal">(opsional)</span>
              </label>
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Tulis ulasan singkat (opsional)..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1 italic leading-tight">
                Kasih bintang aja juga boleh — tapi nulis ulasan bikin skor kontribusimu di Leaderboard lebih tinggi.
              </p>
            </div>

            {/* Role Note */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <img
                  src={currentUser.avatar?.trim() || DEFAULT_AVATAR}
                  alt={currentUser.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span>Mengulas sebagai: <strong>{currentUser.name}</strong></span>
              </div>
              <span className="text-[#FF2E7E] font-black uppercase text-[10px]">
                {currentUser.roleTitle.split(' ')[0]}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                id="submit-rate-film-btn"
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF2E7E] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-sm hover:brightness-110 active:scale-95 transition-transform"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Skor Sotoy</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
