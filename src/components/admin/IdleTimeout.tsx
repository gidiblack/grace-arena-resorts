import { useEffect, useRef } from "react";
import { useRouter } from "next/router";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Monitors user interaction inside the admin shell and automatically logs out
 * the admin user when inactive for 30 minutes, redirecting to /login with reason=idle.
 */
export function IdleTimeout() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await fetch("/api/v1/auth/logout", { method: "POST" });
      } catch {
        // Continue with redirect even if API call fails
      }
      const currentPath = encodeURIComponent(router.asPath || "/admin");
      window.location.href = `/login?redirect=${currentPath}&reason=idle`;
    };

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(handleLogout, IDLE_TIMEOUT_MS);
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [router]);

  return null;
}

export default IdleTimeout;
