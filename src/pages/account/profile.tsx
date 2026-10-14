import React, { useState, useEffect } from "react";
import { Box, Flex, HStack, Icon, Input, SimpleGrid, Stack, Text, Badge } from "@chakra-ui/react";
import AccountLayout from "@/features/account/components/AccountLayout";
import Button from "@/components/ui/button";
import { FaUser, FaKey, FaShieldAlt, FaInfoCircle, FaCheck } from "react-icons/fa";
import { passwordPolicy } from "@/features/auth/schemas";

export default function AccountProfilePage() {
  // Profile form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/v1/auth/me");
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setFullName(json.data.fullName || "");
          setEmail(json.data.email || "");
          setPhone(json.data.phone || "");
        }
      } catch {
        // Silently handled
      }
    }
    loadUser();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    if (phone && !/^\+234\d{10}$/.test(phone)) {
      setProfileError(
        "Phone number must be in +234XXXXXXXXXX Nigerian format (10 digits after +234)"
      );
      setSavingProfile(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setProfileSuccess("Profile details updated successfully!");
      } else {
        setProfileError(json.error?.message || "Failed to update profile.");
      }
    } catch {
      setProfileError("Network error while updating profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      setSavingPassword(false);
      return;
    }

    const policyResult = passwordPolicy.safeParse(newPassword);
    if (!policyResult.success) {
      setPasswordError(
        policyResult.error.issues[0]?.message || "Password does not meet complexity requirements."
      );
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      setSavingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/auth/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPasswordSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(json.error?.message || "Failed to update password.");
      }
    } catch {
      setPasswordError("Network error while updating password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AccountLayout title="Profile & Security Settings" activeTab="profile">
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
        {/* Form 1: Profile Information */}
        <Box
          as="form"
          onSubmit={handleUpdateProfile}
          bg="#0F172A"
          p={{ base: 6, md: 8 }}
          borderRadius="20px"
          border="1px solid #1E293B"
        >
          <HStack gap={3} mb={2}>
            <Icon as={FaUser} color="accent.500" boxSize={5} />
            <Text fontSize="18px" fontWeight="bold">
              Personal Information
            </Text>
          </HStack>
          <Text fontSize="13px" color="gray.400" mb={6}>
            Update your contact preferences for stay notifications and receipts.
          </Text>

          {profileSuccess && (
            <Box
              p={3}
              mb={4}
              borderRadius="8px"
              bg="rgba(72, 187, 120, 0.15)"
              color="#68D391"
              fontSize="13px"
            >
              <HStack gap={2}>
                <Icon as={FaCheck} />
                <Text>{profileSuccess}</Text>
              </HStack>
            </Box>
          )}

          {profileError && (
            <Box
              p={3}
              mb={4}
              borderRadius="8px"
              bg="rgba(229, 62, 62, 0.15)"
              color="#FC8181"
              fontSize="13px"
            >
              {profileError}
            </Box>
          )}

          <Stack gap={4} mb={6}>
            <Box>
              <Text fontSize="12px" fontWeight="medium" mb={1} color="gray.300">
                Full Legal Name
              </Text>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Samuel Adeyemi"
                bg="#1E293B"
                border="1px solid #334155"
                color="white"
                p={3}
                borderRadius="8px"
                fontSize="13px"
                _placeholder={{ color: "gray.400", opacity: 1 }}
                _focus={{ borderColor: "brand.gold", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
              />
            </Box>

            <Box>
              <Text fontSize="12px" fontWeight="medium" mb={1} color="gray.300">
                Nigerian Mobile Phone (+234XXXXXXXXXX)
              </Text>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+2348012345678"
                bg="#1E293B"
                border="1px solid #334155"
                color="white"
                p={3}
                borderRadius="8px"
                fontSize="13px"
                _placeholder={{ color: "gray.400", opacity: 1 }}
                _focus={{ borderColor: "brand.gold", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
              />
            </Box>

            {/* Read-Only Email with Change Notice (SRS Section 4.1 Requirement) */}
            <Box>
              <Flex justify="space-between" align="center" mb={1}>
                <Text fontSize="12px" fontWeight="medium" color="gray.300">
                  Registered Email Address
                </Text>
                <Badge bg="#1E293B" color="gray.400" fontSize="10px">
                  Read Only
                </Badge>
              </Flex>
              <Input
                value={email}
                readOnly
                bg="#182234"
                border="1px solid #2D3748"
                color="gray.300"
                cursor="not-allowed"
                p={3}
                borderRadius="8px"
                fontSize="13px"
              />
              <HStack gap={1.5} mt={1.5} color="gray.400" fontSize="11px">
                <Icon as={FaInfoCircle} />
                <Text>
                  To change your registered email, please reach out to front desk concierge for
                  identity verification.
                </Text>
              </HStack>
            </Box>
          </Stack>

          <Flex justify="flex-end">
            <Button variant="primary" size="md" type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Profile Details"}
            </Button>
          </Flex>
        </Box>

        {/* Form 2: Change Password */}
        <Box
          as="form"
          onSubmit={handleUpdatePassword}
          bg="#0F172A"
          p={{ base: 6, md: 8 }}
          borderRadius="20px"
          border="1px solid #1E293B"
        >
          <HStack gap={3} mb={2}>
            <Icon as={FaKey} color="accent.500" boxSize={5} />
            <Text fontSize="18px" fontWeight="bold">
              Change Password
            </Text>
          </HStack>
          <Text fontSize="13px" color="gray.400" mb={6}>
            Ensure your account is protected with a strong, secure passphrase.
          </Text>

          {passwordSuccess && (
            <Box
              p={3}
              mb={4}
              borderRadius="8px"
              bg="rgba(72, 187, 120, 0.15)"
              color="#68D391"
              fontSize="13px"
            >
              <HStack gap={2}>
                <Icon as={FaCheck} />
                <Text>{passwordSuccess}</Text>
              </HStack>
            </Box>
          )}

          {passwordError && (
            <Box
              p={3}
              mb={4}
              borderRadius="8px"
              bg="rgba(229, 62, 62, 0.15)"
              color="#FC8181"
              fontSize="13px"
            >
              {passwordError}
            </Box>
          )}

          <Stack gap={4} mb={6}>
            <Box>
              <Text fontSize="12px" fontWeight="medium" mb={1} color="gray.300">
                Current Password
              </Text>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                bg="#1E293B"
                border="1px solid #334155"
                color="white"
                p={3}
                borderRadius="8px"
                fontSize="13px"
                _placeholder={{ color: "gray.400", opacity: 1 }}
                _focus={{ borderColor: "brand.gold", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
              />
            </Box>

            <Box>
              <Text fontSize="12px" fontWeight="medium" mb={1} color="gray.300">
                New Password
              </Text>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 chars, 1 uppercase, 1 number, 1 special char"
                bg="#1E293B"
                border="1px solid #334155"
                color="white"
                p={3}
                borderRadius="8px"
                fontSize="13px"
                _placeholder={{ color: "gray.400", opacity: 1 }}
                _focus={{ borderColor: "brand.gold", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
              />
            </Box>

            <Box>
              <Text fontSize="12px" fontWeight="medium" mb={1} color="gray.300">
                Confirm New Password
              </Text>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                bg="#1E293B"
                border="1px solid #334155"
                color="white"
                p={3}
                borderRadius="8px"
                fontSize="13px"
                _placeholder={{ color: "gray.400", opacity: 1 }}
                _focus={{ borderColor: "brand.gold", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
              />
            </Box>
          </Stack>

          <Flex justify="flex-end">
            <Button variant="secondary" size="md" type="submit" disabled={savingPassword}>
              <HStack gap={2}>
                <Icon as={FaShieldAlt} />
                <Text>{savingPassword ? "Updating..." : "Update Password"}</Text>
              </HStack>
            </Button>
          </Flex>
        </Box>
      </SimpleGrid>
    </AccountLayout>
  );
}
