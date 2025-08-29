import crypto from "crypto";

const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY_HEX!; // 32-byte hex string (64 chars)
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex"); // 256-bit key

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("ENCRYPTION_KEY_HEX must decode to 32 bytes");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decrypt(b64: string): string {
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
