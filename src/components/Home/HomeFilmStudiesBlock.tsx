import React, { useMemo } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveConfigArticles } from '../../utils/homepageConfigHelper';
import { SectionEmptyState } from './HomeSectionCommon';

const Section5Skeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="p-6 rounded-3xl bg-[#171717] border border-white/[0.04] grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-5 h-48 bg-slate-800 rounded-2xl" />
      <div className="md:col-span-7 space-y-3 flex flex-col justify-center">
        <div className="h-3 w-28 bg-slate-800 rounded" />
        <div className="h-6 w-5/6 bg-slate-800 rounded" />
        <div className="h-3 w-full bg-slate-800/60 rounded" />
      </div>
    </div>
  </div>
);

export const HomeFilmStudiesBlock: React.FC = () => {
  const {
    publishedArticles,
    isLoadingArticles,
    navigateTo,
    homepageSectionsConfig,
  } = useApp();

  const defaultFilmStudiesArticles = useMemo(() => {
    return publishedArticles
      .filter((a) => a.category === 'film-studies')
      .slice(0, 3);
  }, [publishedArticles]);

  const filmStudiesArticles = useMemo(() => {
    return resolveConfigArticles(
      publishedArticles,
      homepageSectionsConfig?.sections?.film_studies,
      defaultFilmStudiesArticles
    );
  }, [publishedArticles, homepageSectionsConfig?.sections?.film_studies, defaultFilmStudiesArticles]);

  const getFilmStudiesLabel = (sub?: string) => {
    switch (sub) {
      case 'cinematography':
        return 'Sinematografi';
      case 'directing':
        return 'Penyutradaraan';
      case 'producing':
        return 'Produksi & Industri';
      case 'lighting':
        return 'Tata Cahaya';
      case 'post-production':
        return 'Pascaproduksi';
      default:
        return 'Kajian Sinema';
    }
  };

  return (
    <section id="home-film-studies-section" aria-labelledby="heading-film-studies">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08]">
        <div>
          <h2 id="heading-film-studies" className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
            {homepageSectionsConfig?.sections?.film_studies?.title?.trim() || 'Film Studies & Cinematic Essays'}
          </h2>
          <p className="text-slate-400 text-xs sm:text-[13px] mt-1">
            Kajian mendalam seputar teori montase, dramaturgi penyutradaraan, tata sinematografi, dan analisis visual.
          </p>
        </div>
      </div>

      {isLoadingArticles ? (
        <Section5Skeleton />
      ) : filmStudiesArticles.length === 0 ? (
        <SectionEmptyState
          icon={<BookOpen className="w-5 h-5 text-slate-500" />}
          message="Belum ada esai kajian sinema"
          submessage="Analisis sinematografi, teori montase, dan esai sinematik mendalam akan segera dirilis."
        />
      ) : (
        <div className="space-y-4">
          {/* Primary Editorial Long-form Lead with Article Cover Image */}
          {filmStudiesArticles[0] && (
            <article
              onClick={() => navigateTo('article-detail', { articleId: filmStudiesArticles[0].id })}
              className="group p-5 sm:p-7 rounded-3xl bg-[#171717] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer shadow-lg hover:shadow-2xl relative overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Article Image */}
                <div className="md:col-span-5 aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 border border-white/[0.08]">
                  <img
                    src={filmStudiesArticles[0].coverImage || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80'}
                    loading="lazy"
                    decoding="async"
                    alt={filmStudiesArticles[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="md:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2.5">
                      <span className="text-[#FF2E7E] font-semibold">
                        {getFilmStudiesLabel(filmStudiesArticles[0].subCategory)}
                      </span>
                      <span>{filmStudiesArticles[0].publishedAt}</span>
                      <span>{filmStudiesArticles[0].readTime}</span>
                    </div>

                    <h3 className="font-display font-bold text-xl sm:text-2xl text-white group-hover:text-white leading-tight mb-3">
                      {filmStudiesArticles[0].title}
                    </h3>

                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4 font-serif italic line-clamp-3">
                      "{filmStudiesArticles[0].excerpt}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.08] text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <img
                        src={filmStudiesArticles[0].author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                        alt={filmStudiesArticles[0].author?.name || 'Penulis'}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-slate-300 font-medium">
                        {filmStudiesArticles[0].author?.name || 'Redaksi Sotoy'}
                      </span>
                    </div>

                    <span className="text-[#FF2E7E] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Baca Esai Lengkap</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* Secondary Essay Cards with Article Cover Images */}
          {filmStudiesArticles.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filmStudiesArticles.slice(1).map((article) => (
                <article
                  key={article.id}
                  onClick={() => navigateTo('article-detail', { articleId: article.id })}
                  className="group p-4 sm:p-5 rounded-2xl bg-[#171717] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Article Image */}
                    <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-900 border border-white/[0.08] mb-3">
                      <img
                        src={article.coverImage || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80'}
                        loading="lazy"
                        decoding="async"
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1.5">
                      <span className="text-[#FF2E7E] font-medium">
                        {getFilmStudiesLabel(article.subCategory)}
                      </span>
                      <span>{article.readTime}</span>
                    </div>

                    <h4 className="font-display font-bold text-sm sm:text-base text-white group-hover:text-white leading-snug mb-2 line-clamp-2">
                      {article.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {article.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                    <span>{article.author?.name || 'Redaksi'}</span>
                    <span className="text-[#FF2E7E] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[11px]">
                      <span>Baca</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
