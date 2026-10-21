import React, { useState } from "react";
import NextLink from "next/link";
import { Box, Button, Input, Stack, Text } from "@chakra-ui/react";
import AuthLayout from "@/features/auth/components/AuthLayout";
import ActionLoadingOverlay from "@/components/common/ActionLoadingOverlay";
import { ROUTES } from "@/constants/ROUTES";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error?.message || "Failed to submit request.");
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setErrorMsg("Network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your registered email address and we will send you a secure password reset link"
    >
      <ActionLoadingOverlay isOpen={isLoading} message="Sending recovery link..." />
      {isSubmitted ? (
        <Stack gap={4} textAlign="center">
          <Box p={4} bg="blue.50" borderRadius="lg" border="1px solid" borderColor="blue.200">
            <Text color="blue.800" fontSize="sm">
              If an account matches <strong>{email}</strong>, a secure reset link has been
              dispatched. The link is valid for 1 hour.
            </Text>
          </Box>
          <NextLink href={ROUTES.login || "/login"}>
            <Button variant="outline" colorPalette="blue" size="lg" w="full" borderRadius="lg">
              Return to Sign In
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
                Registered Email
              </Text>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                size="lg"
                borderRadius="lg"
                className="auth-input"
                color="gray.900"
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500", opacity: 1 }}
                _focus={{
                  borderColor: "yellow.600",
                  outline: "none",
                  boxShadow: "0 0 0 1px #D97706",
                }}
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
              Send Reset Link
            </Button>

            <Text fontSize="sm" color="gray.600" textAlign="center" mt={3}>
              Remember your password?{" "}
              <NextLink href={ROUTES.login || "/login"}>
                <Text
                  as="span"
                  color="blue.600"
                  fontWeight="semibold"
                  _hover={{ textDecoration: "underline" }}
                >
                  Sign in
                </Text>
              </NextLink>
            </Text>
          </Stack>
        </form>
      )}
    </AuthLayout>
  );
}
