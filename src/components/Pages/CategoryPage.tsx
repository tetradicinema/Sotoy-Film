import React from 'react';
import {
  Film,
  Tv,
  Sparkles,
  Camera,
  BookOpen,
  Clock,
  MessageCircle,
  Eye,
  Filter,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MainCategory, SubCategory } from '../../types';
import { AdBannerSlot } from '../Common/AdBannerSlot';

export const CategoryPage: React.FC = () => {
  const {
    activeCategory,
    activeSubCategory,
    articles,
    navigateTo,
  } = useApp();

  const currentCategory: MainCategory = activeCategory || 'movies';

  // Category visual metadata
  const categoryMetadata: Record<
    MainCategory,
    {
      title: string;
      subtitle: string;
      accentColor: string;
      icon: React.ComponentType<{ className?: string }>;
      allSubCategories: { id: SubCategory; label: string }[];
    }
  > = {
    movies: {
      title: 'Movies',
      subtitle: 'Ulasan film layar lebar, kabar festival internasional, dan analisis sinematik terpercaya.',
      accentColor: '#FF2E7E',
      icon: Film,
      allSubCategories: [
        { id: 'news', label: 'News' },
        { id: 'lists', label: 'Lists' },
        { id: 'reviews', label: 'Reviews' },
      ],
    },
    series: {
      title: 'Series',
      subtitle: 'Dunia serial televisi prestisius, drama streaming HBO, Netflix, Disney+, dan serial terbatas.',
      accentColor: '#00F0FF',
      icon: Tv,
      allSubCategories: [
        { id: 'news', label: 'News' },
        { id: 'lists', label: 'Lists' },
        { id: 'reviews', label: 'Reviews' },
      ],
    },
    anime: {
      title: 'Anime',
      subtitle: 'Kabar rilisan sakuga, manga adaptasi, anime musiman, dan film animasi layar lebar Jepang.',
      accentColor: '#FFD000',
      icon: Sparkles,
      allSubCategories: [
        { id: 'news', label: 'News' },
        { id: 'lists', label: 'Lists' },
      ],
    },
    'cinema-gear': {
      title: 'Cinema Gear',
      subtitle: 'Bedah kamera sinema, lensa anamorphic, gimbal rig, lighting, dan perlengkapan produksi film.',
      accentColor: '#10B981',
      icon: Camera,
      allSubCategories: [
        { id: 'gear-news', label: 'Gear News' },
        { id: 'gear-reviews', label: 'Gear Reviews' },
      ],
    },
    'film-studies': {
      title: 'Film Studies',
      subtitle: 'Pusat edukasi & keahlian filmmaking: Producing, Directing, Sinematografi, Tata Cahaya, dan Post-Production.',
      accentColor: '#7928CA',
      icon: BookOpen,
      allSubCategories: [
        { id: 'producing', label: 'Producing' },
        { id: 'directing', label: 'Directing' },
        { id: 'cinematography', label: 'Cinematography' },
        { id: 'lighting', label: 'Lighting' },
        { id: 'post-production', label: 'Post-Production' },
      ],
    },
  };

  const meta = categoryMetadata[currentCategory];
  const Icon = meta.icon;

  // Filter articles by category and active subcategory
  const filteredArticles = articles.filter(a => {
    if (a.category !== currentCategory) return false;
    if (activeSubCategory && a.subCategory !== activeSubCategory) return false;
    return true;
  });

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={() => navigateTo('home')}
            className="hover:text-white transition-colors"
          >
            Home
          </button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white font-bold capitalize">{meta.title}</span>
          {activeSubCategory && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#FF2E7E] font-bold capitalize">{activeSubCategory}</span>
            </>
          )}
        </div>

        {/* Category Hero Banner */}
        <div
          id="category-header-banner"
          className="relative rounded-3xl p-6 sm:p-10 overflow-hidden border border-slate-800 shadow-2xl bg-[#121324]"
        >
          <div
            className="absolute -right-16 -top-16 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: meta.accentColor }}
          />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4 border"
              style={{
                backgroundColor: `${meta.accentColor}15`,
                borderColor: `${meta.accentColor}40`,
                color: meta.accentColor,
              }}
            >
              <Icon className="w-4 h-4" />
              <span>Kategori Resmi</span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight mb-3">
              {meta.title}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              {meta.subtitle}
            </p>

            {/* Subcategories Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="cat-subcat-all"
                onClick={() => navigateTo('category', { category: currentCategory, subCategory: null })}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  !activeSubCategory
                    ? 'bg-white text-slate-950 shadow-md font-black'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Semua ({articles.filter(a => a.category === currentCategory).length})
              </button>

              {meta.allSubCategories.map(sub => {
                const isCurrent = activeSubCategory === sub.id;
                const count = articles.filter(
                  a => a.category === currentCategory && a.subCategory === sub.id
                ).length;

                return (
                  <button
                    key={sub.id}
                    id={`cat-subcat-${sub.id}`}
                    onClick={() => navigateTo('category', { category: currentCategory, subCategory: sub.id })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isCurrent
                        ? 'text-white shadow-md'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                    style={{
                      backgroundColor: isCurrent ? meta.accentColor : undefined,
                      color: isCurrent && meta.accentColor === '#FFD000' ? '#0f172a' : undefined,
                    }}
                  >
                    <span>{sub.label}</span>
                    <span className="opacity-70 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* Articles Grid for this category */}
        {filteredArticles.length === 0 ? (
          <div className="text-center py-16 bg-[#121324] rounded-3xl border border-slate-800">
            <p className="text-slate-400 text-sm">Belum ada artikel untuk sub-kategori ini saat ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map(article => (
              <article
                key={article.id}
                id={`category-article-${article.id}`}
                onClick={() => navigateTo('article-detail', { articleId: article.id })}
                className="bg-[#121324] border border-slate-800 rounded-3xl overflow-hidden hover:border-[#00F0FF]/60 transition-all duration-300 flex flex-col cursor-pointer group shadow-lg"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121324] via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 bg-[#FF2E7E] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    {article.subCategory}
                  </span>
                  <span className="absolute top-3 right-3 bg-black/80 backdrop-blur text-pink-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-pink-500/30 flex items-center gap-1">
                    ♥ {article.likes}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                      <span className="text-slate-300">{article.author.name}</span>
                      <span>•</span>
                      <span>{article.readTime}</span>
                    </div>

                    <h3 className="font-display font-bold text-base sm:text-lg text-white group-hover:text-[#00F0FF] transition-colors leading-snug mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {article.commentsCount} komentar
                    </span>
                    <span className="text-[#00F0FF] font-bold group-hover:translate-x-1 transition-transform">
                      Selengkapnya →
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Bottom Infeed Ad Banner */}
        <AdBannerSlot variant="infeed" />
      </div>
    </div>
  );
};
