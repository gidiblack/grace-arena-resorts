import { useEffect } from "react";

/**
 * Ensures that any styles or attributes applied by Zag.js / Ark UI / Chakra UI
 * (e.g. pointer-events: none, overflow: hidden, data-scroll-lock, inert, aria-hidden)
 * are cleanly stripped away when a dialog or modal is dismissed.
 */
export function cleanupModalLocks(): void {
  if (typeof document === "undefined") return;

  const purge = () => {
    // 1. Remove body style locks
    document.body.style.removeProperty("pointer-events");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("position");
    document.body.style.removeProperty("top");
    document.body.style.removeProperty("left");
    document.body.style.removeProperty("right");
    document.body.style.removeProperty("padding-right");
    document.body.style.removeProperty("padding-left");

    // 2. Remove documentElement locks
    document.documentElement.style.removeProperty("pointer-events");
    document.documentElement.style.removeProperty("overflow");

    // 3. Remove Zag/Ark scroll & inert dataset markers on body
    document.body.removeAttribute("data-scroll-lock");
    document.body.removeAttribute("data-scroll-locked");
    document.body.removeAttribute("data-inert");

    // 4. Clean inert and aria-hidden from Next.js root
    const nextEl = document.getElementById("__next");
    if (nextEl) {
      nextEl.removeAttribute("inert");
      nextEl.removeAttribute("aria-hidden");
      nextEl.removeAttribute("data-inerted");
      nextEl.removeAttribute("data-aria-hidden");
    }

    // 5. Clean inert and aria-hidden from all direct body children
    Array.from(document.body.children).forEach((child) => {
      child.removeAttribute("inert");
      child.removeAttribute("aria-hidden");
      child.removeAttribute("data-inerted");
      child.removeAttribute("data-aria-hidden");
    });

    // 6. Clean any residual elements with inert or data-inerted
    document
      .querySelectorAll("[data-inerted], [data-aria-hidden], [inert]")
      .forEach((el) => {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
        el.removeAttribute("data-inerted");
        el.removeAttribute("data-aria-hidden");
      });
  };

  // Immediate purge
  purge();

  // Defer next-frame and timeout purges to counteract racing Zag microtasks / RAFs
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(purge);
  }
  setTimeout(purge, 50);
}

/**
 * Hook to automatically clean up residual modal lock styles and inert attributes
 * when a modal closes or unmounts.
 */
export function useModalCleanup(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) {
      cleanupModalLocks();
    }
    return () => {
      cleanupModalLocks();
    };
  }, [isOpen]);
}
