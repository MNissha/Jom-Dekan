import crypto from "crypto";
import { env } from "../config/config/env";

/**
 * AES-256-GCM encryption for secrets that must be *decrypted* later
 * (unlike user_sessions' refresh tokens, which are only ever hashed —
 * calling Google's Calendar API on a tutor's behalf needs the actual
 * refresh token back). The key is derived from JWT_REFRESH_SECRET
 * rather than a new required env var, so environments that haven't
 * configured Calendar integration don't need a separate secret.
 */
const KEY = crypto.createHash("sha256").update(`${env.jwt.refreshSecret}:google-calendar`).digest();

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((buf) => buf.toString("base64")).join(".");
}

export function decryptSecret(ciphertext: string): string {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
