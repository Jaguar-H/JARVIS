import { useEffect, useState } from "react";

const HEALTH_URL = "/api/health";
const POLL_INTERVAL_MS = 15_000;   // check every 15 s
const REQUEST_TIMEOUT_MS = 5_000;  // fail fast if the server doesn't respond

/**
 * Polls /api/health on mount and every POLL_INTERVAL_MS milliseconds.
 * Returns one of: "online" | "offline" | "checking"
 */
export function useHealth() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let timer;

    async function check() {
      try {
        const res = await fetch(HEALTH_URL, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const data = await res.json().catch(() => ({}));
        setStatus(res.ok && data.ok ? "online" : "offline");
      } catch {
        setStatus("offline");
      } finally {
        // Schedule the next check whether this one succeeded or failed.
        timer = setTimeout(check, POLL_INTERVAL_MS);
      }
    }

    check();
    return () => clearTimeout(timer);
  }, []);

  return status;
}
