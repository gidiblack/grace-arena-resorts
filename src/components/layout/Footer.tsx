import React from "react";
import { Flex, HStack, Icon, Image, Text } from "@chakra-ui/react";
import Link from "next/link";
import NextImage from "next/image";
import logo from "../../../public/logo-icon.png";
import { FaGithub, FaLinkedin, FaTwitter } from "react-icons/fa";

const Footer = () => {
  const SOCIALS = [
    {
      label: "GitHub",
      href: "https://github.com/gidiblack",
      icon: FaGithub,
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/gideon-etim-6534a7187/",
      icon: FaLinkedin,
    },
    {
      label: "Twitter",
      href: "https://x.com/tha_Gidi",
      icon: FaTwitter,
    },
  ];
  return (
    <Flex as="footer" w="full" justifyContent="center" bg="#16191C" border={"1px solid #1E293B"}>
      <Flex
        w={"full"}
        maxW={{ base: "100vw", "2xl": "90rem" }}
        alignItems={"center"}
        justifyContent={"space-between"}
        px={[5, null, 6, 8, 10]}
        py={[4, null, 5, 6]}
        gap={[2, null, 0]}
        flexDir={["column", null, "row"]}>
        <Link href={"/"}>
          <HStack gap={0.5}>
            <Image asChild w={"54px"} position={"relative"} objectFit={"contain"}>
              <NextImage src={logo.src} alt="grace arena resorts logo" width={54} height={32} />
            </Image>
            <Text fontSize={[12, null, 13, 14]} fontWeight={"bold"} color={"#DE9E2C"}>
              G.A.R
            </Text>
          </HStack>
        </Link>
        <Text fontSize={[12, null, 13, 14]} color={"#64748B"}>
          &copy; {new Date().getFullYear()} Grace Arena Resorts, All rights reserved.
        </Text>
        <HStack gap={4}>
          {SOCIALS.map((social) => (
            <Link key={social.label} href={social.href} target="_blank" rel="noopener noreferrer">
              <Icon as={social.icon} boxSize={4} color={"#64748B"} />
            </Link>
          ))}
        </HStack>
      </Flex>
    </Flex>
  );
};

export default Footer;
