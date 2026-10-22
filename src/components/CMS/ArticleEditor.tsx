import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Markdown } from 'tiptap-markdown';
import imageCompression from 'browser-image-compression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import { shouldSyncEditorContent } from '../../utils/articleFlow';
import { SocialEmbedNode } from './extensions/SocialEmbedNode';
import { FigureImageNode } from './extensions/FigureImageNode';
import {
  parseEmbedUrl,
  getEmbedValidationFeedback,
  EmbedProvider,
  PROVIDER_CONFIGS,
} from '../../lib/embeds';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Table as TableIcon,
  Image as ImageIcon,
  Share2,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
  Maximize2,
  Minimize2,
  UploadCloud,
  Loader2,
  X,
  Check,
  Plus,
  Play,
  Instagram,
  Twitter,
  Video,
  AtSign,
  ChevronDown,
  Trash2,
  Sparkles,
} from 'lucide-react';

export interface ArticleEditorProps {
  initialJson?: string;
  initialMarkdown?: string;
  onChange: (payload: {
    json: string;
    markdown: string;
    plainText: string;
    wordCount: number;
  }) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  initialJson,
  initialMarkdown,
  onChange,
  placeholder = 'Tulis naskah artikel Anda di sini... Ketik "/" untuk menu kilat atau tempel link media sosial untuk menyematkan embed.',
  readOnly = false,
}) => {
  const { currentUser, isWriter, isAdmin, showToast } = useApp();
  const canEmbed = isWriter || isAdmin || currentUser.role === 'admin' || currentUser.role === 'penulis_sotoy';

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals & Popups
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [embedProviderChoice, setEmbedProviderChoice] = useState<EmbedProvider | 'auto'>('auto');
  const [embedUrlInput, setEmbedUrlInput] = useState('');
  const [embedCaptionInput, setEmbedCaptionInput] = useState('');
  const [embedError, setEmbedError] = useState<string | null>(null);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');
  const [imageCaptionInput, setImageCaptionInput] = useState('');

  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [isHeadingDropdownOpen, setIsHeadingDropdownOpen] = useState(false);
  const [showConvertedNotice, setShowConvertedNotice] = useState<boolean>(
    Boolean(initialMarkdown && !initialJson)
  );

  // Track the last loaded content to avoid unnecessary resets
  const lastLoadedContentRef = useRef<string>(initialJson || initialMarkdown || '');

  // Slash command state
  const [slashMenu, setSlashMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    filter: string;
    selectedIndex: number;
  }>({
    open: false,
    x: 0,
    y: 0,
    filter: '',
    selectedIndex: 0,
  });

  // Bubble menu state
  const [bubbleMenu, setBubbleMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
  }>({
    open: false,
    x: 0,
    y: 0,
  });

  // Setup initial content: prefer JSON, fallback to Markdown
  const getInitialContent = () => {
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {
        console.warn('[ArticleEditor] Failed to parse initialJson:', e);
      }
    }
    return initialMarkdown || '';
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
        dropcursor: {
          color: '#FF2E7E',
          width: 2,
        },
        link: false,
        underline: false,
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#FF2E7E] underline hover:text-[#e0266e] font-semibold cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        validate: href => /^https?:\/\//i.test(href),
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4 border border-slate-800 rounded-xl overflow-hidden',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-slate-800 bg-neutral-900/90 px-3 py-2 text-left text-xs font-black text-white uppercase tracking-wider',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-slate-800/80 px-3 py-2 text-xs text-slate-300',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      SocialEmbedNode,
      FigureImageNode,
      Markdown.configure({
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content: getInitialContent(),
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'article-prose min-h-[420px] focus:outline-none p-4 sm:p-6 text-slate-200 text-sm sm:text-base leading-relaxed',
      },
      handlePaste: (view, event) => {
        // 1. Handle file paste (images)
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                uploadAndInsertImage(file);
                return true;
              }
            }
          }
        }

        // 2. Check if pasting a social embed URL on an empty line or selection
        const text = event.clipboardData?.getData('text/plain')?.trim();
        if (text && canEmbed) {
          const embedData = parseEmbedUrl(text);
          if (embedData) {
            const { state } = view;
            const { selection } = state;
            const $from = selection.$from;
            const isCurrentLineEmpty = $from.parent.content.size === 0;

            if (isCurrentLineEmpty) {
              event.preventDefault();
              editor?.chain().focus().setSocialEmbed({
                provider: embedData.provider,
                url: embedData.url,
                id: embedData.id,
                kind: embedData.kind || null,
              }).run();
              showToast(`Menyematkan embed ${embedData.provider.toUpperCase()} secara otomatis.`, 'success');
              return true;
            }
          }
        }

        return false;
      },
      handleDrop: (view, event) => {
        const hasFiles = event.dataTransfer?.files && event.dataTransfer.files.length > 0;
        if (hasFiles && event.dataTransfer) {
          const file = event.dataTransfer.files[0];
          if (file && file.type.startsWith('image/')) {
            event.preventDefault();
            uploadAndInsertImage(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Broadcast changes with json, markdown, plainText, and wordCount
      const json = JSON.stringify(editor.getJSON());
      const markdown = (editor.storage as any).markdown?.getMarkdown() || '';
      const plainText = editor.getText();
      const words = plainText.trim().split(/\s+/).filter(Boolean).length;

      // Record our own emitted content before notifying the parent. The parent
      // echoes it back through initialJson on the next render; remembering it
      // here makes the sync effect ignore that echo so the caret never moves.
      lastLoadedContentRef.current = json;

      onChange({
        json,
        markdown,
        plainText,
        wordCount: words,
      });

      checkSlashAndBubbleMenu();
    },
    onSelectionUpdate: () => {
      checkSlashAndBubbleMenu();
    },
  });

  // Calculate dynamic reading stats
  const wordCount = editor?.storage.characterCount.words() || 0;
  const charCount = editor?.storage.characterCount.characters() || 0;
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200));

  // Slash command & bubble menu detector
  const checkSlashAndBubbleMenu = useCallback(() => {
    if (!editor) return;

    const { state } = editor;
    const { selection } = state;
    const { empty, from, to } = selection;

    // Check bubble menu on text selection
    if (!empty && from !== to) {
      const selectedText = state.doc.textBetween(from, to).trim();
      if (selectedText.length > 0) {
        const view = editor.view;
        const coords = view.coordsAtPos(from);
        setBubbleMenu({
          open: true,
          x: coords.left,
          y: coords.top - 46,
        });
      } else {
        setBubbleMenu(prev => (prev.open ? { ...prev, open: false } : prev));
      }
    } else {
      setBubbleMenu(prev => (prev.open ? { ...prev, open: false } : prev));
    }

    // Check slash command on empty line with '/'
    if (empty) {
      const $from = selection.$from;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset);
      if (textBefore.startsWith('/')) {
        const query = textBefore.slice(1).toLowerCase();
        const view = editor.view;
        const coords = view.coordsAtPos(from);
        setSlashMenu({
          open: true,
          x: coords.left,
          y: coords.bottom + 8,
          filter: query,
          selectedIndex: 0,
        });
        return;
      }
    }

    setSlashMenu(prev => (prev.open ? { ...prev, open: false } : prev));
  }, [editor]);

  // Sync external changes (article opened or version restored). The editor's
  // own echo is recorded in lastLoadedContentRef by onUpdate, so it is ignored.
  useEffect(() => {
    if (!editor) return;
    const incoming = initialJson || initialMarkdown || '';
    if (!shouldSyncEditorContent(incoming, lastLoadedContentRef.current)) return;

    lastLoadedContentRef.current = incoming;
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        if (parsed && typeof parsed === 'object') {
          editor.commands.setContent(parsed, { emitUpdate: false });
          return;
        }
      } catch (e) {
        console.warn('[ArticleEditor] External sync JSON parse failed:', e);
      }
    }
    editor.commands.setContent(initialMarkdown || '', { emitUpdate: false });
  }, [editor, initialJson, initialMarkdown]);

  // Image Upload Logic (Compress + Firebase Storage)
  const uploadAndInsertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih berkas gambar yang valid (JPG, PNG, WebP, GIF).', 'error');
      return;
    }

    try {
      setIsUploadingImage(true);
      setUploadProgressText('Mengompresi gambar...');

      let fileToUpload = file;
      if (file.size > 1 * 1024 * 1024) {
        try {
          fileToUpload = await imageCompression(file, {
            maxSizeMB: 1.2,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
          });
        } catch (compErr) {
          console.warn('[ImageCompression] Warning:', compErr);
          fileToUpload = file;
        }
      }

      setUploadProgressText('Mengunggah ke penyimpanan...');
      const authorId = currentUser?.id || 'writer';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `articles_media/${authorId}/${Date.now()}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      let downloadUrl = '';
      try {
        await uploadBytes(storageRef, fileToUpload, {
          contentType: fileToUpload.type,
        });
        downloadUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn('[Storage] uploadBytes fallback to base64 DataURL:', storageErr);
        downloadUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fileToUpload);
        });
      }

      if (downloadUrl && editor) {
        const altText = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Ilustrasi Artikel';
        editor.chain().focus().setFigureImage({
          src: downloadUrl,
          alt: altText,
          caption: altText,
        }).run();
        showToast('Gambar berhasil diunggah dan disisipkan!', 'success');
      }
    } catch (err) {
      console.error('[Article Image Upload] Error:', err);
      showToast('Gagal mengunggah gambar. Silakan coba lagi.', 'error');
    } finally {
      setIsUploadingImage(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Insert Link Action
  const handleInsertLink = () => {
    if (!linkUrlInput.trim()) {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      setIsLinkModalOpen(false);
      return;
    }

    let formatted = linkUrlInput.trim();
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`;
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: formatted }).run();
    setIsLinkModalOpen(false);
    setLinkUrlInput('');
    setLinkError(null);
  };

  // Insert Embed Action
  const handleInsertEmbed = () => {
    if (!canEmbed) {
      showToast('Hanya Penulis dan Admin yang memiliki izin menyematkan embed.', 'error');
      setIsEmbedModalOpen(false);
      return;
    }

    const feedback = getEmbedValidationFeedback(embedUrlInput);
    if (!feedback.valid || !feedback.data) {
      setEmbedError(feedback.error || 'Format tautan embed tidak valid.');
      return;
    }

    editor?.chain().focus().setSocialEmbed({
      provider: feedback.data.provider,
      url: feedback.data.url,
      id: feedback.data.id,
      kind: feedback.data.kind || null,
      caption: embedCaptionInput.trim(),
    }).run();

    setIsEmbedModalOpen(false);
    setEmbedUrlInput('');
    setEmbedCaptionInput('');
    setEmbedError(null);
    showToast(`Berhasil menyematkan konten ${feedback.data.provider.toUpperCase()}!`, 'success');
  };

  // Insert Image URL Action
  const handleInsertImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    editor?.chain().focus().setFigureImage({
      src: imageUrlInput.trim(),
      alt: imageAltInput.trim() || 'Ilustrasi Artikel',
      caption: imageCaptionInput.trim() || imageAltInput.trim(),
    }).run();

    setIsImageModalOpen(false);
    setImageUrlInput('');
    setImageAltInput('');
    setImageCaptionInput('');
  };

  // Slash commands registry
  const slashCommands = [
    {
      title: 'Heading 2 (Sub-Judul Utama)',
      icon: <Heading2 className="w-4 h-4 text-white" />,
      action: () => editor?.chain().focus().deleteRange({ from: editor.state.selection.from - slashMenu.filter.length - 1, to: editor.state.selection.from }).toggleHeading({ level: 2 }).run(),
    },
    {
      title: 'Heading 3 (Poin Pembahasan)',
      icon: <Heading3 className="w-4 h-4 text-white" />,
      action: () => editor?.chain().focus().deleteRange({ from: editor.state.selection.from - slashMenu.filter.length - 1, to: editor.state.selection.from }).toggleHeading({ level: 3 }).run(),
    },
    {
      title: 'Daftar Poin (Bullet List)',
      icon: <List className="w-4 h-4 text-white" />,
      action: () => editor?.chain().focus().deleteRange({ from: editor.state.selection.from - slashMenu.filter.length - 1, to: editor.state.selection.from }).toggleBulletList().run(),
    },
    {
      title: 'Daftar Angka (Numbered List)',
      icon: <ListOrdered className="w-4 h-4 text-white" />,
      action: () => editor?.chain().focus().deleteRange({ from: editor.state.selection.from - slashMenu.filter.length - 1, to: editor.state.selection.from }).toggleOrderedList().run(),
    },
    {
      title: 'Kutipan / Blockquote',
      icon: <Quote className="w-4 h-4 text-[#FF2E7E]" />,
      action: () => editor?.chain().focus().deleteRange({ from: editor.state.selection.from - slashMenu.filter.length - 1, to: editor.state.selection.from }).toggleBlockquote().run(),
    },
    {
      title: 'Unggah Gambar (Foto / Diagram)',
      icon: <ImageIcon className="w-4 h-4 text-sky-400" />,
      action: () => {
        editor?.chain().focus().deleteRange({ from: editor.state.selection.from - slashMenu.filter.length - 1, to: editor.state.selection.from }).run();
        fileInputRef.current?.click();
      },
    },
    {
      title: 'Tabel Data (3 Baris x 3 Kolom)',
      icon: <TableIcon className="w-4 h-4 text-emerald-400" />,
      action: () => editor?.chain().focus().deleteRange({ from: editor.state.selection.from - slashMenu.filter.length - 1, to: editor.state.selection.from }).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      title: 'Garis Pembatas (Divider)',
      icon: <Minus className="w-4 h-4 text-slate-400" />,
      action: () => editor?.chain().focus().deleteRange({ from: editor.state.selection.from - slashMenu.filter.length - 1, to: editor.state.selection.from }).setHorizontalRule().run(),
    },
    ...(canEmbed
      ? [
          {
            title: 'Sematkan Media Sosial (Embed)',
            icon: <Share2 className="w-4 h-4 text-amber-400" />,
            action: () => {
              editor?.chain().focus().deleteRange({ from: editor.state.selection.from - slashMenu.filter.length - 1, to: editor.state.selection.from }).run();
              setIsEmbedModalOpen(true);
            },
          },
        ]
      : []),
  ];

  const filteredSlashCommands = slashCommands.filter(c =>
    c.title.toLowerCase().includes(slashMenu.filter)
  );

  if (!editor) {
    return (
      <div className="min-h-[420px] rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-[#FF2E7E] mr-2" />
        <span className="text-sm font-bold">Memuat Editor Naskah Sotoy...</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border border-slate-800 bg-[#121212] overflow-hidden shadow-2xl transition-all duration-200 flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none bg-[#0A0A0A]' : 'relative'
      }`}
    >
      {/* Hidden File Input for Image Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadAndInsertImage(file);
        }}
      />

      {/* One-time conversion notice for legacy markdown articles */}
      {showConvertedNotice && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Artikel ini dikonversi ke editor baru. Format visual dan embed akan disimpan secara otomatis.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowConvertedNotice(false)}
            className="text-amber-400 hover:text-white transition-colors cursor-pointer p-0.5"
            title="Tutup pemberitahuan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* STICKY TOOLBAR */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-1 p-2 sm:p-3 bg-neutral-950/95 backdrop-blur-md border-b border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          {/* Headings dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsHeadingDropdownOpen(!isHeadingDropdownOpen)}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-bold flex items-center gap-1.5 border border-white/5 cursor-pointer"
              title="Pilih Format Paragraf / Judul"
            >
              <span>
                {editor.isActive('heading', { level: 2 })
                  ? 'Heading 2'
                  : editor.isActive('heading', { level: 3 })
                  ? 'Heading 3'
                  : editor.isActive('heading', { level: 4 })
                  ? 'Heading 4'
                  : 'Paragraf'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isHeadingDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-44 rounded-xl bg-neutral-900 border border-slate-800 shadow-2xl py-1 z-30 space-y-0.5"
                onMouseLeave={() => setIsHeadingDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setParagraph().run();
                    setIsHeadingDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-white/[0.06] transition-colors ${
                    editor.isActive('paragraph') ? 'text-[#FF2E7E] font-bold' : 'text-slate-300'
                  }`}
                >
                  Normal (Paragraf)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                    setIsHeadingDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-white/[0.06] transition-colors ${
                    editor.isActive('heading', { level: 2 }) ? 'text-[#FF2E7E]' : 'text-slate-200'
                  }`}
                >
                  Heading 2 (H2)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                    setIsHeadingDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-white/[0.06] transition-colors ${
                    editor.isActive('heading', { level: 3 }) ? 'text-[#FF2E7E]' : 'text-slate-200'
                  }`}
                >
                  Heading 3 (H3)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 4 }).run();
                    setIsHeadingDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-white/[0.06] transition-colors ${
                    editor.isActive('heading', { level: 4 }) ? 'text-[#FF2E7E]' : 'text-slate-200'
                  }`}
                >
                  Heading 4 (H4)
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Bold, Italic, Underline, Strike */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('bold') ? 'bg-[#FF2E7E] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Tebal (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('italic') ? 'bg-[#FF2E7E] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Miring (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('underline') ? 'bg-[#FF2E7E] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Garis Bawah (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('strike') ? 'bg-[#FF2E7E] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Coret Teks"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Link */}
          <button
            type="button"
            onClick={() => {
              const previousUrl = editor.getAttributes('link').href || '';
              setLinkUrlInput(previousUrl);
              setLinkError(null);
              setIsLinkModalOpen(true);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('link') ? 'bg-[#FF2E7E] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Tautkan Link (URL)"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          {editor.isActive('link') && (
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Hapus Link"
            >
              <Unlink className="w-4 h-4" />
            </button>
          )}

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Lists & Quotes */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('bulletList') ? 'bg-[#FF2E7E] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Daftar Poin (Bullet List)"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('orderedList') ? 'bg-[#FF2E7E] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Daftar Bernomor (Numbered List)"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('blockquote') ? 'bg-[#FF2E7E] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Kutipan (Blockquote)"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('codeBlock') ? 'bg-[#FF2E7E] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Blok Kode (Code Block)"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Garis Pembatas (Divider)"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Table Operations */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTableDropdownOpen(!isTableDropdownOpen)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                editor.isActive('table') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Operasi Tabel"
            >
              <TableIcon className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>

            {isTableDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-48 rounded-xl bg-neutral-900 border border-slate-800 shadow-2xl py-1 z-30 text-xs"
                onMouseLeave={() => setIsTableDropdownOpen(false)}
              >
                {!editor.isActive('table') ? (
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                      setIsTableDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-white/[0.06] flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sisipkan Tabel 3x3</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().addRowAfter().run();
                        setIsTableDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-white/[0.06]"
                    >
                      + Tambah Baris
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().addColumnAfter().run();
                        setIsTableDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-white/[0.06]"
                    >
                      + Tambah Kolom
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().deleteRow().run();
                        setIsTableDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-amber-300 hover:bg-white/[0.06]"
                    >
                      - Hapus Baris
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().deleteColumn().run();
                        setIsTableDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-amber-300 hover:bg-white/[0.06]"
                    >
                      - Hapus Kolom
                    </button>
                    <div className="border-t border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().deleteTable().run();
                        setIsTableDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Seluruh Tabel</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Image button */}
          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Sisipkan Gambar (Unggah / URL)"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Embed button (writers/admins only) */}
          {canEmbed && (
            <button
              type="button"
              onClick={() => {
                setEmbedUrlInput('');
                setEmbedCaptionInput('');
                setEmbedError(null);
                setIsEmbedModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
              title="Sematkan Embed Media Sosial (YouTube, IG, X, TikTok, Threads)"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Embed</span>
            </button>
          )}
        </div>

        {/* Right tools: Undo, Redo, Fullscreen */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Urungkan (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Ulangi (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-[#FF2E7E]" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* UPLOADING OVERLAY */}
      {isUploadingImage && (
        <div className="absolute inset-0 bg-black/75 z-30 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-[#FF2E7E] animate-spin" />
          <span className="text-xs font-bold text-white tracking-wide">
            {uploadProgressText || 'Memproses berkas gambar...'}
          </span>
        </div>
      )}

      {/* BUBBLE MENU ON SELECTION */}
      {bubbleMenu.open && (
        <div
          className="fixed z-40 flex items-center gap-1 bg-neutral-900 border border-slate-700 rounded-xl px-2 py-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          style={{ left: `${Math.max(16, bubbleMenu.x)}px`, top: `${Math.max(16, bubbleMenu.y)}px` }}
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              editor.isActive('bold') ? 'bg-[#FF2E7E] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              editor.isActive('italic') ? 'bg-[#FF2E7E] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              editor.isActive('underline') ? 'bg-[#FF2E7E] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkUrlInput(editor.getAttributes('link').href || '');
              setIsLinkModalOpen(true);
            }}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              editor.isActive('link') ? 'bg-[#FF2E7E] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <div className="h-3 w-px bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 rounded-lg text-xs font-black transition-colors ${
              editor.isActive('heading', { level: 2 }) ? 'bg-[#FF2E7E] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 rounded-lg text-xs font-black transition-colors ${
              editor.isActive('heading', { level: 3 }) ? 'bg-[#FF2E7E] text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            H3
          </button>
        </div>
      )}

      {/* SLASH COMMAND DROPDOWN MENU */}
      {slashMenu.open && filteredSlashCommands.length > 0 && (
        <div
          className="fixed z-40 w-72 rounded-2xl bg-neutral-900 border border-slate-700 p-2 shadow-2xl max-h-72 overflow-y-auto"
          style={{ left: `${Math.min(window.innerWidth - 300, Math.max(16, slashMenu.x))}px`, top: `${slashMenu.y}px` }}
        >
          <div className="text-[10px] font-bold text-slate-500 uppercase px-2.5 py-1">
            Menu Kilat Editor
          </div>
          <div className="space-y-0.5">
            {filteredSlashCommands.map((cmd, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  cmd.action();
                  setSlashMenu(prev => ({ ...prev, open: false }));
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                  idx === slashMenu.selectedIndex
                    ? 'bg-[#FF2E7E] text-white'
                    : 'text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <span className="p-1 rounded-lg bg-black/40 border border-white/5">
                  {cmd.icon}
                </span>
                <span>{cmd.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* EDITOR CONTENT AREA */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* BOTTOM STATUS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-neutral-950 border-t border-slate-800 text-[11px] text-slate-400 font-medium select-none">
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-white font-mono">{wordCount}</strong> kata
          </span>
          <span className="text-slate-700">•</span>
          <span>
            <strong className="text-white font-mono">{charCount}</strong> karakter
          </span>
          <span className="text-slate-700">•</span>
          <span>
            Estimasi baca: <strong className="text-cyan-400 font-semibold">{estimatedReadTime} mnt</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-[10px]">
          <span>Ketik <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300">/</kbd> untuk menu perintah</span>
          <span className="text-slate-700">•</span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            WYSIWYG Tiptap Aktif
          </span>
        </div>
      </div>

      {/* LINK INSERTION MODAL */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#FF2E7E]" />
                <span>Sisipkan Tautan Web (Hyperlink)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Alamat URL Tujuan <span className="text-[#FF2E7E]">*</span>
              </label>
              <input
                type="url"
                value={linkUrlInput}
                onChange={(e) => setLinkUrlInput(e.target.value)}
                placeholder="https://contoh-domain.com/halaman"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsertLink();
                  }
                }}
              />
              {linkError && <p className="text-xs text-rose-400">{linkError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                className="px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Terapkan Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOCIAL MEDIA EMBED MODAL */}
      {isEmbedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#FF2E7E]" />
                <span>Sematkan Konten Media Sosial</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEmbedModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provider Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
              {(['auto', 'youtube', 'instagram', 'x', 'tiktok', 'threads'] as const).map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setEmbedProviderChoice(prov)}
                  className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    embedProviderChoice === prov
                      ? 'bg-[#FF2E7E] text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {prov === 'auto' && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                  {prov === 'youtube' && <Play className="w-3.5 h-3.5 text-red-500 fill-current" />}
                  {prov === 'instagram' && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
                  {prov === 'x' && <Twitter className="w-3.5 h-3.5 text-sky-400 fill-current" />}
                  {prov === 'tiktok' && <Video className="w-3.5 h-3.5 text-teal-400" />}
                  {prov === 'threads' && <AtSign className="w-3.5 h-3.5 text-purple-400" />}
                  <span className="capitalize">{prov === 'auto' ? 'Deteksi Otomatis' : prov}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tautan / URL Konten <span className="text-[#FF2E7E]">*</span>
                </label>
                <input
                  type="url"
                  value={embedUrlInput}
                  onChange={(e) => {
                    setEmbedUrlInput(e.target.value);
                    if (embedError) setEmbedError(null);
                  }}
                  placeholder={
                    embedProviderChoice === 'auto'
                      ? 'Tempel tautan YouTube, Instagram, X/Twitter, TikTok, atau Threads...'
                      : PROVIDER_CONFIGS[embedProviderChoice]?.placeholderText
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                  autoFocus
                />
                {embedError && (
                  <p className="text-xs text-rose-400 mt-1.5 font-medium leading-relaxed">
                    {embedError}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Takarir / Keterangan Sumber (Opsional)
                </label>
                <input
                  type="text"
                  value={embedCaptionInput}
                  onChange={(e) => setEmbedCaptionInput(e.target.value)}
                  placeholder="Contoh: Teaser trailer resmi Warner Bros..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E]"
                />
              </div>

              {/* Security & Supported notice */}
              <div className="p-3 rounded-xl bg-black/40 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                <span className="text-slate-300 font-bold block mb-0.5">ℹ️ Ketentuan Sematan:</span>
                Hanya tautan resmi dari host terverifikasi yang didukung. Script disanitasi dan dimuat secara lazy-load saat artikel dibaca untuk performa maksimal.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEmbedModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertEmbed}
                className="px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Sisipkan Embed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE INSERTION MODAL */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span>Sisipkan Gambar Artikel</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Upload from Device button */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
              <UploadCloud className="w-8 h-8 text-[#FF2E7E] mx-auto" />
              <div className="text-xs font-bold text-slate-200">
                Unggah Berkas dari Komputer / HP
              </div>
              <p className="text-[11px] text-slate-400">
                Gambar akan otomatis dikompresi dan disimpan ke Firebase Storage.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsImageModalOpen(false);
                  fileInputRef.current?.click();
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-[#FF2E7E] hover:bg-[#e0266e] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-2"
              >
                <span>Pilih Berkas Foto</span>
              </button>
            </div>

            <div className="text-center text-xs text-slate-500 font-bold">
              — ATAU GUNAKAN URL EKSTERNAL —
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  URL Gambar (HTTPS)
                </label>
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Teks Alternatif (Alt Text)
                </label>
                <input
                  type="text"
                  value={imageAltInput}
                  onChange={(e) => setImageAltInput(e.target.value)}
                  placeholder="Deskripsi singkat objek foto..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Takarir / Sumber Gambar
                </label>
                <input
                  type="text"
                  value={imageCaptionInput}
                  onChange={(e) => setImageCaptionInput(e.target.value)}
                  placeholder="Foto: Warner Bros. Pictures"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertImageUrl}
                disabled={!imageUrlInput.trim()}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
              >
                Sisipkan dari URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
