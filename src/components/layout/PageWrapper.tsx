import React from "react";
import HeadComponent from "@/components/layout/HeadComponent";
import { Plus_Jakarta_Sans, Roboto } from "next/font/google";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WhatsAppFab from "@/components/common/WhatsAppFab";
import CookieConsentBanner from "@/components/common/CookieConsentBanner";
import AnalyticsLoader from "@/components/common/AnalyticsLoader";
import SkipToContent from "@/components/common/SkipToContent";
import PageTransitionIndicator from "@/components/common/PageTransitionIndicator";
import GlobalNetworkStatus from "@/components/common/GlobalNetworkStatus";
import { Box } from "@chakra-ui/react";

interface PageWrapperProps {
  title?: string;
  description?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  children: React.ReactNode;
}

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

export const PageWrapper: React.FC<PageWrapperProps> = ({
  title = "Grace Arena Resorts",
  description = "A Sanctuary of Peace, Luxury, and Christian Hospitality in Igbo-Ora, Oyo State, Nigeria",
  jsonLd,
  children,
}) => {
  return (
    <>
      <HeadComponent title={title} description={description} jsonLd={jsonLd} />
      <PageTransitionIndicator />
      <GlobalNetworkStatus />

      <Box
        className={`${plusJakartaSans.variable} ${roboto.variable} bg-background text-foreground`}
        minH="100vh"
        display="flex"
        flexDirection="column"
        position="relative"
      >
        {/* Skip to Content for WCAG / a11y */}
        <SkipToContent contentId="main-content" />

        <header role="banner">
          <Navbar />
        </header>

        <main id="main-content" role="main" style={{ flex: 1 }}>
          {children}
        </main>

        <footer role="contentinfo">
          <Footer />
        </footer>

        <WhatsAppFab />
        <CookieConsentBanner />
        <AnalyticsLoader />
      </Box>
    </>
  );
};

export default PageWrapper;
