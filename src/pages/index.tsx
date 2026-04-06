import { Box, Flex, HStack, Icon, Link, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import PageSection from "@/components/layout/PageSection";
import HeroBg from "@/assets/hero-bg.jpg";
import gem1 from "@/assets/hero-placeholder.jpg";
import elysian from "@/assets/gar-elysian.jpg";
import village from "@/assets/gar-village.jpg";
import sectionBg from "@/assets/paper-bg.png";
import { FaArrowRightLong } from "react-icons/fa6";

const GEMS = [
  {
    title: "Luxurious Accommodations",
    image: gem1.src,
  },
  {
    title: "Exquisite Dining",
    image: gem1.src,
  },
  {
    title: "Breathtaking Views",
    image: gem1.src,
  },
  {
    title: "Relaxing Spa",
    image: gem1.src,
  },
];

const CAMPUSES = [
  {
    title: "GAR Elysian",
    description:
      "Experience the epitome of luxury at GAR Elysian, where opulence meets tranquility in a haven of indulgence.",
    image: elysian.src,
    href: "/rooms",
  },
  {
    title: "GAR Village",
    description:
      "Discover the charm of GAR Village, a serene retreat that blends rustic elegance with modern comforts for an unforgettable stay.",
    image: village.src,
    href: "/rooms",
  },
];

export default function Home() {
  return (
    <>
      <PageWrapper title="Homepage" description="Welcome to Grace Arena Resorts">
        {/* Hero Section */}
        <Flex
          bg={`url(${HeroBg.src}) rgba(0, 0, 0, 0.25)`}
          bgBlendMode={"overlay"}
          bgSize={"cover"}
          bgRepeat={"no-repeat"}
          bgPos={"center"}
          w={"100vw"}
          minH={"90vh"}
          justifyContent={"center"}
          position={"relative"}>
          <PageSection position={"absolute"} py={0} bottom={-24} zIndex={10}>
            <Text as={"h1"} fontSize="2xl" fontWeight="bold">
              Your Comfort, Our Priority
            </Text>
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={[6, null, 5, 6, 8]} mt={[4, null, 5, 6]}>
              {GEMS.map(({ title, image }, i) => (
                <Box
                  key={i}
                  h={"200px"}
                  bg={`url(${image}) rgba(0, 0, 0, 0.5)`}
                  bgBlendMode={"overlay"}
                  bgSize={"cover"}
                  bgPos={"center"}
                  position={"relative"}
                  borderRadius={8}>
                  <Text
                    position={"absolute"}
                    bottom={6}
                    left={6}
                    color={"light.500"}
                    fontWeight={"semibold"}
                    fontSize={[18, null, 19, 20]}>
                    {title}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </PageSection>
        </Flex>
        {/* About Section */}
        <Flex
          bg={`url(${sectionBg.src})`}
          bgSize={"cover"}
          bgRepeat={"no-repeat"}
          bgPos={"bottom"}
          w={"100vw"}
          minH={"32rem"}
          justifyContent={"center"}
          align={"center"}
          position={"relative"}>
          <PageSection>
            <Text fontSize={[20, null, 24, 28, 32]} fontWeight={"medium"} color={"dark.500"} textAlign={"center"}>
              Grace Arena Resort, nestled in the heart of Igbo-Ora, the land of twins, is a serene Christian resort that
              offers a tranquil escape from the hustle and bustle of everyday life
            </Text>
          </PageSection>
        </Flex>
        {/* Campuses Section */}
        <PageSection>
          {/* <Text
            as={"h2"}
            fontSize={[24, null, 28, 32, 36]}
            fontWeight={"medium"}
            color={"light.500"}
            textAlign={"center"}>
            Explore Our Campuses
          </Text> */}
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={[8, null, 10, 16, 20]} mt={10} px={[0, null, 8, 12, 16]}>
            {CAMPUSES.map(({ title, description, image, href }, i) => (
              <Flex key={i} flexDir={"column"} borderRadius={24} border={"4px solid"} borderColor={"light.500"}>
                <Box
                  h={"320px"}
                  bg={`url(${image}) rgba(0, 0, 0, 0.25)`}
                  bgBlendMode={"overlay"}
                  bgSize={"cover"}
                  bgPos={"center"}
                  borderTopRadius={24}
                />
                <Stack gap={[4, null, 5, 6]} p={[5, null, 6, 8]}>
                  <Text as={"h3"} fontSize={[20, null, 22, 24]} fontWeight={"semibold"}>
                    {title}
                  </Text>
                  <Text fontSize={[14, null, 15, 16]} fontWeight={"medium"}>
                    {description}
                  </Text>
                  <Link href={href} w={"fit-content"}>
                    <HStack className={"group"} transition={"all 0.2s"}>
                      <Text
                        fontSize={[14, null, 15, 16]}
                        fontWeight={"bold"}
                        color={"light.500"}
                        _groupHover={{ color: "accent.500" }}
                        letterSpacing={"4px"}
                        textTransform={"uppercase"}>
                        See More
                      </Text>
                      <Icon as={FaArrowRightLong} w={4} color={"light.500"} _groupHover={{ color: "accent.500" }} />
                    </HStack>
                  </Link>
                </Stack>
              </Flex>
            ))}
          </SimpleGrid>
        </PageSection>
      </PageWrapper>
    </>
  );
}
