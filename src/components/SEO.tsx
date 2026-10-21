import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
}

const SEO: React.FC<SEOProps> = ({ 
  title, 
  description = "Anand Mobile & Electrics - Technology, Electronics & Digital Services all in one place in Sachin, Surat.",
  canonical 
}) => {
  const siteName = "Anand Mobile & Electrics";
  const fullTitle = `${title} | ${siteName}`;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const ogImage = `${baseUrl}/logo.jpg`;
  const canonicalUrl = canonical ? `${baseUrl}${canonical.startsWith('/') ? canonical : `/${canonical}`}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={ogImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
