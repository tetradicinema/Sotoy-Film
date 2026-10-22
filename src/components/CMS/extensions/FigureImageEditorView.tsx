import React, { useEffect, useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Trash2, Check } from 'lucide-react';
import { ALT_TEXT_MAX_LENGTH, validateAltText } from '../../../utils/articleHelpers';

export const FigureImageEditorView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const { src, alt, caption, width, height } = node.attrs as {
    src: string;
    alt: string;
    caption?: string;
    width?: number | null;
    height?: number | null;
  };

  const [altText, setAltText] = useState(alt || '');
  const [captionText, setCaptionText] = useState(caption || '');

  useEffect(() => {
    if (!selected) return;
    setAltText(alt || '');
    setCaptionText(caption || '');
  }, [selected, alt, caption]);

  const altValidation = validateAltText(altText);

  const handleSaveDetails = () => {
    updateAttributes({
      alt: altText.trim().slice(0, ALT_TEXT_MAX_LENGTH),
      caption: captionText.trim(),
    });
  };

  return (
    <NodeViewWrapper className="my-6">
      <figure
        className={`relative group rounded-2xl overflow-hidden border bg-neutral-950/80 shadow-xl transition-all ${
          selected
            ? 'border-[#FF2E7E] ring-2 ring-[#FF2E7E]/30'
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="relative bg-black">
          <img
            src={src}
            alt={alt || ''}
            width={width || undefined}
            height={height || undefined}
            className="w-full h-auto max-h-[520px] object-contain rounded-t-xl"
            loading="lazy"
          />

          <button
            type="button"
            onClick={deleteNode}
            className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-all shadow-md cursor-pointer"
            title="Hapus gambar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {selected ? (
          <div className="p-3 bg-neutral-900/80 border-t border-slate-800/80 space-y-3" contentEditable={false}>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-slate-300">
                  Teks alternatif (SEO)
                </label>
                <span className="text-[10px] font-mono text-slate-500">
                  {altText.length}/{ALT_TEXT_MAX_LENGTH}
                </span>
              </div>
              <input
                type="text"
                value={altText}
                maxLength={ALT_TEXT_MAX_LENGTH}
                onChange={e => setAltText(e.target.value.slice(0, ALT_TEXT_MAX_LENGTH))}
                placeholder="Jelaskan isi gambar untuk pembaca layar dan mesin pencari."
                className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
              />
              <p className="text-[10px] text-slate-500">
                Jelaskan isi gambar, bukan menulis "gambar". Maksimal {ALT_TEXT_MAX_LENGTH} karakter.
              </p>
              {!altValidation.valid ? (
                <p className="text-[10px] text-amber-400">{altValidation.warning}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">
                Keterangan gambar (caption)
              </label>
              <input
                type="text"
                value={captionText}
                onChange={e => setCaptionText(e.target.value)}
                placeholder="Tulis keterangan atau sumber gambar."
                className="w-full bg-black/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveDetails}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan detail gambar</span>
            </button>
          </div>
        ) : null}

        <figcaption className="p-3 bg-neutral-900/60 border-t border-slate-800/80 text-center text-xs text-slate-400 italic">
          {caption || alt || 'Belum ada keterangan gambar.'}
        </figcaption>
      </figure>
    </NodeViewWrapper>
  );
};
