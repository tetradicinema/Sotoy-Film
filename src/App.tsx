import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { SEOHead } from './components/SEO/SEOHead';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navigation/Navbar';
import { Footer } from './components/Navigation/Footer';
import { HeroSection } from './components/Home/HeroSection';
import { FeaturedNews } from './components/Home/FeaturedNews';
import { HomeFilmRecommendations } from './components/Home/HomeFilmRecommendations';
import { HomeCategorySection } from './components/Home/HomeCategorySection';
import { CategoryPage } from './components/Pages/CategoryPage';
import { FilmDatabasePage } from './components/Pages/FilmDatabasePage';
import { FilmDetailPage } from './components/Pages/FilmDetailPage';
import { FilmRecommendationsPage } from './components/Pages/FilmRecommendationsPage';
import { CommunityFeedPage } from './components/Pages/CommunityFeedPage';
import { BuzzDetailPage } from './components/Pages/BuzzDetailPage';
import { ArticleDetailPage } from './components/Pages/ArticleDetailPage';
import { WriteArticlePage } from './components/Pages/WriteArticlePage';
import { UserPage } from './components/Pages/UserPage';
import { SettingsPage } from './components/Pages/SettingsPage';
import { SearchPage } from './components/Pages/SearchPage';
import { AboutUsPage } from './components/Pages/AboutUsPage';
import { PrivacyPolicyPage } from './components/Pages/PrivacyPolicyPage';
import { TermsPage } from './components/Pages/TermsPage';
import { BusinessInquiriesPage } from './components/Pages/BusinessInquiriesPage';
import { CriticSubmissionPage } from './components/Pages/CriticSubmissionPage';
import { CriticCriteriaPage } from './components/Pages/CriticCriteriaPage';
import { AdminCriticSubmissionsPage } from './components/Pages/AdminCriticSubmissionsPage';
import { OnboardingPage } from './components/Pages/OnboardingPage';
import { LoginModal } from './components/Modals/LoginModal';
import { SocialShareModal } from './components/Modals/SocialShareModal';
import { ComposeBuzzModal } from './components/Modals/ComposeBuzzModal';
import { SuspendedAccountModal } from './components/Modals/SuspendedAccountModal';
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

// Fallback loader matching Sotoy Film aesthetic
const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center py-16 px-4">
    <div className="relative mb-6">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF2E7E]/20 to-[#00F0FF]/20 border border-[#FF2E7E]/40 flex items-center justify-center animate-pulse">
        <div className="w-6 h-6 border-2 border-[#FF2E7E] border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="absolute -inset-1 bg-[#FF2E7E]/20 rounded-2xl blur-lg pointer-events-none animate-pulse" />
    </div>
    <div className="text-center space-y-1">
      <p className="text-sm font-black text-white tracking-wide">Memuat Halaman...</p>
      <p className="text-xs text-slate-400">Menyiapkan antarmuka dasbor Sotoy Film</p>
    </div>
  </div>
);

// Standard Home Page view aggregating hero, news, recommendations, and categories
const HomeView: React.FC = () => (
  <>
    <HeroSection />
    <FeaturedNews />
    <HomeFilmRecommendations />
    <HomeCategorySection />
  </>
);

const AppContent: React.FC = () => {
  const { toastMessage, toastType } = useApp();
  const location = useLocation();

  const isOnboarding = location.pathname === '/onboarding';

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E15] text-slate-100 relative selection:bg-[#FF2E7E] selection:text-white pb-16 lg:pb-0">
      {/* Default SEO Metadata fallback */}
      <SEOHead />

      {/* Toast Notification Alert - positioned above bottom bar on mobile */}
      {toastMessage && (
        <div
          id="global-toast-notification"
          className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 bg-[#151624]/95 backdrop-blur-md border ${
            toastType === 'success' ? 'border-emerald-500' : 
            toastType === 'error' ? 'border-red-500' : 
            'border-[#FF2E7E]'
          } text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200`}
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

          {/* Critic Program Routes */}
          <Route path="/gabung-kritikus" element={<CriticSubmissionPage />} />
          <Route path="/critic-submission" element={<CriticSubmissionPage />} />
          <Route path="/kriteria-kritikus" element={<CriticCriteriaPage />} />
          <Route path="/critic-criteria" element={<CriticCriteriaPage />} />
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
