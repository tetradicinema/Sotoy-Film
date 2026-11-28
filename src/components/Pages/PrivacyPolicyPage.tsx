import React from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  UserCheck,
  Database,
  Mail,
  Cookie,
  Megaphone,
  BadgeDollarSign,
  CloudUpload,
  Baby,
  History,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdBannerSlot } from '../Common/AdBannerSlot';
import { SmartLink } from '../Common/SmartLink';
import { PRIVACY_POLICY_CONTENT, type RichText } from '../../content/privacyPage';

/** Renders the structured inline runs from the shared content module. */
const RichTextContent: React.FC<{ value: RichText }> = ({ value }) => (
  <>
    {value.map((entry, index) => {
      if (typeof entry === 'string') {
        return <React.Fragment key={index}>{entry}</React.Fragment>;
      }

      let node: React.ReactNode = entry.text;
      if (entry.code) node = <code>{node}</code>;
      if (entry.em) node = <em>{node}</em>;
      if (entry.strong) node = <strong>{node}</strong>;

      if (entry.href) {
        node = entry.external ? (
          <a href={entry.href} target="_blank" rel="noopener">
            {node}
          </a>
        ) : (
          <SmartLink to={entry.href}>{node}</SmartLink>
        );
      }

      return <React.Fragment key={index}>{node}</React.Fragment>;
    })}
  </>
);

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'informasi-yang-kami-kumpulkan': <Database className="w-5 h-5 text-[#FF2E7E]" />,
  'bagaimana-kami-menggunakan-informasi-anda': <Eye className="w-5 h-5 text-[#FF2E7E]" />,
  'kontrol-dan-hak-privasi-anda': <UserCheck className="w-5 h-5 text-purple-400" />,
  'penyimpanan-lokal-browser': <FileText className="w-5 h-5 text-emerald-400" />,
  'cookie-dan-pilihan-anda': <Cookie className="w-5 h-5 text-[#FF2E7E]" />,
  iklan: <Megaphone className="w-5 h-5 text-[#FF2E7E]" />,
  'afiliasi-dan-konten-sponsor': <BadgeDollarSign className="w-5 h-5 text-[#FF2E7E]" />,
  'penyimpanan-dan-transfer-data': <CloudUpload className="w-5 h-5 text-[#FF2E7E]" />,
  'anak-anak': <Baby className="w-5 h-5 text-[#FF2E7E]" />,
  'perubahan-kebijakan': <History className="w-5 h-5 text-[#FF2E7E]" />,
  'hubungi-petugas-perlindungan-data': <Mail className="w-5 h-5 text-[#FF2E7E]" />,
};

export const PrivacyPolicyPage: React.FC = () => {
  const { navigateTo } = useApp();
  const page = PRIVACY_POLICY_CONTENT;

  return (
    <div id="privacy-policy-page" className="min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Header Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF2E7E]/10 border border-[#FF2E7E]/30 text-[#FF2E7E] text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{page.badge}</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
            {page.title}
          </h1>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{page.effectiveDate}</span>
            <span>•</span>
            <span>{page.version}</span>
          </div>
        </div>

        {/* Global Page Ad Banner */}
        <AdBannerSlot variant="leaderboard" />

        {/* Quick Highlights Callout */}
        <div className="bg-[#171717] border border-[#FF2E7E]/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <h2 className="font-display font-black text-lg text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#FF2E7E]" />
            <span>{page.summary.heading}</span>
          </h2>
          {page.summary.paragraphs.map((paragraph, index) => (
            <p key={index} className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              <RichTextContent value={paragraph} />
            </p>
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {page.summary.highlights.map(highlight => (
              <div
                key={highlight}
                className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2 text-xs text-slate-300"
              >
                <CheckCircle2 className="w-4 h-4 text-[#FF2E7E] shrink-0" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-slate-300 text-xs sm:text-sm leading-relaxed">

          {page.sections.map(section => (
            <section
              key={section.id}
              className="bg-[#171717] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4"
            >
              <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
                {SECTION_ICONS[section.id]}
                <span>{section.heading}</span>
              </h3>

              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>
                  <RichTextContent value={paragraph} />
                </p>
              ))}

              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-2 text-slate-300">
                  {section.bullets.map((bullet, index) => (
                    <li key={index}>
                      <RichTextContent value={bullet} />
                    </li>
                  ))}
                </ul>
              )}

              {section.contactBox && section.contactBox.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                  {section.contactBox.map((line, index) => (
                    <div key={index}>
                      <RichTextContent value={line} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}

        </div>

        {/* Back navigation */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => navigateTo('home')}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            {page.backHomeLabel}
          </button>
          <button
            onClick={() => navigateTo('terms-conditions')}
            className="text-xs font-bold text-[#FF2E7E] hover:underline"
          >
            {page.termsLabel}
          </button>
        </div>

      </div>
    </div>
  );
};
