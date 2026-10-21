import "@/styles/globals.css";
import React, { useEffect } from "react";
import type { AppProps } from "next/app";
import { Provider } from "@/components/ui/provider";
import { Toaster, setupGlobalErrorToaster } from "@/components/ui/toaster";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    setupGlobalErrorToaster();
  }, []);

  return (
    <Provider>
      <Component {...pageProps} />
      <Toaster />
    </Provider>
  );
}
