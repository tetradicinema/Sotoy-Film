import React from 'react';

interface LegacyMarkdownContentProps {
  content: string;
}

export const LegacyMarkdownContent: React.FC<LegacyMarkdownContentProps> = ({ content }) => {
  interface TableData {
    headers: string[];
    rows: string[][];
  }

  interface ArticleContentBlock {
    type: 'h1' | 'h2' | 'h3' | 'callout' | 'list' | 'table' | 'image' | 'p';
    text?: string;
    items?: string[];
    tableData?: TableData;
    imageUrl?: string;
  }

  const blocks: ArticleContentBlock[] = [];
  const rawParagraphs = (content || '').split('\n\n');

  for (const rawPara of rawParagraphs) {
    const trimmed = rawPara.trim();
    if (!trimmed) continue;

    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      blocks.push({
        type: 'image',
        text: imgMatch[1].trim(),
        imageUrl: imgMatch[2].trim(),
      });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({
        type: 'h3',
        text: trimmed.slice(4).trim(),
      });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({
        type: 'h2',
        text: trimmed.slice(3).trim(),
      });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({
        type: 'h1',
        text: trimmed.slice(2).trim(),
      });
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      blocks.push({
        type: 'callout',
        text: trimmed.replace(/\*\*/g, '').trim(),
      });
    } else if (trimmed.startsWith('- ')) {
      const lines = trimmed.split('\n');
      const bulletItems: string[] = [];
      let currentItem = '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('- ')) {
          if (currentItem) bulletItems.push(currentItem);
          currentItem = trimmedLine.slice(2).trim();
        } else if (currentItem) {
          currentItem += ' ' + trimmedLine;
        } else {
          bulletItems.push(trimmedLine);
        }
      }
      if (currentItem) bulletItems.push(currentItem);

      const prevBlock = blocks[blocks.length - 1];
      if (prevBlock && prevBlock.type === 'list' && prevBlock.items) {
        prevBlock.items.push(...bulletItems);
      } else {
        blocks.push({
          type: 'list',
          items: bulletItems,
        });
      }
    } else if (trimmed.startsWith('|') && trimmed.includes('|')) {
      const lines = trimmed.split('\n').filter(l => l.trim().startsWith('|'));
      if (lines.length >= 2) {
        const headers: string[] = [];
        const rows: string[][] = [];
        let isFirstRow = true;

        lines.forEach((line) => {
          const trimmedLine = line.trim();
          if (/^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(trimmedLine)) {
            isFirstRow = false;
            return;
          }

          const cells = trimmedLine
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(c => c.trim());

          if (isFirstRow) {
            headers.push(...cells);
            isFirstRow = false;
          } else {
            rows.push(cells);
          }
        });

        if (headers.length > 0) {
          blocks.push({
            type: 'table',
            tableData: { headers, rows },
          });
        } else {
          blocks.push({
            type: 'p',
            text: rawPara,
          });
        }
      } else {
        blocks.push({
          type: 'p',
          text: rawPara,
        });
      }
    } else {
      blocks.push({
        type: 'p',
        text: rawPara,
      });
    }
  }

  const renderInline = (str: string) => {
    if (!str) return null;
    const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = str.split(tokenRegex);

    return parts.map((part, i) => {
      if (!part) return null;

      // Link: [text](url)
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, text, url] = linkMatch;
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FF2E7E] hover:underline font-semibold"
            onClick={(e) => e.stopPropagation()}
          >
            {text}
          </a>
        );
      }

      // Bold: **text**
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic: *text*
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
        return (
          <em key={i} className="italic text-slate-200">
            {part.slice(1, -1)}
          </em>
        );
      }

      return part;
    });
  };

  return (
    <div className="prose prose-invert max-w-none text-slate-200 text-sm sm:text-base leading-relaxed space-y-4 pt-4">
      {blocks.map((block, idx) => {
        if (block.type === 'h1') {
          return (
            <h1 key={idx} className="font-display font-black text-2xl sm:text-3xl text-white pt-6 pb-2 border-b border-slate-800">
              {block.text}
            </h1>
          );
        }
        if (block.type === 'h2') {
          return (
            <h2 key={idx} className="font-display font-black text-xl sm:text-2xl text-white pt-5 pb-1.5 border-b border-slate-800">
              {block.text}
            </h2>
          );
        }
        if (block.type === 'h3') {
          return (
            <h3 key={idx} className="font-display font-black text-xl text-white pt-4 pb-1 border-b border-slate-800">
              {block.text}
            </h3>
          );
        }
        if (block.type === 'callout') {
          return (
            <div key={idx} className="bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 p-4 rounded-2xl text-[#FF2E7E] font-bold">
              {block.text}
            </div>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={idx} className="list-disc list-inside space-y-1.5 text-slate-300 my-4 pl-2">
              {block.items?.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'table' && block.tableData) {
          const { headers, rows } = block.tableData;
          return (
            <div key={idx} className="my-6 overflow-x-auto rounded-2xl border border-slate-800 bg-neutral-950/80 shadow-xl">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                {headers.length > 0 && (
                  <thead>
                    <tr className="bg-neutral-900 border-b border-slate-800">
                      {headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-4 py-3 font-display font-black text-white uppercase tracking-wider text-[11px] sm:text-xs"
                        >
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-slate-800/60">
                  {rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-4 py-3 text-slate-300 leading-relaxed"
                        >
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === 'image' && block.imageUrl) {
          return (
            <figure key={idx} className="my-6 rounded-2xl overflow-hidden border border-slate-800 bg-neutral-950/80 shadow-xl group">
              <img
                src={block.imageUrl}
                alt={block.text || 'Ilustrasi Artikel'}
                className="w-full max-h-[540px] object-cover rounded-t-xl transition-transform duration-300 group-hover:scale-[1.01]"
                loading="lazy"
              />
              {block.text && (
                <figcaption className="p-3 text-center text-xs text-slate-400 italic bg-neutral-900/50 border-t border-slate-800">
                  {block.text}
                </figcaption>
              )}
            </figure>
          );
        }
        return (
          <p key={idx} className="text-slate-300 leading-relaxed whitespace-pre-line">
            {renderInline(block.text || '')}
          </p>
        );
      })}
    </div>
  );
};
