import React from 'react';
import { motion } from 'motion/react';

/**
 * Animated active-tab indicator for MobileBottomNav.
 *
 * This lives in its own lazily-loaded module so `motion/react` is not pulled
 * into the initial bundle just because the bottom nav is always mounted.
 */
export const MobileNavActiveDot: React.FC = () => (
  <motion.span
    layoutId="mobileActiveIndicatorDot"
    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF2E7E]"
    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
  />
);
