import React, { useState } from "react";
import Head from "next/head";
import { Box, Flex, Theme } from "@chakra-ui/react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { AdminBreadcrumb, type BreadcrumbItem } from "./AdminBreadcrumb";
import { IdleTimeout } from "./IdleTimeout";
import { AdminDialogHost } from "./AdminDialog";
import { AdminLoadingBar } from "./AdminLoadingBar";
import { useAdminNotifications } from "./useAdminNotifications";
import type { AdminUserSession } from "@/lib/auth/admin-guard";

export interface AdminLayoutProps {
  title: string;
  user: AdminUserSession;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

export function AdminLayout({ title, user, breadcrumbs, children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const notifications = useAdminNotifications();

  return (
    <>
      <Head>
        <title>{`${title} | Grace Arena Admin`}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <AdminLoadingBar />
      <IdleTimeout />

      {/* The public site is dark (globals.css sets light body text and light input text). The admin
          shell is light, so force Chakra's light appearance and opt into the [data-theme="light"]
          input rules for everything inside it, modals included. */}
      <Theme appearance="light" hasBackground={false} color="gray.800" data-theme="light">
        <Flex h="100vh" maxH="100vh" overflow="hidden" bg="gray.100">
          {/* Sidebar */}
          <AdminSidebar
            userRole={user.role}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main Content Area */}
          <Flex direction="column" flex="1" minW={0} h="100%" maxH="100vh" overflow="hidden">
            <AdminTopbar
              user={user}
              onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
              notifications={notifications.counts}
              notificationsFailed={notifications.failed}
            />

            <Box
              as="main"
              flex="1"
              minH={0}
              style={{ minHeight: 0 }}
              p={{ base: 4, md: 6, lg: 8 }}
              pb={{ base: 12, md: 20 }}
              bg="gray.50"
              overflowY="auto"
            >
              {breadcrumbs && breadcrumbs.length > 0 && <AdminBreadcrumb items={breadcrumbs} />}
              {children}
            </Box>
          </Flex>
        </Flex>
        <AdminDialogHost />
      </Theme>
    </>
  );
}

export default AdminLayout;
