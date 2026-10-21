import React, { useRef, useState, useSyncExternalStore } from "react";
import { Button, Dialog, Flex, HStack, Icon, Portal, Text, Theme } from "@chakra-ui/react";
import { FaExclamationTriangle, FaInfoCircle, FaCheckCircle } from "react-icons/fa";
import type { IconType } from "react-icons";
import { useModalCleanup } from "@/helpers/modal-cleanup";

/**
 * In-app replacement for window.confirm / window.alert in the admin panel.
 *
 *   if (!(await adminDialog.confirm({ title: "Delete deal?", message: "...", tone: "danger" }))) return;
 *   await adminDialog.notify({ title: "Copied", message: "Media URL copied to clipboard." });
 *
 * Requests are queued and shown one at a time by <AdminDialogHost />, which AdminLayout mounts.
 */

export type AdminDialogTone = "danger" | "warning" | "info" | "success";

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Icon and confirm-button colour; "danger" is the default for confirms */
  tone?: AdminDialogTone;
}

export interface NotifyOptions {
  title: string;
  message: React.ReactNode;
  okLabel?: string;
  tone?: AdminDialogTone;
}

interface DialogRequest {
  id: number;
  kind: "confirm" | "notify";
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone: AdminDialogTone;
  resolve: (confirmed: boolean) => void;
}

const queue: DialogRequest[] = [];
const listeners = new Set<() => void>();
let nextId = 1;
let mountedHosts = 0;

function emit() {
  for (const listener of listeners) listener();
}

function enqueue(request: Omit<DialogRequest, "id" | "resolve">): Promise<boolean> {
  if (mountedHosts === 0) {
    // No host on this page: fail safe (treat as cancelled) rather than hang the caller
    console.error("adminDialog used without <AdminDialogHost /> mounted");
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    queue.push({ ...request, id: nextId++, resolve });
    emit();
  });
}

/** Answers request `id`; ignored if it is no longer the one on screen (stale close events). */
function settle(id: number, confirmed: boolean) {
  if (queue[0]?.id !== id) return;
  queue.shift()!.resolve(confirmed);
  emit();
}

export const adminDialog = {
  confirm(options: ConfirmOptions): Promise<boolean> {
    return enqueue({
      kind: "confirm",
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? "Confirm",
      cancelLabel: options.cancelLabel ?? "Cancel",
      tone: options.tone ?? "danger",
    });
  },
  async notify(options: NotifyOptions): Promise<void> {
    await enqueue({
      kind: "notify",
      title: options.title,
      message: options.message,
      confirmLabel: options.okLabel ?? "OK",
      cancelLabel: "",
      tone: options.tone ?? "info",
    });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getCurrent = () => queue[0] ?? null;
const getServerCurrent = () => null;

const TONES: Record<AdminDialogTone, { icon: IconType; color: string; palette: string }> = {
  danger: { icon: FaExclamationTriangle, color: "red.500", palette: "red" },
  warning: { icon: FaExclamationTriangle, color: "orange.500", palette: "orange" },
  info: { icon: FaInfoCircle, color: "blue.500", palette: "blue" },
  success: { icon: FaCheckCircle, color: "green.500", palette: "green" },
};

export function AdminDialogHost() {
  const current = useSyncExternalStore(subscribe, getCurrent, getServerCurrent);
  // Zag leaves pointer-events: none and aria-hidden behind after closing (see c971fcc)
  useModalCleanup(current !== null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    mountedHosts++;
    return () => {
      mountedHosts--;
      // Leaving the admin shell: pending questions count as cancelled
      if (mountedHosts === 0) {
        while (queue.length > 0) queue.shift()!.resolve(false);
        emit();
      }
    };
  }, []);

  // Keep the last request rendered while the dialog animates closed. The Root must stay mounted
  // and close through `open={false}`: unmounting it while open leaves pointer-events: none on
  // <body> and aria-hidden on the page.
  const [lastShown, setLastShown] = useState<DialogRequest | null>(null);
  if (current && current !== lastShown) setLastShown(current);
  const shown = current ?? lastShown;
  if (!shown) return null;

  const tone = TONES[shown.tone];
  const isConfirm = shown.kind === "confirm";
  // Confirms open on Cancel so a stray Enter never deletes data or emails guests
  const safeFocus = isConfirm ? cancelRef : confirmRef;

  return (
    <Dialog.Root
      open={current !== null}
      role={isConfirm ? "alertdialog" : "dialog"}
      placement="center"
      initialFocusEl={() => safeFocus.current}
      // Escape and clicking outside mean "cancel" for a confirm, "OK" for a notice
      onOpenChange={(details) => {
        if (!details.open) settle(shown.id, !isConfirm);
      }}
    >
      <Portal>
        {/* The portal leaves the admin shell, so re-apply its light theme (see AdminLayout) */}
        <Theme appearance="light" hasBackground={false} color="gray.800" data-theme="light">
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="440px" mx={4}>
              <Dialog.Header pb={2}>
                <HStack gap={3} align="center">
                  <Flex
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    bg={`${tone.palette}.50`}
                    align="center"
                    justify="center"
                    flexShrink={0}
                  >
                    <Icon as={tone.icon} color={tone.color} boxSize={4} />
                  </Flex>
                  <Dialog.Title fontSize="md">{shown.title}</Dialog.Title>
                </HStack>
              </Dialog.Header>
              <Dialog.Body>
                <Dialog.Description asChild>
                  <Text fontSize="sm" color="gray.700" as="div">
                    {shown.message}
                  </Text>
                </Dialog.Description>
              </Dialog.Body>
              <Dialog.Footer gap={2}>
                {isConfirm && (
                  <Button
                    ref={cancelRef}
                    size="sm"
                    variant="outline"
                    onClick={() => settle(shown.id, false)}
                  >
                    {shown.cancelLabel}
                  </Button>
                )}
                <Button
                  ref={confirmRef}
                  size="sm"
                  colorPalette={tone.palette}
                  onClick={() => settle(shown.id, true)}
                >
                  {shown.confirmLabel}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Theme>
      </Portal>
    </Dialog.Root>
  );
}

export default AdminDialogHost;
