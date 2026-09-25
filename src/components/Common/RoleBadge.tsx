import React from 'react';
import { UserRole } from '../../types';
import { getRoleBadgeStyle } from '../../utils/roleStyles';

interface RoleBadgeProps {
  role?: UserRole | string | null;
  showIcon?: boolean;
  showTooltip?: boolean;
  customLabel?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Reusable RoleBadge Component
 * Features:
 * - Centralized styling & color palette from ROLES_CONFIG
 * - Associated Lucide icon
 * - Subtle scaling animation on hover
 * - Floating accessibility tooltip displaying full role title
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  showIcon = true,
  showTooltip = true,
  customLabel,
  size = 'sm',
  className = '',
  onClick,
}) => {
  const style = getRoleBadgeStyle(role);
  const IconComponent = style.Icon;

  // Size configurations
  const sizeClasses = {
    xs: 'text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded gap-1',
    sm: 'text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md gap-1.5',
    md: 'text-xs font-semibold uppercase px-2.5 py-1 rounded-md gap-1.5',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  const labelText = customLabel || style.shortLabel;

  return (
    <span
      className={`relative inline-flex items-center group/role ${className}`}
      onClick={onClick}
    >
      <span
        title={style.fullTitle}
        aria-label={style.fullTitle}
        className={`inline-flex items-center ${sizeClasses[size]} ${style.badgeClass} ${style.hoverScaleClass} cursor-default select-none shadow-sm transition-all duration-200`}
      >
        {showIcon && IconComponent && (
          <IconComponent className={`${iconSizes[size]} shrink-0`} />
        )}
        <span className="tracking-wide font-mono">{labelText}</span>
      </span>

      {/* Floating Tooltip Component */}
      {showTooltip && (
        <span
          role="tooltip"
          className="pointer-events-none opacity-0 group-hover/role:opacity-100 group-hover/role:-translate-y-1 transition-all duration-200 z-50 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-[#171A1F] border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl backdrop-blur-md text-left flex flex-col gap-0.5"
        >
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-white">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: style.color }}
            />
            {style.fullTitle}
          </span>
          <span className="text-[10px] text-slate-400 font-normal leading-tight normal-case">
            {style.description}
          </span>
          {/* Tooltip triangle arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#171A1F]" />
        </span>
      )}
    </span>
  );
};
