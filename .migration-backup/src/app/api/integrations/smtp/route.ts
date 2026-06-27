import { NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity";
import { requireCurrentUser } from "@/lib/auth";
import { encryptText } from "@/lib/crypto";
import { createId, updateStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      fromName?: string;
      email?: string;
      username?: string;
      password?: string;
      host?: string;
      port?: number;
      secure?: boolean;
    };

    const email = body.email?.trim().toLowerCase();
    const username = body.username?.trim();
    const password = body.password?.trim();
    const host = body.host?.trim();
    const port = Number(body.port || 0);

    if (!email || !username || !password || !host || !port) {
      throw new Error("SMTP email, username, password, host, and port are required.");
    }

    await updateStore((store) => {
      const existing = store.emailAccounts.find((account) => account.userId === user.id && account.provider === "smtp" && account.email === email);
      if (existing) {
        existing.refreshTokenEncrypted = encryptText(password);
        existing.updatedAt = new Date().toISOString();
        existing.smtpHost = host;
        existing.smtpPort = port;
        existing.smtpSecure = Boolean(body.secure);
        existing.smtpUsername = username;
        existing.smtpFromName = body.fromName?.trim() || undefined;
        return store;
      }

      store.emailAccounts.unshift({
        id: createId("EML"),
        userId: user.id,
        provider: "smtp",
        email,
        refreshTokenEncrypted: encryptText(password),
        connectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        smtpHost: host,
        smtpPort: port,
        smtpSecure: Boolean(body.secure),
        smtpUsername: username,
        smtpFromName: body.fromName?.trim() || undefined,
      });
      return store;
    });

    await logActivityEvent({
      userId: user.id,
      type: "integration",
      title: "Connected SMTP sender",
      detail: email,
      status: "done",
    });

    return NextResponse.json({ ok: true, message: "SMTP connection saved." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save SMTP connection." }, { status: 400 });
  }
}
