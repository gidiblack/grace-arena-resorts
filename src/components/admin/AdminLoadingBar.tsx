import React, { useEffect, useState, useRef } from "react";
import { Box, Spinner, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";

export function AdminLoadingBar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleStart = (url: string) => {
      // Don't trigger if navigating to the same URL or hash change
      const currentUrl = router.asPath.split("#")[0];
      const targetUrl = url.split("#")[0];
      if (currentUrl === targetUrl) return;

      setLoading(true);
      setProgress(25);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) return prev;
          const diff = 85 - prev;
          return prev + Math.max(1, Math.floor(diff * 0.15));
        });
      }, 120);
    };

    const handleComplete = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Top glowing gold progress bar across the screen */}
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        h="3px"
        zIndex={9999}
        pointerEvents="none"
        bg="rgba(15, 23, 42, 0.4)"
      >
        <Box
          h="100%"
          w={`${progress}%`}
          bg="#FCCA46"
          boxShadow="0 0 10px #FCCA46, 0 0 4px #FCCA46"
          transition={
            progress === 100
              ? "width 0.1s ease-out, opacity 0.25s ease"
              : "width 0.2s ease-out"
          }
          opacity={loading ? 1 : 0}
        />
      </Box>

      {/* Top right floating pill indicator */}
      <Box
        position="fixed"
        top="14px"
        right="20px"
        zIndex={9999}
        pointerEvents="none"
        bg="#0F172A"
        px={3}
        py={1.5}
        borderRadius="full"
        boxShadow="0 4px 12px rgba(0, 0, 0, 0.25)"
        border="1px solid rgba(252, 202, 70, 0.35)"
        display="flex"
        alignItems="center"
        gap={2}
        opacity={loading ? 1 : 0}
        transition="opacity 0.2s ease"
      >
        <Spinner size="xs" color="#FCCA46" borderWidth="2px" />
        <Text fontSize="xs" fontWeight="semibold" color="#FCCA46">
          Loading…
        </Text>
      </Box>
    </>
  );
}

export default AdminLoadingBar;
