import { Box, Flex, GridItem, HStack, Icon, Image, Link, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import PageSection from "@/components/layout/PageSection";
import HeroBg from "@/assets/hero-bg.jpg";
import gem1 from "@/assets/hero-placeholder.jpg";
import elysian from "@/assets/gar-elysian.jpg";
import village from "@/assets/gar-village.jpg";
import sectionBg from "@/assets/paper-bg.png";
import dining from "@/assets/dining.jpg";
import hut from "@/assets/hut.jpg";
import pool from "@/assets/pool.jpg";
import suite from "@/assets/suite.jpg";
import suite2 from "@/assets/suite2.jpg";
import { FaArrowRightLong, FaArrowRight, FaArrowLeft } from "react-icons/fa6";
import Button from "@/components/ui/button";
import { MdKingBed, MdLocalLaundryService, MdPool } from "react-icons/md";
import { TbAirConditioning } from "react-icons/tb";
import { PiChefHatBold, PiPlantFill } from "react-icons/pi";
import { BiDumbbell } from "react-icons/bi";
import { FaWifi } from "react-icons/fa";

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
      "Experience the epitome of luxury at GAR Elysian, where opulence meets tranquility in a haven of indulgence. Discover a world of refined elegance, impeccable service, and unforgettable moments at our premier resort.",
    image: elysian.src,
    href: "/rooms",
  },
  {
    title: "GAR Village",
    description:
      "Discover the charm of GAR Village, a serene retreat that blends rustic elegance with modern comforts for an unforgettable stay. Enjoy a peaceful ambiance, personalized service, and a variety of recreational activities in a picturesque setting.",
    image: village.src,
    href: "/rooms",
  },
];

const AMENITIES = [
  {
    title: "Luxury Rooms",
    icon: MdKingBed,
  },
  {
    title: "Air Conditioning",
    icon: TbAirConditioning,
  },
  {
    title: "Free Wi-Fi",
    icon: FaWifi,
  },
  {
    title: "Breakfast",
    icon: PiChefHatBold,
  },
  {
    title: "Swimming Pool",
    icon: MdPool,
  },
  {
    title: "Gym",
    icon: BiDumbbell,
  },
  {
    title: "Laundry Service",
    icon: MdLocalLaundryService,
  },
  {
    title: "Garden",
    icon: PiPlantFill,
  },
];

export default function Home() {
  return (
    <>
      <PageWrapper title="Homepage" description="Welcome to Grace Arena Resorts">
        {/* Hero Section */}
        <PageSection
          bg={`url(${HeroBg.src}) rgba(0, 0, 0, 0.25)`}
          bgBlendMode={"overlay"}
          bgSize={"cover"}
          bgRepeat={"no-repeat"}
          bgPos={"center"}
          w={"100vw"}
          minH={"90vh"}
          justifyContent={"center"}
          py={0}>
          <Box w={"full"} position={"absolute"} bottom={-24} zIndex={10}>
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
          </Box>
        </PageSection>

        {/* About Section */}
        <PageSection
          bg={`url(${sectionBg.src})`}
          bgSize={"cover"}
          bgRepeat={"no-repeat"}
          bgPos={"bottom"}
          minH={"32rem"}
          justifyContent={"center"}
          align={"center"}>
          <Text fontSize={[20, null, 24, 28, 32]} fontWeight={"medium"} color={"dark.500"} textAlign={"center"}>
            Grace Arena Resort, nestled in the heart of Igbo-Ora, the land of twins, is a serene Christian resort that
            offers a tranquil escape from the hustle and bustle of everyday life
          </Text>
        </PageSection>

        {/* Campuses Section */}
        <PageSection>
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

        {/* Amenities Section */}
        <PageSection minH={"36rem"} py={0}>
          <Flex
            w={"full"}
            flexDir={"column"}
            bgColor={"dark.500"}
            borderRadius={16}
            p={[10, null, 12, 16, 20]}
            position={"absolute"}
            zIndex={10}
            bottom={"-20rem"}>
            <Stack maxW={"480px"} gap={6}>
              <Text
                as={"h3"}
                fontSize={[20, null, 24, 28, 32]}
                fontWeight={"bold"}
                color={"light.500"}
                textTransform={"uppercase"}>
                Elevate Your Stay with Our Exceptional Amenities
              </Text>
              <Text fontSize={[14, null, 15, 16]} color={"light.500"}>
                At Grace Arena Resort, we pride ourselves on offering a wide range of amenities designed to enhance your
                stay and provide an unforgettable experience. From our luxurious accommodations to our exquisite dining
                options, we have everything you need to relax, unwind, and create lasting memories.
              </Text>
              <Button>Explore Amenities</Button>
            </Stack>
            <SimpleGrid
              columns={{ base: 2, md: 3, lg: 4 }}
              gap={[6, null, 8, 12]}
              ml={"auto"}
              w={"70%"}
              position={"relative"}
              top={-10}>
              {AMENITIES.map(({ title, icon }, i) => (
                <Flex
                  key={i}
                  borderRadius={6}
                  outline={"1px solid #AEAEAE"}
                  h={"140px"}
                  w={"full"}
                  align={"center"}
                  justify={"center"}>
                  <Stack gap={4} align={"center"} justify={"center"}>
                    <Icon as={icon} boxSize={6} color={"accent.500"} />
                    <Text fontSize={[12, null, 13, 14]} fontWeight={"bold"} color={"light.500"} textAlign={"center"}>
                      {title}
                    </Text>
                  </Stack>
                </Flex>
              ))}
            </SimpleGrid>
            <Flex justify={"flex-end"} gap={4} mt={10}>
              <Flex
                boxSize={10}
                bgColor={"light.500"}
                borderRadius={"full"}
                align={"center"}
                justify={"center"}
                _hover={{ bgColor: "accent.500", transform: "scale(1.07)" }}
                transition={"all 0.2s"}
                cursor={"pointer"}>
                <Icon as={FaArrowLeft} boxSize={4} color={"dark.500"} />
              </Flex>
              <Flex
                boxSize={10}
                bgColor={"light.500"}
                borderRadius={"full"}
                align={"center"}
                justify={"center"}
                _hover={{ bgColor: "accent.500", transform: "scale(1.07)" }}
                transition={"all 0.2s"}
                cursor={"pointer"}>
                <Icon as={FaArrowRight} boxSize={4} color={"dark.500"} />
              </Flex>
            </Flex>
          </Flex>
        </PageSection>

        {/* Gallery Section */}
        <PageSection bgColor={"light.500"} pt={["8rem", null, "10rem", null, "30rem"]} pb={[12, null, 16, 20]}>
          <Text as={"h2"} fontSize={[24, null, 28, 32, 36]} fontWeight={"medium"} color={"dark.500"}>
            OUR GALLERY
          </Text>
          <SimpleGrid
            columns={{ base: 2, md: 3, lg: 4 }}
            templateRows={"200px 200px 200px"}
            gap={[4, null, 5, 6]}
            mt={[10, null, 14, 16, 20]}
            w={"full"}>
            <GridItem colSpan={2} rowSpan={1}>
              <Image src={dining.src} alt="dining area" w={"full"} h={"full"} objectFit={"cover"} />
            </GridItem>
            <GridItem colSpan={1} rowSpan={1}>
              <Image src={pool.src} alt="pool area" w={"full"} h={"full"} objectFit={"cover"} />
            </GridItem>
            <GridItem colSpan={1} rowSpan={1}>
              <Image src={hut.src} alt="hut area" w={"full"} h={"full"} objectFit={"cover"} />
            </GridItem>
            <GridItem colSpan={1} rowSpan={2}>
              <Flex flexDir={"column"} gap={[4, null, 5, 6]} h={"full"}>
                <Image src={village.src} alt="gar village" w={"full"} h={"200px"} objectFit={"cover"} />
                <Image src={elysian.src} alt="elysian area" w={"full"} h={"200px"} objectFit={"cover"} />
              </Flex>
            </GridItem>

            <GridItem colSpan={1} rowSpan={2}>
              <Image src={suite.src} alt="suite" w={"full"} h={"full"} objectFit={"cover"} />
            </GridItem>
            <GridItem colSpan={2} rowSpan={1}>
              <Image src={gem1.src} alt="dining area" w={"full"} h={"full"} objectFit={"cover"} />
            </GridItem>
            <GridItem colSpan={1} rowSpan={1}>
              <Image src={suite2.src} alt="suite 2" w={"full"} h={"full"} objectFit={"cover"} />
            </GridItem>
            <GridItem colSpan={1} rowSpan={1}>
              <Image src={HeroBg.src} alt="suite 2" w={"full"} h={"full"} objectFit={"cover"} />
            </GridItem>
          </SimpleGrid>
        </PageSection>
      </PageWrapper>
    </>
  );
}
