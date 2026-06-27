import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

type SecretConfig = {
  sessionSecret: string;
  encryptionKey: string;
};

let _config: SecretConfig | null = null;

function isPlaceholder(val: string) {
  return !val || val.startsWith("change-this") || val === "undefined";
}

function loadConfig(): SecretConfig {
  if (_config) return _config;

  const envSession = process.env.SESSION_SECRET ?? "";
  const envEncryption = process.env.APP_ENCRYPTION_KEY ?? "";

  if (!isPlaceholder(envSession) && !isPlaceholder(envEncryption)) {
    _config = { sessionSecret: envSession, encryptionKey: envEncryption };
    return _config;
  }

  const dataRoot = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const secretsPath = path.join(dataRoot, "secrets.json");

  try {
    const raw = readFileSync(secretsPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SecretConfig>;
    if (parsed.sessionSecret && parsed.encryptionKey) {
      _config = { sessionSecret: parsed.sessionSecret, encryptionKey: parsed.encryptionKey };
      return _config;
    }
  } catch {
    // file missing — generate fresh secrets below
  }

  const generated: SecretConfig = {
    sessionSecret: randomBytes(32).toString("hex"),
    encryptionKey: randomBytes(32).toString("hex"),
  };

  try {
    mkdirSync(dataRoot, { recursive: true });
    writeFileSync(secretsPath, JSON.stringify(generated, null, 2));
  } catch {
    // read-only FS — use in-memory only (fine for stateless restarts)
  }

  _config = generated;
  return _config;
}

export function getSessionSecret(): string {
  return loadConfig().sessionSecret;
}

export function getEncryptionKey(): string {
  return loadConfig().encryptionKey;
}
