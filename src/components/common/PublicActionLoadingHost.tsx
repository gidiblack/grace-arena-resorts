import React, { useState, useEffect } from "react";
import {
  ActionLoadingOverlay,
  SHOW_ACTION_LOADING_EVENT,
  HIDE_ACTION_LOADING_EVENT,
} from "./ActionLoadingOverlay";

/**
 * Host component mounted exclusively inside PageWrapper on the public site.
 * Allows any action across the public site to trigger the breathing animated loading overlay
 * via showActionLoading("...") and hideActionLoading() or by rendering ActionLoadingOverlay directly.
 */
export const PublicActionLoadingHost: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleShow = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      setMessage(customEvent.detail?.message);
      setLoading(true);
    };

    const handleHide = () => {
      setLoading(false);
      setMessage(undefined);
    };

    window.addEventListener(SHOW_ACTION_LOADING_EVENT, handleShow);
    window.addEventListener(HIDE_ACTION_LOADING_EVENT, handleHide);

    return () => {
      window.removeEventListener(SHOW_ACTION_LOADING_EVENT, handleShow);
      window.removeEventListener(HIDE_ACTION_LOADING_EVENT, handleHide);
    };
  }, []);

  return <ActionLoadingOverlay isOpen={loading} message={message} />;
};

export default PublicActionLoadingHost;
