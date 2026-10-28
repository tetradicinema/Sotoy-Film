import React, { useEffect, useState } from 'react';
import { ImageIcon, Loader2, User, X } from 'lucide-react';
import type { TmdbEpisode, TmdbEpisodeImage } from '../../utils/tmdbSeasonsTrim';
import {
  fetchTmdbEpisodeImages,
  tmdbEpisodeStillFullUrl,
  tmdbEpisodeStillUrl,
  tmdbProfileThumbUrl,
} from '../../utils/tmdbHelper';

interface EpisodeDetailPanelProps {
  id: string;
  tmdbId: string;
  seasonNumber: number;
  episode: TmdbEpisode;
}

const uniqueNames = (names: string[]): string[] =>
  Array.from(new Set(names.map(name => name.trim()).filter(Boolean)));

const IMAGE_STATUS = {
  loading: 'loading',
  ready: 'ready',
  empty: 'empty',
} as const;

type ImageStatus = (typeof IMAGE_STATUS)[keyof typeof IMAGE_STATUS];

export const EpisodeDetailPanel: React.FC<EpisodeDetailPanelProps> = ({
  id,
  tmdbId,
  seasonNumber,
  episode,
}) => {
  const [imageStatus, setImageStatus] = useState<ImageStatus>(IMAGE_STATUS.loading);
  const [images, setImages] = useState<TmdbEpisodeImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<TmdbEpisodeImage | null>(null);

  const directors = uniqueNames(
    episode.crew.filter(member => member.job === 'Director').map(member => member.name)
  );
  const writers = uniqueNames(
    episode.crew.filter(member => member.job !== 'Director').map(member => member.name)
  );
  const guestStars = episode.guestStars.slice(0, 8);

  useEffect(() => {
    let isMounted = true;
    setImageStatus(IMAGE_STATUS.loading);

    fetchTmdbEpisodeImages(tmdbId, seasonNumber, episode.episodeNumber).then(result => {
      if (!isMounted) return;
      const stills = result?.stills || [];
      setImages(stills);
      setImageStatus(stills.length > 0 ? IMAGE_STATUS.ready : IMAGE_STATUS.empty);
    });

    return () => {
      isMounted = false;
    };
  }, [tmdbId, seasonNumber, episode.episodeNumber]);

  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedImage(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage]);

  return (
    <div
      id={id}
      className="mt-2 bg-[#141414] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-labelledby={`${id}-crew`}>
          <h3
            id={`${id}-crew`}
            className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2"
          >
            Crew
          </h3>
          {directors.length === 0 && writers.length === 0 ? (
            <p className="text-[11px] text-slate-500">Belum ada data kru.</p>
          ) : (
            <div className="space-y-1.5 text-[11px] sm:text-xs">
              {directors.length > 0 && (
                <p className="text-slate-400">
                  <span className="text-slate-500">Directed by: </span>
                  <span className="text-slate-200">{directors.join(', ')}</span>
                </p>
              )}
              {writers.length > 0 && (
                <p className="text-slate-400">
                  <span className="text-slate-500">Written by: </span>
                  <span className="text-slate-200">{writers.join(', ')}</span>
                </p>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby={`${id}-guest-stars`}>
          <h3
            id={`${id}-guest-stars`}
            className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2"
          >
            Guest Stars
          </h3>
          {guestStars.length === 0 ? (
            <p className="text-[11px] text-slate-500">Belum ada data bintang tamu.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {guestStars.map((star, index) => (
                <div
                  key={`${star.name}-${star.character}-${index}`}
                  className="flex items-center gap-2 min-w-0"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center">
                    {star.profilePath ? (
                      <img
                        src={tmdbProfileThumbUrl(star.profilePath)}
                        alt={star.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-200 truncate">
                      {star.name || 'Tanpa Nama'}
                    </p>
                    {star.character && (
                      <p className="text-[10px] text-slate-500 truncate">{star.character}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby={`${id}-images`}>
        <h3
          id={`${id}-images`}
          className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"
        >
          <ImageIcon className="w-3 h-3" />
          Episode Images
        </h3>

        {imageStatus === IMAGE_STATUS.loading ? (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Memuat gambar episode...
          </div>
        ) : imageStatus === IMAGE_STATUS.empty || images.length === 0 ? (
          <p className="text-[11px] text-slate-500 py-1">Belum ada gambar untuk episode ini.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {images.map((image, index) => (
              <button
                key={`${image.filePath}-${index}`}
                type="button"
                onClick={() => setSelectedImage(image)}
                className="w-40 shrink-0 aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-800 hover:border-[#FF2E7E]/60 transition-colors"
                aria-label={`Buka gambar episode ${index + 1}`}
              >
                <img
                  src={tmdbEpisodeStillUrl(image.filePath)}
                  alt={`Gambar E${episode.episodeNumber} ${episode.name || ''}`.trim()}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Gambar episode"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="Tutup gambar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={tmdbEpisodeStillFullUrl(selectedImage.filePath)}
            alt={`Gambar E${episode.episodeNumber} ${episode.name || ''}`.trim()}
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={event => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default EpisodeDetailPanel;
