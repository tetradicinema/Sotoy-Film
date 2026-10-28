import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clapperboard, Play, X } from 'lucide-react';
import type { FilmItem } from '../../types';
import { tmdbMediaType } from '../../utils/tmdbSync';
import {
  buildMostPopular,
  extractYoutubeKey,
  type TmdbMediaData,
  type TmdbMediaImage,
  type TmdbMediaVideo,
} from '../../utils/tmdbMediaTrim';
import {
  fetchTmdbMedia,
  tmdbBackdropFullUrl,
  tmdbBackdropThumbUrl,
  tmdbPosterFullUrl,
  tmdbPosterThumbUrl,
  tmdbYoutubeEmbedUrl,
  tmdbYoutubeThumbUrl,
} from '../../utils/tmdbHelper';

type TabKey = 'popular' | 'videos' | 'backdrops' | 'posters';
type ImageKind = 'backdrop' | 'poster';

interface GalleryImage {
  id: string;
  kind: ImageKind;
  thumb: string;
  full: string;
  alt: string;
}

type RenderItem =
  | { kind: 'video'; video: TmdbMediaVideo }
  | { kind: 'image'; image: GalleryImage };

type ViewerState =
  | { mode: 'images'; images: GalleryImage[]; index: number }
  | { mode: 'videos'; videos: TmdbMediaVideo[]; index: number }
  | null;

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const normalizeImageKey = (value: string): string => {
  const trimmed = value.trim();
  const match = trimmed.match(/^https?:\/\/image\.tmdb\.org\/t\/p\/[^/]+(.+)$/i);
  return match ? match[1] : trimmed;
};

const localMediaFromFilm = (film: FilmItem): TmdbMediaData => {
  const videos: TmdbMediaVideo[] = [];
  const trailerKey = extractYoutubeKey(film.trailerUrl);
  if (trailerKey) {
    videos.push({
      key: trailerKey,
      name: film.trailerTitle?.trim() || `Trailer ${film.title}`,
      type: 'Trailer',
      official: true,
      publishedAt: '',
      language: '',
    });
  }

  const backdrops: TmdbMediaImage[] = [];
  for (const still of film.stills || []) {
    const url = typeof still === 'string' ? still.trim() : '';
    if (url) {
      backdrops.push({
        filePath: url,
        width: 0,
        height: 0,
        voteAverage: 0,
        voteCount: 0,
        language: '',
      });
    }
  }

  return { videos, backdrops, posters: [] };
};

const mergeFilmMedia = (media: TmdbMediaData, film: FilmItem): TmdbMediaData => {
  const local = localMediaFromFilm(film);
  const seenVideos = new Set(media.videos.map(video => video.key));
  const videos = [
    ...local.videos.filter(video => !seenVideos.has(video.key)),
    ...media.videos,
  ];

  const seenImages = new Set(media.backdrops.map(image => normalizeImageKey(image.filePath)));
  const backdrops = [...media.backdrops];
  for (const still of local.backdrops) {
    const key = normalizeImageKey(still.filePath);
    if (seenImages.has(key)) continue;
    seenImages.add(key);
    backdrops.push(still);
  }

  return { videos, backdrops, posters: media.posters };
};

const toGalleryImage = (
  image: TmdbMediaImage,
  kind: ImageKind,
  filmTitle: string
): GalleryImage => {
  const thumb = isAbsoluteUrl(image.filePath)
    ? image.filePath
    : kind === 'backdrop'
    ? tmdbBackdropThumbUrl(image.filePath)
    : tmdbPosterThumbUrl(image.filePath);
  const full = isAbsoluteUrl(image.filePath)
    ? image.filePath
    : kind === 'backdrop'
    ? tmdbBackdropFullUrl(image.filePath)
    : tmdbPosterFullUrl(image.filePath);

  return {
    id: `${kind}:${normalizeImageKey(image.filePath)}`,
    kind,
    thumb,
    full,
    alt: `${kind === 'backdrop' ? 'Backdrop' : 'Poster'} ${filmTitle}`,
  };
};

const MediaSkeletonRow: React.FC = () => (
  <div className="flex gap-3 overflow-hidden" aria-hidden="true">
    {[0, 1, 2, 3].map(index => (
      <div
        key={index}
        className="w-64 sm:w-72 shrink-0 aspect-video rounded-2xl bg-slate-900 border border-slate-800 animate-pulse"
      />
    ))}
  </div>
);

export const FilmMediaSection: React.FC<{ film: FilmItem }> = ({ film }) => {
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [media, setMedia] = useState<TmdbMediaData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('popular');
  const [viewer, setViewer] = useState<ViewerState>(null);

  const sectionRef = useRef<HTMLElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const stillsKey = (film.stills || []).join('|');

  // Lazy load: only fetch once the section is within 300px of the viewport.
  useEffect(() => {
    if (started) return;
    const node = sectionRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let isMounted = true;
    setStatus('loading');
    setMedia(null);

    const load = async () => {
      if (!film.tmdbId) {
        const local = localMediaFromFilm(film);
        if (!isMounted) return;
        const total = local.videos.length + local.backdrops.length + local.posters.length;
        if (total > 0) {
          setMedia(local);
          setStatus('ready');
        } else {
          setStatus('error');
        }
        return;
      }

      const fetched = await fetchTmdbMedia(film.tmdbId, tmdbMediaType(film));
      if (!isMounted) return;
      if (!fetched) {
        setStatus('error');
        return;
      }

      setMedia(mergeFilmMedia(fetched, film));
      setStatus('ready');
    };

    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, film.tmdbId, film.trailerUrl, film.trailerTitle, film.type, film.duration, stillsKey]);

  const popularItems = useMemo(() => buildMostPopular(media), [media]);
  const videos = media?.videos ?? [];
  const backdrops = media?.backdrops ?? [];
  const posters = media?.posters ?? [];
  const totalItems = videos.length + backdrops.length + posters.length;

  const tabs = useMemo(() => {
    const list: Array<{ key: TabKey; label: string; count: number }> = [
      { key: 'popular', label: 'Paling Populer', count: popularItems.length },
      { key: 'videos', label: `Video (${videos.length})`, count: videos.length },
      { key: 'backdrops', label: `Backdrops (${backdrops.length})`, count: backdrops.length },
      { key: 'posters', label: `Poster (${posters.length})`, count: posters.length },
    ];
    return list.filter(tab => tab.count > 0);
  }, [popularItems.length, videos.length, backdrops.length, posters.length]);

  useEffect(() => {
    if (status !== 'ready') return;
    if (tabs.some(tab => tab.key === activeTab)) return;
    if (tabs.length > 0) setActiveTab(tabs[0].key);
  }, [status, tabs, activeTab]);

  const renderItems = useMemo<RenderItem[]>(() => {
    if (!media) return [];

    if (activeTab === 'popular') {
      return popularItems.map(item =>
        item.kind === 'video'
          ? { kind: 'video' as const, video: item.video }
          : { kind: 'image' as const, image: toGalleryImage(item.image, item.kind, film.title) }
      );
    }

    if (activeTab === 'videos') {
      return media.videos.map(video => ({ kind: 'video' as const, video }));
    }

    if (activeTab === 'backdrops') {
      return media.backdrops.map(image => ({
        kind: 'image' as const,
        image: toGalleryImage(image, 'backdrop', film.title),
      }));
    }

    return media.posters.map(image => ({
      kind: 'image' as const,
      image: toGalleryImage(image, 'poster', film.title),
    }));
  }, [media, popularItems, activeTab, film.title]);

  const tabImages = useMemo(
    () =>
      renderItems
        .filter((item): item is { kind: 'image'; image: GalleryImage } => item.kind === 'image')
        .map(item => item.image),
    [renderItems]
  );

  const tabVideos = useMemo(
    () =>
      renderItems
        .filter((item): item is { kind: 'video'; video: TmdbMediaVideo } => item.kind === 'video')
        .map(item => item.video),
    [renderItems]
  );

  const openImage = (image: GalleryImage) => {
    const index = tabImages.findIndex(candidate => candidate.id === image.id);
    setViewer({ mode: 'images', images: tabImages, index: Math.max(0, index) });
  };

  const openVideo = (video: TmdbMediaVideo) => {
    const index = tabVideos.findIndex(candidate => candidate.key === video.key);
    setViewer({ mode: 'videos', videos: tabVideos, index: Math.max(0, index) });
  };

  const stepViewer = useCallback((delta: number) => {
    setViewer(current => {
      if (!current) return current;
      const length = current.mode === 'images' ? current.images.length : current.videos.length;
      if (length < 2) return current;
      const index = (current.index + delta + length) % length;
      return { ...current, index };
    });
  }, []);

  const closeViewer = () => setViewer(null);

  const isViewerOpen = viewer !== null;

  useEffect(() => {
    if (!isViewerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setViewer(null);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepViewer(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepViewer(1);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isViewerOpen, stepViewer]);

  const scrollRow = (direction: number) => {
    const node = rowRef.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.max(240, node.clientWidth * 0.8),
      behavior: 'smooth',
    });
  };

  const viewerImage =
    viewer && viewer.mode === 'images' ? viewer.images[viewer.index] : null;
  const viewerVideo =
    viewer && viewer.mode === 'videos' ? viewer.videos[viewer.index] : null;
  const canStepImages = Boolean(viewer && viewer.mode === 'images' && viewer.images.length > 1);
  const canStepVideos = Boolean(viewer && viewer.mode === 'videos' && viewer.videos.length > 1);
  const viewerImageCount = viewer && viewer.mode === 'images' ? viewer.images.length : 0;
  const viewerImageIndex = viewer && viewer.mode === 'images' ? viewer.index : 0;

  if (status === 'error' || (status === 'ready' && totalItems === 0)) {
    return null;
  }

  return (
    <section
      id="section-media"
      ref={sectionRef}
      className="bg-[#171717] border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-xl space-y-5"
      aria-labelledby="section-media-heading"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2
            id="section-media-heading"
            className="font-display font-black text-xl sm:text-2xl text-white flex items-center gap-2.5"
          >
            <Clapperboard className="w-5 h-5 text-[#FF2E7E]" />
            <span>Media</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Video, backdrop, dan poster resmi {film.title}
          </p>
        </div>
      </div>

      {status !== 'ready' || !media ? (
        <div className="space-y-3">
          <span className="sr-only">Memuat media...</span>
          <MediaSkeletonRow />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] sm:text-xs font-bold">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
                className={`px-3 py-1.5 rounded-full border shrink-0 transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#FF2E7E] text-white border-[#FF2E7E]'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-[#FF2E7E]/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            {renderItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => scrollRow(-1)}
                  aria-label="Geser media ke kiri"
                  className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/80 border border-slate-700 text-white items-center justify-center hover:bg-[#FF2E7E] hover:border-[#FF2E7E] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRow(1)}
                  aria-label="Geser media ke kanan"
                  className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/80 border border-slate-700 text-white items-center justify-center hover:bg-[#FF2E7E] hover:border-[#FF2E7E] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            <div
              ref={rowRef}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none touch-pan-x"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {renderItems.map(item =>
                item.kind === 'video' ? (
                  <button
                    key={`video-${item.video.key}`}
                    type="button"
                    onClick={() => openVideo(item.video)}
                    aria-label={`Putar video ${item.video.name || item.video.type} ${film.title}`}
                    className="w-64 sm:w-72 shrink-0 snap-start text-left group"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-black">
                      <img
                        src={tmdbYoutubeThumbUrl(item.video.key)}
                        alt={`Video ${item.video.name || item.video.type} ${film.title}`}
                        loading="lazy"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-11 h-11 rounded-full bg-[#FF2E7E]/90 text-white flex items-center justify-center shadow-lg shadow-[#FF2E7E]/30 group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </span>
                      </span>
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded border border-white/10">
                        {item.video.type}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-white line-clamp-2 group-hover:text-[#FF2E7E] transition-colors">
                      {item.video.name || `Video ${film.title}`}
                    </p>
                  </button>
                ) : (
                  <button
                    key={`image-${item.image.id}`}
                    type="button"
                    onClick={() => openImage(item.image)}
                    aria-label={`Buka ${item.image.kind === 'backdrop' ? 'backdrop' : 'poster'} ${film.title}`}
                    className={`${
                      item.image.kind === 'poster'
                        ? 'w-36 sm:w-40 aspect-[2/3]'
                        : 'w-64 sm:w-80 aspect-video'
                    } shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 group relative`}
                  >
                    <img
                      src={item.image.thumb}
                      alt={item.image.alt}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Media ${film.title}`}
          onClick={closeViewer}
        >
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              closeViewer();
            }}
            aria-label="Tutup media"
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {viewerImage && (
            <>
              {canStepImages && (
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    stepViewer(-1);
                  }}
                  aria-label="Media sebelumnya"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-[#FF2E7E] transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <div
                className="relative w-full max-w-5xl"
                onClick={event => event.stopPropagation()}
              >
                <img
                  src={viewerImage.full}
                  alt={viewerImage.alt}
                  className="w-full max-h-[78vh] object-contain rounded-xl border border-white/10"
                />
                {canStepImages && (
                  <p className="mt-3 text-center text-[11px] font-bold text-slate-400">
                    {viewerImageIndex + 1} / {viewerImageCount}
                  </p>
                )}
              </div>

              {canStepImages && (
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    stepViewer(1);
                  }}
                  aria-label="Media berikutnya"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-[#FF2E7E] transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </>
          )}

          {viewerVideo && (
            <div
              className="w-full max-w-5xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
                <iframe
                  src={tmdbYoutubeEmbedUrl(viewerVideo.key)}
                  title={`Video ${viewerVideo.name || viewerVideo.type} ${film.title}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-white line-clamp-2">
                  {viewerVideo.name || `Video ${film.title}`}
                </p>
                {canStepVideos && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => stepViewer(-1)}
                      aria-label="Video sebelumnya"
                      className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-[#FF2E7E] transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepViewer(1)}
                      aria-label="Video berikutnya"
                      className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-[#FF2E7E] transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default FilmMediaSection;
