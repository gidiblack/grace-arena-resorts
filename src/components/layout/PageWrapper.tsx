import React from "react";
import HeadComponent from "@/components/layout/HeadComponent";
import { Plus_Jakarta_Sans, Roboto } from "next/font/google";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WhatsAppFab from "@/components/common/WhatsAppFab";
import CookieConsentBanner from "@/components/common/CookieConsentBanner";
import { Box } from "@chakra-ui/react";

interface PageWrapperProps {
  title: string;
  description: string;
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

const PageWrapper = ({ title, description, children }: PageWrapperProps) => {
  return (
    <>
      <HeadComponent title={title} description={description} />
      <Box
        as="div"
        className={`${plusJakartaSans.variable} ${roboto.variable} bg-background text-foreground`}
        minH="100vh"
        display="flex"
        flexDirection="column"
        position="relative">
        {/* Skip to Content for WCAG Accessibility */}
        <a
          href="#main-content"
          style={{
            position: "absolute",
            top: "-40px",
            left: "20px",
            backgroundColor: "#FCCA46",
            color: "#070707",
            padding: "8px 16px",
            fontWeight: "bold",
            borderRadius: "6px",
            zIndex: 200,
            textDecoration: "none",
          }}>
          Skip to main content
        </a>

        <Navbar />

        <Box as="main" id="main-content" flex="1" className={`${plusJakartaSans.variable} ${roboto.variable}`}>
          {children}
        </Box>

        <Footer />
        <WhatsAppFab />
        <CookieConsentBanner />
      </Box>
    </>
  );
};

export default PageWrapper;
