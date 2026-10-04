import React, { useState, useMemo } from 'react';
import { X, Search, Users, Film, Clapperboard, Award, Sparkles, Filter } from 'lucide-react';
import { CastMember, CrewMember } from '../../types';
import { PersonAvatar } from '../Common/PersonAvatar';

interface FullCastCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  filmTitle: string;
  filmYear?: number;
  filmPoster?: string;
  castList: CastMember[];
  crewList: CrewMember[];
  isLoading?: boolean;
}

type TabType = 'all' | 'cast' | 'crew';

export const FullCastCrewModal: React.FC<FullCastCrewModalProps> = ({
  isOpen,
  onClose,
  filmTitle,
  filmYear,
  filmPoster,
  castList,
  crewList,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Extract unique departments from crew
  const departments = useMemo(() => {
    const set = new Set<string>();
    crewList.forEach((c) => {
      if (c.department) set.add(c.department);
      else if (c.job) set.add(c.job);
    });
    return Array.from(set);
  }, [crewList]);

  // Filter cast & crew
  const filteredCast = useMemo(() => {
    if (activeTab === 'crew') return [];
    if (!searchQuery.trim()) return castList;
    const q = searchQuery.toLowerCase();
    return castList.filter(
      (c) => c.name.toLowerCase().includes(q) || c.character.toLowerCase().includes(q)
    );
  }, [castList, searchQuery, activeTab]);

  const filteredCrew = useMemo(() => {
    if (activeTab === 'cast') return [];
    let list = crewList;
    if (selectedDepartment !== 'all') {
      list = list.filter(
        (c) => c.department === selectedDepartment || c.job === selectedDepartment
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.job.toLowerCase().includes(q) ||
          (c.department && c.department.toLowerCase().includes(q))
      );
    }
    return list;
  }, [crewList, searchQuery, selectedDepartment, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        id="full-cast-crew-modal-container"
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#10111f] border border-slate-800/90 rounded-3xl shadow-2xl shadow-black/90 overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-[#141628]/80 backdrop-blur">
          <div className="flex items-center gap-3.5 sm:gap-4 overflow-hidden">
            {filmPoster?.trim() ? (
              <img
                src={filmPoster.trim()}
                alt={filmTitle}
                className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded-xl border border-slate-700 shadow-md shrink-0 hidden xs:block"
              />
            ) : null}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-[#FF2E7E] bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 px-2 py-0.5 rounded-full">
                  <Award className="w-3 h-3 text-[#FF2E7E]" />
                  <span>Kredit Sinematik Lengkap</span>
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {filmYear ? `(${filmYear})` : ''}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-display font-black text-white truncate">
                {filmTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {castList.length} Pemeran • {crewList.length} Tim Produksi & Kru
              </p>
            </div>
          </div>

          <button
            id="close-cast-crew-modal-btn"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white flex items-center justify-center transition-all shrink-0 ml-3"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar: Search & Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/50 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div
              className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none flex-nowrap scroll-smooth touch-pan-x max-w-full shrink-0"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <button
                id="tab-cast-crew-all"
                onClick={() => {
                  setActiveTab('all');
                  setSelectedDepartment('all');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
                  activeTab === 'all'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Semua ({castList.length + crewList.length})</span>
              </button>

              <button
                id="tab-cast-crew-cast"
                onClick={() => {
                  setActiveTab('cast');
                  setSelectedDepartment('all');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
                  activeTab === 'cast'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Pemeran ({castList.length})</span>
              </button>

              <button
                id="tab-cast-crew-crew"
                onClick={() => setActiveTab('crew')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer active:scale-95 ${
                  activeTab === 'crew'
                    ? 'bg-[#FF2E7E] text-white shadow-md shadow-[#FF2E7E]/25 border border-[#FF2E7E]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Clapperboard className="w-3.5 h-3.5" />
                <span>Kru ({crewList.length})</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-cast-crew-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama aktor, sutradara, karakter, atau departemen..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#FF2E7E] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Department Filter Pills for Crew */}
          {activeTab !== 'cast' && departments.length > 0 && (
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 scroll-smooth touch-pan-x"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1 shrink-0">
                <Filter className="w-3 h-3" />
                <span>Departemen:</span>
              </span>
              <button
                onClick={() => setSelectedDepartment('all')}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl border shrink-0 transition-all min-h-[40px] flex items-center justify-center cursor-pointer active:scale-95 ${
                  selectedDepartment === 'all'
                    ? 'bg-[#FF2E7E] text-white border-[#FF2E7E] shadow-md shadow-[#FF2E7E]/25'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                Semua Departemen
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl border shrink-0 transition-all min-h-[40px] flex items-center justify-center cursor-pointer active:scale-95 ${
                    selectedDepartment === dept
                      ? 'bg-[#FF2E7E] text-white border-[#FF2E7E] shadow-md shadow-[#FF2E7E]/25'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8 max-h-[calc(90vh-190px)]">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#FF2E7E] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-300">
                Mengambil data kredit lengkap dari TMDB...
              </p>
            </div>
          ) : filteredCast.length === 0 && filteredCrew.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">
                Tidak ada data yang cocok dengan &ldquo;{searchQuery}&rdquo;
              </h3>
              <p className="text-xs text-slate-400">
                Coba gunakan kata kunci lain atau bersihkan filter pencarian.
              </p>
            </div>
          ) : (
            <>
              {/* Cast Section */}
              {filteredCast.length > 0 && (
                <div id="modal-section-cast" className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="text-sm sm:text-base font-display font-black text-white flex items-center gap-2">
                      <Film className="w-4 h-4 text-[#FF2E7E]" />
                      <span>Daftar Pemeran (Cast)</span>
                    </h3>
                    <span className="text-[11px] font-bold text-[#FF2E7E] bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 px-2.5 py-0.5 rounded-full">
                      {filteredCast.length} Orang
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {filteredCast.map((actor, idx) => (
                      <div
                        key={`cast-${idx}`}
                        className="group bg-slate-900/80 border border-slate-800 hover:border-[#FF2E7E]/60 hover:shadow-[0_0_15px_rgba(0,240,255,0.12)] hover:scale-[1.02] rounded-2xl overflow-hidden transition-all duration-300 flex flex-col"
                      >
                        <div className="aspect-[3/4] w-full overflow-hidden bg-slate-950 relative">
                          <PersonAvatar photo={actor.photo} name={actor.name} />
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors truncate">
                            {actor.name}
                          </h4>
                          <p className="text-[11px] text-[#FF2E7E]/90 font-medium truncate mt-0.5">
                            {actor.character ? `sebagai ${actor.character}` : 'Pemeran'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Crew Section */}
              {filteredCrew.length > 0 && (
                <div id="modal-section-crew" className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="text-sm sm:text-base font-display font-black text-white flex items-center gap-2">
                      <Clapperboard className="w-4 h-4 text-[#FF2E7E]" />
                      <span>Tim Produksi & Departemen (Crew)</span>
                    </h3>
                    <span className="text-[11px] font-bold text-[#FF2E7E] bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 px-2.5 py-0.5 rounded-full">
                      {filteredCrew.length} Orang
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {filteredCrew.map((crew, idx) => (
                      <div
                        key={`crew-${idx}`}
                        className="group bg-slate-900/80 border border-slate-800 hover:border-[#FF2E7E]/60 hover:shadow-[0_0_15px_rgba(255,208,0,0.12)] hover:scale-[1.02] rounded-2xl overflow-hidden transition-all duration-300 flex flex-col"
                      >
                        <div className="aspect-[3/4] w-full overflow-hidden bg-slate-950 relative">
                          <PersonAvatar photo={crew.photo} name={crew.name} />
                          {crew.department && (
                            <span className="absolute top-2 right-2 bg-black/70 border border-white/10 text-[9px] font-bold text-slate-300 px-1.5 py-0.5 rounded backdrop-blur">
                              {crew.department}
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-[#FF2E7E] transition-colors truncate">
                            {crew.name}
                          </h4>
                          <p className="text-[11px] text-[#FF2E7E] font-semibold truncate mt-0.5">
                            {crew.job}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800/90 bg-[#121424] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#FF2E7E]" />
            <span>Data kredit tersinkronisasi dengan The Movie Database (TMDB)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
