import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FigureImageEditorView } from './FigureImageEditorView';

export interface FigureImageOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureImage: {
      setFigureImage: (options: {
        src: string;
        alt?: string;
        caption?: string;
      }) => ReturnType;
    };
  }
}

export const FigureImageNode = Node.create<FigureImageOptions>({
  name: 'figureImage',
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
      src: {
        default: '',
        parseHTML: (element) => {
          const img = element.querySelector('img');
          return img ? img.getAttribute('src') : element.getAttribute('data-src');
        },
        renderHTML: (attributes) => ({ 'data-src': attributes.src }),
      },
      alt: {
        default: '',
        parseHTML: (element) => {
          const img = element.querySelector('img');
          return img ? img.getAttribute('alt') : element.getAttribute('data-alt');
        },
        renderHTML: (attributes) => ({ 'data-alt': attributes.alt }),
      },
      caption: {
        default: '',
        parseHTML: (element) => {
          const cap = element.querySelector('figcaption');
          return cap ? cap.textContent : element.getAttribute('data-caption');
        },
        renderHTML: (attributes) => (attributes.caption ? { 'data-caption': attributes.caption } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-figure-image]',
      },
      {
        tag: 'figure',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const hasImg = element.querySelector('img');
          return hasImg ? {} : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-figure-image': '' }),
      ['img', { src: HTMLAttributes['data-src'], alt: HTMLAttributes['data-alt'] || '' }],
      ['figcaption', {}, HTMLAttributes['data-caption'] || ''],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureImageEditorView);
  },

  addCommands() {
    return {
      setFigureImage:
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
          const alt = node.attrs.caption || node.attrs.alt || '';
          state.write(`\n\n![${alt}](${node.attrs.src})\n\n`);
        },
        parse: {
          setup(markdownit: any) {
            // standard markdown image token handling
          },
        },
      },
    };
  },
});
