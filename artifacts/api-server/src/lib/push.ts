import webpush from "web-push";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { logger } from "./logger";

// VAPID keys — generate once and store in env
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:launchpad@example.com";

let vapidConfigured = false;

export function initVapid() {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    logger.warn("VAPID keys not set — push notifications disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
    return;
  }
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidConfigured = true;
  logger.info("Web Push VAPID configured");
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC;
}

export async function sendPushToAll(notification: { title: string; body: string; tag?: string; url?: string }) {
  if (!vapidConfigured) return;
  const subs = await db.select().from(pushSubscriptionsTable);
  const payload = JSON.stringify({ notification });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err: any) {
      logger.warn({ endpoint: sub.endpoint, err: err?.message }, "push failed — removing expired subscription");
      // Remove dead subscriptions
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint)).catch(() => {});
      }
    }
  }
}

// Import eq separately since we need it
import { eq } from "drizzle-orm";
