import React from 'react';
import { Home, Film, MessageSquare, LogIn, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MobileBottomNav: React.FC = () => {
  const {
    currentView,
    navigateTo,
    isLoggedIn,
    currentUser,
    setLoginModalOpen,
    setIsComposeBuzzOpen,
    activeUserTab,
    unreadNotificationsCount,
  } = useApp();

  const isHomeActive = currentView === 'home';
  const isFilmActive = currentView === 'film-database' || currentView === 'film-detail' || currentView === 'film-recommendations';
  const isBuzzActive = currentView === 'community-feed' || currentView === 'buzz-detail';
  const isProfileActive = currentView === 'user-profile' && activeUserTab !== 'watchlist';

  return (
    <nav
      id="mobile-bottom-navigation-bar"
      aria-label="Navigasi Bawah Mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E1013]/95 backdrop-blur-xl border-t border-white/[0.08] shadow-[0_-8px_24px_rgba(14,16,19,0.8)] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] overflow-auto scrollbar-none scroll-smooth touch-pan-x"
      style={{ overflow: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <div className="flex items-center justify-around min-w-max sm:min-w-full w-full max-w-md mx-auto gap-1 px-0.5">
        {/* 1. Beranda */}
        <button
          id="mobile-bottom-nav-home"
          onClick={() => navigateTo('home')}
          className={`flex flex-col items-center justify-center flex-1 min-w-[56px] shrink-0 py-1 px-1 rounded-lg transition-all duration-200 min-h-[44px] ${
            isHomeActive
              ? 'text-[#FF2E7E]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Home className={`w-5 h-5 transition-transform ${isHomeActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
            {isHomeActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF2E7E]" />
            )}
          </div>
          <span className={`text-[10px] mt-1 tracking-tight font-semibold ${isHomeActive ? 'text-white' : 'text-slate-400'}`}>
            Beranda
          </span>
        </button>

        {/* 2. Film Database */}
        <button
          id="mobile-bottom-nav-films"
          onClick={() => navigateTo('film-database')}
          className={`flex flex-col items-center justify-center flex-1 min-w-[56px] shrink-0 py-1 px-1 rounded-lg transition-all duration-200 min-h-[44px] ${
            isFilmActive
              ? 'text-[#FF2E7E]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Film className={`w-5 h-5 transition-transform ${isFilmActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
            {isFilmActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF2E7E]" />
            )}
          </div>
          <span className={`text-[10px] mt-1 tracking-tight font-semibold ${isFilmActive ? 'text-white' : 'text-slate-400'}`}>
            Film
          </span>
        </button>

        {/* 3. Tulis Buzz (Action Button) */}
        <button
          id="mobile-bottom-nav-compose"
          onClick={() => {
            if (!isLoggedIn) {
              setLoginModalOpen(true);
            } else {
              setIsComposeBuzzOpen(true);
            }
          }}
          className="flex flex-col items-center justify-center flex-1 min-w-[56px] shrink-0 py-1 px-1 transition-all duration-200 min-h-[44px] group"
          title="Tulis Buzz Baru"
          aria-label="Tulis Buzz Baru"
        >
          <div className="w-9 h-9 -mt-2 rounded-full bg-[#FF2E7E] text-white flex items-center justify-center shadow-md shadow-[#FF2E7E]/25 group-active:scale-95 transition-transform">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold text-[#FF2E7E]">
            Tulis
          </span>
        </button>

        {/* 4. Buzz Community Feed */}
        <button
          id="mobile-bottom-nav-buzz"
          onClick={() => navigateTo('community-feed')}
          className={`flex flex-col items-center justify-center flex-1 min-w-[56px] shrink-0 py-1 px-1 rounded-lg transition-all duration-200 min-h-[44px] ${
            isBuzzActive
              ? 'text-[#FF2E7E]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 transition-transform ${isBuzzActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
            {isBuzzActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF2E7E]" />
            )}
          </div>
          <span className={`text-[10px] mt-1 tracking-tight font-semibold ${isBuzzActive ? 'text-white' : 'text-slate-400'}`}>
            Buzz
          </span>
        </button>

        {/* 5. Profil / Masuk */}
        {isLoggedIn ? (
          <button
            id="mobile-bottom-nav-profile"
            onClick={() => navigateTo('user-profile', { userId: currentUser.id, userTab: 'buzz' })}
            className={`flex flex-col items-center justify-center flex-1 min-w-[56px] shrink-0 py-1 px-1 rounded-lg transition-all duration-200 min-h-[44px] ${
              isProfileActive
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className={`w-5 h-5 rounded-full object-cover transition-all ${
                  isProfileActive
                    ? 'ring-2 ring-[#FF2E7E] scale-110'
                    : 'ring-1 ring-white/20'
                }`}
              />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 bg-[#FF2E7E] text-white text-[8px] font-mono tabular-nums font-bold rounded-full flex items-center justify-center border border-[#0E1013] shadow-md">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
              {isProfileActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF2E7E]" />
              )}
            </div>
            <span className={`text-[10px] mt-1 tracking-tight font-semibold ${isProfileActive ? 'text-white' : 'text-slate-400'}`}>
              Profil
            </span>
          </button>
        ) : (
          <button
            id="mobile-bottom-nav-login"
            onClick={() => setLoginModalOpen(true)}
            className="flex flex-col items-center justify-center flex-1 min-w-[56px] shrink-0 py-1 px-1 rounded-lg transition-all duration-200 min-h-[44px] text-[#FF2E7E] hover:text-[#e0266e]"
          >
            <div className="relative">
              <LogIn className="w-5 h-5 stroke-2" />
            </div>
            <span className="text-[10px] mt-1 tracking-tight font-semibold text-[#FF2E7E]">
              Masuk
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
