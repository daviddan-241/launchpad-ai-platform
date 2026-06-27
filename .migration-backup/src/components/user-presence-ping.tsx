"use client";

import { useEffect } from "react";

export function UserPresencePing() {
  useEffect(() => {
    let timer: number | undefined;

    async function ping() {
      try {
        await fetch("/api/activity/ping", { method: "POST" });
      } catch {
        // ignore
      }
    }

    function start() {
      ping();
      timer = window.setInterval(ping, 5 * 60 * 1000);
    }

    function handleVisibility() {
      if (!document.hidden) {
        ping();
      }
    }

    start();
    window.addEventListener("focus", ping);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", ping);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
