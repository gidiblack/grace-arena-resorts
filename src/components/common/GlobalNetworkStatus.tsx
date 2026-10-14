import React, { useEffect, useState } from "react";
import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { MdWifiOff } from "react-icons/md";
import { t } from "@/lib/i18n";

export const GlobalNetworkStatus: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    let timer: NodeJS.Timeout | undefined;
    if (!navigator.onLine) {
      timer = setTimeout(() => setIsOffline(true), 0);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      width="100%"
      bg="#E53E3E"
      color="white"
      py={2}
      px={4}
      zIndex={9998}
      role="alert"
      aria-live="assertive"
      boxShadow="md"
    >
      <Flex justify="center" align="center" gap={2} maxW="1200px" mx="auto">
        <Icon as={MdWifiOff} boxSize={5} />
        <Text fontSize="14px" fontWeight="medium">
          {t("common.offlineNotice")}
        </Text>
      </Flex>
    </Box>
  );
};

export default GlobalNetworkStatus;
