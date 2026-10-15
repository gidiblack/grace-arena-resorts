import { useEffect } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
const CONSENT_KEY = "gar_cookie_consent";
export const CONSENT_UPDATED_EVENT = "gar:consent-updated";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function hasAnalyticsConsent(): boolean {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return Boolean(stored && JSON.parse(stored).analytics);
  } catch {
    return false;
  }
}

function loadGoogleAnalytics() {
  if (!GA_ID || document.getElementById("gar-ga4")) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });

  const script = document.createElement("script");
  script.id = "gar-ga4";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
}

/**
 * Loads GA4 only after the visitor has granted analytics consent (NDPR, SRS Section 3).
 * Renders nothing.
 */
export default function AnalyticsLoader() {
  useEffect(() => {
    if (!GA_ID) return;
    if (hasAnalyticsConsent()) loadGoogleAnalytics();

    const onConsentUpdated = () => {
      if (hasAnalyticsConsent()) loadGoogleAnalytics();
    };
    window.addEventListener(CONSENT_UPDATED_EVENT, onConsentUpdated);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, onConsentUpdated);
  }, []);

  return null;
}
