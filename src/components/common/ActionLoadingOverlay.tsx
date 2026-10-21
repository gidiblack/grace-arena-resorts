import React, { useEffect } from "react";
import { Box, Portal, Text } from "@chakra-ui/react";

export interface ActionLoadingOverlayProps {
  /**
   * Controls whether the overlay is visible.
   * If both isOpen and isLoading are undefined, defaults to true when mounted.
   */
  isOpen?: boolean;
  isLoading?: boolean;
  /**
   * Optional contextual message displayed below the pulsating icon
   * (e.g. "Sending your message...", "Securing your reservation...")
   */
  message?: string;
  /**
   * Custom z-index to overlay headers, modals, and sticky components. Defaults to 9999.
   */
  zIndex?: number;
  /**
   * Accessibility label for screen readers. Defaults to message or "Loading, please wait".
   */
  ariaLabel?: string;
  /**
   * Whether to render into a Portal (document.body). Defaults to true.
   */
  usePortal?: boolean;
}

// Shared across overlay instances so overlapping overlays don't restore scrolling too early
let scrollLockCount = 0;
let originalBodyOverflow = "";

export const SHOW_ACTION_LOADING_EVENT = "gar:show-action-loading";
export const HIDE_ACTION_LOADING_EVENT = "gar:hide-action-loading";

/**
 * Dispatches a global event to show the action loading overlay on the public site.
 */
export function showActionLoading(message?: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SHOW_ACTION_LOADING_EVENT, { detail: { message } }));
  }
}

/**
 * Dispatches a global event to hide the action loading overlay on the public site.
 */
export function hideActionLoading(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HIDE_ACTION_LOADING_EVENT));
  }
}

/**
 * Reusable animated loading component for public site action states.
 * Displays "gar-icon-only.svg" centered inside a full backdrop overlay,
 * pulsating with a smooth, natural breathing animation rhythm.
 */
export const ActionLoadingOverlay: React.FC<ActionLoadingOverlayProps> = ({
  isOpen,
  isLoading,
  message,
  zIndex = 9999,
  ariaLabel,
  usePortal = true,
}) => {
  const active = isLoading !== undefined ? isLoading : isOpen !== undefined ? isOpen : true;

  // Prevent background scrolling while an action is actively processing
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    if (scrollLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLockCount += 1;

    return () => {
      scrollLockCount -= 1;
      if (scrollLockCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
      }
    };
  }, [active]);

  if (!active) {
    return null;
  }

  const content = (
    <Box
      data-testid="action-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel || message || "Loading, please wait"}
      position="fixed"
      inset={0}
      top={0}
      left={0}
      right={0}
      bottom={0}
      w="100vw"
      h="100vh"
      bg="rgba(10, 9, 8, 0.5)"
      backdropFilter="blur(5px)"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      zIndex={zIndex}
      pointerEvents="all"
      userSelect="none"
      style={{
        WebkitBackdropFilter: "blur(5px)",
      }}
    >
      <style>{`
        @keyframes garBreathing {
          0% {
            transform: scale(0.92);
            opacity: 0.72;
            filter: drop-shadow(0 0 6px rgba(252, 202, 70, 0.25));
          }
          42% {
            transform: scale(1.14);
            opacity: 1;
            filter: drop-shadow(0 0 26px rgba(252, 202, 70, 0.85));
          }
          50% {
            transform: scale(1.14);
            opacity: 1;
            filter: drop-shadow(0 0 28px rgba(252, 202, 70, 0.9));
          }
          92% {
            transform: scale(0.92);
            opacity: 0.72;
            filter: drop-shadow(0 0 6px rgba(252, 202, 70, 0.25));
          }
          100% {
            transform: scale(0.92);
            opacity: 0.72;
            filter: drop-shadow(0 0 6px rgba(252, 202, 70, 0.25));
          }
        }
        @keyframes garBreathingHalo {
          0%, 100% {
            transform: scale(0.85);
            opacity: 0.25;
          }
          46% {
            transform: scale(1.28);
            opacity: 0.65;
          }
        }
        @keyframes garTextPulse {
          0%, 100% {
            opacity: 0.75;
          }
          50% {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .gar-breathing-target {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Centered Breathing Container */}
      <Box
        position="relative"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={6}
      >
        {/* Ambient Breathing Halo */}
        <Box
          className="gar-breathing-target"
          position="absolute"
          w={{ base: "160px", md: "180px", lg: "200px" }}
          h={{ base: "160px", md: "180px", lg: "200px" }}
          borderRadius="full"
          bg="radial-gradient(circle, rgba(252, 202, 70, 0.35) 0%, rgba(252, 202, 70, 0.08) 50%, transparent 75%)"
          pointerEvents="none"
          style={{
            animation: "garBreathingHalo 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            willChange: "transform, opacity",
          }}
        />

        {/* Breathing Icon */}
        <Box
          className="gar-breathing-target"
          data-testid="gar-breathing-icon"
          display="flex"
          alignItems="center"
          justifyContent="center"
          style={{
            animation: "garBreathing 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
            willChange: "transform, opacity, filter",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gar-icon-only.svg"
            alt="Grace Arena Resorts"
            width={160}
            height={160}
            style={{
              width: "160px",
              height: "160px",
              objectFit: "contain",
              display: "block",
            }}
          />
        </Box>

        {/* Optional Action Status Message */}
        {message && (
          <Text
            data-testid="action-loading-message"
            mt={[5, null, 6, 8]}
            fontSize="15px"
            fontWeight="semibold"
            color="accent.500"
            letterSpacing="wide"
            textAlign="center"
            maxW="480px"
            style={{
              animation: "garTextPulse 2.2s ease-in-out infinite",
            }}
          >
            {message}
          </Text>
        )}
      </Box>
    </Box>
  );

  if (usePortal && typeof document !== "undefined") {
    return <Portal>{content}</Portal>;
  }

  return content;
};

export default ActionLoadingOverlay;
