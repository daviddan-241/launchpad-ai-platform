import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createId, readStore, updateStore, type User } from "@/lib/store";

export const SESSION_COOKIE = "leadforge_session";

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function createUser(
  name: string,
  email: string,
  password: string,
): Promise<{ user: User; token: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  const trimmedPassword = password.trim();

  if (!trimmedName || !normalizedEmail || trimmedPassword.length < 6) {
    throw new Error("Please provide a name, valid email, and password with at least 6 characters.");
  }

  let createdUser: User | null = null;
  let createdToken = "";

  await updateStore((store) => {
    const existing = store.users.find((user) => user.email === normalizedEmail);
    if (existing) {
      throw new Error("An account with that email already exists.");
    }

    const user: User = {
      id: createId("USR"),
      name: trimmedName,
      email: normalizedEmail,
      passwordHash: hashPassword(trimmedPassword),
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };

    createdUser = user;
    createdToken = randomBytes(24).toString("hex");
    store.users.push(user);
    store.sessions.push({
      token: createdToken,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });

    return store;
  });

  if (!createdUser) {
    throw new Error("Could not create user.");
  }

  const finalUser: User = createdUser;
  return { user: finalUser, token: createdToken };
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = hashPassword(password.trim());
  const store = await readStore();
  const user = store.users.find((item) => item.email === normalizedEmail);

  if (!user || user.passwordHash !== passwordHash) {
    throw new Error("Invalid email or password.");
  }

  const token = randomBytes(24).toString("hex");
  await updateStore((draft) => {
    draft.sessions = draft.sessions.filter((session) => session.userId !== user.id);
    draft.sessions.push({
      token,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });
    return draft;
  });

  return { user, token };
}

export async function logoutUser(token: string | undefined) {
  if (!token) return;
  await updateStore((store) => {
    store.sessions = store.sessions.filter((session) => session.token !== token);
    return store;
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const store = await readStore();
  const session = store.sessions.find((item) => item.token === token);
  if (!session) return null;

  return store.users.find((user) => user.id === session.userId) ?? null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
