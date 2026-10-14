import React, { useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { Box, Button, Input, Stack, Text } from "@chakra-ui/react";
import AuthLayout from "@/features/auth/components/AuthLayout";
import { ROUTES } from "@/constants/ROUTES";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token, email } = router.query;

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token) {
      setErrorMsg("Reset token is missing or expired. Please request a new link.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: String(token),
          newPassword,
          confirmNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error?.message || "Failed to reset password.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrorMsg("Network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create New Password"
      subtitle={
        email ? `Enter a new secure password for ${email}` : "Enter your new password below"
      }
    >
      {isSuccess ? (
        <Stack gap={4} textAlign="center">
          <Box p={4} bg="green.50" borderRadius="lg" border="1px solid" borderColor="green.200">
            <Text color="green.800" fontWeight="medium">
              Your password has been reset successfully!
            </Text>
          </Box>
          <NextLink href={ROUTES.login || "/login"}>
            <Button colorPalette="blue" size="lg" w="full" borderRadius="lg" fontWeight="bold">
              Sign In with New Password
            </Button>
          </NextLink>
        </Stack>
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack gap={4}>
            {errorMsg && (
              <Box p={3} borderRadius="md" bg="red.50" color="red.700" fontSize="sm">
                {errorMsg}
              </Box>
            )}

            <Box>
              <Text
                as="span"
                fontSize="sm"
                fontWeight="medium"
                color="gray.700"
                mb={1}
                display="block"
              >
                New Password
              </Text>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                size="lg"
                borderRadius="lg"
                className="auth-input"
                color="gray.900"
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500", opacity: 1 }}
                _focus={{ borderColor: "yellow.600", outline: "none", boxShadow: "0 0 0 1px #D97706" }}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Min 8 characters, with at least 1 uppercase, 1 lowercase, and 1 number.
              </Text>
            </Box>

            <Box>
              <Text
                as="span"
                fontSize="sm"
                fontWeight="medium"
                color="gray.700"
                mb={1}
                display="block"
              >
                Confirm New Password
              </Text>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                size="lg"
                borderRadius="lg"
                className="auth-input"
                color="gray.900"
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500", opacity: 1 }}
                _focus={{ borderColor: "yellow.600", outline: "none", boxShadow: "0 0 0 1px #D97706" }}
              />
            </Box>

            <Button
              type="submit"
              colorPalette="blue"
              size="lg"
              w="full"
              mt={2}
              loading={isLoading}
              borderRadius="lg"
              fontWeight="bold"
            >
              Update Password
            </Button>
          </Stack>
        </form>
      )}
    </AuthLayout>
  );
}
