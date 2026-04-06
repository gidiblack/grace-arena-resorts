import React from "react";
import { Box, Flex } from "@chakra-ui/react";

const PageSection = ({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<typeof Flex>) => {
  return (
    <Flex
      as={"section"}
      py={["3rem", null, "4rem", "5rem", "6rem"]}
      px={[5, null, 6, 8, 10]}
      w={"full"}
      pos={"relative"}
      {...props}>
      <Box w={"full"} maxW={{ base: "100vw", "2xl": "90rem" }} mx={"auto"} pos={"relative"}>
        {children}
      </Box>
    </Flex>
  );
};

export default PageSection;
