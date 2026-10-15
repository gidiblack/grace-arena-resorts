import React, { useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { Box, Button, Flex, Input, Stack, Text } from "@chakra-ui/react";
import AuthLayout from "@/features/auth/components/AuthLayout";
import { ROUTES } from "@/constants/ROUTES";
import { safeRedirectPath } from "@/lib/http/redirect";
import { getRecaptchaToken } from "@/lib/recaptcha/client";

export default function LoginPage() {
  const router = useRouter();
  const redirectUrl = safeRedirectPath(router.query.redirect);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // reCAPTCHA is enforced server-side after 3 failed attempts
      const recaptchaToken = await getRecaptchaToken("login");
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe, recaptchaToken }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error?.code === "EMAIL_NOT_VERIFIED") {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        setErrorMsg(data.error?.message || "Invalid credentials. Please verify your details.");
        setIsLoading(false);
        return;
      }

      // Successful login -> route to redirect URL or default
      router.push(redirectUrl);
    } catch {
      setErrorMsg("Network error occurred. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to manage your reservations and experiences"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap={4}>
          {errorMsg && (
            <Box
              p={3}
              borderRadius="md"
              bg="red.50"
              border="1px solid"
              borderColor="red.200"
              color="red.700"
              fontSize="sm"
            >
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
              Email Address
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

          <Box>
            <Flex justify="space-between" align="center" mb={1}>
              <Text as="span" fontSize="sm" fontWeight="medium" color="gray.700">
                Password
              </Text>
              <NextLink href={ROUTES.forgotPassword}>
                <Text fontSize="xs" color="blue.600" _hover={{ textDecoration: "underline" }}>
                  Forgot password?
                </Text>
              </NextLink>
            </Flex>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              _focus={{
                borderColor: "yellow.600",
                outline: "none",
                boxShadow: "0 0 0 1px #D97706",
              }}
            />
          </Box>

          <Flex align="center" justify="space-between" mt={1}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontSize: "0.875rem",
                color: "#4A5568",
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ marginRight: "0.5rem" }}
              />
              Remember me for 30 days
            </label>
          </Flex>

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
            Sign In
          </Button>

          <Text fontSize="sm" color="gray.600" textAlign="center" mt={4}>
            Don&apos;t have an account yet?{" "}
            <NextLink href={ROUTES.register || "/register"}>
              <Text
                as="span"
                color="blue.600"
                fontWeight="semibold"
                _hover={{ textDecoration: "underline" }}
              >
                Create an account
              </Text>
            </NextLink>
          </Text>
        </Stack>
      </form>
    </AuthLayout>
  );
}
