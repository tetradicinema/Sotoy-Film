import { escapeHtml } from './metaInjection.js';
import { PRIVACY_POLICY_CONTENT, type RichText, type TextRun } from '../../content/privacyPage.js';

/**
 * Edge-safe body builder for static page copy. Only h1/h2/p/ul/li/a plus the
 * inline strong/em/code spans used by the privacy content are emitted; every
 * text node is escaped before it reaches the crawler response.
 */

function safeHref(raw: string): string | null {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return null;
}

function renderRuns(runs: RichText): string {
  return runs
    .map((entry: string | TextRun) => {
      if (typeof entry === 'string') return escapeHtml(entry);

      let html = escapeHtml(entry.text);
      if (entry.code) html = `<code>${html}</code>`;
      if (entry.em) html = `<em>${html}</em>`;
      if (entry.strong) html = `<strong>${html}</strong>`;

      if (entry.href) {
        const href = safeHref(entry.href);
        if (href) {
          html = `<a href="${escapeHtml(href)}"${entry.external ? ' rel="noopener"' : ''}>${html}</a>`;
        }
      }
      return html;
    })
    .join('');
}

function renderParagraphs(paragraphs: RichText[]): string[] {
  return paragraphs.map(paragraph => `<p>${renderRuns(paragraph)}</p>`);
}

/** Crawler body for /kebijakan-privasi and /privacy-policy. */
export function buildPrivacyPolicyBodyHtml(): string {
  const page = PRIVACY_POLICY_CONTENT;
  const parts: string[] = [
    `<h1>${escapeHtml(page.title)}</h1>`,
    `<p>${escapeHtml(page.badge)}</p>`,
    `<p>${escapeHtml(page.effectiveDate)}</p>`,
    `<p>${escapeHtml(page.version)}</p>`,
    // The callout is not one of the numbered sections, so it stays a paragraph.
    `<p><strong>${escapeHtml(page.summary.heading)}</strong></p>`,
    ...renderParagraphs(page.summary.paragraphs),
  ];

  if (page.summary.highlights.length > 0) {
    parts.push(
      `<ul>${page.summary.highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    );
  }

  for (const section of page.sections) {
    parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    parts.push(...renderParagraphs(section.paragraphs));

    if (section.bullets && section.bullets.length > 0) {
      parts.push(`<ul>${section.bullets.map(bullet => `<li>${renderRuns(bullet)}</li>`).join('')}</ul>`);
    }

    if (section.contactBox && section.contactBox.length > 0) {
      parts.push(...renderParagraphs(section.contactBox));
    }
  }

  parts.push(`<p>${escapeHtml(page.backHomeLabel)}</p>`);
  parts.push(`<p>${escapeHtml(page.termsLabel)}</p>`);

  return `<article>${parts.join('')}</article>`;
}
