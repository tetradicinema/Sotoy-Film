import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from '@dr.pogodin/react-helmet';
import { SEOHead } from './components/SEO/SEOHead';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navigation/Navbar';
import { Footer } from './components/Navigation/Footer';
import { HeroSection } from './components/Home/HeroSection';
import { FeaturedNews } from './components/Home/FeaturedNews';
import { HomeFilmRecommendations } from './components/Home/HomeFilmRecommendations';
import { HomeWatchlistsBlock } from './components/Home/HomeWatchlistsBlock';
import { HomeCinemaGearBlock } from './components/Home/HomeCinemaGearBlock';
import { HomeReviewsBlock } from './components/Home/HomeReviewsBlock';
import { HomeAnimeNewsBlock } from './components/Home/HomeAnimeNewsBlock';
import { HomeFilmStudiesBlock } from './components/Home/HomeFilmStudiesBlock';
import { HomeExploreBlock } from './components/Home/HomeExploreBlock';
import { EditorialSidebar } from './components/Common/EditorialSidebar';
import { HomeBlockKey } from './types';
import {
  resolveBlockOrder,
  resolveHiddenBlocks,
  resolveSidebarWidgetOrder,
  getCachedHomepageLayout,
} from './utils/homepageConfigHelper';
import { CategoryPage } from './components/Pages/CategoryPage';
import { FilmDatabasePage } from './components/Pages/FilmDatabasePage';
import { FilmDetailPage } from './components/Pages/FilmDetailPage';
import { FilmRecommendationsPage } from './components/Pages/FilmRecommendationsPage';
import { CommunityFeedPage } from './components/Pages/CommunityFeedPage';
import { BuzzDetailPage } from './components/Pages/BuzzDetailPage';
import { ArticleDetailPage } from './components/Pages/ArticleDetailPage';
import { WriteArticlePage } from './components/Pages/WriteArticlePage';
import { UserPage } from './components/Pages/UserPage';
import { CollectionDetailPage } from './components/Pages/CollectionDetailPage';
import { SettingsPage } from './components/Pages/SettingsPage';
import { SearchPage } from './components/Pages/SearchPage';
import { AboutUsPage } from './components/Pages/AboutUsPage';
import { PrivacyPolicyPage } from './components/Pages/PrivacyPolicyPage';
import { TermsPage } from './components/Pages/TermsPage';
import { BusinessInquiriesPage } from './components/Pages/BusinessInquiriesPage';
import { CriticSubmissionPage } from './components/Pages/CriticSubmissionPage';
import { CriticCriteriaPage } from './components/Pages/CriticCriteriaPage';
import { AdminCriticSubmissionsPage } from './components/Pages/AdminCriticSubmissionsPage';
import { LeaderboardGuidePage } from './components/Pages/LeaderboardGuidePage';
import { OnboardingPage } from './components/Pages/OnboardingPage';
import { LoginModal } from './components/Modals/LoginModal';
import { SocialShareModal } from './components/Modals/SocialShareModal';
import { ComposeBuzzModal } from './components/Modals/ComposeBuzzModal';
import { SuspendedAccountModal } from './components/Modals/SuspendedAccountModal';
import { EmailVerificationBanner } from './components/Common/EmailVerificationBanner';
import { MobileBottomNav } from './components/Navigation/MobileBottomNav';
import { Sparkles, CheckCircle, X } from 'lucide-react';

// Code-split large/rarely-visited dashboard and admin modules
const AdminDashboard = React.lazy(() =>
  import('./components/Admin/AdminDashboard').then(m => ({ default: m.AdminDashboard }))
);
const WriterDashboard = React.lazy(() =>
  import('./components/Writer/WriterDashboard').then(m => ({ default: m.WriterDashboard }))
);
const CriticDashboard = React.lazy(() =>
  import('./components/Critic/CriticDashboard').then(m => ({ default: m.CriticDashboard }))
);
const CMSPage = React.lazy(() =>
  import('./components/Pages/CMSPage').then(m => ({ default: m.CMSPage }))
);
const AdminHomepageSectionsPage = React.lazy(() =>
  import('./components/Pages/AdminHomepageSectionsPage').then(m => ({ default: m.AdminHomepageSectionsPage }))
);

import { GenericPageSkeleton } from './components/Skeletons';

// Fallback loader matching Sotoy Film aesthetic using structured skeleton
const PageLoadingFallback: React.FC = () => <GenericPageSkeleton />;

const WIDE_BLOCK_KEYS: Set<HomeBlockKey> = new Set(['hero', 'featured_news', 'film_recommendations']);

// Dynamic Home Page view rendering sections according to saved layout order
const HomeView: React.FC = () => {
  const { homepageSectionsConfig, homepageConfigLoaded } = useApp();

  // Try reading cached layout synchronously so repeat visits render without flash
  const cachedLayout = React.useMemo(() => getCachedHomepageLayout(), []);

  // Cap initial skeleton to at most 1500ms if not loaded and no cache exists
  const [skeletonTimedOut, setSkeletonTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (homepageConfigLoaded || cachedLayout) return;
    const timer = setTimeout(() => {
      setSkeletonTimedOut(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [homepageConfigLoaded, cachedLayout]);

  // Active configuration: use cachedLayout ONLY while !homepageConfigLoaded.
  // Once the config has loaded, use only live values (falling back to defaults, not cache).
  const rawBlockOrder = homepageConfigLoaded
    ? homepageSectionsConfig?.blockOrder
    : (homepageSectionsConfig?.blockOrder ?? cachedLayout?.blockOrder);
  const rawSidebarPos = homepageConfigLoaded
    ? homepageSectionsConfig?.sidebarPosition
    : (homepageSectionsConfig?.sidebarPosition ?? cachedLayout?.sidebarPosition);
  const rawWidgetOrder = homepageConfigLoaded
    ? homepageSectionsConfig?.sidebarWidgetOrder
    : (homepageSectionsConfig?.sidebarWidgetOrder ?? cachedLayout?.sidebarWidgetOrder);
  const rawHiddenBlocks = homepageConfigLoaded
    ? homepageSectionsConfig?.hiddenBlocks
    : (homepageSectionsConfig?.hiddenBlocks ?? cachedLayout?.hiddenBlocks);

  // String deps for memoization stability
  const rawBlockOrderKey = rawBlockOrder ? rawBlockOrder.join(',') : '';
  const rawHiddenBlocksKey = rawHiddenBlocks ? rawHiddenBlocks.join(',') : '';

  // Wrap effectiveBlockOrder in useMemo so segments actually memoizes
  const effectiveBlockOrder = React.useMemo(() => {
    const fullBlockOrder = resolveBlockOrder(rawBlockOrder);
    const hiddenBlocksSet = new Set(resolveHiddenBlocks(rawHiddenBlocks));
    const visibleBlockOrder = fullBlockOrder.filter((key) => !hiddenBlocksSet.has(key));
    return visibleBlockOrder.length > 0 ? visibleBlockOrder : [fullBlockOrder[0] || 'hero'];
  }, [rawBlockOrderKey, rawHiddenBlocksKey]);

  const sidebarPosition = rawSidebarPos || 'right';
  const sidebarWidgetOrder = rawWidgetOrder ? resolveSidebarWidgetOrder(rawWidgetOrder) : undefined;

  // Group items into segments: either a single wide block or a band of consecutive column blocks
  const segments = React.useMemo(() => {
    type Segment =
      | { type: 'wide'; key: HomeBlockKey }
      | { type: 'band'; keys: HomeBlockKey[]; isFirstBand: boolean };

    const result: Segment[] = [];
    let currentBand: HomeBlockKey[] = [];
    let firstBandCreated = false;

    for (const key of effectiveBlockOrder) {
      if (WIDE_BLOCK_KEYS.has(key)) {
        if (currentBand.length > 0) {
          result.push({
            type: 'band',
            keys: currentBand,
            isFirstBand: !firstBandCreated,
          });
          firstBandCreated = true;
          currentBand = [];
        }
        result.push({ type: 'wide', key });
      } else {
        currentBand.push(key);
      }
    }

    if (currentBand.length > 0) {
      result.push({
        type: 'band',
        keys: currentBand,
        isFirstBand: !firstBandCreated,
      });
    }

    return result;
  }, [effectiveBlockOrder]);

  // Show a lightweight skeleton on first load if we don't even have a cached layout (for at most 1500ms)
  // (Ensuring all hooks execute in identical order on every render)
  if (!homepageConfigLoaded && !cachedLayout && !skeletonTimedOut) {
    return <GenericPageSkeleton />;
  }

  const renderSingleBlock = (key: HomeBlockKey) => {
    switch (key) {
      case 'hero':
        return <HeroSection key="hero" />;
      case 'featured_news':
        return <FeaturedNews key="featured_news" />;
      case 'film_recommendations':
        return <HomeFilmRecommendations key="film_recommendations" />;
      case 'watchlists':
        return <HomeWatchlistsBlock key="watchlists" />;
      case 'cinema_gear':
        return <HomeCinemaGearBlock key="cinema_gear" />;
      case 'reviews':
        return <HomeReviewsBlock key="reviews" />;
      case 'anime_news':
        return <HomeAnimeNewsBlock key="anime_news" />;
      case 'film_studies':
        return <HomeFilmStudiesBlock key="film_studies" />;
      case 'explore':
        return <HomeExploreBlock key="explore" />;
      default:
        return null;
    }
  };

  return (
    <>
      {segments.map((segment, idx) => {
        if (segment.type === 'wide') {
          return (
            <div key={`wide-${segment.key}`}>
              {renderSingleBlock(segment.key)}
            </div>
          );
        }

        // Column band segment
        if (segment.isFirstBand) {
          return (
            <section
              key={`band-${idx}`}
              id="category-articles-section"
              className="py-6 sm:py-8"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div
                    className={`${
                      sidebarPosition === 'hidden'
                        ? 'lg:col-span-12'
                        : 'lg:col-span-8'
                    } space-y-12`}
                  >
                    {segment.keys.map((key) => (
                      <div key={`col-${key}`}>
                        {renderSingleBlock(key)}
                      </div>
                    ))}
                  </div>

                  {sidebarPosition !== 'hidden' && (
                    <div
                      className={`lg:col-span-4 lg:sticky lg:top-24 self-start space-y-6 ${
                        sidebarPosition === 'left' ? 'lg:order-first' : ''
                      }`}
                    >
                      <EditorialSidebar widgetOrder={sidebarWidgetOrder} />
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        }

        // Secondary / Later bands without sidebar: wrapped in max-w-4xl so column blocks don't stretch awkwardly
        return (
          <section
            key={`band-${idx}`}
            className="py-6 sm:py-8"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto space-y-12">
                {segment.keys.map((key) => (
                  <div key={`col-${key}`}>
                    {renderSingleBlock(key)}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
};

const AppContent: React.FC = () => {
  const { toastMessage, toastType } = useApp();
  const location = useLocation();

  const isOnboarding = location.pathname === '/onboarding';

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-slate-100 relative selection:bg-[#FF2E7E] selection:text-white pb-16 lg:pb-0">
      {/* Default SEO Metadata fallback */}
      <SEOHead />

      {/* Toast Notification Alert - positioned above bottom bar on mobile */}
      {toastMessage && (
        <div
          id="global-toast-notification"
          className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-[100] bg-[#171717]/95 backdrop-blur-md border ${
            toastType === 'success' ? 'border-emerald-500/60' : 
            toastType === 'error' ? 'border-red-500/60' : 
            'border-[#FF2E7E]/60'
          } text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200`}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
            toastType === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 
            toastType === 'error' ? 'bg-red-500/20 text-red-400' : 
            'bg-[#FF2E7E]/20 text-[#FF2E7E]'
          }`}>
            {toastType === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : 
             toastType === 'error' ? <X className="w-3.5 h-3.5" /> : 
             <Sparkles className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs font-bold flex-1">{toastMessage}</span>
        </div>
      )}

      {/* Login / Auth Modal */}
      <LoginModal />

      {/* Social Media Share Modal */}
      <SocialShareModal />

      {/* Compose Buzz Modal */}
      <ComposeBuzzModal />

      {/* Suspended Account Blocking Modal & Appeal Form */}
      <SuspendedAccountModal />

      {/* Persistent Email Verification Banner for unverified email/password accounts */}
      <EmailVerificationBanner />

      {/* Main Navigation Bar */}
      {!isOnboarding && <Navbar />}

      {/* Mobile Fixed Bottom Navigation Dock */}
      {!isOnboarding && <MobileBottomNav />}

      {/* Main URL-based Route Switcher */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          
          {/* Film Routes */}
          <Route path="/film" element={<Navigate to="/film-database" replace />} />
          <Route path="/film/:slug" element={<FilmDetailPage />} />
          <Route path="/film-database" element={<FilmDatabasePage />} />
          <Route path="/rekomendasi-film" element={<FilmRecommendationsPage />} />
          <Route path="/film-recommendations" element={<FilmRecommendationsPage />} />

          {/* Article & Editorial Routes */}
          <Route path="/artikel" element={<Navigate to="/kategori/movies" replace />} />
          <Route path="/article" element={<Navigate to="/kategori/movies" replace />} />
          <Route path="/artikel/:slug" element={<ArticleDetailPage />} />
          <Route path="/article/:slug" element={<ArticleDetailPage />} />
          <Route path="/tulis-artikel" element={<WriteArticlePage />} />
          <Route path="/write-article" element={<WriteArticlePage />} />

          {/* Category & Exploration Routes */}
          <Route path="/kategori" element={<Navigate to="/kategori/movies" replace />} />
          <Route path="/category" element={<Navigate to="/kategori/movies" replace />} />
          <Route path="/kategori/:name" element={<CategoryPage />} />
          <Route path="/kategori/:name/:subCategory" element={<CategoryPage />} />
          <Route path="/category/:name" element={<CategoryPage />} />
          <Route path="/category/:name/:subCategory" element={<CategoryPage />} />

          {/* Community & Buzz Routes */}
          <Route path="/komunitas" element={<CommunityFeedPage />} />
          <Route path="/community-feed" element={<CommunityFeedPage />} />
          <Route path="/buzz/:id" element={<BuzzDetailPage />} />

          {/* User & Settings Routes */}
          <Route path="/user/:id" element={<UserPage />} />
          <Route path="/profil" element={<UserPage />} />
          <Route path="/profile" element={<UserPage />} />
          <Route path="/koleksi/:userId/:collectionId" element={<CollectionDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/search" element={<SearchPage />} />

          {/* Informational & Legal Pages */}
          <Route path="/tentang-kami" element={<AboutUsPage />} />
          <Route path="/about-us" element={<AboutUsPage />} />
          <Route path="/kebijakan-privasi" element={<PrivacyPolicyPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/syarat-ketentuan" element={<TermsPage />} />
          <Route path="/terms-conditions" element={<TermsPage />} />
          <Route path="/kontak-bisnis" element={<BusinessInquiriesPage />} />
          <Route path="/business-inquiries" element={<BusinessInquiriesPage />} />

          {/* Critic Program & Leaderboard Routes */}
          <Route path="/gabung-kritikus" element={<CriticSubmissionPage />} />
          <Route path="/critic-submission" element={<CriticSubmissionPage />} />
          <Route path="/kriteria-kritikus" element={<CriticCriteriaPage />} />
          <Route path="/critic-criteria" element={<CriticCriteriaPage />} />
          <Route path="/panduan-leaderboard" element={<LeaderboardGuidePage />} />
          <Route path="/admin/submissions" element={<AdminCriticSubmissionsPage />} />

          {/* Admin Control Center Standalone URLs */}
          <Route
            path="/admin"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/users"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/moderation"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/catalog"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/storage"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/appeals"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/homepage"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminHomepageSectionsPage />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/beranda"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminHomepageSectionsPage />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/seksi-beranda"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <AdminHomepageSectionsPage />
              </React.Suspense>
            }
          />
          <Route
            path="/writer"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <WriterDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/penulis"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <WriterDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/critic"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <CriticDashboard />
              </React.Suspense>
            }
          />
          <Route
            path="/kritikus"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <CriticDashboard />
              </React.Suspense>
            }
          />

          {/* Dedicated Full Control CMS & Editorial Workspace Routes */}
          <Route
            path="/cms"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <CMSPage />
              </React.Suspense>
            }
          />
          <Route
            path="/workspace"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <CMSPage />
              </React.Suspense>
            }
          />
          <Route
            path="/admin/cms"
            element={
              <React.Suspense fallback={<PageLoadingFallback />}>
                <CMSPage />
              </React.Suspense>
            }
          />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      {!isOnboarding && <Footer />}
    </div>
  );
};

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}
