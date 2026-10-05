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

    // Unordered Lists
    html = html.replace(/^\s*-\s+(.*?)$/gm, '<li class="list-disc list-inside text-slate-300 ml-4 my-1">$1</li>');
    
    // Ordered Lists
    html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li class="list-decimal list-inside text-slate-300 ml-4 my-1">$1</li>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#FF2E7E] hover:underline font-semibold">$1</a>');

    // Split paragraphs
    const paragraphs = html.split(/\n{2,}/);
    const formattedParagraphs = paragraphs.map(p => {
      if (p.trim().startsWith('<h') || p.trim().startsWith('<blockquote') || p.trim().startsWith('<pre') || p.trim().startsWith('<li')) {
        return p;
      }
      return `<p class="text-slate-300 leading-relaxed text-sm my-3">${p.replace(/\n/g, '<br/>')}</p>`;
    });

    return formattedParagraphs.join('\n');
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Bold (**tebal**)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*', '*')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Italic (*miring*)"
          >
            <Italic className="w-4 h-4" />
          </button>
          
          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => insertFormatting('# ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('## ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('### ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => insertFormatting('> ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Kutipan (Blockquote)"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('- ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Bullet List (- item)"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('1. ', '')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('`', '`')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('[', '](url)')}
            disabled={activeTab === 'preview'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Insert Link"
          >
            <Link className="w-4 h-4" />
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
            title="Markdown Help Guide"
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
        <div className="p-4 bg-black/40 border-b border-white/[0.08] text-slate-300 text-xs leading-relaxed space-y-2 grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-white mb-1">Markdown Syntax</h4>
            <ul className="space-y-1 list-none">
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">**tebal**</code> &rarr; <strong>Tebal</strong></li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">*miring*</code> &rarr; <em>Miring</em></li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200"># Judul</code> &rarr; Heading Besar</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">## Subjudul</code> &rarr; Heading Medium</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">&gt; Kutipan</code> &rarr; Blockquote</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">Lists & Links</h4>
            <ul className="space-y-1 list-none">
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">- item</code> &rarr; Bullet Point</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">1. item</code> &rarr; Numbered List</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">`kode`</code> &rarr; Code block</li>
              <li><code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-200">[Teks](Link)</code> &rarr; Anchor Link</li>
            </ul>
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
          <span>Editor Aktif (Markdown + Pratinjau)</span>
        </div>
      </div>
    </div>
  );
};
