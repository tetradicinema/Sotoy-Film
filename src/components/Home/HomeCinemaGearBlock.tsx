import React, { useMemo, useRef } from 'react';
import { Camera, ChevronLeft, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveConfigArticles } from '../../utils/homepageConfigHelper';
import { SectionEmptyState } from './HomeSectionCommon';

const Section2Skeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="p-6 rounded-3xl bg-[#171717] border border-white/[0.04] grid grid-cols-1 sm:grid-cols-12 gap-6">
      <div className="sm:col-span-5 h-48 bg-slate-800 rounded-2xl" />
      <div className="sm:col-span-7 space-y-3 justify-center flex flex-col">
        <div className="h-3 w-32 bg-slate-800 rounded" />
        <div className="h-6 w-3/4 bg-slate-800 rounded" />
        <div className="h-3 w-full bg-slate-800/60 rounded" />
      </div>
    </div>
  </div>
);

export const HomeCinemaGearBlock: React.FC = () => {
  const {
    publishedArticles,
    isLoadingArticles,
    navigateTo,
    homepageSectionsConfig,
  } = useApp();

  const gearScrollRef = useRef<HTMLDivElement>(null);

  const scrollGear = (direction: 'left' | 'right') => {
    if (gearScrollRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      gearScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const defaultGearArticles = useMemo(() => {
    return publishedArticles
      .filter((a) => a.category === 'cinema-gear')
      .slice(0, 6);
  }, [publishedArticles]);

  const gearArticles = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.cinema_gear_articles,
      defaultGearArticles
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.cinema_gear_articles, defaultGearArticles]);

  return (
    <section id="home-cinema-gear-section" aria-labelledby="heading-cinema-gear">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-4 pb-3 border-b border-white/[0.08]">
        <div>
          <h2 id="heading-cinema-gear" className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
            {homepageSectionsConfig?.sections?.cinema_gear_articles?.title?.trim() || 'Cinema Gear & Filmmaking Tech'}
          </h2>
          <p className="text-slate-400 text-xs sm:text-[13px] mt-1">
            Ulasan mendalam kamera sinema, lensa anamorphic, lighting rig, dan panduan perangkat produksi film independen.
          </p>
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => scrollGear('left')}
            className="p-2 rounded-xl bg-black/40 hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
            aria-label="Geser ke kiri"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollGear('right')}
            className="p-2 rounded-xl bg-black/40 hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
            aria-label="Geser ke kanan"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoadingArticles ? (
        <Section2Skeleton />
      ) : gearArticles.length === 0 ? (
        <SectionEmptyState
          icon={<Camera className="w-5 h-5 text-slate-500" />}
          message="Belum ada artikel cinema gear"
          submessage="Ulasan kamera sinema, lensa, dan perangkat produksi akan segera dipublikasikan."
        />
      ) : (
        <div className="space-y-4">
          {/* Featured Large Asymmetric Card */}
          {gearArticles[0] && (
            <article
              onClick={() => navigateTo('article-detail', { articleId: gearArticles[0].id })}
              className="group relative rounded-3xl bg-[#171717] border border-white/[0.08] hover:border-white/20 p-5 sm:p-6 overflow-hidden cursor-pointer transition-all shadow-lg hover:shadow-2xl"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                <div className="sm:col-span-5 aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 relative">
                  <img
                    src={gearArticles[0].coverImage || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'}
                    loading="lazy"
                    decoding="async"
                    alt={gearArticles[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-bold text-white border border-white/10">
                    Sorotan Gear
                  </div>
                </div>

                <div className="sm:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <span className="text-[#FF2E7E] font-semibold">{gearArticles[0].subCategory}</span>
                      <span>{gearArticles[0].publishedAt}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{gearArticles[0].readTime}</span>
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-lg sm:text-xl text-white group-hover:text-white leading-snug mb-2">
                      {gearArticles[0].title}
                    </h3>

                    <p className="text-slate-400 text-xs sm:text-[13px] line-clamp-3 leading-relaxed mb-4">
                      {gearArticles[0].excerpt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
                    <span className="text-slate-400 text-[11px]">Oleh {gearArticles[0].author?.name || 'Redaksi'}</span>
                    <span className="text-[#FF2E7E] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Bedah Spesifikasi</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* Horizontal Snap Strip for remaining gear items */}
          {gearArticles.length > 1 && (
            <div
              ref={gearScrollRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 pt-1 scrollbar-none"
            >
              {gearArticles.slice(1).map((article) => (
                <div
                  key={article.id}
                  onClick={() => navigateTo('article-detail', { articleId: article.id })}
                  className="snap-start min-w-[240px] sm:min-w-[270px] max-w-[270px] p-4 rounded-2xl bg-[#171717] border border-white/[0.08] hover:border-white/20 group cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-900 mb-3 relative">
                      <img
                        src={article.coverImage || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'}
                        loading="lazy"
                        decoding="async"
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
                      <span className="text-[#FF2E7E] font-medium">{article.subCategory}</span>
                      <span>{article.readTime}</span>
                    </div>
                    <h4 className="font-display font-bold text-sm text-white group-hover:text-white line-clamp-2 leading-snug mb-1">
                      {article.title}
                    </h4>
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 truncate max-w-[150px]">{article.publishedAt}</span>
                    <span className="text-[#FF2E7E] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      <span>Detail</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
