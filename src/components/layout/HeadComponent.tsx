import Head from "next/head";
import React from "react";
import { DEFAULT_SITE_TITLE, DEFAULT_SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from "@/lib/seo/meta";

interface HeadComponentProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  children?: React.ReactNode;
}

export const HeadComponent: React.FC<HeadComponentProps> = ({
  title,
  description = DEFAULT_SITE_DESCRIPTION,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
  children,
}) => {
  const fullTitle = title ? `${title} | Grace Arena Resorts` : DEFAULT_SITE_TITLE;

  return (
    <Head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#0F172A" />
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={
          noIndex
            ? "noindex, nofollow"
            : "follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large"
        }
      />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Grace Arena Resorts" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}

      <link rel="icon" href="/favicon.ico" />
      <title>{fullTitle}</title>
      {children}
    </Head>
  );
};

export default HeadComponent;
