import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Instagram,
  Twitter,
  Video,
  AtSign,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { EmbedProvider, PROVIDER_CONFIGS, getEmbedIframe, EmbedData, parseEmbedUrl, getSafeEmbedLink } from '../../lib/embeds';
import { sanitizeExternalUrl } from '../../utils/safeUrl';

export interface SocialEmbedProps {
  provider: EmbedProvider;
  url: string;
  id: string;
  kind?: string;
  caption?: string;
  user?: string;
}

export const SocialEmbed: React.FC<SocialEmbedProps> = ({
  url: storedUrl,
  user: storedUser,
  caption,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const parsed = parseEmbedUrl(storedUrl);
  if (!parsed) {
    return (
      <figure className="my-8 mx-auto w-full max-w-[550px] overflow-hidden">
        <div className="rounded-2xl border border-slate-800 bg-neutral-900/90 p-5 text-center space-y-3 shadow-lg">
          <div className="text-xs text-slate-400">{caption || 'Konten sematan tidak valid atau tidak didukung.'}</div>
        </div>
      </figure>
    );
  }

  const provider = parsed.provider;
  const canonicalUrl = parsed.url;
  const id = parsed.id;
  const kind = parsed.kind;
  const user = parsed.user || storedUser;

  const embedData: EmbedData = { provider, url: canonicalUrl, id, kind: kind as any, caption, user };
  const iframe = getEmbedIframe(embedData);
  const safeLink = getSafeEmbedLink({ provider, url: canonicalUrl, id, kind: kind as any, caption, user }) || sanitizeExternalUrl(canonicalUrl) || canonicalUrl;

  const providerName = PROVIDER_CONFIGS[provider]?.name || 'Media Sosial';

  useEffect(() => {
    if (!iframe) return;
    if (shouldLoad) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting) {
          setShouldLoad(true);
          obs.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [iframe, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [shouldLoad]);

  const iframeStyle = iframe && iframe.aspect ? { aspectRatio: iframe.aspect } : iframe && iframe.height ? { height: iframe.height } : undefined;
  const maxW = iframe ? iframe.maxWidth : 550;

  if (provider === 'threads' || !iframe) {
    return (
      <figure className="my-8 mx-auto w-full max-w-[550px] overflow-hidden">
        <div className="rounded-2xl border border-slate-800 bg-neutral-900/90 p-5 text-center space-y-3 shadow-lg">
          <div className="text-xs font-bold text-white">{providerName}</div>
          <a href={safeLink} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold">
            <span>Lihat di {providerName}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {caption && <p className="text-xs italic text-slate-400 pt-2">{caption}</p>}
        </div>
      </figure>
    );
  }

  return (
    <figure ref={containerRef} className="my-8 mx-auto w-full overflow-hidden" style={{ maxWidth: maxW }}>
      <div
        className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl ${provider === 'youtube' && kind === 'shorts' ? 'aspect-[9/16] max-w-[360px] mx-auto' : ''}`}
        style={provider === 'youtube' && kind === 'shorts' ? undefined : iframeStyle}
      >
        {!loaded && !timedOut && shouldLoad && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/60">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF2E7E]" />
            <span className="sr-only">Loading {providerName}</span>
          </div>
        )}
        {shouldLoad && (
          <iframe
            src={iframe.src}
            title={caption || `${providerName} embed ${id}`}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            onLoad={() => setLoaded(true)}
            allow={provider === 'youtube' ? 'encrypted-media; picture-in-picture; fullscreen' : undefined}
          />
        )}
      </div>
      {timedOut && (
        <div className="mt-2 text-center">
          <a href={safeLink} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">
            <span>Lihat di {providerName}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
      {caption && <figcaption className="mt-2.5 text-center text-xs text-slate-400 italic">{caption}</figcaption>}
    </figure>
  );
};
