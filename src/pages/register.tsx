import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { Box, Button, Input, Stack, Text } from "@chakra-ui/react";
import AuthLayout from "@/features/auth/components/AuthLayout";
import { ROUTES } from "@/constants/ROUTES";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+234");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prefill from the post-booking "Create an account" link (/register?email=&name=)
  useEffect(() => {
    if (!router.isReady) return;
    const { email: qEmail, name: qName } = router.query;
    const timer = setTimeout(() => {
      if (typeof qEmail === "string") setEmail((prev) => prev || qEmail);
      if (typeof qName === "string") setFullName((prev) => prev || qName);
    }, 0);
    return () => clearTimeout(timer);
  }, [router.isReady, router.query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    if (!consentAccepted) {
      setErrorMsg("You must accept the privacy policy to register");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          confirmPassword,
          consentAccepted,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error?.message || "Registration failed. Please review your entries.");
        setIsLoading(false);
        return;
      }

      // Redirect to email verification interstitial
      const sentFlag = data.data?.verificationEmailSent === false ? "&sent=0" : "";
      router.push(`/verify-email?email=${encodeURIComponent(email)}${sentFlag}`);
    } catch {
      setErrorMsg("Network error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Guest Account"
      subtitle="Register to book rooms, access personalized hospitality, and view stay history"
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
              Full Name
            </Text>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Samuel Adeyemi"
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
            <Text
              as="span"
              fontSize="sm"
              fontWeight="medium"
              color="gray.700"
              mb={1}
              display="block"
            >
              Phone Number (+234 format)
            </Text>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2348012345678"
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
            <Text
              as="span"
              fontSize="sm"
              fontWeight="medium"
              color="gray.700"
              mb={1}
              display="block"
            >
              Password
            </Text>
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
            <Text fontSize="xs" color="gray.500" mt={1}>
              At least 8 characters, including 1 uppercase, 1 lowercase, and 1 number.
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
              Confirm Password
            </Text>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

          <Box mt={1}>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                cursor: "pointer",
                fontSize: "0.875rem",
                color: "#4A5568",
              }}
            >
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                style={{ marginTop: "0.25rem", marginRight: "0.5rem" }}
                required
              />
              <span>
                I agree to the Grace Arena Resorts{" "}
                <NextLink href={ROUTES.privacy}>
                  <Text as="span" color="blue.600" textDecoration="underline">
                    NDPR Privacy Policy
                  </Text>
                </NextLink>{" "}
                and consent to processing my contact data for reservation purposes.
              </span>
            </label>
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
            Create Account
          </Button>

          <Text fontSize="sm" color="gray.600" textAlign="center" mt={4}>
            Already registered?{" "}
            <NextLink href={ROUTES.login || "/login"}>
              <Text
                as="span"
                color="blue.600"
                fontWeight="semibold"
                _hover={{ textDecoration: "underline" }}
              >
                Sign in here
              </Text>
            </NextLink>
          </Text>
        </Stack>
      </form>
    </AuthLayout>
  );
}
