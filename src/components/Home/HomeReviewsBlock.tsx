import React, { useMemo } from 'react';
import { Film, Tv, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveConfigArticles } from '../../utils/homepageConfigHelper';
import { SectionEmptyState } from './HomeSectionCommon';

const Section3Skeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
    {[1, 2].map((col) => (
      <div key={col} className="space-y-3">
        <div className="h-4 w-36 bg-slate-800/80 rounded mb-2" />
        {[1, 2, 3].map((item) => (
          <div key={item} className="p-4 rounded-2xl bg-[#171717] border border-white/[0.04] flex gap-3.5">
            <div className="w-24 h-24 bg-slate-800 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-800 rounded" />
              <div className="h-3 w-5/6 bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

export const HomeReviewsBlock: React.FC = () => {
  const {
    publishedArticles,
    isLoadingArticles,
    navigateTo,
    homepageSectionsConfig,
  } = useApp();

  const defaultMovieReviews = useMemo(() => {
    return publishedArticles
      .filter(
        (a) =>
          a.category === 'movies' &&
          (a.subCategory === 'reviews' || a.tags?.some((t) => t.toLowerCase().includes('review')))
      )
      .slice(0, 4);
  }, [publishedArticles]);

  const movieReviews = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.reviews_movie,
      defaultMovieReviews
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.reviews_movie, defaultMovieReviews]);

  const defaultSeriesReviews = useMemo(() => {
    return publishedArticles
      .filter(
        (a) =>
          a.category === 'series' &&
          (a.subCategory === 'reviews' || a.tags?.some((t) => t.toLowerCase().includes('review')))
      )
      .slice(0, 4);
  }, [publishedArticles]);

  const seriesReviews = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.reviews_series,
      defaultSeriesReviews
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.reviews_series, defaultSeriesReviews]);

  return (
    <section id="home-honest-reviews-section" aria-labelledby="heading-honest-reviews">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08]">
        <div>
          <h2 id="heading-honest-reviews" className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
            Honest Reviews: Movies & Series
          </h2>
          <p className="text-slate-400 text-xs sm:text-[13px] mt-1">
            Ulasan jujur, mendalam, dan objektif dari redaksi untuk rilisan layar lebar serta serial streaming terbaru.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Movie Reviews */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 text-xs text-slate-300 font-semibold border-b border-white/[0.04]">
            <span>{homepageSectionsConfig?.sections?.reviews_movie?.title?.trim() || 'Review Film Bioskop'}</span>
            <span className="text-[11px] font-mono text-slate-500">{movieReviews.length} ulasan</span>
          </div>

          {isLoadingArticles ? (
            <Section3Skeleton />
          ) : movieReviews.length === 0 ? (
            <SectionEmptyState
              icon={<Film className="w-4 h-4 text-slate-500" />}
              message="Belum ada ulasan film"
            />
          ) : (
            <div className="space-y-3">
              {movieReviews.map((article) => (
                <article
                  key={article.id}
                  onClick={() => navigateTo('article-detail', { articleId: article.id })}
                  className="p-3.5 sm:p-4 rounded-2xl bg-[#171717] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group flex flex-col sm:flex-row gap-3.5"
                >
                  {/* Article Thumbnail */}
                  <div className="w-full sm:w-24 sm:h-24 aspect-[16/10] sm:aspect-square rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-white/[0.08]">
                    <img
                      src={article.coverImage || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80'}
                      loading="lazy"
                      decoding="async"
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                        <span className="text-[#FF2E7E] font-semibold">Verdict Film</span>
                        <span>{article.readTime}</span>
                      </div>

                      <h4 className="font-display font-bold text-sm text-white group-hover:text-white leading-snug mb-1.5 line-clamp-2">
                        {article.title}
                      </h4>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        "{article.excerpt}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/[0.06] text-[11px] text-slate-400">
                      <span className="truncate max-w-[110px]">{article.author?.name || 'Redaksi'}</span>
                      <span className="text-[#FF2E7E] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
                        <span>Baca Ulasan</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Series Reviews */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 text-xs text-slate-300 font-semibold border-b border-white/[0.04]">
            <span>{homepageSectionsConfig?.sections?.reviews_series?.title?.trim() || 'Review Serial Streaming'}</span>
            <span className="text-[11px] font-mono text-slate-500">{seriesReviews.length} ulasan</span>
          </div>

          {isLoadingArticles ? (
            <Section3Skeleton />
          ) : seriesReviews.length === 0 ? (
            <SectionEmptyState
              icon={<Tv className="w-4 h-4 text-slate-500" />}
              message="Belum ada ulasan serial"
            />
          ) : (
            <div className="space-y-3">
              {seriesReviews.map((article) => (
                <article
                  key={article.id}
                  onClick={() => navigateTo('article-detail', { articleId: article.id })}
                  className="p-3.5 sm:p-4 rounded-2xl bg-[#171717] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer group flex flex-col sm:flex-row gap-3.5"
                >
                  {/* Article Thumbnail */}
                  <div className="w-full sm:w-24 sm:h-24 aspect-[16/10] sm:aspect-square rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-white/[0.08]">
                    <img
                      src={article.coverImage || 'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=300&q=80'}
                      loading="lazy"
                      decoding="async"
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                        <span className="text-[#FF2E7E] font-semibold">Verdict Serial</span>
                        <span>{article.readTime}</span>
                      </div>

                      <h4 className="font-display font-bold text-sm text-white group-hover:text-white leading-snug mb-1.5 line-clamp-2">
                        {article.title}
                      </h4>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        "{article.excerpt}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/[0.06] text-[11px] text-slate-400">
                      <span className="truncate max-w-[110px]">{article.author?.name || 'Redaksi'}</span>
                      <span className="text-[#FF2E7E] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
                        <span>Baca Ulasan</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
