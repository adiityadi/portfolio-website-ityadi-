import "server-only";
import { cookies } from "next/headers";
import { validPasswordHash, verifySession } from "./auth-core";
import { databaseConfigured } from "./storage";
import { verifyOrigin } from "./validation";
export const SESSION_COOKIE="adi_owner";
export function authConfigured() { return databaseConfigured() && validPasswordHash(process.env.ADMIN_PASSWORD_HASH || "") && (process.env.SESSION_SECRET?.length || 0)>=32; }
export async function getOwnerSession() {
  if (!authConfigured()) return null;
  const cookie=(await cookies()).get(SESSION_COOKIE)?.value || "";
  if (!verifySession(cookie,process.env.SESSION_SECRET!,process.env.ADMIN_PASSWORD_HASH!)) return null;
  return {displayName:"Aditya Rathore",email:"Owner studio"};
}
export function verifyWriteOrigin(request:Request) {
  const expected=new URL(process.env.APP_URL || request.url).origin;
  verifyOrigin(request.headers.get("origin"),expected);
}
