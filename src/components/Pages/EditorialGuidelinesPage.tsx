import React from 'react';
import {
  ScrollText,
  Newspaper,
  Star,
  GraduationCap,
  PenLine,
  RefreshCcw,
  BadgeDollarSign,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { SmartLink } from '../Common/SmartLink';
import { EDITORIAL_GUIDELINES_CONTENT, type ContentSection } from '../../content/aboutPages';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  berita: <Newspaper className="w-6 h-6 text-[#FF2E7E]" />,
  review: <Star className="w-6 h-6 text-[#FF2E7E]" />,
  'film-studies': <GraduationCap className="w-6 h-6 text-[#FF2E7E]" />,
  opini: <PenLine className="w-6 h-6 text-[#FF2E7E]" />,
  koreksi: <RefreshCcw className="w-6 h-6 text-[#FF2E7E]" />,
  'sponsor-afiliasi-dan-iklan': <BadgeDollarSign className="w-6 h-6 text-[#FF2E7E]" />,
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

export const EditorialGuidelinesPage: React.FC = () => {
  return (
    <div id="editorial-guidelines-page" className="min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-black uppercase tracking-wider">
            <ScrollText className="w-3.5 h-3.5" />
            <span>Pedoman Redaksi</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            {EDITORIAL_GUIDELINES_CONTENT.h1}
          </h1>

          {EDITORIAL_GUIDELINES_CONTENT.intro.map(paragraph => (
            <p key={paragraph} className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Editorial sections */}
        <div className="space-y-6">
          {EDITORIAL_GUIDELINES_CONTENT.sections.map(section => (
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

              <SectionLinks section={section} />
            </section>
          ))}
        </div>

        {EDITORIAL_GUIDELINES_CONTENT.footerNote && (
          <p className="text-center text-slate-400 text-xs">
            {EDITORIAL_GUIDELINES_CONTENT.footerNote}
          </p>
        )}
      </div>
    </div>
  );
};
