import { getCurrentUser } from "@/lib/auth";
import { getActivityDashboard } from "@/lib/activity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const userId = user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      function send(data: unknown) {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            closed = true;
          }
        }
      }

      function heartbeat() {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch {
            closed = true;
          }
        }
      }

      try {
        const initial = await getActivityDashboard(userId);
        send(initial);
      } catch {
        closed = true;
        controller.close();
        return;
      }

      const dataInterval = setInterval(async () => {
        if (closed) { clearInterval(dataInterval); return; }
        try {
          const snapshot = await getActivityDashboard(userId);
          send(snapshot);
        } catch {
          clearInterval(dataInterval);
        }
      }, 8000);

      const heartbeatInterval = setInterval(() => {
        if (closed) { clearInterval(heartbeatInterval); return; }
        heartbeat();
      }, 25000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(dataInterval);
        clearInterval(heartbeatInterval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
