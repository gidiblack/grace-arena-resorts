export interface PageMetaProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export const DEFAULT_SITE_TITLE = "Grace Arena Resorts — Luxury, Peace & Faith in Igbo-Ora";
export const DEFAULT_SITE_DESCRIPTION =
  "Grace Arena Resorts offers an oasis of rejuvenation, combining Christian hospitality, luxury accommodations, and natural serenity in Igbo-Ora, Oyo State, Nigeria.";
export const DEFAULT_OG_IMAGE = "/assets/hero-bg.jpg";
export const RESORT_URL = "https://gracearenaresorts.com";

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

const RESORT_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "Grace Arena Resorts Way",
  addressLocality: "Igbo-Ora",
  addressRegion: "Oyo State",
  postalCode: "201103",
  addressCountry: "NG",
};

const RESORT_GEO = {
  "@type": "GeoCoordinates",
  latitude: 7.4333,
  longitude: 3.2833,
};

export function generateHotelJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: "Grace Arena Resorts",
    description: DEFAULT_SITE_DESCRIPTION,
    url: RESORT_URL,
    telephone: "+2348123456789",
    email: "info@gracearenaresorts.com",
    address: RESORT_ADDRESS,
    geo: RESORT_GEO,
    checkinTime: "14:00",
    checkoutTime: "11:00",
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Swimming Pool", value: true },
      { "@type": "LocationFeatureSpecification", name: "Prayer Hut", value: true },
      { "@type": "LocationFeatureSpecification", name: "Modern Mall & Spa", value: true },
      { "@type": "LocationFeatureSpecification", name: "Fine Dining Restaurant", value: true },
      { "@type": "LocationFeatureSpecification", name: "High-Speed Wi-Fi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Alcohol-Free Christian Sanctuary", value: true },
    ],
  };
}

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Grace Arena Resorts",
    url: RESORT_URL,
    logo: `${RESORT_URL}/assets/logo.png`,
    description: DEFAULT_SITE_DESCRIPTION,
    telephone: "+2348123456789",
    email: "info@gracearenaresorts.com",
    address: RESORT_ADDRESS,
    sameAs: [
      "https://facebook.com/gracearenaresorts",
      "https://instagram.com/gracearenaresorts",
      "https://x.com/gracearenaresort",
    ],
  };
}

export function generateLocalBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Grace Arena Resorts Facilities & Wellness",
    url: `${RESORT_URL}/facilities`,
    telephone: "+2348123456789",
    address: RESORT_ADDRESS,
    geo: RESORT_GEO,
    openingHours: "Mo-Su 00:00-23:59",
    priceRange: "₦₦",
  };
}

export function generateRestaurantJsonLd(restaurantName?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurantName || "Grace Arena Resorts Dining",
    url: `${RESORT_URL}/restaurants`,
    telephone: "+2348123456789",
    servesCuisine: ["Continental", "Nigerian", "Afro-Fusion"],
    address: RESORT_ADDRESS,
    geo: RESORT_GEO,
    priceRange: "₦₦ - ₦₦₦",
    menu: `${RESORT_URL}/restaurants`,
  };
}

export function generateTouristAttractionJsonLd(name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name,
    description,
    url: `${RESORT_URL}/gems`,
    address: RESORT_ADDRESS,
    geo: RESORT_GEO,
  };
}

export function generateEventJsonLd(eventName: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventName,
    description,
    location: {
      "@type": "Place",
      name: "Grace Arena Resorts",
      address: RESORT_ADDRESS,
    },
    organizer: {
      "@type": "Organization",
      name: "Grace Arena Resorts",
      url: RESORT_URL,
    },
  };
}

export function generateOfferJsonLd(title: string, discountText: string, promoCode?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: title,
    description: `${title} - ${discountText}`,
    priceCurrency: "NGN",
    availability: "https://schema.org/InStock",
    seller: {
      "@type": "Hotel",
      name: "Grace Arena Resorts",
    },
    ...(promoCode ? { identifier: promoCode } : {}),
  };
}

export function generateContactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Grace Arena Resorts",
    url: `${RESORT_URL}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: "Grace Arena Resorts",
      telephone: "+2348123456789",
      email: "info@gracearenaresorts.com",
      address: RESORT_ADDRESS,
    },
  };
}

export function generateWebPageJsonLd({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${RESORT_URL}${url}`,
    publisher: {
      "@type": "Organization",
      name: "Grace Arena Resorts",
      url: RESORT_URL,
    },
  };
}

export function generateRoomsPageJsonLd(
  rooms: Array<{
    id: string;
    name: string;
    shortDesc?: string;
    basePriceNgn?: number | null;
    priceNgn?: number | null;
    isUnderConstruction?: boolean;
  }>
) {
  // Exclude under-construction room types from makesOffer structured data
  const availableOffers = rooms
    .filter((r) => !r.isUnderConstruction && (r.basePriceNgn || r.priceNgn))
    .map((r) => ({
      "@type": "Offer",
      name: r.name,
      description: r.shortDesc || r.name,
      price: (r.basePriceNgn ?? r.priceNgn) || 0,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      url: `${RESORT_URL}/rooms#${r.id}`,
    }));

  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: "Grace Arena Resorts",
    url: `${RESORT_URL}/rooms`,
    description:
      "Browse available luxury suites and authentic thatched huts across GAR Elysian and GAR Village.",
    address: RESORT_ADDRESS,
    geo: RESORT_GEO,
    makesOffer: availableOffers,
  };
}


