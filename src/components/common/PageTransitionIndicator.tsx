import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Box } from "@chakra-ui/react";

export const PageTransitionIndicator: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleStart = () => {
      setLoading(true);
      setProgress(25);
      timer = setInterval(() => {
        setProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 200);
    };

    const handleComplete = () => {
      setProgress(100);
      clearInterval(timer);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      clearInterval(timer);
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  if (!loading && progress === 0) return null;

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      width="100%"
      height="3px"
      zIndex={10000}
      bg="transparent"
      pointerEvents="none"
    >
      <Box
        height="100%"
        width={`${progress}%`}
        bg="#C5A880"
        boxShadow="0 0 10px #C5A880, 0 0 5px #B38E5D"
        transition="width 0.2s ease-out, opacity 0.25s ease"
      />
    </Box>
  );
};

export default PageTransitionIndicator;
