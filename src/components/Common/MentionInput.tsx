import React, { useState, useRef, useEffect } from 'react';
import { AtSign, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder = 'Tulis pesan atau tanggapan...',
  rows = 3,
  id,
  className = '',
  onKeyDown,
  autoFocus = false,
}) => {
  const { allUsers } = useApp();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Detect '@' symbol position and text query after '@'
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    onChange(val);

    // Look backward from cursor position to find '@'
    const lastAtPos = val.lastIndexOf('@', cursorPos - 1);

    if (lastAtPos !== -1) {
      // Ensure '@' is at start of line or preceded by whitespace
      const charBeforeAt = lastAtPos > 0 ? val[lastAtPos - 1] : ' ';
      if (/\s/.test(charBeforeAt) || lastAtPos === 0) {
        const queryCandidate = val.slice(lastAtPos + 1, cursorPos);
        // Only trigger mention if query contains no whitespace and is short
        if (!/\s/.test(queryCandidate) && queryCandidate.length <= 20) {
          setMentionStartIndex(lastAtPos);
          setMentionQuery(queryCandidate.toLowerCase());
          setShowSuggestions(true);
          return;
        }
      }
    }

    setShowSuggestions(false);
  };

  // Filter matching users
  const matchingUsers: User[] = mentionQuery
    ? allUsers.filter(
        u =>
          u.name.toLowerCase().includes(mentionQuery) ||
          u.handle.toLowerCase().includes(mentionQuery)
      )
    : allUsers.slice(0, 5);

  const selectUser = (user: User) => {
    if (mentionStartIndex === -1 || !textareaRef.current) return;

    const textBefore = value.slice(0, mentionStartIndex);
    const cursorPos = textareaRef.current.selectionStart || value.length;
    const textAfter = value.slice(cursorPos);

    const handleToAdd = user.handle.startsWith('@') ? user.handle : `@${user.handle}`;
    const newValue = `${textBefore}${handleToAdd} ${textAfter}`;

    onChange(newValue);
    setShowSuggestions(false);

    // Re-focus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = textBefore.length + handleToAdd.length + 1;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleTextChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {/* Floating Mention Autocomplete Suggestions Dropdown */}
      {showSuggestions && matchingUsers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-72 max-h-56 overflow-y-auto bg-[#181A2E] border border-[#00F0FF]/40 rounded-2xl shadow-2xl z-50 p-1.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 scrollbar-thin">
          <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[10px] font-bold text-[#00F0FF] uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <AtSign className="w-3 h-3" /> Mention Warga Sotoy
            </span>
            <span className="text-slate-400 font-normal">{matchingUsers.length} ditemukan</span>
          </div>

          <div className="py-1 space-y-0.5">
            {matchingUsers.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => selectUser(u)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#00F0FF]/15 transition-colors text-left group"
              >
                <img
                  src={u.avatar}
                  alt={u.name}
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700 group-hover:ring-[#00F0FF] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white group-hover:text-[#00F0FF] truncate">
                      {u.name}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                      {u.role === 'si_paling_sotoy'
                        ? 'Kritikus'
                        : u.role === 'penulis_sotoy'
                        ? 'Redaksi'
                        : 'Warga'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block truncate">
                    {u.handle}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
