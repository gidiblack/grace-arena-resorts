import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { Box, Button, Input, Stack, Text } from "@chakra-ui/react";
import AuthLayout from "@/features/auth/components/AuthLayout";
import { ROUTES } from "@/constants/ROUTES";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { email, token } = router.query;

  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const resendEmail = typeof email === "string" && email ? email : emailInput.trim();

  // A ?token= link from the verification email is confirmed server-side; the page never
  // claims success unless the API accepted the token.
  useEffect(() => {
    if (typeof token !== "string" || !token) return;
    let cancelled = false;

    async function verify() {
      setIsVerifying(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/v1/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          setIsVerified(true);
        } else {
          setErrorMsg(
            data.error?.message ||
              "This verification link is invalid or has expired. Request a new one below."
          );
        }
      } catch {
        if (!cancelled) setErrorMsg("Unable to reach the verification service. Please try again.");
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail) {
      setErrorMsg("Enter the email address you registered with.");
      return;
    }
    setIsResending(true);
    setResendStatus(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
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
          : isVerifying
            ? "Confirming your email address…"
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

            {!email && (
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address for a new verification link"
                size="lg"
                mb={3}
                borderRadius="lg"
                color="gray.900"
                bg="white"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500", opacity: 1 }}
              />
            )}

            <Button
              variant="outline"
              colorPalette="blue"
              size="lg"
              w="full"
              disabled={isVerifying}
              loading={isResending}
              onClick={handleResend}
              borderRadius="lg"
            >
              Resend Verification Email
            </Button>

            <Text fontSize="sm" color="gray.500" mt={4}>
              Already confirmed?{" "}
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
          </Box>
        )}
      </Stack>
    </AuthLayout>
  );
}
