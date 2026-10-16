import React from "react";
import NextLink from "next/link";
import { HStack, Text, Link, Icon } from "@chakra-ui/react";
import { FaChevronRight, FaHome } from "react-icons/fa";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface AdminBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function AdminBreadcrumb({ items }: AdminBreadcrumbProps) {
  return (
    <HStack gap={2} fontSize="sm" color="gray.600" mb={4} flexWrap="wrap">
      <NextLink href="/admin" passHref legacyBehavior>
        <Link display="flex" alignItems="center" color="gray.500" _hover={{ color: "blue.600" }}>
          <Icon as={FaHome} mr={1} boxSize={3} />
          <span>Admin</span>
        </Link>
      </NextLink>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            <Icon as={FaChevronRight} boxSize={2.5} color="gray.400" />
            {isLast || !item.href ? (
              <Text fontWeight="semibold" color="gray.800">
                {item.label}
              </Text>
            ) : (
              <NextLink href={item.href} passHref legacyBehavior>
                <Link color="gray.600" _hover={{ color: "blue.600" }}>
                  {item.label}
                </Link>
              </NextLink>
            )}
          </React.Fragment>
        );
      })}
    </HStack>
  );
}

export default AdminBreadcrumb;
