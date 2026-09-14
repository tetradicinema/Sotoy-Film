import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Flame,
  ArrowRight,
  Send,
  Heart,
  Share2,
  Film,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MainCategory } from '../../types';
import { StarRating } from '../Common/StarRating';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { EditorialSidebar } from '../Common/EditorialSidebar';

export const HomeCategorySection: React.FC = () => {
  const {
    articles,
    films,
    currentUser,
    navigateTo,
    openShareModal,
  } = useApp();

  const [selectedCategoryTab, setSelectedCategoryTab] = useState<MainCategory | 'all'>('all');

  // Filter articles based on tab
  const filteredArticles = selectedCategoryTab === 'all'
    ? articles
    : articles.filter(a => a.category === selectedCategoryTab);

  return (
    <section id="category-articles-section" className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main 2-Column Layout: Left Content (8 cols), Right Sidebar (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* MAIN ARTICLES COLUMN (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Category Filter Tabs Bar */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full scrollbar-none flex-nowrap">
                <button
                  id="filter-cat-all"
                  onClick={() => setSelectedCategoryTab('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategoryTab === 'all'
                      ? 'bg-white text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Semua Artikel
                </button>
                <button
                  id="filter-cat-movies"
                  onClick={() => setSelectedCategoryTab('movies')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategoryTab === 'movies'
                      ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Movies
                </button>
                <button
                  id="filter-cat-series"
                  onClick={() => setSelectedCategoryTab('series')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategoryTab === 'series'
                      ? 'bg-[#00F0FF] text-slate-950 shadow-md shadow-[#00F0FF]/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Series
                </button>
                <button
                  id="filter-cat-anime"
                  onClick={() => setSelectedCategoryTab('anime')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategoryTab === 'anime'
                      ? 'bg-[#FFD000] text-slate-950 shadow-md shadow-[#FFD000]/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Anime
                </button>
                <button
                  id="filter-cat-gear"
                  onClick={() => setSelectedCategoryTab('cinema-gear')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategoryTab === 'cinema-gear'
                      ? 'bg-[#10B981] text-slate-950 shadow-md shadow-[#10B981]/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Cinema Gear
                </button>
                <button
                  id="filter-cat-studies"
                  onClick={() => setSelectedCategoryTab('film-studies')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategoryTab === 'film-studies'
                      ? 'bg-[#7928CA] text-white shadow-md shadow-[#7928CA]/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Film Studies
                </button>
              </div>

              {selectedCategoryTab !== 'all' && (
                <button
                  onClick={() => navigateTo('category', { category: selectedCategoryTab })}
                  className="text-xs font-bold text-[#00F0FF] hover:underline flex items-center gap-1"
                >
                  <span>Halaman Khusus {selectedCategoryTab}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Articles List with rich layout */}
            <div className="space-y-4">
              {filteredArticles.slice(0, 7).map((article, idx) => (
                <article
                  key={article.id}
                  id={`cat-article-item-${article.id}`}
                  onClick={() => navigateTo('article-detail', { articleId: article.id })}
                  className="bg-[#121324] border border-slate-800/80 hover:border-[#00F0FF]/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-5 group cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl"
                >
                  {/* Article Thumbnail */}
                  <div className="sm:w-56 h-40 rounded-xl overflow-hidden shrink-0 relative">
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">
                      {article.category}
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md text-pink-400 text-[11px] font-bold px-2 py-0.5 rounded shadow border border-pink-500/30 flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-current" />
                      <span>{article.likes}</span>
                    </div>
                  </div>

                  {/* Article Content */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-bold text-[#FF2E7E] uppercase tracking-wider">
                          {article.subCategory}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[11px] text-slate-400">{article.publishedAt}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[11px] text-slate-400">{article.readTime}</span>
                      </div>

                      <h3 className="font-display font-black text-base sm:text-lg text-white group-hover:text-[#00F0FF] transition-colors leading-snug mb-2">
                        {article.title}
                      </h3>

                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                        {article.excerpt}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <img
                          src={article.author.avatar}
                          alt={article.author.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-slate-300 font-medium">{article.author.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
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
                              authorName: article.author.name,
                              authorAvatar: article.author.avatar,
                              meta: `${article.category.toUpperCase()} • ${article.author.name} (${article.readTime})`,
                            });
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-[#00F0FF] transition-colors"
                          title="Bagikan Artikel ke Instagram Stories & Feed"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[#FF2E7E] font-bold text-[11px] group-hover:translate-x-1 transition-transform">
                          Baca Pembahasan →
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* In-feed Ad Banner Slot between articles */}
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
