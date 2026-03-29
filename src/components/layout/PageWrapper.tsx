import React from "react";
import HeadComponent from "@/components/layout/HeadComponent";
import { Plus_Jakarta_Sans, Roboto } from "next/font/google";
import Navbar from "./Navbar";
import Footer from "./Footer";

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
      <body className={`${plusJakartaSans.variable} ${roboto.variable} bg-background text-foreground`}>
        <Navbar />
        <main className={`${plusJakartaSans.variable} ${roboto.variable}`}>{children}</main>
        <Footer />
      </body>
    </>
  );
};

export default PageWrapper;
