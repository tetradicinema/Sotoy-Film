import React from 'react';
import { Link, type LinkProps } from 'react-router-dom';

/**
 * Crawlable wrapper around react-router's <Link>.
 *
 * Behaviour:
 * - Always renders a real <a href>, so crawlers and "open in new tab" work.
 * - On a plain left-click (button 0, no ctrl/meta/shift/alt, no target) it
 *   scrolls the page back to the top, matching what navigateTo() does for
 *   programmatic navigation. Modified clicks and targeted links keep the
 *   native behaviour (no scroll jump).
 * - Internal links open in the same tab; never force target="_blank".
 *
 * The current view/history bookkeeping does not go through navigateTo for
 * these links; AppContext's URL-sync effect records the visited view for
 * every pathname change, which keeps goBack()/viewHistory accurate.
 */
export const SmartLink: React.FC<LinkProps> = ({ onClick, ...rest }) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    const isPlainLeftClick =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      !rest.target;

    if (isPlainLeftClick) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return <Link {...rest} onClick={handleClick} />;
};

export default SmartLink;
