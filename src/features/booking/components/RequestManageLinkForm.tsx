import React, { useState } from "react";
import { Box, Input, Stack, Text } from "@chakra-ui/react";
import Button from "@/components/ui/button";
import ActionLoadingOverlay from "@/components/common/ActionLoadingOverlay";

/**
 * "Email me a new manage link": for guests who lost their private booking link.
 */
export default function RequestManageLinkForm({
  defaultReference = "",
}: {
  defaultReference?: string;
}) {
  const [reference, setReference] = useState(defaultReference);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/v1/bookings/manage-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference.trim(), email: email.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage(json.data.message);
      } else {
        setError(json.error?.message || "Unable to send a new link right now.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    bg: "#1E293B",
    border: "1px solid #334155",
    color: "white",
    p: 3,
    borderRadius: "8px",
    _placeholder: { color: "gray.400", opacity: 1 },
    _focus: { borderColor: "accent.500", outline: "none" },
  } as const;

  return (
    <form onSubmit={handleSubmit}>
      <ActionLoadingOverlay isOpen={sending} message="Sending your booking link..." />
      <Stack gap={3}>
        <Box>
          <label
            htmlFor="manage-ref"
            style={{ display: "block", fontSize: "13px", color: "#CBD5E1", marginBottom: "6px" }}
          >
            Booking reference
          </label>
          <Input
            id="manage-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            placeholder="GAR-XXXXXXXX"
            required
            {...inputStyle}
          />
        </Box>
        <Box>
          <label
            htmlFor="manage-email"
            style={{ display: "block", fontSize: "13px", color: "#CBD5E1", marginBottom: "6px" }}
          >
            Email used for the booking
          </label>
          <Input
            id="manage-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            {...inputStyle}
          />
        </Box>
        {message && (
          <Text fontSize="13px" color="#68D391" role="status">
            {message}
          </Text>
        )}
        {error && (
          <Text fontSize="13px" color="#FC8181" role="alert">
            {error}
          </Text>
        )}
        <Button type="submit" variant="primary" size="md" disabled={sending}>
          {sending ? "Sending…" : "Email Me a New Link"}
        </Button>
      </Stack>
    </form>
  );
}
