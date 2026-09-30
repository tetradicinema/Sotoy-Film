import React from 'react';
import { Trophy, Info, ChevronRight, Users, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { RoleBadge } from './RoleBadge';
import { LeaderboardEntry, LeaderboardPeriod } from '../../utils/leaderboard';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12, y: 5 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export interface LeaderboardPeriodTabsProps {
  activePeriod: LeaderboardPeriod;
  onChangePeriod: (period: LeaderboardPeriod) => void;
  className?: string;
}

export const LeaderboardPeriodTabs: React.FC<LeaderboardPeriodTabsProps> = ({
  activePeriod,
  onChangePeriod,
  className = '',
}) => {
  const tabs: { id: LeaderboardPeriod; label: string }[] = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div
      className={`flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto scrollbar-none whitespace-nowrap shrink-0 ${className}`}
    >
      {tabs.map(t => {
        const isActive = activePeriod === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChangePeriod(t.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              isActive
                ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

export interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  limit?: number;
  compact?: boolean;
  flat?: boolean;
  minimal?: boolean;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  hideGuideButton?: boolean;
  showFooterLink?: boolean;
  emptyText?: string;
  className?: string;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  entries,
  limit = 5,
  compact = false,
  flat = false,
  minimal = false,
  title = 'Review Leaderboards',
  subtitle,
  hideHeader = false,
  hideGuideButton = false,
  showFooterLink = false,
  emptyText = 'Belum ada aktivitas di periode ini',
  className = '',
}) => {
  const { navigateTo } = useApp();
  const displayedEntries = entries.slice(0, limit);

  return (
    <div
      className={
        flat
          ? `flex flex-col justify-start space-y-3 ${className}`
          : `bg-[#171A1F] border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col justify-start space-y-4 ${className}`
      }
    >
      {/* Card Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 pb-3 border-b border-slate-800/80 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] flex items-center justify-center shrink-0">
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className={`font-display font-black text-white truncate ${
                  compact ? 'text-xs' : 'text-sm sm:text-base'
                }`}
              >
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {!hideGuideButton && (
            <button
              type="button"
              onClick={() => navigateTo('panduan-leaderboard')}
              title="Panduan Leaderboard"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-[#FF2E7E] transition-all shrink-0 cursor-pointer shadow-sm inline-flex items-center justify-center"
            >
              <Info className="w-3.5 h-3.5 text-[#FF2E7E] shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* Card Body / Rows */}
      {displayedEntries.length === 0 ? (
        <div className="text-center py-10 px-6 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800/60 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-slate-300 font-bold text-sm">Belum ada jawara di sini</p>
            <p className="text-slate-500 text-xs italic leading-relaxed">
              {emptyText === 'Belum ada aktivitas di periode ini' ? 'Jadilah orang pertama yang mendominasi puncak klasemen!' : emptyText}
            </p>
          </div>
          <button
            onClick={() => navigateTo('community-feed')}
            className="mt-2 px-4 py-2 rounded-xl bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-[11px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-[#FF2E7E]/20 transition-all cursor-pointer"
          >
            <span>Mulai Berdiskusi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={flat ? 'space-y-3' : 'divide-y divide-slate-800/60'}
        >
          {displayedEntries.map(entry => {
            const userInitial = entry.user.name
              ? entry.user.name.charAt(0).toUpperCase()
              : 'U';

            return (
              <motion.div
                key={entry.user.id}
                variants={itemVariants}
                className={`flex items-center justify-between gap-2 sm:gap-3 ${
                  flat ? 'py-1' : compact ? 'py-2' : 'py-2.5 sm:py-3'
                } group`}
              >
                {/* Left: Rank & User Info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Rank Badge */}
                  <div 
                    className="shrink-0 flex items-center justify-center"
                    title={`Peringkat #${entry.rank} berdasarkan akumulasi poin dari ulasan, rating, dan jumlah suka.`}
                  >
                    {entry.rank === 1 ? (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-xs border border-[#F5C542]/60 bg-[#F5C542]/15 text-[#F5C542] shadow-[0_0_8px_rgba(245,197,66,0.2)]">
                        1
                      </div>
                    ) : entry.rank === 2 ? (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-xs border border-[#C0C7D1]/60 bg-[#C0C7D1]/15 text-[#C0C7D1] shadow-[0_0_8px_rgba(192,199,209,0.15)]">
                        2
                      </div>
                    ) : entry.rank === 3 ? (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-xs border border-[#CD7F32]/60 bg-[#CD7F32]/15 text-[#CD7F32] shadow-[0_0_8px_rgba(205,127,50,0.15)]">
                        3
                      </div>
                    ) : (
                      <div className="w-6 h-6 flex items-center justify-center font-black text-xs text-[#FF2E7E]">
                        #{entry.rank}
                      </div>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    onClick={() => navigateTo('user-profile', { userId: entry.user.id })}
                    className="shrink-0 cursor-pointer"
                  >
                    {entry.user.avatar ? (
                      <img
                        src={entry.user.avatar}
                        alt={entry.user.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-700/80 group-hover:border-[#FF2E7E] transition-colors"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 group-hover:border-[#FF2E7E] transition-colors">
                        {userInitial}
                      </div>
                    )}
                  </div>

                  {/* Name Only (Full Visibility, No Role Badge) */}
                  <div className="min-w-0 flex-1">
                    <span
                      onClick={() => navigateTo('user-profile', { userId: entry.user.id })}
                      className="font-bold text-xs sm:text-sm text-white truncate block group-hover:text-[#FF2E7E] transition-colors cursor-pointer"
                      title={entry.user.name}
                    >
                      {entry.user.name}
                    </span>
                  </div>
                </div>

                {/* Right: Stat Columns */}
                {!minimal && (
                  <div className={`flex items-center ${compact ? 'gap-1.5 sm:gap-2.5' : 'gap-2 sm:gap-4'} shrink-0 text-right tabular-nums`}>
                    <div className={`flex flex-col items-end ${compact ? 'min-w-[26px] sm:min-w-[34px]' : 'min-w-[32px] sm:min-w-[40px]'}`}>
                      <span className="font-bold text-xs sm:text-sm text-white">
                        {entry.ratings.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">
                        Rating
                      </span>
                    </div>

                    <div className={`flex flex-col items-end ${compact ? 'min-w-[26px] sm:min-w-[34px]' : 'min-w-[32px] sm:min-w-[40px]'}`}>
                      <span className="font-bold text-xs sm:text-sm text-[#FF2E7E]">
                        {entry.reviews.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">
                        Ulasan
                      </span>
                    </div>

                    <div className={`flex flex-col items-end ${compact ? 'min-w-[26px] sm:min-w-[34px]' : 'min-w-[32px] sm:min-w-[40px]'}`}>
                      <span className="font-bold text-xs sm:text-sm text-amber-400">
                        {entry.likes.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">
                        Suka
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {(minimal || showFooterLink) && (
        <div className="pt-3 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => navigateTo('film-database')}
            className="text-xs font-bold text-[#FF2E7E] hover:text-white transition-all inline-flex items-center gap-1 cursor-pointer bg-transparent"
          >
            <span>Lihat Leaderboard Lengkap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
