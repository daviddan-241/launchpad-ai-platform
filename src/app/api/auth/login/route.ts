import { NextResponse } from "next/server";
import { loginUser, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    const { user, token } = await loginUser(body.email ?? "", body.password ?? "");
    const response = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not log in." },
      { status: 400 },
    );
  }
}
