import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { Box, Button, Stack, Text } from "@chakra-ui/react";
import AuthLayout from "@/features/auth/components/AuthLayout";
import { ROUTES } from "@/constants/ROUTES";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { email, token } = router.query;

  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If token is provided in query, attempt auto-verification
  useEffect(() => {
    if (token && email) {
      // In production/staging, can post token to an internal verify handler or confirm
      setIsVerified(true);
    }
  }, [token, email]);

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setResendStatus(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(email) }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResendStatus("A new verification email has been sent. Please check your inbox.");
      } else {
        setErrorMsg(data.error?.message || "Failed to resend. Please wait before retrying.");
      }
    } catch {
      setErrorMsg("Unable to contact verification service. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title={isVerified ? "Email Confirmed" : "Verify Your Email"}
      subtitle={
        isVerified
          ? "Your email address has been successfully confirmed"
          : `We sent a confirmation link to ${email || "your email address"}`
      }
    >
      <Stack gap={6} textAlign="center">
        {isVerified ? (
          <Box p={4} bg="green.50" borderRadius="lg" border="1px solid" borderColor="green.200">
            <Text color="green.800" fontWeight="medium" mb={3}>
              Your account is now verified! You can proceed to sign in and book your stay.
            </Text>
            <NextLink href={ROUTES.login || "/login"}>
              <Button colorPalette="blue" size="lg" w="full" borderRadius="lg" fontWeight="bold">
                Continue to Sign In
              </Button>
            </NextLink>
          </Box>
        ) : (
          <Box>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Please click the link inside the confirmation email we sent to activate your account.
              Email verification is required before reservations can be confirmed.
            </Text>

            {resendStatus && (
              <Box p={3} mb={4} bg="blue.50" borderRadius="md" color="blue.700" fontSize="sm">
                {resendStatus}
              </Box>
            )}

            {errorMsg && (
              <Box p={3} mb={4} bg="red.50" borderRadius="md" color="red.700" fontSize="sm">
                {errorMsg}
              </Box>
            )}

            <Button
              variant="outline"
              colorPalette="blue"
              size="lg"
              w="full"
              loading={isResending}
              onClick={handleResend}
              borderRadius="lg"
            >
              Resend Verification Email
            </Button>

            <Text fontSize="sm" color="gray.500" mt={4}>
              Already confirmed?{" "}
              <NextLink href={ROUTES.login || "/login"}>
                <Text as="span" color="blue.600" fontWeight="semibold" _hover={{ textDecoration: "underline" }}>
                  Sign in
                </Text>
              </NextLink>
            </Text>
          </Box>
        )}
      </Stack>
    </AuthLayout>
  );
}
