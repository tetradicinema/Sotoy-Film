import React, { useRef, useState } from 'react';
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
  Table as TableIcon,
  Eye,
  Edit2,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

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
  id,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Parse a basic subset of markdown into styled HTML for live preview
  const parseMarkdown = (md: string) => {
    if (!md) return '<p class="text-slate-500 italic">Pratinjau kosong...</p>';
    
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*?)$/gm, '<h3 class="text-base font-black text-white mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 class="text-lg font-black text-white mt-5 mb-2">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 class="text-xl font-black text-white mt-6 mb-3">$1</h1>');

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
        trimmed.startsWith('<div class="overflow-x-auto')
      ) {
        return p;
      }
      return `<p class="text-slate-300 leading-relaxed text-sm my-3">${p.replace(/\n/g, '<br/>')}</p>`;
    });

    return formattedParagraphs.join('\n');
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

        let inner = '';
        node.childNodes.forEach((child) => {
          inner += processNode(child);
        });

        switch (tag) {
          case 'a': {
            const href = el.getAttribute('href');
            const cleanText = inner.replace(/\s+/g, ' ').trim();
            if (href && cleanText && !href.startsWith('javascript:')) {
              return `[${cleanText}](${href})`;
            }
            return inner;
          }
          case 'b':
          case 'strong': {
            const trimmed = inner.trim();
            return trimmed ? `**${trimmed}**` : '';
          }
          case 'i':
          case 'em': {
            const trimmed = inner.trim();
            return trimmed ? `*${trimmed}*` : '';
          }
          case 'h1': {
            const trimmed = inner.trim();
            return trimmed ? `\n\n# ${trimmed}\n\n` : '';
          }
          case 'h2': {
            const trimmed = inner.trim();
            return trimmed ? `\n\n## ${trimmed}\n\n` : '';
          }
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6': {
            const trimmed = inner.trim();
            return trimmed ? `\n\n### ${trimmed}\n\n` : '';
          }
          case 'li': {
            const trimmed = inner.trim();
            return trimmed ? `\n- ${trimmed}` : '';
          }
          case 'ul':
          case 'ol': {
            return `\n${inner}\n`;
          }
          case 'p': {
            const trimmed = inner.trim();
            return trimmed ? `\n\n${trimmed}\n\n` : '';
          }
          case 'blockquote': {
            const lines = inner.trim().split('\n');
            return `\n\n${lines.map(l => `> ${l}`).join('\n')}\n\n`;
          }
          case 'code': {
            return `\`${inner}\``;
          }
          case 'pre': {
            return `\n\`\`\`\n${inner.trim()}\n\`\`\`\n`;
          }
          case 'br': {
            return '\n';
          }
          case 'div':
          case 'section':
          case 'article': {
            return inner ? `\n${inner}\n` : '';
          }
          case 'tr':
          case 'thead':
          case 'tbody':
          case 'tfoot':
          case 'th':
          case 'td': {
            return inner.trim();
          }
          default:
            return inner;
        }
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

    // 2. If clipboard contains rich HTML (tables, links, bold, headings, lists)
    if (html && (
      html.includes('<table') ||
      html.includes('<tr') ||
      html.includes('<td') ||
      html.includes('<th') ||
      html.includes('<a ') ||
      html.includes('<a\n') ||
      html.includes('<strong') ||
      html.includes('<b>') ||
      html.includes('<h1') ||
      html.includes('<h2') ||
      html.includes('<h3') ||
      html.includes('<li')
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

  return (
    <div
      className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative w-full'
      }`}
    >
      {/* 1. EDITOR TOOLBAR & NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 border-b border-slate-800/80">
        
        {/* Formatting Buttons (Disabled in Preview Mode) */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => insertFormatting('**', '**')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Bold (**tebal**)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*', '*')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Italic (*miring*)"
          >
            <Italic className="w-4 h-4" />
          </button>
          
          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => insertFormatting('# ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Heading 1 (# Judul)"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('## ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Heading 2 (## Subjudul)"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('### ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Heading 3 (### Sub-bagian)"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => insertFormatting('> ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Kutipan (Blockquote)"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('- ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Bullet List (- item)"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('1. ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Numbered List (1. item)"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('`', '`')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Inline Code (`kode`)"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleInsertLink}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Sisipkan Tautan / Link ([teks](url))"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleInsertTable}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Buat Tabel Baru (| Kolom | Nilai |)"
          >
            <TableIcon className="w-4 h-4 text-[#FF2E7E]" />
          </button>
        </div>

        {/* Tab Switchers & Right Actions */}
        <div className="flex items-center gap-2">
          {/* Write / Preview Tab Toggles */}
          <div className="bg-black/30 p-0.5 rounded-xl border border-white/10 flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('write')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'write'
                  ? 'bg-[#FF2E7E] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Tulis</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#FF2E7E] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau</span>
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Help & Fullscreen Toggles */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showHelp ? 'text-[#FF2E7E] bg-white/[0.08]' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
            title="Panduan Format Markdown"
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
            <h4 className="font-semibold text-white mb-1">Teks & Judul</h4>
            <ul className="space-y-1 list-none">
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">**tebal**</code> &rarr; <strong>Tebal</strong></li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">*miring*</code> &rarr; <em>Miring</em></li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200"># Judul</code> &rarr; Heading Besar</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">## Subjudul</code> &rarr; Heading Medium</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">### Bagian</code> &rarr; Heading Kecil</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Daftar & Tautan</h4>
            <ul className="space-y-1 list-none">
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">- item</code> &rarr; Bullet Point</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">1. item</code> &rarr; Numbered List</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">`kode`</code> &rarr; Code block</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">[Teks](Link)</code> &rarr; Anchor Link</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">&gt; Kutipan</code> &rarr; Blockquote</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Tabel Data</h4>
            <div className="bg-white/[0.03] p-2 rounded-lg border border-white/[0.06] font-mono text-[11px] leading-tight space-y-1 text-slate-300">
              <p>| Kolom 1 | Kolom 2 |</p>
              <p>| --- | --- |</p>
              <p>| Data A | Nilai A |</p>
              <p className="text-[10px] text-slate-500 pt-1 font-sans">💡 Tip: Copy-paste tabel dari Excel/Docs akan otomatis diubah ke format tabel ini.</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. WRITING CANVAS */}
      <div className="flex-1 min-h-[220px] relative">
        {activeTab === 'write' ? (
          <textarea
            id={id}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="w-full h-full min-h-[220px] bg-[#171717] text-slate-100 p-4 font-sans text-sm placeholder-slate-500 focus:outline-none resize-y"
            style={{ minHeight: isFullscreen ? 'calc(100vh - 150px)' : '240px' }}
          />
        ) : (
          <div
            className="w-full h-full overflow-y-auto p-4 bg-[#171717] text-slate-100 markdown-body prose prose-invert max-w-none text-sm leading-relaxed"
            style={{ height: isFullscreen ? 'calc(100vh - 150px)' : '240px', minHeight: '240px' }}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(value) }}
          />
        )}
      </div>

      {/* 4. METRICS / STATS FOOTER */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#171717] border-t border-white/[0.08] text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="tabular-nums">{wordCount} Kata</span>
          <span>•</span>
          <span className="tabular-nums">{charCount} Karakter</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Editor Aktif (Markdown + Tabel + Pratinjau)</span>
        </div>
      </div>
    </div>
  );
};
