import React from 'react';
import { Clock, ArrowUpRight, Flame, MessageCircle, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ArticleCardSkeleton } from '../Skeletons';
import { useDynamicArticleAuthor } from '../../hooks/useDynamicArticleAuthor';
import { Article } from '../../types';

interface FeaturedNewsCardProps {
  article: Article;
  navigateTo: (view: any, params?: any) => void;
}

const FeaturedNewsCard: React.FC<FeaturedNewsCardProps> = ({ article, navigateTo }) => {
  const author = useDynamicArticleAuthor(article.authorId, article.author);

  return (
    <article
      id={`featured-news-card-${article.id}`}
      onClick={() => navigateTo('article-detail', { articleId: article.id })}
      className="bg-[#171A1F] border border-white/[0.08] hover:border-white/20 rounded-3xl overflow-hidden group transition-all duration-300 flex flex-col cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-black/50"
    >
      {/* Editorial Card Cover Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        <img
          src={article.coverImage}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171A1F] via-transparent to-transparent opacity-60" />
      </div>

      {/* Editorial Card Body */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Clean Unboxed Kicker Metadata */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2.5">
            <span className="text-[#FF2E7E] font-semibold uppercase tracking-wider text-[11px]">
              {article.category}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="capitalize">{article.subCategory}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{article.readTime}</span>
            </span>
          </div>

          {/* Card Title */}
          <h3 className="font-display font-bold text-base sm:text-lg text-white group-hover:text-white transition-colors line-clamp-2 leading-snug mb-2.5">
            {article.title}
          </h3>

          {/* Excerpt */}
          <p className="text-slate-400 text-xs sm:text-[13px] line-clamp-2 leading-relaxed mb-4">
            {article.excerpt}
          </p>
        </div>

        {/* Card Footer: Attributable Author & Engagement */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          {/* Author Block */}
          {author.loading ? (
            <div className="flex items-center gap-2 animate-pulse">
              <div className="w-6 h-6 rounded-full bg-slate-800" />
              <div className="h-3 w-20 bg-slate-800 rounded" />
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigateTo('user-profile', { userId: author.id });
              }}
              className="flex items-center gap-2 group/author cursor-pointer hover:text-white transition-colors"
              title={`Kunjungi profil ${author.displayName || author.name}`}
            >
              <img
                src={author.avatarURL || author.avatar}
                alt={author.displayName || author.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 group-hover/author:ring-[#FF2E7E] transition-all"
              />
              <span className="text-slate-300 font-medium text-xs group-hover/author:text-white transition-colors truncate max-w-[120px]">
                {author.displayName || author.name}
              </span>
            </div>
          )}

          {/* Read affordance */}
          <div className="flex items-center gap-3 font-mono tabular-nums text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>{article.views.toLocaleString()}</span>
            </span>
            <span className="text-[#FF2E7E] font-sans font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Baca →
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export const FeaturedNews: React.FC = () => {
  const { publishedArticles, isLoadingArticles, navigateTo } = useApp();

  // Pick articles with featured: true that are not heroSlider
  const featuredArticles = publishedArticles.filter(a => a.featured && !a.heroSlider).slice(0, 3);

  return (
    <section id="featured-news-section" className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#FF2E7E] rounded-full inline-block" />
              <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                Featured News & Top Stories
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-[13px] mt-1 ml-3.5">
              Global cinema industry dispatches, festival highlights, and in-depth editorial stories.
            </p>
          </div>

          <button
            id="see-all-news-btn"
            onClick={() => navigateTo('category', { category: 'movies', subCategory: 'news' })}
            className="self-start sm:self-auto text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>All News</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
          </button>
        </div>

        {/* 3-Column Grid for Featured Stories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingArticles && publishedArticles.length === 0 ? (
            Array.from({ length: 3 }).map((_, index) => (
              <ArticleCardSkeleton key={`featured-article-skeleton-${index}`} />
            ))
          ) : (
            featuredArticles.map((article) => (
              <FeaturedNewsCard key={article.id} article={article} navigateTo={navigateTo} />
            ))
          )}
        </div>
      </div>
    </section>
  );
};
