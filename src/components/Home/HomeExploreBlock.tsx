import React, { useState, useMemo } from 'react';
import { Clock, Share2, ArrowRight, ChevronRight, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDynamicArticleAuthor } from '../../hooks/useDynamicArticleAuthor';
import { MainCategory, Article } from '../../types';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import {
  ContentCategoryMobileMenu,
  CATEGORY_OPTIONS,
} from './ContentCategoryMobileMenu';

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
      className="bg-[#171717] border border-white/[0.08] hover:border-white/20 rounded-3xl p-5 flex flex-col sm:flex-row gap-5 group cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-black/50"
    >
      {/* Article Thumbnail */}
      <div className="sm:w-56 h-44 sm:h-auto rounded-2xl overflow-hidden shrink-0 relative bg-slate-900">
        <img
          src={article.coverImage || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent opacity-40 sm:hidden" />
      </div>

      {/* Article Content */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
            <span className="text-[#FF2E7E] font-semibold uppercase tracking-wider text-[11px]">
              {article.category}
            </span>
            <span className="capitalize">{article.subCategory}</span>
            <span className="text-[11px]">{article.publishedAt}</span>
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{article.readTime}</span>
            </span>
          </div>

          <h3 className="font-display font-bold text-base sm:text-lg text-white group-hover:text-white transition-colors leading-snug mb-2">
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
                src={author.avatarURL || author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
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

export const HomeExploreBlock: React.FC = () => {
  const {
    publishedArticles,
    navigateTo,
    openShareModal,
  } = useApp();

  const [selectedCategoryTab, setSelectedCategoryTab] = useState<MainCategory | 'all'>('all');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Compute article count per category for drawer display
  const categoryCounts = useMemo(() => {
    const counts: Record<MainCategory | 'all', number> = {
      all: publishedArticles.length,
      movies: 0,
      series: 0,
      anime: 0,
      'cinema-gear': 0,
      'film-studies': 0,
    };
    for (const art of publishedArticles) {
      if (art.category && counts[art.category as MainCategory] !== undefined) {
        counts[art.category as MainCategory]++;
      }
    }
    return counts;
  }, [publishedArticles]);

  const currentCategoryOption = CATEGORY_OPTIONS.find((c) => c.id === selectedCategoryTab);
  const currentCategoryLabel = currentCategoryOption ? currentCategoryOption.label : 'Semua Artikel';

  // Filter articles based on tab for bottom Explore section
  const filteredArticles = selectedCategoryTab === 'all'
    ? publishedArticles
    : publishedArticles.filter((a) => a.category === selectedCategoryTab);

  return (
    <section id="explore-categories-section" aria-labelledby="heading-explore-categories">
      <div id="explore-categories-container" className="pt-8 border-t border-white/[0.08] space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-slate-300 rounded-full inline-block" />
              <h2 id="heading-explore-categories" className="font-display font-black text-xl sm:text-2xl text-white tracking-tight">
                Explore Categories & Archives
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-[13px] mt-1 ml-3.5">
              Ulasan film, bedah serial, anime musim ini, eksplorasi cinema gear, dan kajian sinematik.
            </p>
          </div>

          {selectedCategoryTab !== 'all' && (
            <button
              onClick={() => navigateTo('category', { category: selectedCategoryTab })}
              className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Arsip Lengkap {selectedCategoryTab}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desktop Category Filter Tabs Bar (Cohesive Segmented Control) */}
        <div className="hidden lg:flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/[0.08] overflow-x-auto scrollbar-none">
          {CATEGORY_OPTIONS.map((cat) => {
            const isCatActive = selectedCategoryTab === cat.id;
            const buttonIdMap: Record<string, string> = {
              all: 'filter-cat-all',
              movies: 'filter-cat-movies',
              series: 'filter-cat-series',
              anime: 'filter-cat-anime',
              'cinema-gear': 'filter-cat-gear',
              'film-studies': 'filter-cat-studies',
            };

            return (
              <button
                key={cat.id}
                id={buttonIdMap[cat.id]}
                onClick={() => setSelectedCategoryTab(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isCatActive
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Mobile Category Trigger Button (Threads-style Drawer Opener) */}
        <div className="lg:hidden flex items-center justify-between gap-3">
          <button
            id="mobile-category-drawer-trigger"
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/[0.10] active:border-white/20 text-xs font-semibold text-white transition-all active:scale-[0.98] min-h-[44px] cursor-pointer"
            aria-haspopup="dialog"
            aria-expanded={isMobileDrawerOpen}
            aria-label="Pilih Kategori Konten"
          >
            <span className="text-slate-400 font-normal">Kategori:</span>
            <span className="font-bold text-white">{currentCategoryLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {filteredArticles.length} artikel
          </span>
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

      {/* Mobile Content Category Drawer Menu (Threads-style) */}
      <ContentCategoryMobileMenu
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        selectedCategory={selectedCategoryTab}
        onSelectCategory={(cat) => setSelectedCategoryTab(cat)}
        categoryCounts={categoryCounts}
      />
    </section>
  );
};
