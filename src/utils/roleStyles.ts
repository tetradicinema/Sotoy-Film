import { UserRole } from '../types';

export interface RoleStyle {
  color: string; // Hex color
  text: string; // Tailwind text class
  bg: string; // Tailwind bg class
  border: string; // Tailwind border class
  badge: string; // Combined badge classes
  accent: string; // Accent color name or hex
  name: string; // Display name for the role
}

export const getRoleStyle = (role: UserRole): RoleStyle => {
  switch (role) {
    case 'warga_sotoy':
      return {
        color: '#00F0FF',
        text: 'text-[#00F0FF]',
        bg: 'bg-cyan-500/15',
        border: 'border-cyan-500/30',
        badge: 'bg-cyan-500/15 text-[#00F0FF] border border-cyan-500/30',
        accent: 'cyan',
        name: 'Warga Sotoy',
      };
    case 'si_paling_sotoy':
      return {
        color: '#FFD000',
        text: 'text-[#FFD000]',
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/40',
        badge: 'bg-amber-500/15 text-[#FFD000] border border-amber-500/40',
        accent: 'amber',
        name: 'Si Paling Sotoy',
      };
    case 'penulis_sotoy':
      return {
        color: '#FF2E7E',
        text: 'text-[#FF2E7E]',
        bg: 'bg-pink-500/15',
        border: 'border-pink-500/30',
        badge: 'bg-pink-500/15 text-[#FF2E7E] border border-pink-500/30',
        accent: 'pink',
        name: 'Penulis Sotoy',
      };
    case 'admin':
      return {
        color: '#7928CA',
        text: 'text-purple-300',
        bg: 'bg-purple-500/15',
        border: 'border-purple-500/40',
        badge: 'bg-purple-500/15 text-purple-300 border border-purple-500/40',
        accent: 'purple',
        name: 'Admin Sotoy',
      };
    default:
      return {
        color: '#00F0FF',
        text: 'text-[#00F0FF]',
        bg: 'bg-cyan-500/15',
        border: 'border-cyan-500/30',
        badge: 'bg-cyan-500/15 text-[#00F0FF] border border-cyan-500/30',
        accent: 'cyan',
        name: 'Warga Sotoy',
      };
  }
};
