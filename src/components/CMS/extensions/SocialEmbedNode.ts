import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { SocialEmbedEditorView } from './SocialEmbedEditorView';
import { parseEmbedUrl } from '../../../lib/embeds';

export interface SocialEmbedOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    socialEmbed: {
      setSocialEmbed: (options: {
        provider: string;
        url: string;
        id: string;
        kind?: string | null;
        caption?: string;
      }) => ReturnType;
    };
  }
}

export const SocialEmbedNode = Node.create<SocialEmbedOptions>({
  name: 'socialEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      provider: {
        default: 'youtube',
        parseHTML: (element) => element.getAttribute('data-provider'),
        renderHTML: (attributes) => ({ 'data-provider': attributes.provider }),
      },
      url: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-url'),
        renderHTML: (attributes) => ({ 'data-url': attributes.url }),
      },
      id: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => ({ 'data-id': attributes.id }),
      },
      kind: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-kind'),
        renderHTML: (attributes) => (attributes.kind ? { 'data-kind': attributes.kind } : {}),
      },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') || '',
        renderHTML: (attributes) => (attributes.caption ? { 'data-caption': attributes.caption } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-social-embed]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-social-embed': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SocialEmbedEditorView);
  },

  addCommands() {
    return {
      setSocialEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  // Markdown serialization integration for tiptap-markdown
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`\n\n${node.attrs.url}\n\n`);
        },
        parse: {
          setup(markdownit: any) {
            // No custom inline tokens required
          },
        },
      },
    };
  },
});
