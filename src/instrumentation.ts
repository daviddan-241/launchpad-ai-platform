export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapAllWorkers } = await import("./lib/workers");
    bootstrapAllWorkers();
    startSelfPing();
  }
}

function startSelfPing() {
  const runtime = globalThis as typeof globalThis & { __selfPingStarted?: boolean };
  if (runtime.__selfPingStarted) return;
  runtime.__selfPingStarted = true;

  const appUrl = process.env.APP_URL;
  if (!appUrl) return;

  const interval = 14 * 60 * 1000;

  const ping = () => {
    fetch(`${appUrl}/api/ping`, { method: "GET" }).catch(() => undefined);
  };

  const timer = setInterval(ping, interval);
  timer.unref?.();
  setTimeout(ping, 30_000);
}
