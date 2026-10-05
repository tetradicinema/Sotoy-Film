import React from 'react';
import {
  Flame,
  Users,
  Sparkles,
  Bookmark,
  Heart,
  Plus,
  MessageSquare,
  Search,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export type BuzzFeedTab = 'for-you' | 'following' | 'trending' | 'saved' | 'liked';

export interface BuzzFeedSidebarProps {
  className?: string;
  activeTab?: BuzzFeedTab;
  onSelectTab?: (tab: BuzzFeedTab) => void;
  savedCount?: number;
  followingCount?: number;
  onComposeClick?: () => void;
  onSearchClick?: () => void;
}

export const BuzzFeedSidebar: React.FC<BuzzFeedSidebarProps> = ({
  className = '',
  activeTab: propActiveTab,
  onSelectTab,
  savedCount: propSavedCount,
  followingCount: propFollowingCount,
  onComposeClick,
  onSearchClick,
}) => {
  const {
    buzzFeedTab: contextActiveTab,
    setBuzzFeedTab,
    isLoggedIn,
    currentUser,
    setLoginModalOpen,
    setIsComposeBuzzOpen,
    navigateTo,
    buzzList,
    savedBuzzIds,
    followingIds,
  } = useApp();

  const activeTab = propActiveTab || contextActiveTab;

  const handleCompose = () => {
    if (onComposeClick) {
      onComposeClick();
      return;
    }
    if (!isLoggedIn) {
      setLoginModalOpen(true);
    } else {
      setIsComposeBuzzOpen(true);
    }
  };

  const handleTabChange = (tabId: BuzzFeedTab) => {
    if (onSelectTab) {
      onSelectTab(tabId);
    }
    setBuzzFeedTab(tabId);
  };

  const savedCount = propSavedCount !== undefined 
    ? propSavedCount 
    : (savedBuzzIds?.length || 0);
  const followingCount = propFollowingCount !== undefined 
    ? propFollowingCount 
    : (followingIds?.length || currentUser?.following?.length || 0);

  const navItems: {
    id: BuzzFeedTab;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: number | null;
  }[] = [
    {
      id: 'for-you',
      label: 'Untukmu',
      description: 'Semua ulasan & diskusi terkini',
      icon: Flame,
    },
    {
      id: 'following',
      label: 'Mengikuti',
      description: 'Dari kritikus yang kamu ikuti',
      icon: Users,
      badge: followingCount > 0 ? followingCount : null,
    },
    {
      id: 'trending',
      label: 'Sedang Hangat',
      description: 'Diskusi dengan interaksi tertinggi',
      icon: Sparkles,
    },
    {
      id: 'saved',
      label: 'Tersimpan',
      description: 'Koleksi buzz yang kamu bookmark',
      icon: Bookmark,
      badge: savedCount > 0 ? savedCount : null,
    },
    {
      id: 'liked',
      label: 'Disukai',
      description: 'Buzz yang telah kamu beri apresiasi',
      icon: Heart,
    },
  ];

  return (
    <aside
      id="sotoy-buzz-sidebar"
      className={`w-64 xl:w-72 shrink-0 sticky top-20 flex flex-col gap-4 select-none ${className}`}
    >
      {/* Brand Header */}
      <div className="bg-[#171717] border border-white/[0.08] rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#171717] border border-white/10 flex items-center justify-center text-[#FF2E7E] shadow-sm">
              <MessageSquare className="w-4 h-4 text-[#FF2E7E]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
                <span>Sotoy Buzz</span>
                <span className="w-2 h-2 rounded-full bg-[#FF2E7E]" />
              </h2>
              <p className="text-xs text-slate-400">Komunitas Pop-Culture Film</p>
            </div>
          </div>
        </div>

        {/* Compose CTA */}
        <div className="pt-3">
          <button
            id="buzz-sidebar-compose-btn"
            onClick={handleCompose}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#FF2E7E] hover:bg-[#e0266e] text-white font-semibold text-xs shadow-md shadow-[#FF2E7E]/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tulis Buzz Baru</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <nav className="bg-[#171717] border border-white/[0.08] rounded-xl p-2.5 shadow-lg space-y-1">
        <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
          Kategori Feed
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`buzz-nav-tab-${item.id}`}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all text-xs border ${
                isActive
                  ? 'text-[#FF2E7E] bg-[#FF2E7E]/10 border-[#FF2E7E]/25 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'scale-110 text-[#FF2E7E]' : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{item.label}</p>
                  <p className="text-[10px] text-slate-400 truncate hidden xl:block">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                <span
                  className={`text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-[#FF2E7E] text-white'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-medium border border-transparent"
          >
            <Search className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Cari Topik Film...</span>
          </button>
        )}
      </nav>

      {/* User Profile Card Footer */}
      <div className="bg-[#171717] border border-white/[0.08] rounded-xl p-3 shadow-lg">
        {isLoggedIn ? (
          <div
            onClick={() => navigateTo('user-profile')}
            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                alt={currentUser?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate group-hover:text-[#FF2E7E] transition-colors">
                  {currentUser?.name}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Shield className="w-3 h-3 text-[#FF2E7E]" />
                  <span className="truncate">{currentUser?.roleTitle?.split(' ')[0] || 'Member'}</span>
                </div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        ) : (
          <button
            onClick={() => setLoginModalOpen(true)}
            className="w-full text-center py-2 px-3 rounded-lg bg-white/[0.05] border border-white/10 hover:border-white/20 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Masuk untuk Berdiskusi
          </button>
        )}
      </div>
    </aside>
  );
};
