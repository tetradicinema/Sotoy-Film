import { LucideIcon, Users, Award, PenSquare, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

export interface RoleConfigItem {
  id: UserRole;
  name: string;
  shortLabel: string;
  fullTitle: string;
  description: string;
  color: string;
  text: string;
  bg: string;
  border: string;
  badgeClass: string;
  hoverScaleClass: string;
  accent: string;
  icon: LucideIcon;
}

/**
 * Consolidated Role Configuration for Sotoy Film
 * Multi-accent system with #FF2E7E primary pink accent and clean neutral tiers.
 */
export const ROLES_CONFIG: Record<UserRole, RoleConfigItem> = {
  warga_sotoy: {
    id: 'warga_sotoy',
    name: 'Warga Sotoy',
    shortLabel: 'Warga',
    fullTitle: 'Warga Sotoy (Penonton Santai)',
    description: 'Anggota komunitas & penonton sinema santai',
    color: '#A3A3A3',
    text: 'text-slate-400',
    bg: 'bg-white/[0.04]',
    border: 'border-white/[0.08]',
    badgeClass: 'bg-white/[0.04] text-slate-400 border border-white/[0.08]',
    hoverScaleClass: 'transition-all duration-200 active:scale-95',
    accent: '#FF2E7E',
    icon: Users,
  },
  si_paling_sotoy: {
    id: 'si_paling_sotoy',
    name: 'Si Paling Sotoy',
    shortLabel: 'Top Critic',
    fullTitle: 'Si Paling Sotoy (Kritikus Film)',
    description: 'Kritikus film terverifikasi & kurator tahunan',
    color: '#FFFFFF',
    text: 'text-white',
    bg: 'bg-white/[0.08]',
    border: 'border-white/15',
    badgeClass: 'bg-white/[0.08] text-white border border-white/15',
    hoverScaleClass: 'transition-all duration-200 active:scale-95',
    accent: '#FF2E7E',
    icon: Award,
  },
  penulis_sotoy: {
    id: 'penulis_sotoy',
    name: 'Penulis Sotoy',
    shortLabel: 'Penulis',
    fullTitle: 'Penulis Sotoy (Jurnalis Film & Pop-Culture)',
    description: 'Jurnalis & editor artikel editorial resmi',
    color: '#FF2E7E',
    text: 'text-[#FF2E7E]',
    bg: 'bg-[#FF2E7E]/10',
    border: 'border-[#FF2E7E]/30',
    badgeClass: 'bg-[#FF2E7E]/10 text-[#FF2E7E] border border-[#FF2E7E]/30',
    hoverScaleClass: 'transition-all duration-200 active:scale-95',
    accent: '#FF2E7E',
    icon: PenSquare,
  },
  admin: {
    id: 'admin',
    name: 'Admin Sotoy',
    shortLabel: 'Admin',
    fullTitle: 'Admin Sotoy (Pengelola Platform)',
    description: 'Moderator platform, manajemen pengguna & kurasi',
    color: '#FF2E7E',
    text: 'text-white',
    bg: 'bg-[#FF2E7E]',
    border: 'border-[#FF2E7E]',
    badgeClass: 'bg-[#FF2E7E] text-white border border-[#FF2E7E]',
    hoverScaleClass: 'transition-all duration-200 active:scale-95',
    accent: '#FF2E7E',
    icon: ShieldCheck,
  },
};

export interface RoleBadgeStyleResult {
  role: UserRole;
  name: string;
  shortLabel: string;
  fullTitle: string;
  description: string;
  color: string;
  text: string;
  bg: string;
  border: string;
  badge: string;
  badgeClass: string;
  hoverScaleClass: string;
  accent: string;
  icon: LucideIcon;
  Icon: LucideIcon;
}

export const getRoleBadgeStyle = (role?: UserRole | string | null): RoleBadgeStyleResult => {
  const normalizedKey = (role as UserRole) || 'warga_sotoy';
  const config = ROLES_CONFIG[normalizedKey] || ROLES_CONFIG.warga_sotoy;

  return {
    role: config.id,
    name: config.name,
    shortLabel: config.shortLabel,
    fullTitle: config.fullTitle,
    description: config.description,
    color: config.color,
    text: config.text,
    bg: config.bg,
    border: config.border,
    badge: `${config.badgeClass} ${config.hoverScaleClass}`,
    badgeClass: config.badgeClass,
    hoverScaleClass: config.hoverScaleClass,
    accent: config.accent,
    icon: config.icon,
    Icon: config.icon,
  };
};

export const getRoleStyle = getRoleBadgeStyle;
