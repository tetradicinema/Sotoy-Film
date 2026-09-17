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
 * Single source of truth for role identity, colors, badges, and icons.
 */
export const ROLES_CONFIG: Record<UserRole, RoleConfigItem> = {
  warga_sotoy: {
    id: 'warga_sotoy',
    name: 'Warga Sotoy',
    shortLabel: 'Warga',
    fullTitle: 'Warga Sotoy (Penonton Santai)',
    description: 'Anggota komunitas & penonton sinema santai',
    color: '#00F0FF',
    text: 'text-[#00F0FF]',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30',
    badgeClass: 'bg-cyan-500/15 text-[#00F0FF] border border-cyan-500/30',
    hoverScaleClass: 'transition-transform duration-200 hover:scale-105 active:scale-95',
    accent: '#00F0FF',
    icon: Users,
  },
  si_paling_sotoy: {
    id: 'si_paling_sotoy',
    name: 'Si Paling Sotoy',
    shortLabel: 'Top Critic',
    fullTitle: 'Si Paling Sotoy (Kritikus Film)',
    description: 'Kritikus film terverifikasi & kurator tahunan',
    color: '#FFD000',
    text: 'text-[#FFD000]',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    badgeClass: 'bg-amber-500/15 text-[#FFD000] border border-amber-500/40',
    hoverScaleClass: 'transition-transform duration-200 hover:scale-105 active:scale-95',
    accent: '#FFD000',
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
    bg: 'bg-pink-500/15',
    border: 'border-pink-500/30',
    badgeClass: 'bg-pink-500/15 text-[#FF2E7E] border border-pink-500/30',
    hoverScaleClass: 'transition-transform duration-200 hover:scale-105 active:scale-95',
    accent: '#FF2E7E',
    icon: PenSquare,
  },
  admin: {
    id: 'admin',
    name: 'Admin Sotoy',
    shortLabel: 'Admin',
    fullTitle: 'Admin Sotoy (Pengelola Platform)',
    description: 'Moderator platform, manajemen pengguna & kurasi',
    color: '#7928CA',
    text: 'text-purple-300',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/40',
    badgeClass: 'bg-purple-500/15 text-purple-300 border border-purple-500/40',
    hoverScaleClass: 'transition-transform duration-200 hover:scale-105 active:scale-95',
    accent: '#7928CA',
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
  badge: string; // Full tailwind class with border and hover scale
  badgeClass: string;
  hoverScaleClass: string;
  accent: string;
  icon: LucideIcon;
  Icon: LucideIcon;
}

/**
 * Returns centralized role badge styling, tailwind classes, and lucide icon.
 * @param role UserRole or string identifier
 */
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

// Backward-compatible alias for existing code
export const getRoleStyle = getRoleBadgeStyle;
