import { createHmac, createHash, scrypt, timingSafeEqual, randomBytes } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export const SESSION_SECONDS = 8 * 60 * 60;
export function validPasswordHash(hash: string) { return /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash); }
export async function verifyPassword(password: string, stored: string) {
  if (!validPasswordHash(stored) || password.length < 12 || password.length > 1024) return false;
  const [, salt, expected] = stored.split("$");
  const key = await derive(password, salt, 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(expected,"hex"));
}
export function createSession(secret: string, passwordHash: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({exp:Math.floor(now/1000)+SESSION_SECONDS,version:createHash("sha256").update(passwordHash).digest("hex"),nonce:randomBytes(16).toString("hex")})).toString("base64url");
  return payload+"."+createHmac("sha256",secret).update(payload).digest("base64url");
}
export function verifySession(token: string, secret: string, passwordHash: string, now = Date.now()) {
  if (!token || token.length > 1024 || secret.length < 32 || !validPasswordHash(passwordHash)) return false;
  const parts=token.split("."); if(parts.length!==2) return false;
  const [payload,signature]=parts;
  const expected=createHmac("sha256",secret).update(payload).digest();
  const supplied=Buffer.from(signature,"base64url");
  if(supplied.length!==expected.length || !timingSafeEqual(supplied,expected)) return false;
  try {
    const value=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
    const epoch=Math.floor(now/1000);
    return Number.isInteger(value.exp) && value.exp>epoch && value.exp<=epoch+SESSION_SECONDS && value.version===createHash("sha256").update(passwordHash).digest("hex");
  } catch { return false; }
}
