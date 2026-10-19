import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Trash2, Edit2, Image as ImageIcon } from 'lucide-react';

export const FigureImageEditorView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const { src, alt, caption } = node.attrs as {
    src: string;
    alt: string;
    caption?: string;
  };

  const [captionText, setCaptionText] = useState(caption || '');
  const [isEditingCaption, setIsEditingCaption] = useState(false);

  const handleSaveCaption = () => {
    updateAttributes({ caption: captionText.trim() });
    setIsEditingCaption(false);
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
        <div className="relative">
          <img
            src={src}
            alt={alt || 'Gambar Artikel'}
            className="w-full max-h-[520px] object-cover rounded-t-xl"
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

        <figcaption className="p-3 bg-neutral-900/60 border-t border-slate-800/80">
          {isEditingCaption ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                placeholder="Tulis takarir / sumber gambar..."
                className="flex-1 bg-black/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
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
                className="px-3 py-1.5 bg-[#FF2E7E] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Simpan
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingCaption(true)}
              className="text-center text-xs text-slate-400 hover:text-slate-200 italic cursor-pointer py-0.5 flex items-center justify-center gap-1.5"
            >
              <span>{caption || alt || '+ Tambahkan takarir atau sumber gambar...'}</span>
              <Edit2 className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
            </div>
          )}
        </figcaption>
      </figure>
    </NodeViewWrapper>
  );
};
