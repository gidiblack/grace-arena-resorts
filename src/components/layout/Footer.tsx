import React from "react";
import { Flex, GridItem, HStack, Icon, Image, SimpleGrid, Stack, Text, Box } from "@chakra-ui/react";
import Link from "next/link";
import NextImage from "next/image";
import logo from "../../../public/grace_arena_logo-light.svg";
import { FaEnvelope, FaFacebook, FaLinkedin, FaPhoneAlt, FaTwitter } from "react-icons/fa";
import { ROUTES } from "@/constants/ROUTES";
import { RiInstagramFill } from "react-icons/ri";
import { FaLocationDot } from "react-icons/fa6";

const Footer = () => {
  const SOCIALS = [
    {
      label: "Facebook",
      href: "https://www.facebook.com/gidiblack",
      icon: FaFacebook,
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/gidiblack",
      icon: RiInstagramFill,
    },
    {
      label: "Twitter",
      href: "https://x.com/tha_Gidi",
      icon: FaTwitter,
    },
  ];
  return (
    <Flex
      as="footer"
      w="full"
      flexDir={"column"}
      bgColor="#F1F5F9"
      px={[5, null, 6, 8, 10]}
      py={[8, null, 10, 12, 16, 20]}
      alignItems={"center"}>
      <Flex w={"full"} maxW={{ base: "100vw", "2xl": "90rem" }} justifyContent={"space-between"}>
        <SimpleGrid columns={{ base: 2, lg: 6 }} gap={8}>
          <GridItem colSpan={2}>
            <Stack gap={[3, null, 4, 5, 6]}>
              <Link href={ROUTES.home}>
                <Image asChild width={"120px"} height={"56px"} position={"relative"} objectFit={"contain"}>
                  <NextImage src={logo.src} alt="grace arena logo" width={120} height={56} />
                </Image>
              </Link>
              <Text fontSize={[12, null, 13, 14]} color={"dark.400"}>
                Lorem, ipsum dolor sit amet consectetur adipisicing elit. Voluptas sed rerum tempora veniam
                necessitatibus obcaecati fugiat! Ullam similique reprehenderit labore id praesentium ex nesciunt
                corrupti ea et, nihil illum facere soluta rerum repellendus eligendi sequi molestiae, totam modi
                voluptates accusantium!
              </Text>
              <HStack gap={4}>
                {SOCIALS.map((social) => (
                  <Link key={social.label} href={social.href} target="_blank" rel="noopener noreferrer">
                    <Icon as={social.icon} boxSize={[4, null, 5, 6]} color={"dark.400"} />
                  </Link>
                ))}
              </HStack>
            </Stack>
          </GridItem>
          <GridItem colSpan={1}>
            <Text as={"h4"} fontSize={[14, null, 15, 16]} fontWeight={"bold"} color={"dark.500"}>
              Rooms & Suites
            </Text>
            <Stack mt={4} gap={3}>
              <Text fontSize={[12, null, 13, 14]} fontWeight={"medium"} color={"dark.400"}>
                The Fountain Haven
              </Text>
              <Text fontSize={[12, null, 13, 14]} fontWeight={"medium"} color={"dark.400"}>
                The Oasis Villa
              </Text>
              <Text fontSize={[12, null, 13, 14]} fontWeight={"medium"} color={"dark.400"}>
                The Cabana
              </Text>
              <Text fontSize={[12, null, 13, 14]} fontWeight={"medium"} color={"dark.400"}>
                The Executive Hut
              </Text>
            </Stack>
          </GridItem>
          <GridItem colSpan={1}>
            <Text as={"h4"} fontSize={[14, null, 15, 16]} fontWeight={"bold"} color={"dark.500"}>
              Quick Links
            </Text>
            <Stack mt={4} gap={3}>
              <Text fontSize={[12, null, 13, 14]} fontWeight={"medium"} color={"dark.400"}>
                Facilities
              </Text>
              <Text fontSize={[12, null, 13, 14]} fontWeight={"medium"} color={"dark.400"}>
                Events
              </Text>
              <Text fontSize={[12, null, 13, 14]} fontWeight={"medium"} color={"dark.400"}>
                Deals & Offers
              </Text>
              <Text fontSize={[12, null, 13, 14]} fontWeight={"medium"} color={"dark.400"}>
                Restaurants
              </Text>
            </Stack>
          </GridItem>
          <GridItem colSpan={2}>
            <Text as={"h4"} fontSize={[14, null, 15, 16]} fontWeight={"bold"} color={"dark.500"}>
              Contact Us
            </Text>
            <Stack mt={4} gap={3}>
              <HStack gap={1} alignItems={"flex-start"}>
                <Icon as={FaLocationDot} boxSize={4} color={"dark.300"} mt={1} />
                <Text fontSize={[12, null, 13, 14]} color={"dark.400"}>
                  Grace Arena Resorts, Address Line 1, Address Line 2, City, Country
                </Text>
              </HStack>
              <Link href="tel:+2341234567890">
                <HStack gap={1} alignItems={"flex-start"}>
                  <Icon as={FaPhoneAlt} boxSize={4} color={"dark.300"} mt={1} />
                  <Text fontSize={[12, null, 13, 14]} color={"dark.400"}>
                    +234 123 456 7890
                  </Text>
                </HStack>
              </Link>
              <Link href="mailto:bookings@gracearenaresorts.com">
                <HStack gap={1} alignItems={"flex-start"}>
                  <Icon as={FaEnvelope} boxSize={4} color={"dark.300"} mt={1} />
                  <Text fontSize={[12, null, 13, 14]} color={"dark.400"}>
                    bookings@gracearenaresorts.com
                  </Text>
                </HStack>
              </Link>
            </Stack>
          </GridItem>
        </SimpleGrid>
      </Flex>
      <Text fontSize={[12, null, 13, 14]} color={"dark.400"} mt={[4, null, 3, 4]} textAlign={"center"}>
        &copy; {new Date().getFullYear()} Grace Arena Resorts, All rights reserved.
      </Text>
    </Flex>
  );
};

export default Footer;
