export interface PageMetaProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export const DEFAULT_SITE_TITLE = "Grace Arena Resorts — Luxury, Peace & Faith in Abuja";
export const DEFAULT_SITE_DESCRIPTION =
  "Grace Arena Resorts offers an oasis of rejuvenation, combining Christian hospitality, luxury accommodations, and natural serenity in Abuja, Nigeria.";
export const DEFAULT_OG_IMAGE = "/assets/hero-bg.jpg";

export function getMetaTags({
  title,
  description = DEFAULT_SITE_DESCRIPTION,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
}: PageMetaProps = {}) {
  const fullTitle = title ? `${title} | Grace Arena Resorts` : DEFAULT_SITE_TITLE;

  return {
    title: fullTitle,
    description,
    canonical,
    ogImage,
    noIndex,
  };
}

export function generateHotelJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: "Grace Arena Resorts",
    description: DEFAULT_SITE_DESCRIPTION,
    url: "https://gracearenaresorts.com",
    telephone: "+2348123456789",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Abuja",
      addressRegion: "FCT",
      addressCountry: "NG",
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Swimming Pool", value: true },
      { "@type": "LocationFeatureSpecification", name: "Prayer Hut", value: true },
      { "@type": "LocationFeatureSpecification", name: "Fine Dining", value: true },
      { "@type": "LocationFeatureSpecification", name: "High-Speed WiFi", value: true },
    ],
  };
}
