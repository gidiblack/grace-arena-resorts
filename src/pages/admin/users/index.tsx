import React, { useState, useEffect, useCallback } from "react";
import type { GetServerSideProps } from "next";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Button,
  Icon,
  Spinner,
  Table,
} from "@chakra-ui/react";
import {
  FaUsers,
  FaUserPlus,
  FaCheckCircle,
  FaExclamationCircle,
  FaLock,
  FaUnlock,
  FaUserShield,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminDialog } from "@/components/admin/AdminDialog";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import type { UserRole } from "@/types/db";

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  is_email_verified: boolean;
  is_locked: boolean;
  created_at: string;
}

interface UsersPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<UsersPageProps> = async (ctx) => {
  return requireAdminPage<UsersPageProps>(ctx, ["super_admin"]);
};

export default function AdminUsersPage({ adminUser }: UsersPageProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserItem | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("content_manager");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // New user form fields
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>("content_manager");
  const [createPhone, setCreatePhone] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setUsers(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim() || !createPassword || !createFullName.trim()) {
      setFeedback({ type: "error", message: "Email, password, and full name are required." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail.trim().toLowerCase(),
          password: createPassword,
          fullName: createFullName.trim(),
          role: createRole,
          phone: createPhone.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `Admin user '${createEmail}' successfully created with role '${createRole}'!`,
        });
        setShowCreateModal(false);
        setCreateEmail("");
        setCreatePassword("");
        setCreateFullName("");
        setCreatePhone("");
        await fetchUsers();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to create admin user.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRole) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/admin/users/${selectedUserForRole.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `User '${selectedUserForRole.email}' role updated to '${newRole}'.`,
        });
        setSelectedUserForRole(null);
        await fetchUsers();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to update role.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error updating user role." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (user: UserItem) => {
    if (user.id === adminUser.id) {
      await adminDialog.notify({
        title: "You can't lock your own account",
        message: "Ask another Super Admin to lock or unlock your account.",
        tone: "warning",
      });
      return;
    }

    const newLockedState = !user.is_locked;
    const confirmed = await adminDialog.confirm(
      newLockedState
        ? {
            title: "Lock account?",
            message: `${user.email} loses access immediately and can't log in until the account is unlocked.`,
            confirmLabel: "Lock Account",
          }
        : {
            title: "Unlock account?",
            message: `${user.email} will be able to log in again.`,
            confirmLabel: "Unlock Account",
            tone: "warning",
          }
    );
    if (!confirmed) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: newLockedState }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `Account '${user.email}' ${newLockedState ? "locked" : "unlocked"}.`,
        });
        await fetchUsers();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to update user lock status.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error updating lock status." });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return "red";
      case "resort_admin":
        return "blue";
      case "content_manager":
        return "purple";
      default:
        return "gray";
    }
  };

  return (
    <AdminLayout
      title="User Management"
      user={adminUser}
      breadcrumbs={[{ label: "User Management" }]}
    >
      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <HStack gap={2}>
            <Heading as="h1" size="lg" color="gray.800">
              Staff & User Access Control
            </Heading>
            <Badge colorPalette="red" fontSize="10px">
              Super Admin Only
            </Badge>
          </HStack>
          <Text fontSize="sm" color="gray.600">
            Provision staff administrator accounts, assign RBAC roles, and manage account locks.
          </Text>
        </Box>

        <Button size="sm" colorPalette="blue" onClick={() => setShowCreateModal(true)}>
          <HStack gap={1}>
            <Icon as={FaUserPlus} boxSize={3} />
            <Text>Create Admin User</Text>
          </HStack>
        </Button>
      </Flex>

      {feedback && (
        <Box
          bg={feedback.type === "success" ? "green.50" : "red.50"}
          color={feedback.type === "success" ? "green.700" : "red.700"}
          p={3}
          borderRadius="md"
          mb={4}
          fontSize="sm"
          border="1px solid"
          borderColor={feedback.type === "success" ? "green.200" : "red.200"}
        >
          <HStack gap={2}>
            <Icon as={feedback.type === "success" ? FaCheckCircle : FaExclamationCircle} />
            <Text fontWeight="semibold">{feedback.message}</Text>
          </HStack>
        </Box>
      )}

      {/* Filter and Search Bar */}
      <Box bg="white" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200" mb={6}>
        <Flex gap={3} flexWrap="wrap">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              height: "36px",
              padding: "0 12px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #CBD5E0",
              minWidth: "260px",
            }}
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              height: "36px",
              padding: "0 12px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #CBD5E0",
              background: "white",
            }}
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="resort_admin">Resort Admin</option>
            <option value="content_manager">Content Manager</option>
            <option value="guest">Registered Guest</option>
          </select>
        </Flex>
      </Box>

      <Box
        bg="white"
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="sm"
        overflow="hidden"
      >
        {loading ? (
          <Flex justify="center" p={12}>
            <Spinner size="lg" color="blue.500" />
          </Flex>
        ) : users.length === 0 ? (
          <VStack py={12} px={4}>
            <Icon as={FaUsers} boxSize={8} color="gray.400" mb={2} />
            <Text fontWeight="semibold" color="gray.700">
              No users found
            </Text>
          </VStack>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader>Full Name & Email</Table.ColumnHeader>
                  <Table.ColumnHeader>Assigned Role</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Joined</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {users.map((u) => {
                  const isSelf = u.id === adminUser.id;
                  return (
                    <Table.Row key={u.id} bg={isSelf ? "blue.50" : undefined}>
                      <Table.Cell>
                        <Box>
                          <HStack gap={2}>
                            <Text fontWeight="semibold">{u.full_name}</Text>
                            {isSelf && (
                              <Badge colorPalette="blue" fontSize="9px">
                                You
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {u.email}
                          </Text>
                        </Box>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          colorPalette={getRoleBadgeColor(u.role)}
                          textTransform="uppercase"
                          fontSize="10px"
                        >
                          {u.role.replace("_", " ")}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {u.is_locked ? (
                          <Badge colorPalette="red" fontSize="10px">
                            Locked
                          </Badge>
                        ) : (
                          <Badge colorPalette="green" fontSize="10px">
                            Active
                          </Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell fontSize="xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <HStack gap={1} justify="flex-end">
                          <Button
                            size="xs"
                            variant="outline"
                            colorPalette="purple"
                            onClick={() => {
                              setSelectedUserForRole(u);
                              setNewRole(u.role);
                            }}
                            disabled={saving}
                          >
                            <HStack gap={1}>
                              <Icon as={FaUserShield} boxSize={2.5} />
                              <Text>Role</Text>
                            </HStack>
                          </Button>

                          {!isSelf && (
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette={u.is_locked ? "green" : "red"}
                              onClick={() => handleToggleLock(u)}
                              disabled={saving}
                            >
                              <Icon as={u.is_locked ? FaUnlock : FaLock} boxSize={2.5} />
                            </Button>
                          )}
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>

      {/* CREATE ADMIN USER MODAL */}
      {showCreateModal && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={200}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
        >
          <Box bg="white" maxW="480px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="sm">Provision Admin Account</Heading>
              <Button size="xs" variant="ghost" onClick={() => setShowCreateModal(false)}>
                Close
              </Button>
            </Flex>

            <form onSubmit={handleCreateUser}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Full Name *
                  </Text>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samuel Adekunle"
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                    }}
                  />
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Email Address *
                  </Text>
                  <input
                    type="email"
                    required
                    placeholder="e.g. staff@gracearenaresorts.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                    }}
                  />
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Temporary Password *
                  </Text>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                    }}
                  />
                </Box>

                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Role *
                    </Text>
                    <select
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as UserRole)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E0",
                        fontSize: "14px",
                        background: "white",
                      }}
                    >
                      <option value="content_manager">Content Manager</option>
                      <option value="resort_admin">Resort Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </Box>

                  <Box flex="1">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Phone (Optional)
                    </Text>
                    <input
                      type="text"
                      placeholder="+234..."
                      value={createPhone}
                      onChange={(e) => setCreatePhone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E0",
                        fontSize: "14px",
                      }}
                    />
                  </Box>
                </Flex>

                <Flex
                  justify="flex-end"
                  gap={2}
                  pt={3}
                  borderTop="1px solid"
                  borderColor="gray.100"
                >
                  <Button size="sm" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" colorPalette="blue" type="submit" loading={saving}>
                    Create Account
                  </Button>
                </Flex>
              </VStack>
            </form>
          </Box>
        </Box>
      )}

      {/* CHANGE ROLE MODAL */}
      {selectedUserForRole && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={200}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
        >
          <Box bg="white" maxW="400px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="sm">Modify User Role</Heading>
              <Button size="xs" variant="ghost" onClick={() => setSelectedUserForRole(null)}>
                Close
              </Button>
            </Flex>

            <Text fontSize="xs" color="gray.600" mb={4}>
              Select new role for <strong>{selectedUserForRole.full_name}</strong> (
              {selectedUserForRole.email}).
            </Text>

            <form onSubmit={handleChangeRole}>
              <Box mb={4}>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E0",
                    fontSize: "14px",
                    background: "white",
                  }}
                >
                  <option value="guest">Registered Guest</option>
                  <option value="content_manager">Content Manager</option>
                  <option value="resort_admin">Resort Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </Box>

              <Flex justify="flex-end" gap={2}>
                <Button size="sm" variant="outline" onClick={() => setSelectedUserForRole(null)}>
                  Cancel
                </Button>
                <Button size="sm" colorPalette="blue" type="submit" loading={saving}>
                  Update Role
                </Button>
              </Flex>
            </form>
          </Box>
        </Box>
      )}
    </AdminLayout>
  );
}
