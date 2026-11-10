import React, { useState, useEffect, useRef, useMemo } from "react";
import { Box, HStack, IconButton, Link, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Button from "@/components/ui/button";
import { ROUTES } from "@/constants/ROUTES";
import HeroBg from "@/assets/hero-bg.jpg";
import suite from "@/assets/suite.jpg";
import dining from "@/assets/dining.jpg";
import hut from "@/assets/hut.jpg";
import pool from "@/assets/pool.jpg";
import useWindowDimensions from "@/helpers/useWindowDimensions";

export interface GemCard {
  title: string;
  subtitle: string;
  image: string;
  link: string;
  description?: string;
}

const DEFAULT_GEMS: GemCard[] = [
  {
    title: "Luxurious Accommodations",
    subtitle: "Suites & Thatched Huts",
    image: suite.src,
    link: ROUTES.rooms,
  },
  {
    title: "Exquisite Dining",
    subtitle: "Local & Continental",
    image: dining.src,
    link: ROUTES.restaurants,
  },
  {
    title: "The Prayer Hut",
    subtitle: "Spiritual Tranquility",
    image: hut.src,
    link: ROUTES.facilities,
  },
  {
    title: "Serene Pool & Wellness",
    subtitle: "Recreation & Spa",
    image: pool.src,
    link: ROUTES.facilities,
  },
];

interface HeroVideoProps {
  videoSrc?: string;
  posterSrc?: string;
  gems?: GemCard[];
}

export const HeroVideo: React.FC<HeroVideoProps> = ({
  videoSrc = "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-luxury-hotel-resort-in-nature-42991-large.mp4",
  posterSrc = HeroBg.src,
  gems = DEFAULT_GEMS,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [shouldPlayVideo, setShouldPlayVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { width } = useWindowDimensions();

  // Determine how many cards are visible based on viewport width
  const cardsVisible: number =
    width === undefined ? 4 : width < 640 ? 1 : width < 1024 ? 2 : 4;

  const totalGems = gems.length;

  // Extended gems array for seamless infinite looping when there are more items than visible slots
  const extendedGems = useMemo(() => {
    if (gems.length <= cardsVisible) return gems;
    return [...gems, ...gems.slice(0, cardsVisible)];
  }, [gems, cardsVisible]);

  // Handle transition end for seamless wrap
  const handleTransitionEnd = () => {
    if (currentIndex >= totalGems) {
      setIsTransitioning(false);
      setCurrentIndex(0);
    }
  };

  // Re-enable transition after snap
  useEffect(() => {
    if (!isTransitioning) {
      const frame = requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isTransitioning]);

  // Check prefers-reduced-motion and screen width (<768px fallback)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkPlayability = () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isMobile = window.innerWidth < 768;
      return !prefersReducedMotion && !isMobile && Boolean(videoSrc);
    };

    const timer = setTimeout(() => {
      setShouldPlayVideo(checkPlayability());
    }, 0);

    const handleResize = () => {
      setShouldPlayVideo(checkPlayability());
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [videoSrc]);

  // 5s Auto-rotation — advance 1 card forward each tick when more items than visible
  useEffect(() => {
    if (isPaused || totalGems <= cardsVisible) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, totalGems, cardsVisible]);

  // Arrow handlers
  const goLeft = () => {
    if (totalGems <= cardsVisible) return;
    if (currentIndex === 0) {
      setIsTransitioning(false);
      setCurrentIndex(totalGems);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
          setCurrentIndex(totalGems - 1);
        });
      });
    } else {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const goRight = () => {
    if (totalGems <= cardsVisible) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const activeGemIndex = totalGems > 0 ? currentIndex % totalGems : 0;
  const translateX = -(currentIndex * (100 / cardsVisible));
  const cardWidthPct = `${100 / cardsVisible}%`;

  const arrowButtonStyles = {
    boxSize: 8,
    borderRadius: "full" as const,
    bg: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white",
    _hover: { bg: "accent.500", borderColor: "accent.500" },
    _active: { bg: "accent.600" },
    zIndex: 4,
    flexShrink: 0,
  } as const;

  return (
    <Box
      position="relative"
      minH={{ base: "88vh", md: "94vh" }}
      bg="#070707"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      px={{ base: 4, md: 8, xl: 12 }}
      pt={{ base: "100px", md: "120px" }}
      pb={{ base: "60px", md: "80px" }}
      overflow="hidden"
    >
      {/* Background Poster Image */}
      <Box
        position="absolute"
        inset={0}
        bg={`linear-gradient(rgba(7, 7, 7, 0.5), rgba(7, 7, 7, 0.8)), url(${posterSrc})`}
        bgSize="cover"
        bgPos="center"
        zIndex={0}
      />

      {/* Background Autoplay Loop Video (Desktop and no reduced-motion only) */}
      {shouldPlayVideo && !videoError && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoError(true)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
            opacity: 0.55,
          }}
          data-testid="hero-video-player"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Dark overlay gradient to guarantee contrast */}
      <Box
        position="absolute"
        inset={0}
        bg="linear-gradient(to bottom, rgba(7, 7, 7, 0.4) 0%, rgba(7, 7, 7, 0.85) 100%)"
        zIndex={2}
      />

      {/* Hero Content */}
      <Stack
        position="relative"
        zIndex={3}
        maxW="58rem"
        textAlign="center"
        align="center"
        gap={{ base: 4, md: 5 }}
        mt={{ base: 6, md: 0 }}
      >
        <Text
          fontSize={{ base: "12px", md: "14px" }}
          fontWeight="bold"
          letterSpacing={{ base: "3px", md: "4px" }}
          color="accent.500"
          textTransform="uppercase"
        >
          A Serene Christian Retreat in Igbo-Ora, Nigeria
        </Text>

        <Text
          as="h1"
          fontSize={{ base: "32px", sm: "42px", md: "56px", lg: "64px" }}
          fontWeight="bold"
          color="white"
          lineHeight={{ base: "1.15", md: "1.1" }}
        >
          Your Comfort, <br />
          <Text as="span" color="accent.500">
            Our Sacred Priority
          </Text>
        </Text>

        <Text
          fontSize={{ base: "15px", sm: "17px", md: "19px" }}
          color="gray.200"
          maxW="42rem"
          lineHeight="tall"
        >
          Step away from the city hustle into wholesome tranquility. Immerse yourself in refined
          accommodations, the peaceful Prayer Hut, lush landscapes, and authentic Nigerian warmth.
        </Text>

        <HStack gap={4} pt={4} flexWrap="wrap" justify="center">
          <Link href={ROUTES.booking}>
            <Button size="lg" style={{ padding: "14px 36px", fontSize: "15px" }}>
              Book Your Stay
            </Button>
          </Link>
          <Link href={ROUTES.rooms}>
            <Button variant="outline" size="lg" style={{ padding: "14px 32px", fontSize: "15px" }}>
              Explore Rooms &amp; Suites
            </Button>
          </Link>
        </HStack>
      </Stack>

      {/* Sliding Carousel — All Gems */}
      <Box
        position="relative"
        zIndex={3}
        w="full"
        maxW="76rem"
        mt={{ base: 12, md: 16 }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        {/* Arrow buttons + carousel track in a row */}
        <HStack gap={2} align="center">
          {/* Left arrow */}
          <IconButton
            aria-label="Previous"
            onClick={goLeft}
            {...arrowButtonStyles}
          >
            <FaChevronLeft size={12} />
          </IconButton>

          {/* Carousel viewport — clips the sliding track with vertical buffer so top borders & hover transforms are not cut off */}
          <Box overflow="hidden" flex={1} minW={0} py="20px" my="-20px">
            <Box
              display="flex"
              onTransitionEnd={handleTransitionEnd}
              style={{
                transform: `translateX(${translateX}%)`,
                transition: isTransitioning
                  ? "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)"
                  : "none",
              }}
            >
              {extendedGems.map(({ title, subtitle, image, link }, i) => {
                const itemIndex = i % totalGems;
                const isActive = itemIndex === activeGemIndex;

                return (
                  <Box
                    key={`${i}-${title}`}
                    flexShrink={0}
                    style={{ width: cardWidthPct }}
                    px={{ base: 1, md: 2 }}
                  >
                    <NextLink href={link} style={{ textDecoration: "none" }}>
                      <Box
                        h="150px"
                        bg={`linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%), url(${image})`}
                        bgSize="cover"
                        bgPos="center"
                        borderRadius="14px"
                        p={4}
                        display="flex"
                        flexDirection="column"
                        justifyContent="flex-end"
                        border="2px solid"
                        borderColor={isActive ? "accent.500" : "rgba(255, 255, 255, 0.15)"}
                        cursor="pointer"
                        position="relative"
                        transform={isActive ? "translateY(-4px)" : "none"}
                        boxShadow={isActive ? "0 10px 25px rgba(252, 202, 70, 0.25)" : "none"}
                        transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                        _hover={{
                          transform: "translateY(-6px)",
                          borderColor: "accent.500",
                          boxShadow: "0 12px 28px rgba(0,0,0,0.6)",
                        }}
                        onClick={() => {
                          setIsTransitioning(true);
                          setCurrentIndex(i);
                        }}
                        aria-label={`${title} - ${subtitle}`}
                      >
                        {/* Active 5-second progress indicator bar */}
                        {isActive && !isPaused && (
                          <Box
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            h="3px"
                            bg="accent.500"
                            borderTopRadius="12px"
                          />
                        )}

                        <Text
                          fontSize="11px"
                          fontWeight="semibold"
                          color="accent.500"
                          textTransform="uppercase"
                        >
                          {subtitle}
                        </Text>
                        <Text fontSize="16px" fontWeight="bold" color="white" mt={0.5}>
                          {title}
                        </Text>
                      </Box>
                    </NextLink>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Right arrow */}
          <IconButton
            aria-label="Next"
            onClick={goRight}
            {...arrowButtonStyles}
          >
            <FaChevronRight size={12} />
          </IconButton>
        </HStack>
      </Box>
    </Box>
  );
};

export default HeroVideo;
