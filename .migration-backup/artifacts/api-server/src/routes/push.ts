import { Router, type IRouter } from "express";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getVapidPublicKey, sendPushToAll } from "../lib/push";

const router: IRouter = Router();

// Get VAPID public key for client subscription
router.get("/push/vapid-key", (req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(503).json({ error: "Push notifications not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY." });
    return;
  }
  res.json({ publicKey: key });
});

// Subscribe to push notifications
router.post("/push/subscribe", async (req, res): Promise<void> => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "endpoint and keys required" });
      return;
    }

    await db.insert(pushSubscriptionsTable)
      .values({ endpoint, p256dh: keys.p256dh, auth: keys.auth })
      .onConflictDoUpdate({ target: pushSubscriptionsTable.endpoint, set: { p256dh: keys.p256dh, auth: keys.auth } });

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "push subscribe failed");
    res.status(500).json({ error: "Subscribe failed" });
  }
});

// Unsubscribe
router.post("/push/unsubscribe", async (req, res): Promise<void> => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) { res.status(400).json({ error: "endpoint required" }); return; }
    await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "push unsubscribe failed");
    res.status(500).json({ error: "Unsubscribe failed" });
  }
});

// Test push
router.post("/push/test", async (req, res): Promise<void> => {
  try {
    await sendPushToAll({ title: "LaunchPad Test", body: "Push notifications are working!", tag: "test" });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "push test failed");
    res.status(500).json({ error: "Push failed" });
  }
});

export default router;
