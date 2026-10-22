import React, { useMemo } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { SocialEmbedNode } from '../CMS/extensions/SocialEmbedNode';
import { FigureImageNode } from '../CMS/extensions/FigureImageNode';
import { SocialEmbed } from './SocialEmbed';
import { EmbedProvider } from '../../lib/embeds';

// Interactive Social Embed NodeView for public readers
const PublicSocialEmbedView: React.FC<NodeViewProps> = ({ node }) => {
  const { provider, url, id, kind, caption, user } = node.attrs as {
    provider: EmbedProvider;
    url: string;
    id: string;
    kind?: string;
    caption?: string;
    user?: string;
  };

  return (
    <NodeViewWrapper className="w-full">
      <SocialEmbed
        provider={provider}
        url={url}
        id={id}
        kind={kind}
        caption={caption}
        user={user}
      />
    </NodeViewWrapper>
  );
};

// Extended SocialEmbedNode that mounts the public interactive SocialEmbed component
const PublicSocialEmbedNode = SocialEmbedNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(PublicSocialEmbedView);
  },
});

// Read-only figure renderer: no editing controls, dimensions preserved to
// avoid layout shift and lazy loading for below-the-fold images.
const PublicFigureImageView: React.FC<NodeViewProps> = ({ node }) => {
  const { src, alt, caption, width, height } = node.attrs as {
    src?: string;
    alt?: string;
    caption?: string;
    width?: number | null;
    height?: number | null;
  };

  return (
    <NodeViewWrapper className="my-6">
      <figure className="rounded-2xl overflow-hidden border border-slate-800 bg-neutral-950/80">
        <img
          src={src || ''}
          alt={alt || ''}
          width={width || undefined}
          height={height || undefined}
          className="w-full h-auto max-h-[560px] object-contain bg-black"
          loading="lazy"
        />
        {caption ? (
          <figcaption className="p-3 text-center text-xs text-slate-400 italic border-t border-slate-800/80 bg-neutral-900/60">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    </NodeViewWrapper>
  );
};

const PublicFigureImageNode = FigureImageNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(PublicFigureImageView);
  },
});

export interface TiptapContentRendererProps {
  contentJson: string;
}

export const TiptapContentRenderer: React.FC<TiptapContentRendererProps> = ({ contentJson }) => {
  const parsedContent = useMemo(() => {
    try {
      if (!contentJson) return null;
      const parsed = JSON.parse(contentJson);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      console.warn('[TiptapContentRenderer] Failed to parse contentJson:', e);
    }
    return null;
  }, [contentJson]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [2, 3, 4],
          },
          link: false,
          underline: false,
        }),
        Underline,
        LinkExtension.configure({
          openOnClick: true,
          HTMLAttributes: {
            class: 'text-[#FF2E7E] underline hover:text-[#e0266e] font-semibold transition-colors',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
        Table.configure({
          HTMLAttributes: {
            class: 'border-collapse table-auto w-full my-6 border border-slate-800 rounded-2xl overflow-hidden shadow-xl bg-neutral-950/80',
          },
        }),
        TableRow,
        TableHeader.configure({
          HTMLAttributes: {
            class: 'border border-slate-800 bg-neutral-900/90 px-4 py-3 text-left font-display font-black text-white uppercase tracking-wider text-[11px] sm:text-xs',
          },
        }),
        TableCell.configure({
          HTMLAttributes: {
            class: 'border border-slate-800/80 px-4 py-3 text-slate-300 text-xs sm:text-sm leading-relaxed',
          },
        }),
        PublicSocialEmbedNode,
        PublicFigureImageNode,
      ],
      content: parsedContent || '',
      editable: false,
      editorProps: {
        attributes: {
          class: 'article-prose text-slate-200 text-sm sm:text-base leading-relaxed space-y-4 pt-4 focus:outline-none',
        },
      },
    },
    [parsedContent]
  );

  if (!editor || !parsedContent) {
    return null;
  }

  return (
    <div className="w-full">
      <EditorContent editor={editor} />
    </div>
  );
};
