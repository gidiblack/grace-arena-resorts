import { Text } from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import PageSection from "@/components/layout/PageSection";

export default function Home() {
  return (
    <>
      <PageWrapper title="Homepage" description="Welcome to Grace Arena Resorts">
        <PageSection>
          <Text as={"h1"} fontSize="2xl" fontWeight="bold">
            Welcome to Grace Arena Resorts
          </Text>
          <Text mt={4}>
            Experience the epitome of luxury and tranquility at Grace Arena Resorts, where every moment is crafted to
            perfection. Nestled in a breathtaking location, our resort offers an unparalleled blend of opulence and
            natural beauty. Whether you're seeking a romantic getaway, a family vacation, or a rejuvenating retreat,
            Grace Arena Resorts promises an unforgettable escape. Indulge in world-class amenities, exquisite dining,
            and personalized service that caters to your every need. Discover a sanctuary of serenity and sophistication
            at Grace Arena Resorts, where your dream vacation becomes a reality. and then some...
          </Text>
        </PageSection>
      </PageWrapper>
    </>
  );
}
