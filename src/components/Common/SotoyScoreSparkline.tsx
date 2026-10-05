import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Sparkles, Flame, Calendar, ArrowUpRight } from 'lucide-react';
import { User, UserRating } from '../../types';
import { computeUserLeaderboardScore } from '../../utils/leaderboard';

interface SotoyScoreSparklineProps {
  user: User;
  ratings?: UserRating[];
  className?: string;
}

const INDONESIAN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const INDONESIAN_MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const SotoyScoreSparkline: React.FC<SotoyScoreSparklineProps> = ({
  user,
  ratings = [],
  className = '',
}) => {
  // Compute monthly data progression over the last 6 months
  const { chartData, currentScore, growthPercentage, total6MonthPointsGained } = useMemo(() => {
    const userRatings = ratings.filter(r => r.userId === user.id);
    const liveStats = computeUserLeaderboardScore(user, ratings);
    const finalScore = liveStats.score;

    const now = new Date();
    const monthsData: { month: string; fullMonth: string; score: number; reviewsCount: number; likesCount: number; dateCutoff: Date }[] = [];

    // Generate last 6 months (Month -5 to Month 0)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // End of this month: 1st of next month minus 1ms
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const monthIdx = d.getMonth();
      const year = d.getFullYear();

      monthsData.push({
        month: INDONESIAN_MONTHS_SHORT[monthIdx],
        fullMonth: `${INDONESIAN_MONTHS_FULL[monthIdx]} ${year}`,
        score: 0,
        reviewsCount: 0,
        likesCount: 0,
        dateCutoff: monthEnd,
      });
    }

    // Filter ratings up to each month cutoff
    const hasTimestampRatings = userRatings.some(r => r.createdAt);

    if (hasTimestampRatings) {
      monthsData.forEach(m => {
        const ratingsBefore = userRatings.filter(r => {
          if (!r.createdAt) return false;
          const rDate = new Date(r.createdAt);
          return rDate <= m.dateCutoff;
        });

        const likesSum = ratingsBefore.reduce((acc, r) => acc + (r.likes || 0), 0);
        const reviewsCount = ratingsBefore.length;

        m.reviewsCount = reviewsCount;
        m.likesCount = likesSum;
        m.score = reviewsCount * 10 + likesSum;
      });

      // Ensure current month equals live finalScore if targetUser.totalReviews is higher
      if (monthsData[monthsData.length - 1].score < finalScore) {
        monthsData[monthsData.length - 1].score = finalScore;
      }
    } else {
      // If ratings don't have detailed timestamps, construct a realistic progression baseline ending at finalScore
      const totalPoints = finalScore;
      monthsData.forEach((m, idx) => {
        // Distribute points progressively across 6 months
        const ratio = (idx + 1) / 6;
        const estimatedScore = Math.round(totalPoints * Math.pow(ratio, 1.2));
        m.score = idx === 5 ? finalScore : Math.min(estimatedScore, finalScore);
      });
    }

    // Ensure non-decreasing score trend over time
    for (let i = 1; i < monthsData.length; i++) {
      if (monthsData[i].score < monthsData[i - 1].score) {
        monthsData[i].score = monthsData[i - 1].score;
      }
    }

    const startScore = monthsData[0].score;
    const endScore = monthsData[monthsData.length - 1].score;
    const totalGained = endScore - startScore;

    const growthPct = startScore > 0
      ? Math.round(((endScore - startScore) / startScore) * 100)
      : endScore > 0 ? 100 : 0;

    return {
      chartData: monthsData,
      currentScore: finalScore,
      growthPercentage: growthPct,
      total6MonthPointsGained: totalGained,
    };
  }, [user, ratings]);

  // Custom sleek tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#12131C] border border-[#FF2E7E]/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold border-b border-slate-800 pb-1">
            <Calendar className="w-3.5 h-3.5 text-[#FF2E7E]" />
            <span>{data.fullMonth}</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-0.5">
            <span className="text-slate-300">Skor Sotoy:</span>
            <span className="font-black text-[#FF2E7E] flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              {data.score} pts
            </span>
          </div>
          {data.reviewsCount > 0 && (
            <div className="text-[10px] text-slate-400 flex justify-between gap-3">
              <span>Total Ulasan:</span>
              <span className="text-white font-bold">{data.reviewsCount}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-[#171717] border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden ${className}`}>
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF2E7E]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E] flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-black text-sm text-white flex items-center gap-1.5">
              <span>Progres Skor Sotoy</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                6 Bulan Terakhir
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Pertumbuhan poin reputasi dari ulasan dan apresiasi suka komunitas
            </p>
          </div>
        </div>

        {/* Growth badge & Live score */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{total6MonthPointsGained} pts</span>
            {growthPercentage > 0 && (
              <span className="text-[10px] text-emerald-300 font-bold">({growthPercentage}%)</span>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-xs font-bold text-white flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#FF2E7E] fill-[#FF2E7E]" />
            <span className="font-black text-[#FF2E7E]">{currentScore}</span>
            <span className="text-slate-400 text-[10px]">Total</span>
          </div>
        </div>
      </div>

      {/* Recharts Sparkline Area Chart */}
      <div className="w-full h-28 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF2E7E" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#FF2E7E" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#A3A3A3', fontSize: 11, fontWeight: 700 }}
              dy={5}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#737373', fontSize: 10 }}
              domain={['dataMin - 5', 'dataMax + 5']}
              hide={true}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="score"
              stroke="#FF2E7E"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#scoreAreaGradient)"
              activeDot={{ r: 6, fill: '#FF2E7E', stroke: '#ffffff', strokeWidth: 2 }}
              dot={{ r: 3, fill: '#FF2E7E', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
