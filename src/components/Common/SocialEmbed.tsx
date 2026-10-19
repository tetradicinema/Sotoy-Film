import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Instagram,
  Twitter,
  Video,
  AtSign,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { EmbedProvider, PROVIDER_CONFIGS } from '../../lib/embeds';

// Global script loader cache to prevent duplicate script tags
const loadedScripts = new Map<string, Promise<boolean>>();

function loadExternalScript(src: string): Promise<boolean> {
  if (loadedScripts.has(src)) {
    return loadedScripts.get(src)!;
  }

  const promise = new Promise<boolean>((resolve) => {
    // Check if script already exists in DOM
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
}

export interface SocialEmbedProps {
  provider: EmbedProvider;
  url: string;
  id: string;
  kind?: string;
  caption?: string;
  user?: string;
}

export const SocialEmbed: React.FC<SocialEmbedProps> = ({
  provider,
  url,
  id,
  kind,
  caption,
  user,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Lazy loading observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Script loading and processing when visible
  useEffect(() => {
    if (!isVisible) return;

    if (provider === 'youtube') {
      setIsRendered(true);
      return;
    }

    let isCancelled = false;
    const timeoutId = setTimeout(() => {
      if (!isCancelled) {
        setTimedOut(true);
      }
    }, 8000);

    const scriptUrl = PROVIDER_CONFIGS[provider]?.scriptUrl;
    if (!scriptUrl) {
      setIsRendered(true);
      clearTimeout(timeoutId);
      return;
    }

    loadExternalScript(scriptUrl)
      .then((success) => {
        if (isCancelled) return;
        clearTimeout(timeoutId);

        if (!success) {
          setHasError(true);
          return;
        }

        // Trigger provider-specific embed processors
        try {
          if (provider === 'instagram' && (window as any).instgrm?.Embeds) {
            (window as any).instgrm.Embeds.process();
          } else if (provider === 'x' && (window as any).twttr?.widgets && containerRef.current) {
            (window as any).twttr.widgets.load(containerRef.current);
          }
          setIsRendered(true);
        } catch (e) {
          console.warn('[SocialEmbed] Processing error:', e);
          setIsRendered(true);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          clearTimeout(timeoutId);
          setHasError(true);
        }
      });

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isVisible, provider]);

  const getProviderIcon = () => {
    switch (provider) {
      case 'youtube':
        return <Play className="w-4 h-4 text-red-500 fill-current" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'x':
        return <Twitter className="w-4 h-4 text-sky-400 fill-current" />;
      case 'tiktok':
        return <Video className="w-4 h-4 text-teal-400" />;
      case 'threads':
        return <AtSign className="w-4 h-4 text-purple-400" />;
      default:
        return <ExternalLink className="w-4 h-4 text-slate-400" />;
    }
  };

  const providerName = PROVIDER_CONFIGS[provider]?.name || 'Media Sosial';

  // Fallback card if script failed or timed out
  const renderFallbackCard = () => (
    <div className="rounded-2xl border border-slate-800 bg-neutral-900/90 p-5 text-center space-y-3 max-w-[550px] mx-auto shadow-lg">
      <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto">
        {getProviderIcon()}
      </div>
      <div>
        <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
          <span>Konten dari {providerName}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {timedOut
            ? 'Pemuatan embed pihak ketiga melebihi batas waktu.'
            : 'Konten tidak dapat dimuat langsung di browser Anda.'}
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold transition-all shadow-md active:scale-95"
      >
        <span>Lihat di {providerName}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      {caption && (
        <p className="text-xs italic text-slate-400 border-t border-slate-800 pt-2">
          {caption}
        </p>
      )}
    </div>
  );

  return (
    <figure
      ref={containerRef}
      className="my-8 mx-auto w-full max-w-[550px] overflow-hidden"
    >
      {/* If error or timeout, show fallback card */}
      {hasError || timedOut ? (
        renderFallbackCard()
      ) : !isVisible ? (
        // Initial viewport skeleton placeholder
        <div className="h-64 rounded-2xl bg-neutral-900/60 border border-slate-800/80 animate-pulse flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF2E7E]" />
          <span className="text-xs font-medium">Memuat sematan {providerName}...</span>
        </div>
      ) : (
        <div className="relative w-full">
          {/* YouTube Embed */}
          {provider === 'youtube' && (
            <div
              className={`rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl ${
                kind === 'shorts' ? 'aspect-[9/16] max-w-[360px] mx-auto' : 'aspect-video'
              }`}
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
                title={caption || `YouTube Video ${id}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}

          {/* Instagram Embed */}
          {provider === 'instagram' && (
            <div className="min-h-[440px] flex items-center justify-center">
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={url}
                data-instgrm-version="14"
                style={{
                  background: '#121212',
                  border: '1px solid #262626',
                  borderRadius: '16px',
                  boxShadow: 'none',
                  margin: '0 auto',
                  maxWidth: '540px',
                  minWidth: '326px',
                  padding: '0',
                  width: '99.375%',
                }}
              >
                <div style={{ padding: '16px' }}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-[#FF2E7E] flex items-center gap-1.5"
                  >
                    <span>Lihat kiriman ini di Instagram</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </blockquote>
            </div>
          )}

          {/* X / Twitter Embed */}
          {provider === 'x' && (
            <div className="min-h-[220px] flex justify-center">
              <blockquote className="twitter-tweet" data-theme="dark" data-lang="id">
                <a href={url}>Memuat unggahan X...</a>
              </blockquote>
            </div>
          )}

          {/* TikTok Embed */}
          {provider === 'tiktok' && (
            <div className="min-h-[440px] flex justify-center">
              <blockquote
                className="tiktok-embed"
                cite={url}
                data-video-id={id}
                style={{ maxWidth: '550px', minWidth: '325px' }}
              >
                <section>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`@${user || 'tiktok'}`}
                    href={`https://www.tiktok.com/@${user || ''}`}
                  >
                    @{user || 'tiktok'}
                  </a>
                </section>
              </blockquote>
            </div>
          )}

          {/* Threads Embed */}
          {provider === 'threads' && (
            <div className="min-h-[300px] flex justify-center">
              <blockquote
                className="text-post-media"
                data-text-post-permalink={url}
                data-text-post-version="0"
                style={{
                  background: '#121212',
                  border: '1px solid #262626',
                  borderRadius: '16px',
                  margin: '0 auto',
                  maxWidth: '540px',
                  minWidth: '320px',
                  padding: '12px',
                  width: '100%',
                }}
              >
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400">
                  Lihat postingan di Threads
                </a>
              </blockquote>
            </div>
          )}

          {/* Caption */}
          {caption && (
            <figcaption className="mt-2.5 text-center text-xs text-slate-400 italic">
              {caption}
            </figcaption>
          )}
        </div>
      )}
    </figure>
  );
};
