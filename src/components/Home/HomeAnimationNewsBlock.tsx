import React, { useMemo } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveConfigArticles } from '../../utils/homepageConfigHelper';
import { SectionEmptyState } from './HomeSectionCommon';

const Section4Skeleton: React.FC = () => (
  <div className="bg-[#171717] rounded-3xl border border-white/[0.04] divide-y divide-white/[0.04] animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="p-3.5 flex items-center gap-3.5">
        <div className="w-12 h-12 bg-slate-800 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-28 bg-slate-800/70 rounded" />
          <div className="h-3.5 w-3/4 bg-slate-800 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const HomeAnimationNewsBlock: React.FC = () => {
  const {
    publishedArticles,
    isLoadingArticles,
    navigateTo,
    homepageSectionsConfig,
  } = useApp();

  const defaultAnimationNews = useMemo(() => {
    const newsOnly = publishedArticles.filter(
      (a) =>
        a.category === 'animation' &&
        (a.subCategory === 'news' || a.tags?.some((t) => t.toLowerCase().includes('news')))
    );
    if (newsOnly.length >= 3) return newsOnly.slice(0, 5);
    return publishedArticles.filter((a) => a.category === 'animation').slice(0, 5);
  }, [publishedArticles]);

  const animationNews = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.anime_news,
      defaultAnimationNews
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.anime_news, defaultAnimationNews]);

  return (
    <section id="home-animation-news-ticker" aria-labelledby="heading-animation-news">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08]">
        <div>
          <h2 id="heading-animation-news" className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
            {homepageSectionsConfig?.sections?.anime_news?.title?.trim() || 'Animation News & Season Updates'}
          </h2>
          <p className="text-slate-400 text-xs sm:text-[13px] mt-1">
            Warta terkini seputar jadwal tayang musim baru, adaptasi manga, dan kabar resmi dari studio animation Jepang.
          </p>
        </div>
        <span className="text-[11px] font-mono text-slate-500 self-start sm:self-auto">
          News Wire ({animationNews.length})
        </span>
      </div>

      {isLoadingArticles ? (
        <Section4Skeleton />
      ) : animationNews.length === 0 ? (
        <SectionEmptyState
          icon={<Sparkles className="w-5 h-5 text-slate-500" />}
          message="Belum ada kabar animation terbaru"
          submessage="Update jadwal tayang dan kabar terkini animation akan segera diperbarui."
        />
      ) : (
        <div className="bg-[#171717] rounded-3xl border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          {animationNews.map((article) => (
            <div
              key={article.id}
              onClick={() => navigateTo('article-detail', { articleId: article.id })}
              className="p-3 sm:p-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                {/* Article Thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-white/[0.08]">
                  <img
                    src={article.coverImage || 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=160&q=80'}
                    loading="lazy"
                    decoding="async"
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono text-slate-400">
                      {article.publishedAt}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF2E7E]" />
                    <span className="text-[10px] uppercase font-bold text-[#FF2E7E] tracking-wider">
                      {article.subCategory || 'Animation Wire'}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-white transition-colors truncate">
                    {article.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-slate-400 group-hover:text-[#FF2E7E] transition-colors text-xs">
                <span className="hidden sm:inline text-[11px] font-mono text-slate-500">
                  {article.readTime}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
