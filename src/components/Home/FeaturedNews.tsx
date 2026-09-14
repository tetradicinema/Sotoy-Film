import React from 'react';
import { Sparkles, MessageCircle, Clock, ArrowUpRight, Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FeaturedNews: React.FC = () => {
  const { articles, navigateTo } = useApp();

  // Pick articles with featured: true that are not heroSlider, plus others
  const featuredArticles = articles.filter(a => a.featured && !a.heroSlider).slice(0, 3);
  const secondaryNews = articles.filter(a => a.subCategory === 'news' && !a.heroSlider).slice(0, 3);

  return (
    <section id="featured-news-section" className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF2E7E]/20 flex items-center justify-center text-[#FF2E7E] shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-black text-lg sm:text-2xl text-white tracking-tight">
                  Featured News & Hot Scoop
                </h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2E7E] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF2E7E]"></span>
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Kabar terpanas industri perfilman, box office, dan pengumuman festival terkini
              </p>
            </div>
          </div>

          <button
            id="see-all-news-btn"
            onClick={() => navigateTo('category', { category: 'movies', subCategory: 'news' })}
            className="self-start sm:self-auto text-xs font-bold text-[#FFD000] hover:text-white flex items-center gap-1 transition-colors bg-slate-900/60 sm:bg-transparent px-3 sm:px-0 py-1.5 sm:py-0 rounded-xl sm:rounded-none border border-slate-800 sm:border-0"
          >
            <span>Lihat Semua Berita</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Column Grid for Featured Stories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredArticles.map((article, idx) => (
            <article
              key={article.id}
              id={`featured-news-card-${article.id}`}
              onClick={() => navigateTo('article-detail', { articleId: article.id })}
              className="bg-[#121324] border border-slate-800/80 rounded-3xl overflow-hidden group hover:border-[#FF2E7E]/60 transition-all duration-300 flex flex-col cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-[#FF2E7E]/10"
            >
              {/* Card Cover Image */}
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121324] via-transparent to-transparent" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="bg-[#FF2E7E] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                    {article.category}
                  </span>
                  <span className="bg-slate-900/80 backdrop-blur text-slate-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                    {article.subCategory}
                  </span>
                </div>

                {/* Likes indicator */}
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-pink-500/30 text-pink-400 text-xs font-bold flex items-center gap-1">
                  <span>♥ {article.likes}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                    <span className="text-white font-medium">{article.author.name}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-base sm:text-lg text-white group-hover:text-[#FF2E7E] transition-colors line-clamp-2 leading-snug mb-2">
                    {article.title}
                  </h3>

                  <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-4">
                    {article.excerpt}
                  </p>
                </div>

                {/* Footer Meta */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                      {article.commentsCount}
                    </span>
                    <span>{article.views.toLocaleString()} views</span>
                  </div>
                  <span className="text-[#00F0FF] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    Baca →
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
