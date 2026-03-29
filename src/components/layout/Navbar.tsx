import React from "react";
import { Flex } from "@chakra-ui/react";

const Navbar = () => {
  return (
    <>
      <Flex as="nav" w="full" justifyContent="center" bg="#16191C" borderBottom={"1px solid #1E293B"}>
        <p>Grace Arena Resorts</p>
      </Flex>
    </>
  );
};

export default Navbar;
