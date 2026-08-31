import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const KEY_LEN = 32;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== KEY_LEN) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex chars).");
  }
  return buf;
}

/**
 * Encrypts a UTF-8 string with AES-256-GCM. Output format:
 *   base64(iv).base64(ciphertext).base64(authTag)
 * Three components, dot-delimited, base64url-safe components avoided so a
 * legacy URL-decoder won't accidentally mangle them.
 */
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), enc.toString("base64"), tag.toString("base64")].join(".");
}

export function decryptSecret(blob: string): string {
  const key = getKey();
  const [ivB64, encB64, tagB64] = blob.split(".");
  if (!ivB64 || !encB64 || !tagB64) {
    throw new Error("Malformed encrypted payload");
  }
  const iv = Buffer.from(ivB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
