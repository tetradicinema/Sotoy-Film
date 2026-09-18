import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string | string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'video.movie';
  canonicalUrl?: string;
  schema?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
}

const DEFAULT_TITLE = 'Sotoy Film - Ulasan & Kritik Film Terpercaya';
const DEFAULT_DESC = 'Platform ulasan film dengan skor sotoy paling jujur di Indonesia.';
const DEFAULT_KEYWORDS = 'ulasan film, kritik film, film indonesia, skor sotoy, cinema gear';
const DEFAULT_IMAGE = 'https://www.sotoyfilm.my.id/og-default.jpg';
const DEFAULT_URL = 'https://www.sotoyfilm.my.id';

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description = DEFAULT_DESC,
  keywords,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  canonicalUrl,
  schema,
  noindex = false,
}) => {
  const finalTitle = title ? `${title} | Sotoy Film` : DEFAULT_TITLE;
  const finalUrl = url || DEFAULT_URL;
  const finalCanonical = canonicalUrl || finalUrl;
  const finalKeywords = Array.isArray(keywords) 
    ? keywords.join(', ') 
    : keywords || DEFAULT_KEYWORDS;

  const schemas = Array.isArray(schema) ? schema : schema ? [schema] : [];

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={finalKeywords} />
      <link rel="canonical" href={finalCanonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Sotoy Film" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data */}
      {schemas.map((s, i) => (
        <script key={`schema-${i}`} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
};
