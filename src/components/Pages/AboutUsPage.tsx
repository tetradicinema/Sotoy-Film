import React from 'react';
import {
  Clapperboard,
  Sparkles,
  BookOpen,
  Users,
  MessageSquare,
  Mail,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { SmartLink } from '../Common/SmartLink';
import {
  ABOUT_PAGE_CONTENT,
  ABOUT_TEAM,
  type ContentSection,
} from '../../content/aboutPages';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'siapa-di-balik-sotoy-film': <Users className="w-6 h-6 text-[#FF2E7E]" />,
  'kenapa-namanya-sotoy-film': <Sparkles className="w-6 h-6 text-[#FF2E7E]" />,
  'apa-yang-kami-tulis': <BookOpen className="w-6 h-6 text-[#FF2E7E]" />,
  'tim-redaksi': <Users className="w-6 h-6 text-[#FF2E7E]" />,
  komunitas: <MessageSquare className="w-6 h-6 text-[#FF2E7E]" />,
  'hubungi-kami': <Mail className="w-6 h-6 text-[#FF2E7E]" />,
};

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

const TeamGrid: React.FC = () => {
  const { getUserById } = useApp();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ABOUT_TEAM.map(member => {
        const user = getUserById(member.userId);
        const avatar = user?.avatar;

        return (
          <SmartLink
            key={member.userId}
            to={`/user/${member.userId}`}
            className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-[#FF2E7E]/50 transition-colors"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={member.name}
                width="56"
                height="56"
                loading="lazy"
                className="w-14 h-14 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <span
                aria-hidden="true"
                className="w-14 h-14 rounded-full bg-[#FF2E7E]/15 border border-[#FF2E7E]/30 text-[#FF2E7E] font-display font-black flex items-center justify-center"
              >
                {getInitials(member.name)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block font-bold text-white text-sm group-hover:text-[#FF2E7E] transition-colors">
                {member.name}
              </span>
              <span className="block text-slate-400 text-xs mt-0.5">{member.role}</span>
            </span>
          </SmartLink>
        );
      })}
    </div>
  );
};

const SectionLinks: React.FC<{ section: ContentSection }> = ({ section }) => {
  if (!section.links || section.links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {section.links.map(link =>
        link.external ? (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-[#FF2E7E]/60 text-slate-200 hover:text-white text-xs font-semibold transition-colors"
          >
            <span>{link.label}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <SmartLink
            key={link.href}
            to={link.href}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-[#FF2E7E]/60 text-slate-200 hover:text-white text-xs font-semibold transition-colors"
          >
            <span>{link.label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </SmartLink>
        )
      )}
    </div>
  );
};

export const AboutUsPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div id="about-us-page" className="min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-black uppercase tracking-wider">
            <Clapperboard className="w-3.5 h-3.5" />
            <span>Tentang Sotoy Film</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            {ABOUT_PAGE_CONTENT.h1}
          </h1>

          {ABOUT_PAGE_CONTENT.intro.map(paragraph => (
            <p key={paragraph} className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* Editorial sections */}
        <div className="space-y-6">
          {ABOUT_PAGE_CONTENT.sections.map(section => (
            <section
              key={section.id}
              className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-5 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#FF2E7E]/10 rounded-full blur-3xl pointer-events-none" />

              <h2 className="font-display font-black text-2xl text-white flex items-center gap-3">
                {SECTION_ICONS[section.id]}
                <span>{section.heading}</span>
              </h2>

              {section.paragraphs && section.paragraphs.length > 0 && (
                <div className="space-y-3 text-slate-300 text-sm sm:text-base leading-relaxed">
                  {section.paragraphs.map(paragraph => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              )}

              {section.bullets && section.bullets.length > 0 && (
                <ul className="space-y-2 text-slate-300 text-sm sm:text-base leading-relaxed">
                  {section.bullets.map(bullet => (
                    <li key={bullet} className="flex gap-2.5">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#FF2E7E] shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.showTeam && <TeamGrid />}

              <SectionLinks section={section} />
            </section>
          ))}
        </div>

        {/* CTA Bottom Box */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#171717] border border-slate-800 space-y-3">
              <h3 className="font-display font-black text-2xl text-white">Mau kerja sama?</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Untuk rumah produksi, distributor, komunitas film, dan brand. Kirim brief lewat
                halaman kemitraan.
              </p>
              <button
                onClick={() => navigateTo('business-inquiries')}
                className="px-6 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-transform active:scale-95 shadow-lg shadow-[#FF2E7E]/20"
              >
                Hubungi Kemitraan →
              </button>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-[#171717] border border-slate-800 space-y-3">
              <h3 className="font-display font-black text-2xl text-white">Mau jadi penulis?</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Punya sudut pandang soal film dan senang menulis? Kirim portofolio dan topik yang
                ingin kamu tulis lewat formulir pendaftaran.
              </p>
              <button
                onClick={() => navigateTo('writer-application')}
                className="px-6 py-2.5 rounded-xl bg-[#FF2E7E] hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-transform active:scale-95 shadow-lg shadow-[#FF2E7E]/20"
              >
                Daftar Jadi Penulis →
              </button>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => navigateTo('community-feed')}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              Jelajahi Buzz Komunitas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
