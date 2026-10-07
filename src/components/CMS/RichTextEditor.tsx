import React, { useRef, useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Code,
  Link,
  Image as ImageIcon,
  Table as TableIcon,
  HelpCircle,
  Maximize2,
  Minimize2,
  Loader2,
  UploadCloud,
  Clock,
  Sparkles,
} from 'lucide-react';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useApp } from '../../context/AppContext';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Mulai menulis artikel...',
  id = 'write-content-textarea',
}) => {
  const { currentUser, showToast } = useApp();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalChangeRef = useRef(false);

  // Default to direct visual mode: formatting is directly visible as you type
  const [editorMode, setEditorMode] = useState<'visual' | 'markdown'>('visual');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Parse a basic subset of markdown into styled HTML for live formatted editor
  const parseMarkdown = (md: string) => {
    if (!md || !md.trim()) return '';
    
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*?)$/gm, '<h3 class="text-base font-black text-white mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 class="text-lg font-black text-white mt-5 mb-2">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 class="text-xl font-black text-white mt-6 mb-3">$1</h1>');

    // Images: ![alt](url)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<figure class="my-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-xl"><img src="$2" alt="$1" class="w-full max-h-[480px] object-cover rounded-t-xl" loading="lazy" /><figcaption class="p-2.5 text-center text-xs text-slate-400 italic bg-white/[0.02] border-t border-white/[0.06]">$1</figcaption></figure>');

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>');

    // Blockquotes
    html = html.replace(/^&gt;\s+(.*?)$/gm, '<blockquote class="border-l-4 border-[#FF2E7E] pl-4 py-1 italic bg-white/[0.03] text-slate-300 my-4 rounded-r-lg">$1</blockquote>');

    // Code Blocks & Inline Code
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-black/50 p-3 rounded-xl font-mono text-xs text-slate-200 overflow-x-auto my-4 border border-white/[0.08]">$1</pre>');
    html = html.replace(/`(.*?)`/g, '<code class="bg-black/50 px-1.5 py-0.5 rounded font-mono text-xs text-slate-200 border border-white/[0.08]">$1</code>');

    // Tables: match lines containing pipes
    html = html.replace(/(?:^|\n)(\|(?:[^\n]+\|)+)(?:\n(\|(?:[^\n]+\|)+))+/gm, (match) => {
      const lines = match.trim().split('\n').filter(Boolean);
      if (lines.length < 2) return match;

      let isHeader = true;
      let thead = '';
      let tbody = '';

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (/^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(trimmed)) {
          isHeader = false;
          return;
        }

        const cells = trimmed
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(c => c.trim());

        if (idx === 0 || isHeader) {
          thead = `<thead><tr class="bg-white/[0.06] border-b border-white/10">${cells.map(c => `<th class="px-3.5 py-2.5 text-left font-bold text-xs text-white uppercase tracking-wider">${c}</th>`).join('')}</tr></thead>`;
          isHeader = false;
        } else {
          tbody += `<tr class="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">${cells.map(c => `<td class="px-3.5 py-2 text-xs text-slate-300">${c}</td>`).join('')}</tr>`;
        }
      });

      return `<div class="overflow-x-auto my-4 rounded-xl border border-white/10 bg-black/40"><table class="w-full border-collapse text-left text-xs">${thead}<tbody>${tbody}</tbody></table></div>`;
    });

    // Unordered Lists
    html = html.replace(/^\s*-\s+(.*?)$/gm, '<li class="list-disc list-inside text-slate-300 ml-4 my-1">$1</li>');
    
    // Ordered Lists
    html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li class="list-decimal list-inside text-slate-300 ml-4 my-1">$1</li>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#FF2E7E] hover:underline font-semibold">$1</a>');

    // Split paragraphs
    const paragraphs = html.split(/\n{2,}/);
    const formattedParagraphs = paragraphs.map(p => {
      const trimmed = p.trim();
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<li') ||
        trimmed.startsWith('<figure') ||
        trimmed.startsWith('<div class="overflow-x-auto')
      ) {
        return p;
      }
      return `<p class="text-slate-300 leading-relaxed text-sm my-3">${p.replace(/\n/g, '<br/>')}</p>`;
    });

    return formattedParagraphs.join('\n');
  };

  // Sync external markdown changes into editorRef HTML
  useEffect(() => {
    if (editorMode === 'visual' && editorRef.current) {
      if (isInternalChangeRef.current) {
        isInternalChangeRef.current = false;
        return;
      }
      const html = parseMarkdown(value);
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    }
  }, [value, editorMode]);

  const handleVisualInput = () => {
    if (!editorRef.current) return;
    isInternalChangeRef.current = true;
    const html = editorRef.current.innerHTML;
    const markdown = convertHtmlToMarkdown(html);
    onChange(markdown);
  };

  const handleVisualPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        processAndUploadImage(file);
        return;
      }
    }

    const html = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');

    // If pasting a plain URL while text is selected
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    const isUrl = /^https?:\/\/[^\s]+$/i.test(plainText.trim());
    if (selectedText.trim() && isUrl) {
      e.preventDefault();
      const linkHtml = `<a href="${plainText.trim()}" target="_blank" rel="noopener noreferrer" class="text-[#FF2E7E] hover:underline font-semibold">${selectedText}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
      handleVisualInput();
      return;
    }

    if (html) {
      e.preventDefault();
      const cleanMarkdown = convertHtmlToMarkdown(html);
      const cleanHtml = parseMarkdown(cleanMarkdown);
      document.execCommand('insertHTML', false, cleanHtml);
      handleVisualInput();
      return;
    }
  };

  // Upload image to Firebase Storage and insert tag into editor
  const processAndUploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast?.('Hanya format gambar (JPG, PNG, WebP, GIF) yang didukung.', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast?.('Ukuran gambar maksimal 15MB.', 'error');
      return;
    }

    try {
      setIsUploadingImage(true);
      showToast?.('Mengunggah gambar ke Firebase Storage...', 'info');

      const authorId = currentUser?.id || 'writer';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const storagePath = `articles_media/${authorId}/${timestamp}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      let downloadUrl = '';
      try {
        await uploadBytes(storageRef, file, {
          contentType: file.type,
        });
        downloadUrl = await getDownloadURL(storageRef);
      } catch (storageErr: any) {
        console.warn('[Storage] uploadBytes fallback to base64 data url:', storageErr);
        downloadUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      if (downloadUrl) {
        const altText = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Ilustrasi Gambar';
        
        if (editorMode === 'visual' && editorRef.current) {
          editorRef.current.focus();
          const figureHtml = `<figure class="my-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-xl"><img src="${downloadUrl}" alt="${altText}" class="w-full max-h-[480px] object-cover rounded-t-xl" loading="lazy" /><figcaption class="p-2.5 text-center text-xs text-slate-400 italic bg-white/[0.02] border-t border-white/[0.06]">${altText}</figcaption></figure><p><br></p>`;
          document.execCommand('insertHTML', false, figureHtml);
          handleVisualInput();
        } else {
          const textarea = textareaRef.current;
          const markdownImage = `\n\n![${altText}](${downloadUrl})\n\n`;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const newValue = text.substring(0, start) + markdownImage + text.substring(end);
            onChange(newValue);
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(start + markdownImage.length, start + markdownImage.length);
            }, 30);
          } else {
            onChange((value ? value + '\n\n' : '') + markdownImage);
          }
        }

        showToast?.('Gambar berhasil diunggah dan disisipkan!', 'success');
      }
    } catch (err: any) {
      console.error('[Article Image Upload] Error:', err);
      showToast?.('Gagal mengunggah gambar. Silakan coba lagi.', 'error');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper to convert rich HTML from clipboard into clean Markdown
  const convertHtmlToMarkdown = (html: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const processNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent || '';
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return '';
        }

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // Skip non-content tags
        if (['script', 'style', 'meta', 'link', 'head', 'svg', 'noscript'].includes(tag)) {
          return '';
        }

        // Handle table explicitly
        if (tag === 'table') {
          const rows = Array.from(el.querySelectorAll('tr'));
          if (rows.length === 0) return '';

          const markdownRows: string[] = [];
          let maxCols = 0;
          const tableData: string[][] = [];

          rows.forEach((tr) => {
            const cells = Array.from(tr.querySelectorAll('th, td'));
            const cellTexts = cells.map(c => {
              let cellInner = '';
              c.childNodes.forEach(child => {
                cellInner += processNode(child);
              });
              return cellInner.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim();
            });
            if (cellTexts.length > maxCols) maxCols = cellTexts.length;
            tableData.push(cellTexts);
          });

          if (maxCols === 0) return '';

          tableData.forEach((row, rowIndex) => {
            while (row.length < maxCols) {
              row.push('');
            }
            markdownRows.push(`| ${row.join(' | ')} |`);

            if (rowIndex === 0) {
              const separator = Array(maxCols).fill('---').join(' | ');
              markdownRows.push(`| ${separator} |`);
            }
          });

          return `\n\n${markdownRows.join('\n')}\n\n`;
        }

        // Handle images
        if (tag === 'img') {
          const src = el.getAttribute('src');
          const alt = el.getAttribute('alt') || 'Gambar';
          if (src && !src.startsWith('data:image/svg')) {
            return `\n\n![${alt}](${src})\n\n`;
          }
          return '';
        }

        // Check inline style rules on any element (e.g. span, p, div, font, etc.)
        let isBoldStyle = false;
        let isItalicStyle = false;
        let isStrikethrough = false;

        const styleAttr = el.getAttribute('style') || '';
        if (styleAttr) {
          const lowerStyle = styleAttr.toLowerCase();
          if (
            (lowerStyle.includes('font-weight') && (lowerStyle.includes('bold') || lowerStyle.includes('700') || lowerStyle.includes('800') || lowerStyle.includes('900') || lowerStyle.includes('600')))
          ) {
            isBoldStyle = true;
          }
          if (lowerStyle.includes('font-style') && (lowerStyle.includes('italic') || lowerStyle.includes('oblique'))) {
            isItalicStyle = true;
          }
          if (lowerStyle.includes('text-decoration') && lowerStyle.includes('line-through')) {
            isStrikethrough = true;
          }
        }

        let inner = '';
        node.childNodes.forEach((child) => {
          inner += processNode(child);
        });

        let result = inner;

        switch (tag) {
          case 'a': {
            const href = el.getAttribute('href');
            const cleanText = inner.replace(/\s+/g, ' ').trim();
            if (href && cleanText && !href.startsWith('javascript:') && !href.startsWith('vbscript:')) {
              result = `[${cleanText}](${href})`;
            } else {
              result = inner;
            }
            break;
          }
          case 'b':
          case 'strong': {
            const trimmed = inner.trim();
            result = trimmed ? `**${trimmed}**` : '';
            break;
          }
          case 'i':
          case 'em': {
            const trimmed = inner.trim();
            result = trimmed ? `*${trimmed}*` : '';
            break;
          }
          case 's':
          case 'del':
          case 'strike': {
            const trimmed = inner.trim();
            result = trimmed ? `~~${trimmed}~~` : '';
            break;
          }
          case 'u': {
            result = inner;
            break;
          }
          case 'h1': {
            const trimmed = inner.trim();
            result = trimmed ? `\n\n# ${trimmed}\n\n` : '';
            break;
          }
          case 'h2': {
            const trimmed = inner.trim();
            result = trimmed ? `\n\n## ${trimmed}\n\n` : '';
            break;
          }
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6': {
            const trimmed = inner.trim();
            result = trimmed ? `\n\n### ${trimmed}\n\n` : '';
            break;
          }
          case 'li': {
            const trimmed = inner.trim();
            result = trimmed ? `\n- ${trimmed}` : '';
            break;
          }
          case 'ul':
          case 'ol': {
            result = `\n${inner}\n`;
            break;
          }
          case 'p': {
            const trimmed = inner.trim();
            result = trimmed ? `\n\n${trimmed}\n\n` : '';
            break;
          }
          case 'blockquote': {
            const lines = inner.trim().split('\n');
            result = `\n\n${lines.map(l => `> ${l}`).join('\n')}\n\n`;
            break;
          }
          case 'code': {
            result = `\`${inner}\``;
            break;
          }
          case 'pre': {
            result = `\n\`\`\`\n${inner.trim()}\n\`\`\`\n`;
            break;
          }
          case 'br': {
            result = '\n';
            break;
          }
          case 'div':
          case 'section':
          case 'article':
          case 'main':
          case 'header':
          case 'footer': {
            result = inner ? `\n${inner}\n` : '';
            break;
          }
          case 'tr':
          case 'thead':
          case 'tbody':
          case 'tfoot':
          case 'th':
          case 'td': {
            result = inner.trim();
            break;
          }
          default:
            result = inner;
            break;
        }

        // Apply inline styles detected on span / font / div tags if not already wrapped
        if (isBoldStyle && !result.startsWith('**') && result.trim()) {
          result = `**${result.trim()}**`;
        }
        if (isItalicStyle && !result.startsWith('*') && result.trim()) {
          result = `*${result.trim()}*`;
        }
        if (isStrikethrough && !result.startsWith('~~') && result.trim()) {
          result = `~~${result.trim()}~~`;
        }

        return result;
      };

      const result = processNode(doc.body);
      return result
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } catch (err) {
      console.warn('Failed to parse rich HTML on paste:', err);
      return '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 0. If pasting a local image / screenshot file directly from clipboard
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        processAndUploadImage(file);
        return;
      }
    }

    const html = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);

    // 1. If text is selected in editor and user pastes a URL, auto-wrap into [selectedText](url)
    const isUrl = /^https?:\/\/[^\s]+$/i.test(plainText.trim());
    if (selected.trim() && isUrl) {
      e.preventDefault();
      const replacement = `[${selected}](${plainText.trim()})`;
      const newValue = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
      }, 20);
      return;
    }

    // 2. If clipboard contains rich HTML (tables, images, links, bold, headings, lists, inline styles)
    if (html && (
      /<(table|tr|td|th|img|a|strong|b|em|i|s|del|strike|u|h[1-6]|li|ul|ol|p|blockquote|code|pre|div|span)[^>]*>/i.test(html) ||
      html.includes('style=') ||
      html.includes('href=')
    )) {
      const markdown = convertHtmlToMarkdown(html);
      if (markdown && markdown.length > 0) {
        e.preventDefault();
        const newValue = textarea.value.substring(0, start) + markdown + textarea.value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + markdown.length, start + markdown.length);
        }, 20);
        return;
      }
    }

    // 3. If clipboard is TSV (tab-separated spreadsheet text e.g. from Excel / Google Sheets)
    if (plainText && plainText.includes('\t') && plainText.includes('\n')) {
      const lines = plainText.trim().split('\n').filter(Boolean);
      if (lines.length >= 2 && lines[0].includes('\t')) {
        const tableRows: string[] = [];
        let colCount = 0;
        lines.forEach((line, idx) => {
          const cells = line.split('\t').map(c => c.trim().replace(/\|/g, '\\|'));
          if (cells.length > colCount) colCount = cells.length;
          tableRows.push(`| ${cells.join(' | ')} |`);
          if (idx === 0) {
            tableRows.push(`| ${Array(cells.length).fill('---').join(' | ')} |`);
          }
        });
        const markdownTable = `\n\n${tableRows.join('\n')}\n\n`;
        e.preventDefault();
        const newValue = textarea.value.substring(0, start) + markdownTable + textarea.value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + markdownTable.length, start + markdownTable.length);
        }, 20);
        return;
      }
    }
  };

  const handleInsertLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    if (selectedText) {
      const replacement = `[${selectedText}](https://)`;
      const newValue = text.substring(0, start) + replacement + text.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.focus();
        const urlStart = start + selectedText.length + 3;
        const urlEnd = urlStart + 8;
        textarea.setSelectionRange(urlStart, urlEnd);
      }, 30);
    } else {
      const replacement = '[teks tautan](https://)';
      const newValue = text.substring(0, start) + replacement + text.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.focus();
        const urlStart = start + 14;
        const urlEnd = urlStart + 8;
        textarea.setSelectionRange(urlStart, urlEnd);
      }, 30);
    }
  };

  const handleInsertTable = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const templateTable = `\n\n| Kolom 1 | Kolom 2 | Kolom 3 |\n| --- | --- | --- |\n| Data 1 | Keterangan A | 9.0 |\n| Data 2 | Keterangan B | 8.5 |\n| Data 3 | Keterangan C | 9.2 |\n\n`;
    const newValue = text.substring(0, start) + templateTable + text.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      // Highlight "Kolom 1" so user can edit table directly
      const firstCellStart = start + 4;
      const firstCellEnd = firstCellStart + 7;
      textarea.setSelectionRange(firstCellStart, firstCellEnd);
    }, 30);
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = prefix + (selectedText || placeholder.replace('Mulai menulis ', '')) + suffix;
    const newValue = text.substring(0, start) + replacement + text.substring(end);

    onChange(newValue);

    // Focus and select the newly inserted text
    setTimeout(() => {
      textarea.focus();
      const selectLen = selectedText ? selectedText.length : (replacement.length - prefix.length - suffix.length);
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectLen);
    }, 50);
  };

  // Counting stats
  const wordCount = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = value ? value.length : 0;

  const handleApplyFormatting = (cmd: string) => {
    if (editorMode === 'visual') {
      editorRef.current?.focus();
      if (cmd === 'bold') {
        document.execCommand('bold', false);
      } else if (cmd === 'italic') {
        document.execCommand('italic', false);
      } else if (cmd === 'h1') {
        document.execCommand('formatBlock', false, '<h1>');
      } else if (cmd === 'h2') {
        document.execCommand('formatBlock', false, '<h2>');
      } else if (cmd === 'h3') {
        document.execCommand('formatBlock', false, '<h3>');
      } else if (cmd === 'quote') {
        document.execCommand('formatBlock', false, '<blockquote>');
      } else if (cmd === 'ul') {
        document.execCommand('insertUnorderedList', false);
      } else if (cmd === 'ol') {
        document.execCommand('insertOrderedList', false);
      } else if (cmd === 'code') {
        document.execCommand('formatBlock', false, '<pre>');
      } else if (cmd === 'link') {
        const url = window.prompt('Masukkan alamat tautan URL (contoh: https://sotoyfilm.id):', 'https://');
        if (url && url.trim()) {
          document.execCommand('createLink', false, url.trim());
        }
      } else if (cmd === 'table') {
        const tableHtml = `<div class="overflow-x-auto my-4 rounded-xl border border-white/10 bg-black/40"><table class="w-full border-collapse text-left text-xs"><thead><tr class="bg-white/[0.06] border-b border-white/10"><th class="px-3.5 py-2.5 text-left font-bold text-xs text-white uppercase tracking-wider">Kolom 1</th><th class="px-3.5 py-2.5 text-left font-bold text-xs text-white uppercase tracking-wider">Kolom 2</th><th class="px-3.5 py-2.5 text-left font-bold text-xs text-white uppercase tracking-wider">Kolom 3</th></tr></thead><tbody><tr class="border-b border-white/[0.05]"><td class="px-3.5 py-2 text-xs text-slate-300">Data 1</td><td class="px-3.5 py-2 text-xs text-slate-300">Keterangan A</td><td class="px-3.5 py-2 text-xs text-slate-300">9.0</td></tr><tr class="border-b border-white/[0.05]"><td class="px-3.5 py-2 text-xs text-slate-300">Data 2</td><td class="px-3.5 py-2 text-xs text-slate-300">Keterangan B</td><td class="px-3.5 py-2 text-xs text-slate-300">8.5</td></tr></tbody></table></div><p><br></p>`;
        document.execCommand('insertHTML', false, tableHtml);
      }
      handleVisualInput();
    } else {
      if (cmd === 'bold') insertFormatting('**', '**');
      else if (cmd === 'italic') insertFormatting('*', '*');
      else if (cmd === 'h1') insertFormatting('# ', '');
      else if (cmd === 'h2') insertFormatting('## ', '');
      else if (cmd === 'h3') insertFormatting('### ', '');
      else if (cmd === 'quote') insertFormatting('> ', '');
      else if (cmd === 'ul') insertFormatting('- ', '');
      else if (cmd === 'ol') insertFormatting('1. ', '');
      else if (cmd === 'code') insertFormatting('`', '`');
      else if (cmd === 'link') handleInsertLink();
      else if (cmd === 'table') handleInsertTable();
    }
  };

  return (
    <div
      className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative w-full'
      }`}
    >
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processAndUploadImage(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* 1. EDITOR TOOLBAR & NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 border-b border-slate-800/80">
        
        {/* Formatting Buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => handleApplyFormatting('bold')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tebal / Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleApplyFormatting('italic')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Miring / Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          
          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => handleApplyFormatting('h1')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Heading 1 (Judul Utama)"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleApplyFormatting('h2')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Heading 2 (Subjudul)"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleApplyFormatting('h3')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Heading 3 (Sub-bagian)"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => handleApplyFormatting('quote')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Kutipan / Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleApplyFormatting('ul')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Daftar Poin (Bullet List)"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleApplyFormatting('ol')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Daftar Angka (Numbered List)"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleApplyFormatting('code')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Blok Kode"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleApplyFormatting('link')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Sisipkan Tautan / Link"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleApplyFormatting('table')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Sisipkan Tabel Baru Langsung"
          >
            <TableIcon className="w-4 h-4 text-[#FF2E7E]" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer relative"
            title="Unggah Gambar Lokal (Firebase Storage)"
          >
            {isUploadingImage ? (
              <Loader2 className="w-4 h-4 text-[#FF2E7E] animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4 text-[#FF2E7E]" />
            )}
          </button>
        </div>

        {/* Right Status Indicator & Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Format Langsung Active Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-[#FF2E7E] text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#FF2E7E]" />
            <span>{editorMode === 'visual' ? 'Format Langsung Terlihat' : 'Mode Markdown Mentah'}</span>
          </div>

          {/* Toggle between Direct Visual and Raw Markdown */}
          <button
            type="button"
            onClick={() => {
              if (editorMode === 'visual') {
                setEditorMode('markdown');
              } else {
                setEditorMode('visual');
                setTimeout(() => {
                  if (editorRef.current) {
                    editorRef.current.innerHTML = parseMarkdown(value);
                  }
                }, 10);
              }
            }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title={editorMode === 'visual' ? 'Beralih ke tampilan teks mentah Markdown' : 'Beralih ke tampilan visual langsung'}
          >
            {editorMode === 'visual' ? 'Kode Markdown' : 'Format Langsung'}
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5 hidden sm:block" />

          {/* Help & Fullscreen Toggles */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showHelp ? 'text-[#FF2E7E] bg-white/[0.08]' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Panduan Format"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            title={isFullscreen ? 'Minimize' : 'Fullscreen Editor'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. HELP GUIDE */}
      {showHelp && (
        <div className="p-4 bg-black/40 border-b border-white/[0.08] text-slate-300 text-xs leading-relaxed space-y-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold text-white mb-1">Format Teks & Judul</h4>
            <p className="text-[11px] text-slate-400">
              Format langsung terlihat saat Anda mengetik atau mengeklik tombol di bilah menu di atas. Anda tidak perlu berpindah ke tab pratinjau.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Daftar, Tautan & Gambar</h4>
            <p className="text-[11px] text-slate-400">
              Paste tautan, tabel dari Excel/Sheets, atau salinan artikel web berformat: tautan, tabel, dan gambar otomatis tampil berformat rapi di kanvas editor.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Tabel & Upload Otomatis</h4>
            <div className="bg-white/[0.03] p-2 rounded-lg border border-white/[0.06] text-[11px] leading-tight space-y-1 text-slate-300">
              <p className="text-[10px] text-slate-400 font-sans">💡 Tip: Klik tombol Tabel untuk menyisipkan tabel siap isi, atau seret & lepas berkas gambar langsung ke kanvas editor.</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. WRITING CANVAS - DIRECTLY FORMATTED */}
      <div
        className="flex-1 min-h-[260px] relative bg-[#171717]"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
              processAndUploadImage(file);
            }
          }
        }}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 bg-[#FF2E7E]/15 border-2 border-dashed border-[#FF2E7E] z-20 flex flex-col items-center justify-center backdrop-blur-xs text-white rounded-xl pointer-events-none">
            <UploadCloud className="w-10 h-10 text-[#FF2E7E] animate-bounce mb-2" />
            <span className="font-bold text-sm">Lepaskan gambar di sini untuk mengunggah</span>
            <span className="text-xs text-slate-300">File akan otomatis diunggah ke Firebase Storage</span>
          </div>
        )}

        {editorMode === 'visual' ? (
          <div
            id={id}
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleVisualInput}
            onPaste={handleVisualPaste}
            data-placeholder={placeholder}
            className="w-full h-full min-h-[260px] p-5 text-slate-100 font-sans text-sm focus:outline-none overflow-y-auto leading-relaxed prose prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500 empty:before:pointer-events-none"
            style={{ minHeight: isFullscreen ? 'calc(100vh - 160px)' : '280px' }}
          />
        ) : (
          <textarea
            id={id}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="w-full h-full min-h-[260px] bg-[#171717] text-slate-100 p-5 font-mono text-xs placeholder-slate-500 focus:outline-none resize-y leading-relaxed"
            style={{ minHeight: isFullscreen ? 'calc(100vh - 160px)' : '280px' }}
          />
        )}
      </div>

      {/* 4. METRICS / STATS FOOTER */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#171717] border-t border-white/[0.08] text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="tabular-nums font-semibold text-slate-200">{wordCount} Kata</span>
          <span>•</span>
          <span className="tabular-nums">{charCount} Karakter</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 text-[#FF2E7E] font-semibold bg-[#FF2E7E]/10 px-2 py-0.5 rounded-md border border-[#FF2E7E]/20">
            <Clock className="w-3 h-3" />
            <span>~{Math.max(1, Math.ceil(wordCount / 200))} mnt baca</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300 font-sans text-xs">
          <span className={`h-1.5 w-1.5 rounded-full ${isUploadingImage ? 'bg-[#FF2E7E] animate-ping' : 'bg-emerald-500'}`} />
          <span>{isUploadingImage ? 'Mengunggah Gambar ke Storage...' : 'Format Langsung Aktif (Langsung Terlihat Tanpa Pratinjau)'}</span>
        </div>
      </div>
    </div>
  );
};
