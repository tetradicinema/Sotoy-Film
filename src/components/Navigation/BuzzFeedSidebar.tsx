import React from 'react';
import {
  Flame,
  Users,
  Bookmark,
  Heart,
  Sparkles,
  Plus,
  Search,
  MessageSquare,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export type BuzzFeedTab = 'for-you' | 'following' | 'saved' | 'liked' | 'trending';

interface BuzzFeedSidebarProps {
  activeTab: BuzzFeedTab;
  onSelectTab: (tab: BuzzFeedTab) => void;
  onComposeClick: () => void;
  onSearchClick?: () => void;
  className?: string;
  savedCount?: number;
  followingCount?: number;
}

export const BuzzFeedSidebar: React.FC<BuzzFeedSidebarProps> = ({
  activeTab,
  onSelectTab,
  onComposeClick,
  onSearchClick,
  className = '',
  savedCount = 0,
  followingCount = 0,
}) => {
  const { currentUser, isLoggedIn, setLoginModalOpen, navigateTo } = useApp();

  const handleCompose = () => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      return;
    }
    onComposeClick();
  };

  const navItems: {
    id: BuzzFeedTab;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: number | null;
    activeColor: string;
  }[] = [
    {
      id: 'for-you',
      label: 'Untukmu',
      description: 'Semua ulasan & diskusi terkini',
      icon: Flame,
      activeColor: 'text-[#FF2E7E] bg-[#FF2E7E]/10 border-[#FF2E7E]/30',
    },
    {
      id: 'following',
      label: 'Mengikuti',
      description: 'Dari kritikus yang kamu ikuti',
      icon: Users,
      badge: followingCount > 0 ? followingCount : null,
      activeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 'trending',
      label: 'Sedang Hangat',
      description: 'Diskusi dengan interaksi tertinggi',
      icon: Sparkles,
      activeColor: 'text-[#FFD000] bg-[#FFD000]/10 border-[#FFD000]/30',
    },
    {
      id: 'saved',
      label: 'Tersimpan',
      description: 'Koleksi buzz yang kamu bookmark',
      icon: Bookmark,
      badge: savedCount > 0 ? savedCount : null,
      activeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'liked',
      label: 'Disukai',
      description: 'Buzz yang telah kamu beri apresiasi',
      icon: Heart,
      activeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
  ];

  return (
    <aside
      id="sotoy-buzz-sidebar"
      className={`w-64 xl:w-72 shrink-0 sticky top-20 flex flex-col gap-4 select-none ${className}`}
    >
      {/* Brand Header */}
      <div className="bg-[#121324]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF2E7E] to-[#8000FF] flex items-center justify-center text-white shadow-lg shadow-[#FF2E7E]/20">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-black text-sm text-white tracking-tight flex items-center gap-1.5">
                <span>Sotoy Buzz</span>
                <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
              </h2>
              <p className="text-[11px] text-slate-400">Komunitas Pop-Culture Film</p>
            </div>
          </div>
        </div>

        {/* Compose CTA */}
        <div className="pt-3">
          <button
            id="buzz-sidebar-compose-btn"
            onClick={handleCompose}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF2E7E] to-[#FF6B6B] hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-[#FF2E7E]/25 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tulis Buzz Baru</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <nav className="bg-[#121324]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-2.5 shadow-xl space-y-1">
        <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Kategori Feed
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`buzz-nav-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? `${item.activeColor} border font-bold shadow-sm`
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? '' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <div className="truncate">
                  <div className="text-xs font-semibold leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-400 truncate hidden xl:block font-normal mt-0.5">
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Quick Search Shortcut */}
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-medium border border-transparent"
          >
            <Search className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Cari Topik Film...</span>
          </button>
        )}
      </nav>

      {/* User Profile Card Footer */}
      <div className="bg-[#121324]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 shadow-xl">
        {isLoggedIn ? (
          <div
            onClick={() => navigateTo('user-profile')}
            className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                alt={currentUser?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate group-hover:text-[#FF2E7E] transition-colors">
                  {currentUser?.name}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Shield className="w-2.5 h-2.5 text-[#FF2E7E]" />
                  <span className="truncate">{currentUser?.roleTitle?.split(' ')[0] || 'Member'}</span>
                </div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        ) : (
          <button
            onClick={() => setLoginModalOpen(true)}
            className="w-full text-center py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            Masuk untuk Berdiskusi
          </button>
        )}
      </div>
    </aside>
  );
};
