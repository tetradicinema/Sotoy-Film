import React, { useMemo } from 'react';
import {
  AtSign,
  ChevronDown,
  ChevronUp,
  Facebook,
  Github,
  Globe,
  Hash,
  Instagram,
  Linkedin,
  Music,
  Music2,
  Plus,
  Trash2,
  Youtube,
} from 'lucide-react';
import { ProfileLink, ProfileLinkPlatform } from '../../types';
import {
  detectPlatform,
  createProfileLinkId,
  validateProfileLinks,
  PROFILE_LINK_MAX_LINKS,
  PROFILE_LINK_MAX_URL_LENGTH,
  PROFILE_LINK_MAX_LABEL_LENGTH,
} from '../../utils/profileLinks';

interface ProfileLinksEditorProps {
  value: ProfileLink[];
  onChange: (links: ProfileLink[]) => void;
  max?: number;
  disabled?: boolean;
}

const PLATFORM_META: Record<
  ProfileLinkPlatform,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  instagram: { label: 'Instagram', Icon: Instagram },
  tiktok: { label: 'TikTok', Icon: Music2 },
  youtube: { label: 'YouTube', Icon: Youtube },
  x: { label: 'X (Twitter)', Icon: AtSign },
  facebook: { label: 'Facebook', Icon: Facebook },
  threads: { label: 'Threads', Icon: Hash },
  linkedin: { label: 'LinkedIn', Icon: Linkedin },
  github: { label: 'GitHub', Icon: Github },
  spotify: { label: 'Spotify', Icon: Music },
  website: { label: 'Website', Icon: Globe },
};

const ProfileLinksEditor: React.FC<ProfileLinksEditorProps> = ({
  value,
  onChange,
  max = PROFILE_LINK_MAX_LINKS,
  disabled = false,
}) => {
  // Hooks stay above any conditional logic / early returns.
  const { errors } = useMemo(
    () => validateProfileLinks(value, max),
    [value, max]
  );

  const links = Array.isArray(value) ? value : [];

  const updateLink = (id: string, patch: Partial<ProfileLink>) => {
    onChange(links.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLink = (id: string) => {
    onChange(links.filter(l => l.id !== id));
  };

  const moveLink = (id: string, direction: -1 | 1) => {
    const index = links.findIndex(l => l.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addLink = () => {
    if (disabled || links.length >= max) return;
    onChange([
      ...links,
      { id: createProfileLinkId(), url: '', platform: 'website' },
    ]);
  };

  const canAdd = !disabled && links.length < max;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
          Tautan Profil
        </span>
        <span
          className={`text-[10px] font-bold font-mono tabular-nums px-2 py-0.5 rounded-md border ${
            links.length >= max
              ? 'text-[#FFD000] bg-[#FFD000]/10 border-[#FFD000]/30'
              : 'text-slate-400 bg-slate-800 border-slate-700'
          }`}
          aria-live="polite"
        >
          {links.length}/{max}
        </span>
      </div>

      {links.length === 0 && (
        <p className="text-xs text-slate-500">
          Belum ada tautan. Tambahkan tautan ke media sosial atau situs web kamu.
        </p>
      )}

      {links.map((link, index) => {
        const platform = detectPlatform(link.url || '');
        const meta = PLATFORM_META[platform] ?? PLATFORM_META.website;
        const error = errors[link.id];
        const { Icon } = meta;

        return (
          <div
            key={link.id}
            className="rounded-xl border border-white/10 bg-[#0A0A0A] p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Icon className="w-4 h-4 text-[#FF2E7E] shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                  {meta.label}
                </span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveLink(link.id, -1)}
                  disabled={disabled || index === 0}
                  aria-label={`Pindahkan tautan ${meta.label} ke atas`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-[#FF2E7E]"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveLink(link.id, 1)}
                  disabled={disabled || index === links.length - 1}
                  aria-label={`Pindahkan tautan ${meta.label} ke bawah`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-[#FF2E7E]"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeLink(link.id)}
                  disabled={disabled}
                  aria-label={`Hapus tautan ${meta.label}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <input
              type="text"
              inputMode="url"
              value={link.url}
              onChange={e => updateLink(link.id, { url: e.target.value })}
              placeholder="https://instagram.com/username"
              maxLength={PROFILE_LINK_MAX_URL_LENGTH + 50}
              disabled={disabled}
              aria-label={`URL tautan ${meta.label}`}
              aria-invalid={!!error}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] transition-colors disabled:opacity-50"
            />

            <input
              type="text"
              value={link.label ?? ''}
              onChange={e => updateLink(link.id, { label: e.target.value })}
              placeholder="Label (opsional, mis. Akun pribadi)"
              maxLength={PROFILE_LINK_MAX_LABEL_LENGTH + 20}
              disabled={disabled}
              aria-label="Label tautan (opsional)"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF2E7E] transition-colors disabled:opacity-50"
            />

            {error && (
              <p className="text-[11px] text-red-400 font-medium" role="alert">
                {error}
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addLink}
        disabled={!canAdd}
        aria-label="Tambah tautan"
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#FF2E7E]/40 bg-[#FF2E7E]/5 px-3 py-2 text-xs font-bold text-[#FF2E7E] hover:bg-[#FF2E7E]/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-[#FF2E7E]"
      >
        <Plus className="w-4 h-4" />
        Tambah tautan
      </button>
    </div>
  );
};

export default ProfileLinksEditor;
