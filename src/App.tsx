import React from 'react';
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
import { AboutUsPage } from './components/Pages/AboutUsPage';
import { PrivacyPolicyPage } from './components/Pages/PrivacyPolicyPage';
import { TermsPage } from './components/Pages/TermsPage';
import { BusinessInquiriesPage } from './components/Pages/BusinessInquiriesPage';
import { CriticSubmissionPage } from './components/Pages/CriticSubmissionPage';
import { CriticCriteriaPage } from './components/Pages/CriticCriteriaPage';
import { AdminCriticSubmissionsPage } from './components/Pages/AdminCriticSubmissionsPage';
import { LoginModal } from './components/Modals/LoginModal';
import { SocialShareModal } from './components/Modals/SocialShareModal';
import { MobileBottomNav } from './components/Navigation/MobileBottomNav';
import { Sparkles, CheckCircle, Info } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentView, toastMessage } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E15] text-slate-100 relative selection:bg-[#FF2E7E] selection:text-white pb-16 lg:pb-0">
      {/* Toast Notification Alert - positioned above bottom bar on mobile */}
      {toastMessage && (
        <div
          id="global-toast-notification"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 bg-[#151624]/95 backdrop-blur-md border border-[#FF2E7E] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="w-6 h-6 rounded-full bg-[#FF2E7E]/20 text-[#FF2E7E] flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold flex-1">{toastMessage}</span>
        </div>
      )}

      {/* Login / Auth Modal */}
      <LoginModal />

      {/* Social Media Share Modal */}
      <SocialShareModal />

      {/* Main Navigation Bar */}
      <Navbar />

      {/* Mobile Fixed Bottom Navigation Dock */}
      <MobileBottomNav />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <>
            <HeroSection />
            <FeaturedNews />
            <HomeFilmRecommendations />
            <HomeCategorySection />
          </>
        )}

        {currentView === 'category' && <CategoryPage />}
        {currentView === 'article-detail' && <ArticleDetailPage />}
        {currentView === 'film-database' && <FilmDatabasePage />}
        {currentView === 'film-detail' && <FilmDetailPage />}
        {currentView === 'film-recommendations' && <FilmRecommendationsPage />}
        {currentView === 'community-feed' && <CommunityFeedPage />}
        {currentView === 'buzz-detail' && <BuzzDetailPage />}
        {currentView === 'write-article' && <WriteArticlePage />}
        {currentView === 'user-profile' && <UserPage />}
        {currentView === 'settings' && <SettingsPage />}
        {currentView === 'about-us' && <AboutUsPage />}
        {currentView === 'privacy-policy' && <PrivacyPolicyPage />}
        {currentView === 'terms-conditions' && <TermsPage />}
        {currentView === 'business-inquiries' && <BusinessInquiriesPage />}
        {currentView === 'critic-submission' && <CriticSubmissionPage />}
        {currentView === 'critic-criteria' && <CriticCriteriaPage />}
        {currentView === 'admin-critic-submissions' && <AdminCriticSubmissionsPage />}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
