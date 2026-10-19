import React, { useState } from 'react';
import {
  Play,
  Instagram,
  Twitter,
  Video,
  AtSign,
  ExternalLink,
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
  provider: storedProvider,
  url: storedUrl,
  id: storedId,
  kind: storedKind,
  caption,
  user: storedUser,
}) => {
  const [showEmbed, setShowEmbed] = useState(false);

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
  const host = (() => {
    try {
      return new URL(canonicalUrl).hostname;
    } catch {
      return '';
    }
  })();

  const safeLink = getSafeEmbedLink({ provider, url: canonicalUrl, id, kind: kind as any, caption, user }) || canonicalUrl;

  const embedData: EmbedData = {
    provider,
    url: canonicalUrl,
    id,
    kind: kind as any,
    caption,
    user,
  };

  const iframe = getEmbedIframe(embedData);

  if (provider === 'threads' || !iframe) {
    return (
      <figure className="my-8 mx-auto w-full max-w-[550px] overflow-hidden">
        <div className="rounded-2xl border border-slate-800 bg-neutral-900/90 p-5 text-center space-y-3 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto">
            {getProviderIcon()}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
              <span>Konten dari {providerName}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 break-all">{host}</p>
          </div>
          <a
            href={safeLink}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <span>Lihat di {providerName}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {caption && (
            <p className="text-xs italic text-slate-400 border-t border-slate-800 pt-2">{caption}</p>
          )}
        </div>
        {caption && (
          <figcaption className="mt-2.5 text-center text-xs text-slate-400 italic">{caption}</figcaption>
        )}
      </figure>
    );
  }

  if (!showEmbed) {
    return (
      <figure className="my-8 mx-auto w-full max-w-[550px] overflow-hidden">
        <div className="rounded-2xl border border-slate-800 bg-neutral-900/90 p-5 text-center space-y-3 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto">
            {getProviderIcon()}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
              <span>Konten dari {providerName}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 break-all">{host}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmbed(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>Tampilkan konten</span>
            </button>
            <a
              href={safeLink}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
            >
              <span>Lihat di {providerName}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          {caption && (
            <p className="text-xs italic text-slate-400 border-t border-slate-800 pt-2">{caption}</p>
          )}
          {provider === 'youtube' && (
            <div className="mt-3 rounded-xl overflow-hidden border border-slate-800 aspect-video relative max-w-full">
              <img
                src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
                alt={caption || `Thumbnail YouTube ${id}`}
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-black/70 border border-white/20 flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-white fill-current ml-0.5" />
                </div>
              </div>
            </div>
          )}
        </div>
        {caption && (
          <figcaption className="mt-2.5 text-center text-xs text-slate-400 italic">{caption}</figcaption>
        )}
      </figure>
    );
  }

  const iframeStyle = iframe.aspect
    ? { aspectRatio: iframe.aspect }
    : iframe.height
    ? { height: iframe.height }
    : undefined;

  return (
    <figure className="my-8 mx-auto w-full overflow-hidden" style={{ maxWidth: iframe.maxWidth }}>
      <div
        className={`rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl ${
          provider === 'youtube' && kind === 'shorts' ? 'aspect-[9/16] max-w-[360px] mx-auto' : ''
        }`}
        style={provider === 'youtube' && kind === 'shorts' ? undefined : iframeStyle}
      >
        <iframe
          src={iframe.src}
          title={caption || `${providerName} embed ${id}`}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          allow={provider === 'youtube' ? 'encrypted-media; picture-in-picture; fullscreen' : undefined}
        />
      </div>
      {caption && (
        <figcaption className="mt-2.5 text-center text-xs text-slate-400 italic">{caption}</figcaption>
      )}
    </figure>
  );
};
