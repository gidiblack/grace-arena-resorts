import { useEffect, useState } from "react";
import type { AdminNotificationCounts } from "@/services/analytics/analytics-service";

const POLL_INTERVAL_MS = 60 * 1000;

export interface AdminNotificationsState {
  counts: AdminNotificationCounts | null;
  /** The most recent refresh failed (counts, if any, are from an earlier refresh) */
  failed: boolean;
}

/** Notification bell counts, refreshed every minute and when the tab regains focus. */
export function useAdminNotifications(): AdminNotificationsState {
  const [state, setState] = useState<AdminNotificationsState>({ counts: null, failed: false });

  useEffect(() => {
    let active = true;

    const load = () => {
      fetch("/api/v1/admin/notifications")
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (!active) return;
          if (json?.success) setState({ counts: json.data, failed: false });
          else setState((prev) => ({ ...prev, failed: true }));
        })
        .catch(() => {
          // Keep the last known counts; the next poll retries
          if (active) setState((prev) => ({ ...prev, failed: true }));
        });
    };

    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, []);

  return state;
}
