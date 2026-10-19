import React, { useMemo } from 'react';
import { Clock, ArrowUpRight, Eye } from 'lucide-react';
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
      className="bg-[#171717] border border-white/[0.08] hover:border-white/20 rounded-2xl overflow-hidden group transition-all duration-300 flex flex-col cursor-pointer shadow-md hover:shadow-xl hover:shadow-black/50"
    >
      {/* Editorial Card Cover Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        <img
          src={article.coverImage || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80'}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent opacity-50" />
      </div>

      {/* Editorial Card Body */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Metadata */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
            <span className="text-[#FF2E7E] font-semibold uppercase tracking-wider text-[10px] truncate max-w-[80px]">
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <Clock className="w-2.5 h-2.5 text-slate-500" />
              <span>{article.readTime}</span>
            </span>
          </div>

          {/* Card Title */}
          <h3 className="font-display font-bold text-xs sm:text-sm text-white group-hover:text-white transition-colors line-clamp-2 leading-snug mb-1.5">
            {article.title}
          </h3>

          {/* Excerpt */}
          <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed mb-3">
            {article.excerpt}
          </p>
        </div>

        {/* Card Footer */}
        <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
          {author.loading ? (
            <div className="flex items-center gap-1.5 animate-pulse">
              <div className="w-5 h-5 rounded-full bg-slate-800" />
              <div className="h-2.5 w-14 bg-slate-800 rounded" />
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigateTo('user-profile', { userId: author.id });
              }}
              className="flex items-center gap-1.5 group/author cursor-pointer hover:text-white transition-colors"
              title={`Kunjungi profil ${author.displayName || author.name}`}
            >
              <img
                src={author.avatarURL || author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                alt={author.displayName || author.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10 group-hover/author:ring-[#FF2E7E] transition-all"
              />
              <span className="text-slate-300 font-medium text-[11px] group-hover/author:text-white transition-colors truncate max-w-[85px]">
                {author.displayName || author.name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 font-mono tabular-nums text-[10px] text-slate-400 shrink-0">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3 text-slate-500" />
              <span>{article.views.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export const FeaturedNews: React.FC = () => {
  const { publishedArticles, isLoadingArticles, navigateTo } = useApp();

  // Pick strictly articles flagged with featured
  const featuredArticles = useMemo(() => {
    const featured = publishedArticles.filter(a => a.featured === true);
    return featured.slice(0, 5);
  }, [publishedArticles]);

  return (
    <section id="featured-news-section" className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-5 pb-3 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#FF2E7E] rounded-full inline-block" />
              <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                Featured News & Top Stories
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-[13px] mt-1 ml-3.5">
              Kabar terkini dari industri sinema global, sorotan festival, dan berita pilihan redaksi.
            </p>
          </div>

          <button
            id="see-all-news-btn"
            onClick={() => navigateTo('category', { category: 'movies', subCategory: 'news' })}
            className="self-start sm:self-auto text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Semua Berita</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#FF2E7E]" />
          </button>
        </div>

        {/* 5-Column Grid for Compact Featured Stories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {isLoadingArticles && publishedArticles.length === 0 ? (
            Array.from({ length: 5 }).map((_, index) => (
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
