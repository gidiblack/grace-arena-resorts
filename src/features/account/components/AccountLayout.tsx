import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Box, Flex, HStack, Icon, Text, Badge, Spinner } from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/button";
import { FaCalendarCheck, FaKey, FaSignOutAlt, FaPlus } from "react-icons/fa";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  isEmailVerified: boolean;
}

interface AccountLayoutProps {
  children: React.ReactNode;
  title: string;
  activeTab: "overview" | "bookings" | "profile";
}

export default function AccountLayout({ children, title, activeTab }: AccountLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/v1/auth/me");
        if (!res.ok) {
          router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
          return;
        }
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data);
        } else {
          router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
        }
      } catch {
        router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <PageWrapper title={`${title} — Grace Arena Resorts`}>
        <Flex minH="60vh" align="center" justify="center" bg="#0B132B">
          <Spinner color="accent.500" size="xl" />
        </Flex>
      </PageWrapper>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageWrapper title={`${title} — Grace Arena Resorts`}>
      <Box bg="#0B132B" color="white" minH="85vh" py={{ base: 8, md: 12 }}>
        <Box maxW="1200px" mx="auto" px={{ base: 4, sm: 6, lg: 8 }}>
          {/* Header Profile Bar */}
          <Flex
            bg="#0F172A"
            p={{ base: 6, md: 8 }}
            borderRadius="20px"
            border="1px solid #1E293B"
            justify="space-between"
            align={{ base: "flex-start", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap={4}
            mb={8}
          >
            <HStack gap={4}>
              <Flex
                w="56px"
                h="56px"
                borderRadius="full"
                bg="accent.500"
                color="black"
                align="center"
                justify="center"
                fontSize="22px"
                fontWeight="extrabold"
              >
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "G"}
              </Flex>
              <Box>
                <HStack gap={2}>
                  <Text fontSize={{ base: "18px", md: "22px" }} fontWeight="bold" color="white">
                    {user.fullName || "Guest Account"}
                  </Text>
                  <Badge
                    bg="rgba(72, 187, 120, 0.2)"
                    color="#48BB78"
                    px={2.5}
                    py={0.5}
                    borderRadius="full"
                    fontSize="11px"
                  >
                    Verified Guest
                  </Badge>
                </HStack>
                <Text fontSize="13px" color="gray.400" mt={0.5}>
                  {user.email} • {user.phone || "No phone added"}
                </Text>
              </Box>
            </HStack>

            <Link href="/booking" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="sm">
                <HStack gap={2}>
                  <Icon as={FaPlus} />
                  <Text>Book a Stay</Text>
                </HStack>
              </Button>
            </Link>
          </Flex>

          {/* Navigation Tabs */}
          <HStack gap={2} borderBottom="1px solid #1E293B" pb={3} mb={8} overflowX="auto">
            <Link href="/account" style={{ textDecoration: "none" }}>
              <Button variant={activeTab === "overview" ? "primary" : "secondary"} size="sm">
                Overview
              </Button>
            </Link>

            <Link href="/account/bookings" style={{ textDecoration: "none" }}>
              <Button variant={activeTab === "bookings" ? "primary" : "secondary"} size="sm">
                <HStack gap={2}>
                  <Icon as={FaCalendarCheck} />
                  <Text>My Bookings</Text>
                </HStack>
              </Button>
            </Link>

            <Link href="/account/profile" style={{ textDecoration: "none" }}>
              <Button variant={activeTab === "profile" ? "primary" : "secondary"} size="sm">
                <HStack gap={2}>
                  <Icon as={FaKey} />
                  <Text>Profile &amp; Password</Text>
                </HStack>
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              style={{ marginLeft: "auto", borderColor: "#334155" }}
            >
              <HStack gap={2}>
                <Icon as={FaSignOutAlt} color="#FC8181" />
                <Text color="#FC8181">Sign Out</Text>
              </HStack>
            </Button>
          </HStack>

          {/* Main Tab Content */}
          <Box>{children}</Box>
        </Box>
      </Box>
    </PageWrapper>
  );
}
