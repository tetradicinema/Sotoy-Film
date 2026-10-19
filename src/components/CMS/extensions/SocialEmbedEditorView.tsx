import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import {
  ExternalLink,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  Instagram,
  Twitter,
  Video,
  AtSign,
} from 'lucide-react';
import { EmbedProvider, parseEmbedUrl, getEmbedValidationFeedback } from '../../../lib/embeds';

export const SocialEmbedEditorView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const { provider, url, id, caption } = node.attrs as {
    provider: EmbedProvider;
    url: string;
    id: string;
    kind?: string;
    caption?: string;
  };

  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editUrlInput, setEditUrlInput] = useState(url);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionInput, setCaptionInput] = useState(caption || '');

  const getProviderIcon = (p: EmbedProvider) => {
    switch (p) {
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

  const getProviderLabel = (p: EmbedProvider) => {
    switch (p) {
      case 'youtube':
        return 'YouTube Video';
      case 'instagram':
        return 'Instagram Post / Reel';
      case 'x':
        return 'X (Twitter) Post';
      case 'tiktok':
        return 'TikTok Video';
      case 'threads':
        return 'Threads Post';
      default:
        return 'Media Sosial';
    }
  };

  const handleSaveUrl = () => {
    const feedback = getEmbedValidationFeedback(editUrlInput);
    if (!feedback.valid || !feedback.data) {
      setUrlError(feedback.error || 'Link tautan tidak valid.');
      return;
    }

    updateAttributes({
      provider: feedback.data.provider,
      url: feedback.data.url,
      id: feedback.data.id,
      kind: feedback.data.kind || null,
    });
    setIsEditingUrl(false);
    setUrlError(null);
  };

  const handleSaveCaption = () => {
    updateAttributes({
      caption: captionInput.trim(),
    });
    setIsEditingCaption(false);
  };

  return (
    <NodeViewWrapper className="my-6">
      <div
        className={`rounded-2xl border transition-all overflow-hidden bg-neutral-900/90 shadow-lg ${
          selected
            ? 'border-[#FF2E7E] ring-2 ring-[#FF2E7E]/30'
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950/80 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/[0.05] border border-white/10">
              {getProviderIcon(provider)}
            </span>
            <span className="font-bold text-slate-200">
              {getProviderLabel(provider)}
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-black/40 px-2 py-0.5 rounded-full border border-slate-800">
              ID: {id}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Buka tautan asli di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => {
                setEditUrlInput(url);
                setIsEditingUrl(!isEditingUrl);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Ganti URL tautan"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={deleteNode}
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Hapus blok embed ini"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body / Preview */}
        <div className="p-4 space-y-3">
          {isEditingUrl ? (
            <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-slate-800">
              <label className="text-[11px] font-bold text-slate-300 block">
                Ubah Tautan Konten:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editUrlInput}
                  onChange={(e) => {
                    setEditUrlInput(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  placeholder="https://..."
                  className="flex-1 bg-neutral-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
                <button
                  type="button"
                  onClick={handleSaveUrl}
                  className="px-3 py-1.5 bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(false)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {urlError && (
                <p className="text-[11px] text-rose-400 font-medium">
                  {urlError}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-black/30 px-3.5 py-2.5 rounded-xl border border-white/[0.05]">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-slate-400 truncate font-mono">
                  {url}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  <span>Pratinjau interaktif akan otomatis dimuat oleh pembaca di halaman artikel.</span>
                </div>
              </div>
            </div>
          )}

          {/* Caption Input */}
          <div className="pt-1">
            {isEditingCaption ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={captionInput}
                  onChange={(e) => setCaptionInput(e.target.value)}
                  placeholder="Tulis keterangan / takarir embed (opsional)..."
                  className="flex-1 bg-neutral-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#FF2E7E]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCaption();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveCaption}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingCaption(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingCaption(true)}
                className="text-xs italic text-slate-400 hover:text-slate-300 cursor-pointer py-1 px-1.5 rounded hover:bg-white/[0.02] flex items-center justify-between group"
              >
                <span>{caption || '+ Tambahkan takarir / keterangan sumber...'}</span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-500 transition-opacity" />
              </div>
            )}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};
