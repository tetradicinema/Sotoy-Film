import React, { useState } from 'react';
import {
  Clock,
  Share2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDynamicArticleAuthor } from '../../hooks/useDynamicArticleAuthor';
import { MainCategory, Article } from '../../types';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { EditorialSidebar } from '../Common/EditorialSidebar';

interface HomeCategoryArticleItemProps {
  article: Article;
  navigateTo: (view: any, params?: any) => void;
  openShareModal: (data: any) => void;
}

const HomeCategoryArticleItem: React.FC<HomeCategoryArticleItemProps> = ({ article, navigateTo, openShareModal }) => {
  const author = useDynamicArticleAuthor(article.authorId, article.author);

  return (
    <article
      id={`cat-article-item-${article.id}`}
      onClick={() => navigateTo('article-detail', { articleId: article.id })}
      className="bg-[#121320] border border-white/[0.08] hover:border-white/20 rounded-3xl p-5 flex flex-col sm:flex-row gap-5 group cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-black/50"
    >
      {/* Article Thumbnail */}
      <div className="sm:w-56 h-44 sm:h-auto rounded-2xl overflow-hidden shrink-0 relative bg-slate-900">
        <img
          src={article.coverImage}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121320] via-transparent to-transparent opacity-40 sm:hidden" />
      </div>

      {/* Article Content */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
            <span className="text-[#FF2E7E] font-semibold uppercase tracking-wider text-[11px]">
              {article.category}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="capitalize">{article.subCategory}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-[11px]">{article.publishedAt}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{article.readTime}</span>
            </span>
          </div>

          <h3 className="font-display font-bold text-base sm:text-lg text-white group-hover:text-amber-200 transition-colors leading-snug mb-2">
            {article.title}
          </h3>

          <p className="text-slate-400 text-xs sm:text-[13px] line-clamp-2 leading-relaxed">
            {article.excerpt}
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.08] text-xs text-slate-400">
          {author.loading ? (
            <div className="flex items-center gap-2 animate-pulse">
              <div className="w-6 h-6 rounded-full bg-slate-800" />
              <div className="h-3 w-24 bg-slate-800 rounded" />
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigateTo('user-profile', { userId: author.id });
              }}
              className="flex items-center gap-2 cursor-pointer group/author hover:text-white transition-colors"
              title={`Kunjungi profil ${author.displayName || author.name}`}
            >
              <img
                src={author.avatarURL || author.avatar}
                alt={author.displayName || author.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 group-hover/author:ring-[#FF2E7E] transition-all"
              />
              <span className="text-slate-300 font-medium text-xs group-hover/author:text-white transition-colors truncate max-w-[130px]">
                {author.displayName || author.name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              id={`share-article-btn-${article.id}`}
              onClick={(e) => {
                e.stopPropagation();
                openShareModal({
                  title: article.title,
                  url: window.location.href,
                  text: article.excerpt,
                  tags: article.tags,
                  image: article.coverImage,
                  imageUrl: article.coverImage,
                  type: 'article',
                  category: article.category,
                  authorName: author.displayName || author.name,
                  authorAvatar: author.avatarURL || author.avatar,
                  meta: `${article.category.toUpperCase()} · ${author.displayName || author.name} (${article.readTime})`,
                });
              }}
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
              title="Bagikan Artikel"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <span className="text-[#FF2E7E] font-semibold text-xs group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              <span>Baca Pembahasan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export const HomeCategorySection: React.FC = () => {
  const {
    publishedArticles,
    navigateTo,
    openShareModal,
  } = useApp();

  const [selectedCategoryTab, setSelectedCategoryTab] = useState<MainCategory | 'all'>('all');

  // Filter articles based on tab
  const filteredArticles = selectedCategoryTab === 'all'
    ? publishedArticles
    : publishedArticles.filter(a => a.category === selectedCategoryTab);

  return (
    <section id="category-articles-section" className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-sky-400 rounded-full inline-block" />
              <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                Eksplorasi Rubrik & Arsip
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-[13px] mt-1 ml-3.5">
              Ulasan film, bedah serial, anime musim ini, eksplorasi cinema gear, dan kajian sinematik.
            </p>
          </div>

          {selectedCategoryTab !== 'all' && (
            <button
              onClick={() => navigateTo('category', { category: selectedCategoryTab })}
              className="text-xs font-semibold text-sky-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>Arsip Lengkap {selectedCategoryTab}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Main 2-Column Layout: Left Content (8 cols), Right Sidebar (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* MAIN ARTICLES COLUMN (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Category Filter Tabs Bar (Cohesive Segmented Control) */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/[0.08] overflow-x-auto scrollbar-none">
              <button
                id="filter-cat-all"
                onClick={() => setSelectedCategoryTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  selectedCategoryTab === 'all'
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua Artikel
              </button>
              <button
                id="filter-cat-movies"
                onClick={() => setSelectedCategoryTab('movies')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  selectedCategoryTab === 'movies'
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Movies
              </button>
              <button
                id="filter-cat-series"
                onClick={() => setSelectedCategoryTab('series')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  selectedCategoryTab === 'series'
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Series
              </button>
              <button
                id="filter-cat-anime"
                onClick={() => setSelectedCategoryTab('anime')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  selectedCategoryTab === 'anime'
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Anime
              </button>
              <button
                id="filter-cat-gear"
                onClick={() => setSelectedCategoryTab('cinema-gear')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  selectedCategoryTab === 'cinema-gear'
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cinema Gear
              </button>
              <button
                id="filter-cat-studies"
                onClick={() => setSelectedCategoryTab('film-studies')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  selectedCategoryTab === 'film-studies'
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Film Studies
              </button>
            </div>

            {/* Articles List */}
            <div className="space-y-4">
              {filteredArticles.slice(0, 7).map((article) => (
                <HomeCategoryArticleItem
                  key={article.id}
                  article={article}
                  navigateTo={navigateTo}
                  openShareModal={openShareModal}
                />
              ))}
            </div>

            {/* In-feed Ad Banner Slot */}
            <AdBannerSlot variant="infeed" />
          </div>

          {/* RIGHT SIDEBAR (4 Columns) */}
          <div className="lg:col-span-4">
            <EditorialSidebar />
          </div>
        </div>
      </div>
    </section>
  );
};
