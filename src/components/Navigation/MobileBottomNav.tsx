import React from 'react';
import { Home, Film, MessageSquare, Bookmark, User, LogIn } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MobileBottomNav: React.FC = () => {
  const {
    currentView,
    navigateTo,
    watchlist,
    isLoggedIn,
    currentUser,
    setLoginModalOpen,
    activeUserTab,
  } = useApp();

  const isHomeActive = currentView === 'home';
  const isFilmActive = currentView === 'film-database' || currentView === 'film-detail' || currentView === 'film-recommendations';
  const isBuzzActive = currentView === 'community-feed' || currentView === 'buzz-detail';
  const isWatchlistActive = currentView === 'user-profile' && activeUserTab === 'watchlist';
  const isProfileActive = currentView === 'user-profile' && activeUserTab !== 'watchlist';

  return (
    <nav
      id="mobile-bottom-navigation-bar"
      aria-label="Navigasi Bawah Mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0E15]/95 backdrop-blur-xl border-t border-slate-800/90 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Beranda */}
        <button
          id="mobile-bottom-nav-home"
          onClick={() => navigateTo('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px] ${
            isHomeActive
              ? 'text-[#FF2E7E]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Home className={`w-5 h-5 transition-transform ${isHomeActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
            {isHomeActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF2E7E] shadow-[0_0_8px_#FF2E7E]" />
            )}
          </div>
          <span className={`text-[10px] mt-1 tracking-tight font-bold ${isHomeActive ? 'text-white' : 'text-slate-400'}`}>
            Beranda
          </span>
        </button>

        {/* 2. Film Database */}
        <button
          id="mobile-bottom-nav-films"
          onClick={() => navigateTo('film-database')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px] ${
            isFilmActive
              ? 'text-[#FFD000]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Film className={`w-5 h-5 transition-transform ${isFilmActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
            {isFilmActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FFD000] shadow-[0_0_8px_#FFD000]" />
            )}
          </div>
          <span className={`text-[10px] mt-1 tracking-tight font-bold ${isFilmActive ? 'text-white' : 'text-slate-400'}`}>
            Film
          </span>
        </button>

        {/* 3. Buzz Community Feed */}
        <button
          id="mobile-bottom-nav-buzz"
          onClick={() => navigateTo('community-feed')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px] ${
            isBuzzActive
              ? 'text-[#00F0FF]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 transition-transform ${isBuzzActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF2E7E] animate-pulse" />
            {isBuzzActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]" />
            )}
          </div>
          <span className={`text-[10px] mt-1 tracking-tight font-bold ${isBuzzActive ? 'text-white' : 'text-slate-400'}`}>
            Buzz
          </span>
        </button>

        {/* 4. Watchlist */}
        <button
          id="mobile-bottom-nav-watchlist"
          onClick={() => {
            if (!isLoggedIn) {
              setLoginModalOpen(true);
            } else {
              navigateTo('user-profile', { userTab: 'watchlist' });
            }
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px] ${
            isWatchlistActive
              ? 'text-emerald-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bookmark className={`w-5 h-5 transition-transform ${isWatchlistActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
            {watchlist.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-slate-950 font-black text-[9px] px-1 rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                {watchlist.length}
              </span>
            )}
            {isWatchlistActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
            )}
          </div>
          <span className={`text-[10px] mt-1 tracking-tight font-bold ${isWatchlistActive ? 'text-white' : 'text-slate-400'}`}>
            Watchlist
          </span>
        </button>

        {/* 5. Profil / Masuk */}
        {isLoggedIn ? (
          <button
            id="mobile-bottom-nav-profile"
            onClick={() => navigateTo('user-profile', { userTab: 'activity' })}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px] ${
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
                    ? 'ring-2 ring-[#00F0FF] scale-110'
                    : 'ring-1 ring-slate-700'
                }`}
              />
              {isProfileActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]" />
              )}
            </div>
            <span className={`text-[10px] mt-1 tracking-tight font-bold ${isProfileActive ? 'text-white' : 'text-slate-400'}`}>
              Profil
            </span>
          </button>
        ) : (
          <button
            id="mobile-bottom-nav-login"
            onClick={() => setLoginModalOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px] text-[#00F0FF] hover:text-cyan-300"
          >
            <div className="relative">
              <LogIn className="w-5 h-5 stroke-2" />
            </div>
            <span className="text-[10px] mt-1 tracking-tight font-bold text-[#00F0FF]">
              Masuk
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
