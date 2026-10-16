import React, { useState } from "react";
import Head from "next/head";
import { Box, Flex } from "@chakra-ui/react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { AdminBreadcrumb, type BreadcrumbItem } from "./AdminBreadcrumb";
import { IdleTimeout } from "./IdleTimeout";
import type { AdminUserSession } from "@/lib/auth/admin-guard";

export interface AdminLayoutProps {
  title: string;
  user: AdminUserSession;
  breadcrumbs?: BreadcrumbItem[];
  notificationCount?: number;
  children: React.ReactNode;
}

export function AdminLayout({
  title,
  user,
  breadcrumbs,
  notificationCount = 0,
  children,
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Head>
        <title>{`${title} | Grace Arena Admin`}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <IdleTimeout />

      <Flex minH="100vh" bg="gray.100">
        {/* Sidebar */}
        <AdminSidebar
          userRole={user.role}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <Flex direction="column" flex="1" minW={0} overflow="hidden">
          <AdminTopbar
            user={user}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            notificationCount={notificationCount}
          />

          <Box
            as="main"
            flex="1"
            p={{ base: 4, md: 6, lg: 8 }}
            bg="gray.50"
            overflowY="auto"
          >
            {breadcrumbs && breadcrumbs.length > 0 && (
              <AdminBreadcrumb items={breadcrumbs} />
            )}
            {children}
          </Box>
        </Flex>
      </Flex>
    </>
  );
}

export default AdminLayout;
